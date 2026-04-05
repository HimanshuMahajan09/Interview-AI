const express = require('express');
const Session = require('../models/Session');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/progress/dashboard ────────────────────────────
router.get('/dashboard', protect, async (req, res) => {
    try {
        const sessions = await Session.find({ user: req.user._id }).sort({ createdAt: -1 });

        const totalSessions = sessions.length;
        const avgScore = totalSessions
            ? Math.round(sessions.reduce((a, s) => a + (s.overallScore || 0), 0) / totalSessions)
            : 0;

        const scores = sessions.map(s => s.overallScore || 0);
        const bestScore = scores.length ? Math.max(...scores) : 0;
        const worstScore = scores.length ? Math.min(...scores) : 0;

        const trend = sessions.slice(0, 10).reverse().map((s, i) => ({
            session: i + 1,
            score: s.overallScore || 0,
            type: s.interviewType,
            date: s.createdAt,
        }));

        const byType = {};
        sessions.forEach(s => {
            if (!byType[s.interviewType]) byType[s.interviewType] = { total: 0, count: 0 };
            byType[s.interviewType].total += s.overallScore || 0;
            byType[s.interviewType].count += 1;
        });
        const typeBreakdown = Object.entries(byType).map(([type, val]) => ({
            type,
            avgScore: Math.round(val.total / val.count),
            sessions: val.count,
        }));

        const metricKeys = ['clarity', 'relevance', 'depth', 'communication'];
        const avgMetrics = {};
        metricKeys.forEach(k => {
            const vals = sessions.filter(s => s.metrics?.[k]).map(s => s.metrics[k]);
            avgMetrics[k] = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
        });

        const user = await User.findById(req.user._id).select('currentStreak longestStreak lastPracticeDate');

        res.json({
            totalSessions,
            avgScore,
            bestScore,
            worstScore,
            trend,
            typeBreakdown,
            avgMetrics,
            streak: {
                current: user.currentStreak,
                longest: user.longestStreak,
                lastPractice: user.lastPracticeDate,
            },
            recentSessions: sessions.slice(0, 5).map(s => ({
                _id: s._id,
                interviewType: s.interviewType,
                difficulty: s.difficulty,
                overallScore: s.overallScore,
                totalQuestions: s.totalQuestions,
                createdAt: s.createdAt,
            })),
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;