const { getDb } = require('../config/firebase');
const { toDocObject, matchesQuery, QueryBuilder } = require('./firestoreHelper');

const COLLECTION = 'submissions';

class Submission {
  constructor(data = {}) {
    Object.assign(this, toDocObject(data, data._id || data.id));
    this._id = this._id || this.id;
    this.id = this._id;
    if (this.userId && typeof this.userId === 'object' && (this.userId._id || this.userId.id)) {
      this.userId = String(this.userId._id || this.userId.id);
    }
  }

  async save() {
    const db = getDb();
    const docData = { ...this };
    delete docData._id;
    delete docData.id;

    if (docData.userId && typeof docData.userId === 'object') {
      docData.userId = String(docData.userId._id || docData.userId.id);
    }

    docData.updatedAt = new Date();
    if (!docData.createdAt) docData.createdAt = new Date();

    const docId = String(this._id || this.id);
    await db.collection(COLLECTION).doc(docId).set(docData, { merge: true });
    return this;
  }

  toJSON() {
    return { ...this };
  }

  toObject() {
    return { ...this };
  }

  // ─── Static Methods ────────────────────────────────────────────────────────

  static find(query = {}) {
    return new QueryBuilder(COLLECTION, query, Submission, false);
  }

  static findById(id) {
    if (!id) return new QueryBuilder(COLLECTION, { _id: '__none__' }, Submission, true);
    const cleanId = String(id._id || id.id || id);
    return new QueryBuilder(COLLECTION, { _id: cleanId }, Submission, true);
  }

  static findOne(query = {}) {
    return new QueryBuilder(COLLECTION, query, Submission, true);
  }

  static async create(subData) {
    const db = getDb();
    const data = { ...subData };

    if (data.userId && typeof data.userId === 'object') {
      data.userId = String(data.userId._id || data.userId.id);
    }

    data.totalScore = Number(data.totalScore || 0);
    data.status = data.status || 'in-progress';
    data.startedAt = data.startedAt ? new Date(data.startedAt) : new Date();
    data.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    data.updatedAt = new Date();

    let docRef;
    if (data._id || data.id) {
      const customId = String(data._id || data.id);
      docRef = db.collection(COLLECTION).doc(customId);
      await docRef.set(data);
    } else {
      docRef = await db.collection(COLLECTION).add(data);
    }

    return new Submission({ ...data, _id: docRef.id, id: docRef.id });
  }

  static async findOneAndUpdate(query = {}, updateData = {}, options = {}) {
    let existing = await Submission.findOne(query);

    const data = updateData.$set ? { ...updateData.$set } : { ...updateData };

    if (!existing) {
      if (options.upsert) {
        const createPayload = { ...query, ...data };
        return Submission.create(createPayload);
      }
      return null;
    }

    if (data.userId && typeof data.userId === 'object') {
      data.userId = String(data.userId._id || data.userId.id);
    }

    data.updatedAt = new Date();
    Object.assign(existing, data);
    await existing.save();

    return existing;
  }

  static async deleteMany(query = {}) {
    const db = getDb();
    const snapshot = await db.collection(COLLECTION).get();
    let count = 0;

    for (const doc of snapshot.docs) {
      const data = toDocObject(doc.data(), doc.id);
      if (matchesQuery(data, query)) {
        await db.collection(COLLECTION).doc(doc.id).delete();
        count++;
      }
    }
    return { deletedCount: count };
  }

