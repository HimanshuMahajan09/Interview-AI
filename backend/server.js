const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// ── Middleware ──────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:4000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// ── Routes ──────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/resume', require('./routes/resume'));    // resume upload + JD parser
app.use('/api/progress', require('./routes/progress')); // dashboard + streak

app.get('/api/health', (_req, res) => res.json({ status: 'OK' }));

// ── MongoDB ─────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅  MongoDB connected');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀  Server on http://localhost:${PORT}`));
  })
  .catch(err => { console.error('❌  MongoDB error:', err.message); process.exit(1); });