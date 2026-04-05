const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  interviewType: { type: String, required: true },
  difficulty: { type: String, required: true },
  role: { type: String, default: '' },
  mode: { type: String, enum: ['voice', 'text'], default: 'voice' },
  totalQuestions: { type: Number, default: 5 },
  overallScore: { type: Number, default: 0 },
  metrics: {
    clarity: Number,
    relevance: Number,
    depth: Number,
    communication: Number
  },
  questions: [
    {
      question: String,
      answer: String,
      score: Number,
      feedback: mongoose.Schema.Types.Mixed
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Session', SessionSchema);
