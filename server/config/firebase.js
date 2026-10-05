const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let isInitialized = false;
let db = null;
let isMock = false;

// In-memory / file persistent store for offline / dev fallback
let localStore = {
  users: {},
  questions: {},
  submissions: {},
  round_controls: {},
};

const LOCAL_STORE_FILE = path.join(__dirname, '../data/firestore_local.json');

const loadLocalStore = () => {
  try {
    if (fs.existsSync(LOCAL_STORE_FILE)) {
      const data = fs.readFileSync(LOCAL_STORE_FILE, 'utf-8');
      if (data && data.trim()) {
        localStore = JSON.parse(data);
      }
    }
  } catch (_) {}
};

const saveLocalStore = () => {
  try {
    const dataDir = path.dirname(LOCAL_STORE_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(localStore, null, 2), 'utf-8');
  } catch (_) {}
};

/**
 * Scan directories for any Firebase service account key JSON files
 */
function findServiceAccountFiles() {
  const searchDirs = [
    __dirname,
    path.join(__dirname, '..'),
    path.join(__dirname, '../..'),
  ];

  const found = [];

  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    found.push(path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH));
  }

  for (const dir of searchDirs) {
    try {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        for (const f of files) {
          if (f.endsWith('.json')) {
            if (
              f.includes('firebase-adminsdk') ||
              f === 'serviceAccountKey.json' ||
              f === 'firebase-key.json' ||
              f.includes('codebreaker')
            ) {
              found.push(path.join(dir, f));
            }
          }
        }
      }
    } catch (_) {}
  }

  return [...new Set(found)];
}

function configureFirestoreSettings(firestoreInstance) {
  try {
    firestoreInstance.settings({ ignoreUndefinedProperties: true });
  } catch (_) {}
  return firestoreInstance;
}

/**
 * Initialize Firebase Admin SDK with Cloud Firestore
 */
function initFirebase() {
  if (isInitialized && db) {
    return { admin: isMock ? null : admin, db, isMock };
  }

  // 1. Try FIREBASE_SERVICE_ACCOUNT_KEY (Raw JSON string or Base64 string or file path)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      let serviceAccount;
      const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
      if (rawKey.startsWith('{')) {
        serviceAccount = JSON.parse(rawKey);
      } else if (fs.existsSync(rawKey)) {
        serviceAccount = JSON.parse(fs.readFileSync(rawKey, 'utf-8'));
      } else {
        const decoded = Buffer.from(rawKey, 'base64').toString('utf-8');
        serviceAccount = JSON.parse(decoded);
      }

      if (admin.apps.length === 0) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      }
      db = configureFirestoreSettings(admin.firestore());
      isInitialized = true;
      isMock = false;
      console.log(` Connected to Firebase Cloud Firestore successfully (${serviceAccount.project_id || 'remote'})!`);
      return { admin, db, isMock: false };
    } catch (err) {
      console.warn(' Failed to initialize Firebase with FIREBASE_SERVICE_ACCOUNT_KEY:', err.message);
    }
  }

  // 2. Try JSON service account key files in project directories
  const keyFiles = findServiceAccountFiles();
  for (const filePath of keyFiles) {
    if (fs.existsSync(filePath)) {
      try {
        const serviceAccount = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        if (serviceAccount.project_id && serviceAccount.private_key && serviceAccount.client_email) {
          if (admin.apps.length === 0) {
            admin.initializeApp({
              credential: admin.credential.cert(serviceAccount),
            });
          }
          db = configureFirestoreSettings(admin.firestore());
          isInitialized = true;
          isMock = false;
          console.log(` Connected to Firebase Cloud Firestore successfully! Project: "${serviceAccount.project_id}" (via ${path.basename(filePath)})`);
          return { admin, db, isMock: false };
        }
      } catch (err) {
        console.warn(` Failed loading service account key at ${filePath}:`, err.message);
      }
    }
  }

  // 3. Try individual environment variables (PROJECT_ID, CLIENT_EMAIL, PRIVATE_KEY)
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    try {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
      if (admin.apps.length === 0) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey,
          }),
        });
      }
      db = configureFirestoreSettings(admin.firestore());
      isInitialized = true;
      isMock = false;
      console.log(` Connected to Firebase Cloud Firestore successfully (Project: ${process.env.FIREBASE_PROJECT_ID})!`);
      return { admin, db, isMock: false };
    } catch (err) {
      console.warn(' Failed to initialize Firebase with Env Variables:', err.message);
    }
  }

  // 4. Try Google Application Default Credentials
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    try {
      if (admin.apps.length === 0) {
        admin.initializeApp();
      }
      db = configureFirestoreSettings(admin.firestore());
      isInitialized = true;
      isMock = false;
      console.log(' Connected to Firebase Firestore using GOOGLE_APPLICATION_CREDENTIALS.');
      return { admin, db, isMock: false };
    } catch (err) {
      console.warn(' Application default credentials failed:', err.message);
    }
  }

  // 5. Local Persistent Firestore Datastore (Offline / Local Dev Fallback)
  console.log('--------------------------------------------------------------------------------');
  console.log('  FIREBASE CLOUD FIRESTORE INITIALIZATION:');
  console.log('  Using local persistent Firestore datastore (fallback).');
  console.log('--------------------------------------------------------------------------------');

  loadLocalStore();
  isMock = true;
  isInitialized = true;
  db = createMockFirestore();

  return { admin: null, db, isMock: true };
}

