/**
 * Helper utilities for querying and transforming Firestore documents
 * in a Mongoose-compatible style.
 */

const { getDb } = require('../config/firebase');

/**
 * Normalizes document data ensuring `_id` and `id` are consistent
 */
function toDocObject(data, id) {
  if (!data) return null;
  const obj = { ...data };
  obj._id = obj._id || id || obj.id;
  obj.id = obj._id;

  // Convert Firestore Timestamps to JavaScript Dates
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === 'object') {
      if (typeof value.toDate === 'function') {
        obj[key] = value.toDate();
      } else if (value._seconds !== undefined && value._nanoseconds !== undefined) {
        obj[key] = new Date(value._seconds * 1000 + Math.floor(value._nanoseconds / 1000000));
      }
    }
  }

  return obj;
}

/**
 * Evaluate if a record matches a query object
 */
function matchesQuery(record, query = {}) {
  if (!query || Object.keys(query).length === 0) return true;

  for (const [key, value] of Object.entries(query)) {
    if (key === '$or' && Array.isArray(value)) {
      const orMatch = value.some((subQuery) => matchesQuery(record, subQuery));
      if (!orMatch) return false;
      continue;
    }

    if (key === '$and' && Array.isArray(value)) {
      const andMatch = value.every((subQuery) => matchesQuery(record, subQuery));
      if (!andMatch) return false;
      continue;
    }

    let recordVal = record[key];
    if (key === '_id' || key === 'id') {
      recordVal = record._id || record.id;
    }

    if (value && typeof value === 'object' && !(value instanceof RegExp) && !(value instanceof Date)) {
      // Operator checks
      if (value.$in && Array.isArray(value.$in)) {
        const inVals = value.$in.map((v) => String(v?._id || v?.id || v));
        const currentVal = String(recordVal?._id || recordVal?.id || recordVal);
        if (!inVals.includes(currentVal)) return false;
      }
      if (value.$nin && Array.isArray(value.$nin)) {
        const ninVals = value.$nin.map((v) => String(v?._id || v?.id || v));
        const currentVal = String(recordVal?._id || recordVal?.id || recordVal);
        if (ninVals.includes(currentVal)) return false;
      }
      if (value.$ne !== undefined) {
        if (String(recordVal) === String(value.$ne)) return false;
      }
      if (value.$regex !== undefined) {
        const regex = new RegExp(value.$regex, value.$options || '');
        if (!regex.test(String(recordVal || ''))) return false;
      }
      if (value.$gt !== undefined && !(recordVal > value.$gt)) return false;
      if (value.$gte !== undefined && !(recordVal >= value.$gte)) return false;
      if (value.$lt !== undefined && !(recordVal < value.$lt)) return false;
      if (value.$lte !== undefined && !(recordVal <= value.$lte)) return false;
    } else if (value instanceof RegExp) {
      if (!value.test(String(recordVal || ''))) return false;
    } else if (key === '_id' || key === 'id' || key === 'userId' || key === 'questionId') {
      const strVal = String(value?._id || value?.id || value);
      const strRec = String(recordVal?._id || recordVal?.id || recordVal);
      if (strVal !== strRec) return false;
    } else {
      if (recordVal !== value) return false;
    }
  }

  return true;
}

/**
 * Sorts array of objects by field spec (e.g. { createdAt: -1, order: 1 })
 */
function sortRecords(records, sortObj = {}) {
  if (!sortObj || Object.keys(sortObj).length === 0) return records;

  return [...records].sort((a, b) => {
    for (const [field, direction] of Object.entries(sortObj)) {
      const dir = direction === -1 || direction === 'desc' ? -1 : 1;
      const aVal = a[field];
      const bVal = b[field];

      if (aVal === undefined && bVal === undefined) continue;
      if (aVal === undefined) return 1 * dir;
      if (bVal === undefined) return -1 * dir;

      if (aVal instanceof Date && bVal instanceof Date) {
        if (aVal.getTime() !== bVal.getTime()) {
          return (aVal.getTime() - bVal.getTime()) * dir;
        }
      } else if (typeof aVal === 'string' && typeof bVal === 'string') {
        const cmp = aVal.localeCompare(bVal);
        if (cmp !== 0) return cmp * dir;
      } else if (aVal !== bVal) {
        return (aVal > bVal ? 1 : -1) * dir;
      }
    }
    return 0;
  });
}

/**
 * Applies projection / field exclusion
 */
