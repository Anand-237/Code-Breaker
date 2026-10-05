const { getDb } = require('../config/firebase');
const { toDocObject, matchesQuery, QueryBuilder } = require('./firestoreHelper');

const COLLECTION = 'round_controls';

class RoundControl {
  constructor(data = {}) {
    Object.assign(this, toDocObject(data, data._id || data.id || `round_${data.round}`));
    this._id = this._id || this.id || `round_${this.round}`;
    this.id = this._id;
  }

  async save() {
    const db = getDb();
    const docData = { ...this };
    delete docData._id;
    delete docData.id;

    docData.updatedAt = new Date();
    if (!docData.createdAt) docData.createdAt = new Date();

    const docId = String(this._id || this.id || `round_${this.round}`);
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
    return new QueryBuilder(COLLECTION, query, RoundControl);
  }

  static async findOne(query = {}) {
    const db = getDb();
    const snapshot = await db.collection(COLLECTION).get();

    for (const doc of snapshot.docs) {
      const data = toDocObject(doc.data(), doc.id);
      if (matchesQuery(data, query)) {
        return new RoundControl(data);
      }
    }
    return null;
  }

  static async create(controlData) {
    const db = getDb();
    const data = { ...controlData };

    data.round = Number(data.round);
    data.isUnlocked = Boolean(data.isUnlocked);
    data.durationMinutes = data.durationMinutes !== undefined ? data.durationMinutes : null;
    data.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    data.updatedAt = new Date();

    const docId = `round_${data.round}`;
    const docRef = db.collection(COLLECTION).doc(docId);
    await docRef.set(data);

    return new RoundControl({ ...data, _id: docId, id: docId });
  }

  static async findOneAndUpdate(query = {}, updateData = {}, options = {}) {
    let existing = await RoundControl.findOne(query);

    const data = updateData.$set ? { ...updateData.$set } : { ...updateData };

    if (!existing) {
      if (options.upsert) {
        const createPayload = { ...query, ...data };
        return RoundControl.create(createPayload);
      }
      return null;
    }

    data.updatedAt = new Date();
    Object.assign(existing, data);
    await existing.save();

    return existing;
  }
}

module.exports = RoundControl;
