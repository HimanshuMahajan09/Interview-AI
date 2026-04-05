const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['application/pdf', 'text/plain'];
        allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only PDF or .txt files allowed'));
    },
});

// ── POST /api/resume/upload ─────────────────────────────────
router.post('/upload', protect, upload.single('resume'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: 'No file provided' });

        let text = '';
        if (req.file.mimetype === 'application/pdf') {
            const parsed = await pdfParse(req.file.buffer);
            text = parsed.text;
        } else {
            text = req.file.buffer.toString('utf-8');
        }

        text = text.replace(/\s+/g, ' ').trim().substring(0, 4000);
        await User.findByIdAndUpdate(req.user._id, { resumeText: text });

        res.json({ message: 'Resume saved', preview: text.substring(0, 200) + '…' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ── GET /api/resume ─────────────────────────────────────────
router.get('/', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('resumeText');
        res.json({ resumeText: user.resumeText || '' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ── DELETE /api/resume ──────────────────────────────────────
router.delete('/', protect, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user._id, { resumeText: '' });
        res.json({ message: 'Resume removed' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;