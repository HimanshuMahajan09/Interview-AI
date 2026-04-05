const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const Session = require('../models/Session');

// Save a completed session
router.post('/', protect, async (req, res) => {
  try {
    const session = await Session.create({ ...req.body, user: req.user._id });
    res.status(201).json(session);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all sessions for current user
router.get('/', protect, async (req, res) => {
  try {
    const sessions = await Session.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
