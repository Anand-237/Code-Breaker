# ☢ Code Breakers — Doomsday Edition

> A full-stack technical event platform where participants compete in 3 rounds of coding challenges under a doomsday theme.
> Powered by **Node.js, Express, React (Vite), and Firebase Cloud Firestore**.

---

## 🗂 Project Structure

```
Code_Debugging/
├── client/          # React + Vite frontend
├── server/          # Node.js + Express API (Firebase Firestore)
└── api/             # Vercel serverless entrypoint
```

---

## ⚙️ Prerequisites

- Node.js ≥ 18
- A [Firebase](https://firebase.google.com/) Project with Cloud Firestore enabled
- npm or yarn

---

## 🚀 Quick Start

### 1. Firebase Setup

You can connect Firebase in any of the following ways:

#### Option A: `serviceAccountKey.json` (Recommended for Local Dev)
1. Go to **[Firebase Console](https://console.firebase.google.com/)** → **Project Settings** → **Service Accounts**.
2. Click **Generate new private key** and download the JSON file.
3. Place it in the `server/` directory (or project root) as `serviceAccountKey.json`.

#### Option B: Environment Variables (Recommended for Deployment / Vercel / Render)
Set the following environment variables in `.env` (or in your hosting provider's dashboard):
```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

*Note: If no Firebase credentials are provided, the server automatically starts with a local persistent Firestore datastore for zero-friction local development.*

---

### 2. Set up environment variables

Copy `.env` in the root:
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=codebreakers_secret_key_2026
CLIENT_URL=http://localhost:5173

# Firebase Configuration
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

---

### 3. Install dependencies & Seed

```bash
# Install dependencies
npm install --prefix server
npm install --prefix client

# Seed questions & admin account
npm run seed --prefix server
```

Default Admin credentials:
- **Username:** `admin`
- **Password:** `CodeBreaker123`

---

### 4. Start Development Servers

**Backend:**
```bash
npm run dev --prefix server
# Runs on http://localhost:5000
```

**Frontend:**
```bash
npm run dev --prefix client
# Runs on http://localhost:5173
```

---

## 🔑 Default Credentials (after seed)

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `CodeBreaker123` |

---

## 👤 User Roles

### Admin
- Access Admin Panel at `/admin`
- Manage participants, questions, round locks, manual review queue, PDF reports & Excel/CSV export

### Participant
- Accounts created by admin or bulk CSV
- Access rounds when unlocked by admin
- Live leaderboard tracking

---

## 🏆 Scoring

- **Round 1 (Basic)**: 15 questions x 2 marks = 30 marks
- **Round 2 (Intermediate)**: 10 questions x 3 marks = 30 marks
- **Round 3 (Advanced)**: 8 questions x 5 marks = 40 marks
- **Total Marks**: 100 marks
- **Tie-breaker**: Earliest submission timestamp

---

## 📜 API Reference

| Method | Route | Access |
|---|---|---|
| POST | `/api/auth/login` | Public |
| GET | `/api/auth/me` | Auth |
| GET | `/api/rounds/status` | Participant |
| GET | `/api/rounds/round1/questions` | Participant |
| POST | `/api/rounds/round1/submit` | Participant |
| GET | `/api/rounds/round2/questions` | Participant |
| POST | `/api/rounds/round2/submit` | Participant |
| GET | `/api/rounds/round3/questions` | Participant |
| POST | `/api/rounds/round3/run` | Participant |
| POST | `/api/rounds/round3/submit` | Participant |
| GET | `/api/rounds/final-result` | Participant |
| GET | `/api/rounds/scorecard-pdf` | Participant |
| GET | `/api/leaderboard/top3` | Auth |
| GET | `/api/admin/results` | Admin |
| GET | `/api/admin/users` | Admin |
| POST | `/api/admin/users` | Admin |
| PATCH | `/api/admin/round-control/:round` | Admin |
| GET | `/api/admin/export/:round` | Admin |
| GET | `/api/admin/export/pdf` | Admin |
