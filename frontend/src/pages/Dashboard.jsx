import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';

export default function Dashboard() {
    const { user, token, logout } = useAuth();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        apiFetch('/progress/dashboard', {}, token)
            .then(setData)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, [token]);

    const scoreColor = (v) =>
        v >= 75 ? 'var(--accent3)' : v >= 50 ? 'var(--warn)' : 'var(--danger)';

    const formatDate = (d) =>
        d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—';

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 12 }}>
            <div className="spinner" />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading your progress…</span>
        </div>
    );

    if (error) return (
        <div style={{ maxWidth: 600, margin: '60px auto', padding: '0 20px' }}>
            <div className="auth-error">{error}</div>
        </div>
    );

    const { totalSessions, avgScore, bestScore, worstScore, trend, typeBreakdown, avgMetrics, streak, recentSessions } = data;

    return (
        <div style={{ maxWidth: 920, margin: '0 auto', padding: '40px 40px' }}>

            {/* ── Page header ── */}
            <div style={{ marginBottom: 32 }}>
                <div className="hero-tag" style={{ marginBottom: 12 }}>📊 Your Progress</div>
                <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.8rem', fontWeight: 800, marginBottom: 6 }}>
                    Performance Dashboard
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    Track your improvement across every interview session.
                </p>
            </div>

            {/* ── Top stat cards ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 28 }}>
                {[
                    { label: 'Sessions Done', value: totalSessions, color: 'var(--accent)', icon: '🎯' },
                    { label: 'Average Score', value: avgScore + '%', color: scoreColor(avgScore), icon: '📊' },
                    { label: 'Best Score', value: bestScore + '%', color: 'var(--accent3)', icon: '🏆' },
                    { label: 'Current Streak', value: streak.current + ' 🔥', color: 'var(--warn)', icon: '⚡' },
                    { label: 'Longest Streak', value: streak.longest + ' days', color: 'var(--accent2)', icon: '📅' },
                ].map(card => (
                    <div key={card.label} style={{
                        background: 'var(--surface)', border: '1px solid var(--border)',
                        borderRadius: 12, padding: '18px 16px',
                    }}>
                        <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 8 }}>
                            {card.icon} {card.label}
                        </div>
                        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.6rem', fontWeight: 800, color: card.color }}>
                            {card.value}
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Score trend bar chart ── */}
            {trend.length > 0 && (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 22 }}>
                    <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.9rem', fontWeight: 700, marginBottom: 20 }}>
                        📈 Score Trend (last {trend.length} sessions)
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
                        {trend.map((t, i) => (
                            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: '0.6rem', color: scoreColor(t.score) }}>{t.score}%</span>
                                <div style={{
                                    width: '100%', borderRadius: '4px 4px 0 0',
                                    height: `${Math.max(4, t.score)}%`,
                                    background: `linear-gradient(180deg, ${scoreColor(t.score)}, ${scoreColor(t.score)}88)`,
                                    transition: 'height 0.6s ease',
                                }} />
                                <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                                    {formatDate(t.date)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Average metrics + Type breakdown row ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 22 }}>

                {/* Avg metrics */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
                    <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.9rem', fontWeight: 700, marginBottom: 18 }}>
                        🎯 Average Metrics
                    </h2>
                    {[
                        { label: 'Clarity', val: avgMetrics.clarity, color: '#00d4ff' },
                        { label: 'Relevance', val: avgMetrics.relevance, color: '#a78bfa' },
                        { label: 'Depth', val: avgMetrics.depth, color: '#10b981' },
                        { label: 'Communication', val: avgMetrics.communication, color: '#f59e0b' },
                    ].map(m => (
                        <div key={m.label} style={{ marginBottom: 14 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: 5 }}>
                                <span style={{ color: 'var(--text-muted)' }}>{m.label}</span>
                                <span style={{ color: m.color, fontWeight: 700 }}>{m.val}</span>
                            </div>
                            <div style={{ height: 4, background: 'var(--surface3)', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${m.val}%`, background: m.color, borderRadius: 3, transition: 'width 1s ease' }} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* By type */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
                    <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.9rem', fontWeight: 700, marginBottom: 18 }}>
                        🗂️ By Interview Type
                    </h2>
                    {typeBreakdown.length === 0
                        ? <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No sessions yet.</p>
                        : typeBreakdown.map(t => (
                            <div key={t.type} style={{ marginBottom: 14 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: 5 }}>
                                    <span style={{ color: 'var(--text-dim)', textTransform: 'capitalize' }}>{t.type}</span>
                                    <span style={{ color: scoreColor(t.avgScore), fontWeight: 700 }}>{t.avgScore}% <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({t.sessions} sessions)</span></span>
                                </div>
                                <div style={{ height: 4, background: 'var(--surface3)', borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${t.avgScore}%`, background: scoreColor(t.avgScore), borderRadius: 3, transition: 'width 1s ease' }} />
                                </div>
                            </div>
                        ))
                    }
                </div>
            </div>

            {/* ── Recent sessions ── */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}>
                <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '0.9rem', fontWeight: 700, padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
                    🕐 Recent Sessions
                </h2>
                {recentSessions.length === 0
                    ? <p style={{ padding: '20px 22px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No sessions yet. Start your first interview!</p>
                    : recentSessions.map(s => (
                        <div key={s._id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 22px', borderBottom: '1px solid var(--border)' }}>
                            <span style={{
                                padding: '4px 12px', borderRadius: 100, fontSize: '0.65rem', fontWeight: 700,
                                background: `${scoreColor(s.overallScore)}18`, color: scoreColor(s.overallScore),
                                border: `1px solid ${scoreColor(s.overallScore)}44`, whiteSpace: 'nowrap',
                            }}>
                                {s.overallScore}%
                            </span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'capitalize', marginBottom: 2 }}>
                                    {s.interviewType} — {s.difficulty}
                                </div>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                                    {s.totalQuestions} questions · {formatDate(s.createdAt)}
                                </div>
                            </div>
                        </div>
                    ))
                }
            </div>

            {/* ── Actions ── */}
            <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-primary" onClick={() => navigate('/')}>
                    🎙️ Start New Interview
                </button>
                <button className="btn btn-sec" onClick={() => { logout(); navigate('/login'); }}>
                    Sign Out
                </button>
            </div>

        </div>
    );
}