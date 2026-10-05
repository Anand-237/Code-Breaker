const { getDb } = require('../config/firebase');
const { toDocObject, matchesQuery, QueryBuilder } = require('./firestoreHelper');

const COLLECTION = 'questions';

class Question {
  constructor(data = {}) {
    Object.assign(this, toDocObject(data, data._id || data.id));
    this._id = this._id || this.id;
    this.id = this._id;
  }

  async save() {
    const db = getDb();
    const docData = { ...this };
    delete docData._id;
    delete docData.id;

    if (docData.marks !== undefined && docData.points === undefined) {
      docData.points = docData.marks;
    } else if (docData.points !== undefined && docData.marks === undefined) {
      docData.marks = docData.points;
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
    return new QueryBuilder(COLLECTION, query, Question, false);
  }

  static findById(id) {
    if (!id) return new QueryBuilder(COLLECTION, { _id: '__none__' }, Question, true);
    const cleanId = String(id._id || id.id || id);
    return new QueryBuilder(COLLECTION, { _id: cleanId }, Question, true);
  }

  static findOne(query = {}) {
    return new QueryBuilder(COLLECTION, query, Question, true);
  }

  static async create(questionData) {
    const db = getDb();
    const data = { ...questionData };

    if (data.marks !== undefined && data.points === undefined) {
      data.points = data.marks;
    } else if (data.points !== undefined && data.marks === undefined) {
      data.marks = data.points;
    }

    data.isActive = data.isActive !== undefined ? data.isActive : true;
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

    return new Question({ ...data, _id: docRef.id, id: docRef.id });
  }

  static async insertMany(questionsArray = []) {
    const createdList = [];

    for (const item of questionsArray) {
      const created = await Question.create(item);
      createdList.push(created);
    }

    return createdList;
  }

  static async findByIdAndUpdate(id, updateData = {}, options = {}) {
    if (!id) return null;
    const cleanId = String(id._id || id.id || id);
    const existing = await Question.findById(cleanId);
    if (!existing) return null;

    const data = updateData.$set ? { ...updateData.$set } : { ...updateData };
    if (data.marks !== undefined && data.points === undefined) {
      data.points = data.marks;
    } else if (data.points !== undefined && data.marks === undefined) {
      data.marks = data.points;
    }

    data.updatedAt = new Date();
    Object.assign(existing, data);
    await existing.save();

    return existing;
  }

  static async findByIdAndDelete(id) {
    if (!id) return null;
    const question = await Question.findById(id);
    if (!question) return null;

    const db = getDb();
    const cleanId = String(question._id || question.id);
    await db.collection(COLLECTION).doc(cleanId).delete();
    return question;
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

  static async countDocuments(query = {}) {
    const db = getDb();
    const snapshot = await db.collection(COLLECTION).get();
    let count = 0;

    snapshot.forEach((doc) => {
      const data = toDocObject(doc.data(), doc.id);
      if (matchesQuery(data, query)) count++;
    });

    return count;
  }
}

module.exports = Question;
