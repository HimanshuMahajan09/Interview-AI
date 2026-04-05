import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';

export default function Signup() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [form,    setForm]    = useState({ name: '', email: '', password: '', confirm: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm) {
      return setError('Passwords do not match');
    }
    if (form.password.length < 6) {
      return setError('Password must be at least 6 characters');
    }

    setLoading(true);
    try {
      const data = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });
      login(data.token, data.user);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-logo">Interview<span>AI</span></div>
        <div className="hero-tag" style={{ marginBottom: '24px' }}>🎙️ Voice-Powered AI Coach</div>
        <h2 className="auth-title">Create your account</h2>
        <p className="auth-sub">Start practising interviews with AI feedback</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={submit} className="auth-form">
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              name="name"
              placeholder="Jane Smith"
              value={form.name}
              onChange={handle}
              required
              minLength={2}
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handle}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              placeholder="Min. 6 characters"
              value={form.password}
              onChange={handle}
              required
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              name="confirm"
              placeholder="Repeat password"
              value={form.confirm}
              onChange={handle}
              required
            />
          </div>

          {/* Password strength hints */}
          <div className="pills" style={{ marginBottom: '4px' }}>
            <div className={`pill ${form.password.length >= 6 ? 'pill-ok' : ''}`}>6+ chars</div>
            <div className={`pill ${/[A-Z]/.test(form.password) ? 'pill-ok' : ''}`}>Uppercase</div>
            <div className={`pill ${/[0-9]/.test(form.password) ? 'pill-ok' : ''}`}>Number</div>
          </div>

          <button type="submit" className="start-btn" disabled={loading}>
            {loading ? <><span className="btn-spinner" /> Creating account…</> : '🚀 Create Account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{' '}
          <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
