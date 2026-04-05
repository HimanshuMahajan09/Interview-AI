const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  question: String,
  followUpAsked: String,   // the follow-up question Claude generated
  answer: String,
  followUpAnswer: String,   // user's answer to the follow-up
  score: Number,
  feedback: mongoose.Schema.Types.Mixed,
}, { _id: false });

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
  persona: { type: String, default: 'friendly' }, // friendly | aggressive | formal
  totalQuestions: { type: Number, default: 5 },
  overallScore: { type: Number, default: 0 },
  metrics: {
    clarity: Number,
    relevance: Number,
    depth: Number,
    communication: Number,
  },
  questions: [QuestionSchema],

  // source of question generation
  generatedFrom: { type: String, enum: ['default', 'resume', 'jobDescription'], default: 'default' },

}, { timestamps: true });

module.exports = mongoose.model('Session', SessionSchema);