function applySelect(record, selectFields) {
  if (!selectFields || !record) return record;

  let fields = [];
  if (typeof selectFields === 'string') {
    fields = selectFields.trim().split(/\s+/);
  } else if (Array.isArray(selectFields)) {
    fields = selectFields;
  }

  const isExclusion = fields.some((f) => f.startsWith('-'));
  const newObj = { ...record };

  if (isExclusion) {
    fields.forEach((f) => {
      const cleanField = f.replace(/^-/, '');
      delete newObj[cleanField];
    });
  } else if (fields.length > 0) {
    const includedObj = { _id: record._id, id: record.id };
    fields.forEach((f) => {
      if (record[f] !== undefined) includedObj[f] = record[f];
    });
    return includedObj;
  }

  return newObj;
}

/**
 * Chainable query builder that mimics Mongoose Query
 */
class QueryBuilder {
  constructor(collectionName, query = {}, modelClass = null, isSingle = false) {
    this.collectionName = collectionName;
    this.query = query;
    this.modelClass = modelClass;
    this.isSingle = isSingle;
    this._sort = null;
    this._limit = null;
    this._skip = null;
    this._select = null;
    this._populates = [];
    this._lean = false;
  }

  sort(sortObj) {
    this._sort = sortObj;
    return this;
  }

  limit(num) {
    this._limit = num;
    return this;
  }

  skip(num) {
    this._skip = num;
    return this;
  }

  select(fields) {
    this._select = fields;
    return this;
  }

  populate(field, select) {
    this._populates.push({ field, select });
    return this;
  }

  lean() {
    this._lean = true;
    return this;
  }

  async exec() {
    const db = getDb();
    const snapshot = await db.collection(this.collectionName).get();
    let records = [];

    snapshot.forEach((doc) => {
      const data = toDocObject(doc.data(), doc.id);
      if (matchesQuery(data, this.query)) {
        records.push(data);
      }
    });

    if (this._sort) {
      records = sortRecords(records, this._sort);
    }

    if (this._skip) {
      records = records.slice(this._skip);
    }

    if (this._limit) {
      records = records.slice(0, this._limit);
    }

    // Process population
    if (this._populates.length > 0) {
      for (const pop of this._populates) {
        if (typeof pop.field === 'string') {
          if (pop.field === 'userId') {
            const userSnap = await db.collection('users').get();
            const userMap = {};
            userSnap.forEach((u) => {
              userMap[u.id] = toDocObject(u.data(), u.id);
            });

            records.forEach((rec) => {
              if (rec.userId) {
                const u = userMap[String(rec.userId._id || rec.userId.id || rec.userId)];
                rec.userId = u ? applySelect(u, pop.select) : rec.userId;
              }
            });
          } else if (pop.field === 'adminReviewedBy') {
            const userSnap = await db.collection('users').get();
            const userMap = {};
            userSnap.forEach((u) => {
              userMap[u.id] = toDocObject(u.data(), u.id);
            });

            records.forEach((rec) => {
              if (rec.adminReviewedBy) {
                const u = userMap[String(rec.adminReviewedBy._id || rec.adminReviewedBy.id || rec.adminReviewedBy)];
                rec.adminReviewedBy = u ? applySelect(u, pop.select) : rec.adminReviewedBy;
              }
            });
          }
        } else if (typeof pop.field === 'object' && pop.field.path === 'answers.questionId') {
          const qSnap = await db.collection('questions').get();
          const qMap = {};
          qSnap.forEach((q) => {
            qMap[q.id] = toDocObject(q.data(), q.id);
          });

          records.forEach((rec) => {
            if (Array.isArray(rec.answers)) {
              rec.answers.forEach((ans) => {
                if (ans.questionId) {
                  const q = qMap[String(ans.questionId._id || ans.questionId.id || ans.questionId)];
                  ans.questionId = q ? applySelect(q, pop.field.select) : ans.questionId;
                }
              });
            }
          });
        }
      }
    }

    if (this._select) {
      records = records.map((r) => applySelect(r, this._select));
    }

    if (this.isSingle) {
      if (records.length === 0) return null;
      const rec = records[0];
      if (this._lean) return rec;
      return this.modelClass ? new this.modelClass(rec) : rec;
    }

    if (this._lean) {
      return records;
    }

    if (this.modelClass) {
      return records.map((r) => new this.modelClass(r));
    }

    return records;
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  catch(reject) {
    return this.exec().catch(reject);
  }
}

module.exports = {
  toDocObject,
  matchesQuery,
  sortRecords,
  applySelect,
  QueryBuilder,
};