/**
 * Creates an in-memory & file-persisted mock Firestore interface
 */
function createMockFirestore() {
  const getCollection = (colName) => {
    if (!localStore[colName]) localStore[colName] = {};
    return localStore[colName];
  };

  const generateId = () => {
    return 'doc_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
  };

  return {
    collection: (colName) => ({
      doc: (docId) => {
        const id = docId || generateId();
        return {
          id,
          get: async () => {
            const col = getCollection(colName);
            const data = col[id];
            return {
              id,
              exists: !!data,
              data: () => (data ? JSON.parse(JSON.stringify(data)) : undefined),
            };
          },
          set: async (data, options = {}) => {
            const col = getCollection(colName);
            if (options.merge && col[id]) {
              col[id] = { ...col[id], ...data };
            } else {
              col[id] = { ...data, id };
            }
            saveLocalStore();
            return { id };
          },
          update: async (data) => {
            const col = getCollection(colName);
            if (col[id]) {
              col[id] = { ...col[id], ...data };
              saveLocalStore();
            }
            return { id };
          },
          delete: async () => {
            const col = getCollection(colName);
            delete col[id];
            saveLocalStore();
            return true;
          },
        };
      },
      add: async (data) => {
        const id = generateId();
        const col = getCollection(colName);
        col[id] = { ...data, id };
        saveLocalStore();
        return {
          id,
          get: async () => ({
            id,
            exists: true,
            data: () => JSON.parse(JSON.stringify(col[id])),
          }),
        };
      },
      get: async () => {
        const col = getCollection(colName);
        const docs = Object.values(col).map((d) => ({
          id: d.id,
          exists: true,
          data: () => JSON.parse(JSON.stringify(d)),
        }));
        return {
          empty: docs.length === 0,
          size: docs.length,
          docs,
          forEach: (cb) => docs.forEach(cb),
        };
      },
    }),
    batch: () => {
      const ops = [];
      return {
        set: (docRef, data, options) => ops.push(() => docRef.set(data, options)),
        update: (docRef, data) => ops.push(() => docRef.update(data)),
        delete: (docRef) => ops.push(() => docRef.delete()),
        commit: async () => {
          for (const op of ops) await op();
          saveLocalStore();
        },
      };
    },
  };
}

const getDb = () => {
  if (!db) initFirebase();
  return db;
};

module.exports = {
  initFirebase,
  getDb,
  get db() {
    return getDb();
  },
  get isMock() {
    return isMock;
  },
};
