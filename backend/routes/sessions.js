const express = require('express');
const Session = require('../models/Session');
const User = require('../models/User');
const { protect } = require('../middleware/auth');


const router = express.Router();

// ── POST /api/sessions ─────────────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    const session = await Session.create({ ...req.body, user: req.user._id });

    // Update daily streak
    const user = await User.findById(req.user._id);
    user.updateStreak();
    await user.save();

    res.status(201).json({
      session,
      streak: {
        current: user.currentStreak,
        longest: user.longestStreak,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/sessions ──────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const sessions = await Session.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/sessions/:id ──────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, user: req.user._id });
    if (!session) return res.status(404).json({ message: 'Session not found' });
    res.json(session);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;