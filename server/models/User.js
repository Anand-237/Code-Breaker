const bcrypt = require('bcryptjs');
const { getDb } = require('../config/firebase');
const { toDocObject, matchesQuery, applySelect, QueryBuilder } = require('./firestoreHelper');

const COLLECTION = 'users';

class User {
  constructor(data = {}) {
    Object.assign(this, toDocObject(data, data._id || data.id));
    this._id = this._id || this.id;
    this.id = this._id;
  }

  /** Compare plain text password with hashed password */
  async comparePassword(candidatePassword) {
    if (!this.password || !candidatePassword) return false;
    return bcrypt.compare(String(candidatePassword), String(this.password));
  }

  /** Save changes to Firestore */
  async save() {
    const db = getDb();
    const docData = { ...this };
    delete docData._id;
    delete docData.id;

    // If password is not hashed (bcrypt hashes start with $2a$ or $2b$), hash it
    if (docData.password && !docData.password.startsWith('$2')) {
      const salt = await bcrypt.genSalt(12);
      docData.password = await bcrypt.hash(docData.password, salt);
      this.password = docData.password;
    }

    docData.updatedAt = new Date();
    if (!docData.createdAt) docData.createdAt = new Date();

    const docId = String(this._id || this.id);
    await db.collection(COLLECTION).doc(docId).set(docData, { merge: true });
    return this;
  }

  /** Return plain JSON without password */
  toJSON() {
    const obj = { ...this };
    delete obj.password;
    return obj;
  }

  toObject() {
    return { ...this };
  }

  // ─── Static Methods ────────────────────────────────────────────────────────

  static find(query = {}) {
    return new QueryBuilder(COLLECTION, query, User, false);
  }

  static findById(id) {
    if (!id) return new QueryBuilder(COLLECTION, { _id: '__none__' }, User, true);
    const cleanId = String(id._id || id.id || id);
    return new QueryBuilder(COLLECTION, { _id: cleanId }, User, true);
  }

  static findOne(query = {}) {
    return new QueryBuilder(COLLECTION, query, User, true);
  }

  static async create(userData) {
    const db = getDb();
    const data = { ...userData };

    if (!data.name && data.teamName) data.name = data.teamName;
    if (!data.teamName && data.name) data.teamName = data.name;
    if (!data.username && data.teamName) data.username = data.teamName.toLowerCase().replace(/\s+/g, '');

    // Hash password if plain text
    if (data.password && !data.password.startsWith('$2')) {
      const salt = await bcrypt.genSalt(12);
      data.password = await bcrypt.hash(data.password, salt);
    }

    data.role = data.role || 'participant';
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

    const created = new User({ ...data, _id: docRef.id, id: docRef.id });
    return created;
  }

  static async findByIdAndDelete(id) {
    if (!id) return null;
    const user = await User.findById(id);
    if (!user) return null;

    const db = getDb();
    const cleanId = String(user._id || user.id);
    await db.collection(COLLECTION).doc(cleanId).delete();
    return user;
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

  /** Collection-like helper for backup script restore */
  static get collection() {
    return {
      insertOne: async (doc) => {
        return User.create(doc);
      },
    };
  }
}

module.exports = User;