  /**
   * MongoDB Aggregation Pipeline simulator for Firestore
   */
  static async aggregate(pipeline = []) {
    const db = getDb();
    const subSnap = await db.collection(COLLECTION).get();
    let rows = [];

    subSnap.forEach((doc) => {
      rows.push(toDocObject(doc.data(), doc.id));
    });

    for (const stage of pipeline) {
      if (stage.$match) {
        rows = rows.filter((r) => matchesQuery(r, stage.$match));
      } else if (stage.$group) {
        const groupKey = stage.$group._id;
        const groups = {};

        rows.forEach((row) => {
          let gVal;
          if (typeof groupKey === 'string' && groupKey.startsWith('$')) {
            const field = groupKey.substring(1);
            gVal = String(row[field] || '');
          } else {
            gVal = 'all';
          }

          if (!groups[gVal]) {
            groups[gVal] = { _id: gVal };
            for (const [key, expr] of Object.entries(stage.$group)) {
              if (key === '_id') continue;
              if (expr.$sum) groups[gVal][key] = 0;
              if (expr.$min) groups[gVal][key] = null;
              if (expr.$push) groups[gVal][key] = [];
            }
          }

          for (const [key, expr] of Object.entries(stage.$group)) {
            if (key === '_id') continue;
            if (expr.$sum !== undefined) {
              let val = 0;
              if (typeof expr.$sum === 'string' && expr.$sum.startsWith('$')) {
                val = Number(row[expr.$sum.substring(1)] || 0);
              } else if (typeof expr.$sum === 'number') {
                val = expr.$sum;
              }
              groups[gVal][key] += val;
            }
            if (expr.$min !== undefined) {
              if (typeof expr.$min === 'string' && expr.$min.startsWith('$')) {
                const fVal = row[expr.$min.substring(1)];
                if (fVal) {
                  if (!groups[gVal][key] || new Date(fVal) < new Date(groups[gVal][key])) {
                    groups[gVal][key] = fVal;
                  }
                }
              }
            }
            if (expr.$push !== undefined) {
              if (typeof expr.$push === 'object') {
                const item = {};
                for (const [pk, pv] of Object.entries(expr.$push)) {
                  if (typeof pv === 'string' && pv.startsWith('$')) {
                    item[pk] = row[pv.substring(1)];
                  } else {
                    item[pk] = pv;
                  }
                }
                groups[gVal][key].push(item);
              }
            }
          }
        });

        rows = Object.values(groups);
      } else if (stage.$sort) {
        rows.sort((a, b) => {
          for (const [field, direction] of Object.entries(stage.$sort)) {
            const dir = direction === -1 ? -1 : 1;
            const aVal = a[field];
            const bVal = b[field];
            if (aVal === undefined && bVal === undefined) continue;
            if (aVal === undefined) return 1 * dir;
            if (bVal === undefined) return -1 * dir;
            if (aVal instanceof Date && bVal instanceof Date) {
              if (aVal.getTime() !== bVal.getTime()) return (aVal.getTime() - bVal.getTime()) * dir;
            } else if (aVal !== bVal) {
              return (aVal > bVal ? 1 : -1) * dir;
            }
          }
          return 0;
        });
      } else if (stage.$limit) {
        rows = rows.slice(0, stage.$limit);
      } else if (stage.$lookup) {
        const targetCollection = stage.$lookup.from;
        const targetSnap = await db.collection(targetCollection).get();
        const targetMap = {};
        targetSnap.forEach((d) => {
          const docObj = toDocObject(d.data(), d.id);
          targetMap[d.id] = docObj;
          if (docObj._id) targetMap[docObj._id] = docObj;
        });

        rows.forEach((r) => {
          const lVal = String(r[stage.$lookup.localField] || '');
          const match = targetMap[lVal];
          r[stage.$lookup.as] = match ? [match] : [];
        });
      } else if (stage.$unwind) {
        const fieldName = typeof stage.$unwind === 'string' ? stage.$unwind.replace(/^\$/, '') : stage.$unwind.path.replace(/^\$/, '');
        const newRows = [];
        rows.forEach((r) => {
          const arr = r[fieldName];
          if (Array.isArray(arr) && arr.length > 0) {
            arr.forEach((item) => {
              newRows.push({ ...r, [fieldName]: item });
            });
          } else if (arr) {
            newRows.push(r);
          }
        });
        rows = newRows;
      } else if (stage.$project) {
        rows = rows.map((r) => {
          const projected = {};
          for (const [k, v] of Object.entries(stage.$project)) {
            if (k === '_id' && v === 0) continue;
            if (typeof v === 'string' && v.startsWith('$')) {
              const pathParts = v.substring(1).split('.');
              let curr = r;
              for (const part of pathParts) {
                curr = curr ? curr[part] : undefined;
              }
              projected[k] = curr;
            } else if (v === 1) {
              projected[k] = r[k];
            }
          }
          return projected;
        });
      }
    }

    return rows;
  }

  static get collection() {
    return {
      insertOne: async (doc) => {
        return Submission.create(doc);
      },
    };
  }
}

module.exports = Submission;
