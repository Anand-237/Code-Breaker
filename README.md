# ☢ Code Breakers — Doomsday Edition

> A full-stack technical event platform where participants compete in 3 rounds of coding challenges under a doomsday theme.

---

## 🗂 Project Structure

```
Code_Debugging/
├── client/          # React 18 + Vite frontend
└── server/          # Node.js + Express API
```

---

## ⚙️ Prerequisites

- Node.js ≥ 18
- A [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (free tier works fine)
- npm or yarn

---

## 🚀 Quick Start

### 1. Clone / extract the project

### 2. Set up environment variables

Copy `.env.example` to `.env` in the **root** of the project, then fill in your values:

```bash
# From the root directory
cp .env.example .env
```

Required fields in `.env`:
```
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/code-breakers
JWT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
PORT=5000
ADMIN_SETUP_SECRET=my-secret-admin-key
CLIENT_URL=http://localhost:5173
AUTO_GRADE_ENABLED=false
```

> **MongoDB Atlas note:** Go to Network Access → Add IP Address → Allow access from anywhere (`0.0.0.0/0`) during development, or whitelist your server's IP for production.

### 3. Install server dependencies

```bash
cd server
npm install
```

### 4. Install client dependencies

```bash
cd client
npm install
```

### 5. Seed the database

```bash
cd server
npm run seed
```

This will:
- Create admin account: `username=admin / password=Admin@1234`
- Create 20 sample MCQ questions (Round 1)
- Create 5 sample output questions (Round 2)
- Create 3 sample debug questions (Round 3)
- Initialize all 3 rounds as **locked**

> ⚠️ **Change the admin password** after first login!

### 6. Start the development servers

**Terminal 1 — Backend:**
```bash
cd server
npm run dev
# Runs on http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd client
npm run dev
# Runs on http://localhost:5173
```

---

## 🔑 Default Credentials (after seed)

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `Admin@1234` |

> ⚠️ Change this immediately via Admin Panel → Participants → Edit.

---

## 👤 User Roles

### Admin
- Access Admin Panel at `/admin`
- Can create/manage participants, questions, round locks, view results, export data

### Participant
- Cannot self-register — accounts created by admin only
- Access home page at `/` after login
- Can only enter unlocked rounds

---

## 📖 Features

### Participant-Facing
- 🔒 **Doomsday-themed login** with glowing red form
- 🏠 **Home page** with 3 sector cards (locked/unlocked/completed)
- 📡 **Live Top-3 leaderboard** sidebar (20s polling)
- 📡 **Round 1** — 20 MCQ questions, one-at-a-time navigator
- 💀 **Round 2** — Code output prediction with syntax highlighting
- ☠ **Round 3** — Monaco code editor for debugging challenges

### Admin Panel
- 👥 **Participant management**: create, bulk CSV upload, reset password, deactivate
- 📝 **Question bank**: CRUD for all 3 round types
- 🔒 **Round control**: lock/unlock with optional time limits
- 📊 **Results dashboard**: full leaderboard + Round 3 manual review
- ↓ **Export**: per-round and overall results as `.xlsx` or `.csv`

---

## 🔐 Security

- Passwords hashed with **bcrypt** (cost factor 12) — never stored in plaintext
- **JWT tokens** with 8-hour expiry
- **Server-side scoring** — client scores never trusted
- Correct answers **never sent** to participant API endpoints
- **Rate limiting** on login: 10 attempts / 15 minutes per IP
- Round-lock enforcement on every submission attempt

---

## 🌐 Deployment Notes

| Service | Recommended Host |
|---|---|
| Frontend | Vercel or Netlify |
| Backend | Render or Railway |
| Database | MongoDB Atlas |

**Frontend (Vercel):**
- Build command: `npm run build`
- Output: `dist/`
- Add env var: `VITE_API_URL=https://your-backend.onrender.com`
- Update `client/src/api/axios.js` baseURL to use `import.meta.env.VITE_API_URL`

**Backend (Render):**
- Add all env vars from `.env.example`
- Start command: `npm start`
- Update `CORS CLIENT_URL` to your Vercel URL

---

## 🔧 Configuration

| Variable | Default | Description |
|---|---|---|
| `AUTO_GRADE_ENABLED` | `false` | Enable Judge0 API for Round 3 auto-grading |
| `ROUND1_QUESTION_COUNT` | `20` | Questions shown per participant in Round 1 |
| Leaderboard poll interval | `20s` | Configurable in `HomePage.jsx` `POLL_INTERVAL` |

---

## 📁 CSV Bulk Import Format

For bulk participant creation via Admin Panel → Participants → Bulk CSV Upload:

```csv
name,username,password,teamName
Alice Johnson,alice,Pass@123,Team Alpha
Bob Smith,bobsmith,Pass@456,Team Beta
Charlie Brown,charlie,Pass@789,
```

- `teamName` column is optional
- Header row is required
- Invalid rows are reported without stopping the import

---

## 🏆 Scoring

- **Round 1**: 5 pts per correct MCQ answer (20 questions = max 100 pts)
- **Round 2**: 10 pts per correct output prediction
- **Round 3**: 15 pts per challenge (admin-graded or auto-graded)
- **Cumulative**: R1 + R2 + R3
- **Tie-breaker**: Earliest submission timestamp wins

---

## 📜 API Reference

| Method | Route | Access |
|---|---|---|
| POST | `/api/auth/login` | Public |
| GET | `/api/auth/me` | Auth |
| POST | `/api/auth/admin/setup` | Secret-gated |
| GET | `/api/rounds/status` | Participant |
| GET | `/api/rounds/round1/questions` | Participant |
| POST | `/api/rounds/round1/submit` | Participant |
| GET | `/api/leaderboard/top3` | Auth |
| GET | `/api/leaderboard/full` | Admin |
| CRUD | `/api/admin/users` | Admin |
| CRUD | `/api/admin/round1-questions` | Admin |
| PATCH | `/api/admin/round-control/:round` | Admin |
| GET | `/api/admin/export/:round` | Admin |
| GET | `/api/admin/export/overall` | Admin |
