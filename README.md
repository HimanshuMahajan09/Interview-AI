# InterviewAI 🎙️

> Voice-powered AI interview coach built with the MERN stack + Claude AI.

![Stack](https://img.shields.io/badge/Stack-MERN-7c3aed?style=flat-square) ![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black) ![License](https://img.shields.io/badge/License-MIT-10b981?style=flat-square)

Speak your answers out loud — the AI transcribes in real-time, catches grammar mistakes and filler words, scores your communication, and shows a perfect model answer instantly.

---

## Features

- 🎙️ Live voice recognition + real-time transcription
- ❌ Grammar & filler word detection with corrections
- ✅ AI-generated model answers after each question
- 📊 Scored on Clarity, Relevance, Depth & Communication
- 💾 Session history saved to your account
- 🔐 JWT-based signup & login

---

## Tech Stack

| | |
|---|---|
| Frontend | React 18, React Router v6 |
| Backend | Node.js, Express |
| Database | MongoDB, Mongoose |
| Auth | JWT, bcryptjs |
| AI | Anthropic Claude API |

---

## Getting Started

### Prerequisites
- Node.js v18+, npm v9+
- MongoDB (local or Atlas)
- Anthropic API key

### Install

```bash
git clone https://github.com/HimanshuMahajan09/interview-ai.git
cd interview-ai

npm install
cd backend && npm install
cd ../frontend && npm install
```

### Configure

**`backend/.env`**
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/interviewai
JWT_SECRET=your_secret_key
CLIENT_URL=http://localhost:3000
```

**`frontend/.env`**
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_GEMINI_API_KEY=sk-ant-xxxxxxxxxxxx
```

### Run

```bash
# from project root
npm run dev
```

Frontend → http://localhost:3000  
Backend → http://localhost:5000

---

## API Routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | ❌ | Create account |
| POST | `/api/auth/login` | ❌ | Sign in, get JWT |
| GET | `/api/auth/me` | ✅ | Current user |
| POST | `/api/sessions` | ✅ | Save session |
| GET | `/api/sessions` | ✅ | All user sessions |

---

## Common Issues

| Issue | Fix |
|-------|-----|
| MongoDB refused | Start `mongod` or check Atlas URI |
| CORS error | Match `CLIENT_URL` to your React port |
| Claude 401 | Check `REACT_APP_GEMINI_API_KEY` in `.env` |
| Mic not working | Allow mic permissions; HTTPS required in production |

---

## License

MIT
