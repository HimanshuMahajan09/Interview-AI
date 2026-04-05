const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false
  },

  // ── Streak tracking ──────────────────────────────────────
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  lastPracticeDate: { type: Date, default: null },

  // ── Resume text (extracted from uploaded PDF/text) ───────
  resumeText: { type: String, default: '' },

}, { timestamps: true });

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Update daily streak — call after every completed session
UserSchema.methods.updateStreak = function () {
  const today = new Date();
  const todayStr = today.toDateString();
  const last = this.lastPracticeDate;

  if (!last) {
    this.currentStreak = 1;
  } else {
    const lastStr = new Date(last).toDateString();
    const diffDays = Math.floor((today - new Date(last)) / (1000 * 60 * 60 * 24));

    if (lastStr === todayStr) {
      // Already practiced today — streak unchanged
    } else if (diffDays === 1) {
      this.currentStreak += 1;          // consecutive day
    } else {
      this.currentStreak = 1;           // streak broken
    }
  }

  if (this.currentStreak > this.longestStreak) {
    this.longestStreak = this.currentStreak;
  }
  this.lastPracticeDate = today;
};

module.exports = mongoose.model('User', UserSchema);