import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../utils/api';

// ── Claude API helper ────────────────────────────────────────────────────────
async function callClaude(prompt, system = '') {
  const body = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  };
  if (system) body.system = system;
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error('API ' + r.status);
  const d = await r.json();
  return d.content.map((c) => c.text || '').join('');
}

// ── Initial state factory ────────────────────────────────────────────────────
const initState = () => ({
  questions: [], currentQ: 0, answers: [], transcripts: [],
  feedbacks: [], scores: [], totalQ: 5,
  difficulty: 'Junior', interviewType: 'software', role: '', background: '', mode: 'voice',
  timerVal: 120, timerInterval: null,
  recognition: null, isListening: false,
  finalTr: '', interimTr: '',
  waveBars: [], waveAnim: null,
  speechOK: false, ttsOK: false,
});

export default function InterviewApp() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const [S, setS] = useState(initState());
  const [screen, setScreen] = useState('home');           // 'home' | 'interview' | 'results'
  const [overlayHidden, setOverlayHidden] = useState(false);

  // Form state
  const [interviewType, setInterviewType] = useState('software');
  const [numQ, setNumQ] = useState(5);
  const [targetRole, setTargetRole] = useState('');
  const [userBg, setUserBg] = useState('');
  const [difficulty, setDifficulty] = useState('Junior');
  const [mode, setMode] = useState('voice');

  // ── NEW: Feature state ────────────────────────────────────────────────────
  const [persona, setPersona] = useState('friendly');
  const [resumeText, setResumeText] = useState('');
  const [resumeUploaded, setResumeUploaded] = useState(false);
  const [jdText, setJdText] = useState('');
  const [jdExpanded, setJdExpanded] = useState(false);
  const [followUpQuestion, setFollowUpQuestion] = useState('');
  const [followUpAnswer, setFollowUpAnswer] = useState('');
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followUpSubmitted, setFollowUpSubmitted] = useState(false);
  const [streakInfo, setStreakInfo] = useState(null);

  // Interview UI state
  const [timerDisplay, setTimerDisplay] = useState('02:00');
  const [timerClass, setTimerClass] = useState('');
  const [progPct, setProgPct] = useState(0);
  const [progLabel, setProgLabel] = useState('Q 0/0');
  const [qText, setQText] = useState('Loading…');
  const [qHint, setQHint] = useState('');
  const [hintVisible, setHintVisible] = useState(false);
  const [transcript, setTranscript] = useState({ final: '', interim: '' });
  const [wordCount, setWordCount] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [micLabel, setMicLabel] = useState('Press mic to record');
  const [answerBox, setAnswerBox] = useState('');
  const [charCount, setCharCount] = useState(0);
  const [fbVisible, setFbVisible] = useState(false);
  const [fbContent, setFbContent] = useState('');
  const [submitDisabled, setSubmitDisabled] = useState(false);
  const [nextVisible, setNextVisible] = useState(false);
  const [startDisabled, setStartDisabled] = useState(false);
  const [startBtnText, setStartBtnText] = useState('🎙️ Start Voice Interview →');
  const [micBadge, setMicBadge] = useState({ cls: 'mic-badge mic-ok', text: 'Checking…' });
  const [toast, setToast] = useState({ visible: false, msg: '', type: 'info' });
  const [typeBadge, setTypeBadge] = useState('—');
  const [diffBadge, setDiffBadge] = useState('—');
  const [recVisible, setRecVisible] = useState(false);

  // Results state
  const [overallScore, setOverallScore] = useState('—');
  const [verdict, setVerdict] = useState('—');
  const [metricsHtml, setMetricsHtml] = useState('');
  const [reviewHtml, setReviewHtml] = useState('');
  const [tipsHtml, setTipsHtml] = useState('');

  // Refs
  const SRef = useRef(S);
  const waveBarRefs = useRef([]);
  const waveAnimRef = useRef(null);
  const timerRef = useRef(null);
  const recognRef = useRef(null);
  const isListenRef = useRef(false);

  const updateS = (patch) => {
    setS((prev) => { const n = { ...prev, ...patch }; SRef.current = n; return n; });
  };

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const speechOK = !!SR;
    const ttsOK = 'speechSynthesis' in window;
    updateS({ speechOK, ttsOK });

    if (speechOK) {
      setMicBadge({ cls: 'mic-badge mic-ok', text: '🎙️ Voice Ready' });
    } else {
      setMicBadge({ cls: 'mic-badge mic-no', text: '⚠️ Voice Not Supported — Use Text Mode' });
      setMode('text');
      setStartBtnText('⌨️ Start Text Interview →');
    }

    setTimeout(() => setOverlayHidden(true), 1500);

    // ── NEW: Load saved resume from backend ───────────────
    apiFetch('/resume', {}, token)
      .then(d => { if (d.resumeText) { setResumeText(d.resumeText); setResumeUploaded(true); } })
      .catch(() => { });
  }, []);

  // ── Toast helper ──────────────────────────────────────────────────────────
  const showToast = (msg, type = 'info') => {
    setToast({ visible: true, msg, type });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 4500);
  };

  // ── Waveform ──────────────────────────────────────────────────────────────
  const animateWave = (on) => {
    clearInterval(waveAnimRef.current);
    if (!on) {
      waveBarRefs.current.forEach((b) => { if (b) { b.style.height = '4px'; b.classList.remove('active'); } });
      return;
    }
    waveAnimRef.current = setInterval(() => {
      waveBarRefs.current.forEach((b, i) => {
        if (!b) return;
        const h = isListenRef.current
          ? 4 + Math.random() * 34
          : 4 + Math.abs(Math.sin(Date.now() / 300 + i * 0.5)) * 9;
        b.style.height = h + 'px';
        b.classList.toggle('active', isListenRef.current);
      });
    }, 80);
  };

  // ── Speech recognition ────────────────────────────────────────────────────
  const setupRecognition = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    const rec = new SR();
    rec.continuous = true; rec.interimResults = true; rec.lang = 'en-US'; rec.maxAlternatives = 1;

    rec.onstart = () => {
      isListenRef.current = true;
      setIsListening(true);
      setMicLabel('Listening…');
      setRecVisible(true);
      animateWave(true);
    };
    rec.onend = () => {
      if (isListenRef.current) { try { rec.start(); } catch (e) { } }
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed') {
        showToast('Microphone access denied. Please allow mic access.', 'err');
        isListenRef.current = false;
        setIsListening(false);
      }
    };
    rec.onresult = (e) => {
      let fin = ''; let inter = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) fin += e.results[i][0].transcript + ' ';
        else inter += e.results[i][0].transcript;
      }
      setTranscript((prev) => {
        const newFinal = prev.final + fin;
        const words = (newFinal + inter).trim().split(/\s+/).filter(Boolean).length;
        setWordCount(words);
        return { final: newFinal, interim: inter };
      });
    };
    return rec;
  };

  const toggleMic = () => {
    if (isListenRef.current) {
      isListenRef.current = false;
      setIsListening(false);
      setMicLabel('Press mic to record');
      setRecVisible(false);
      animateWave(false);
      try { recognRef.current?.stop(); } catch (e) { }
    } else {
      if (!SRef.current.speechOK) { showToast('Voice not supported. Use text mode.', 'err'); return; }
      if (!recognRef.current) recognRef.current = setupRecognition();
      isListenRef.current = true;
      try { recognRef.current.start(); } catch (e) { }
    }
  };

  const clearTranscript = () => {
    setTranscript({ final: '', interim: '' });
    setWordCount(0);
  };

  const speakQuestion = () => {
    if (!SRef.current.ttsOK) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(SRef.current.questions[SRef.current.currentQ]?.q || '');
    utt.rate = 0.92; utt.pitch = 1;
    window.speechSynthesis.speak(utt);
  };

  const speakText = (text) => {
    if (!SRef.current.ttsOK) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 0.92; utt.pitch = 1;
    window.speechSynthesis.speak(utt);
  };

  const toggleHint = () => setHintVisible((v) => !v);

  // ── Timer ─────────────────────────────────────────────────────────────────
  const startTimer = (seconds) => {
    clearInterval(timerRef.current);
    let t = seconds;
    const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    setTimerDisplay(fmt(t));
    timerRef.current = setInterval(() => {
      t--;
      setTimerDisplay(fmt(t));
      setTimerClass(t <= 10 ? 'danger' : t <= 30 ? 'warn' : '');
      if (t <= 0) { clearInterval(timerRef.current); autoSubmit(); }
    }, 1000);
  };

  const autoSubmit = () => {
    showToast("Time's up! Submitting answer…", 'info');
    submitAnswer(true);
  };

  // ── NEW: Resume upload handler ────────────────────────────────────────────
  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('resume', file);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/resume/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        const d = await res.json();
        setResumeText(d.preview || '');
        setResumeUploaded(true);
        showToast('✅ Resume uploaded! Questions will be tailored to your experience.', 'info');
      } else {
        showToast('Resume upload failed. Try a PDF or .txt file.', 'err');
      }
    } catch {
      showToast('Resume upload failed.', 'err');
    }
  };

  const handleRemoveResume = async () => {
    try {
      await apiFetch('/resume', { method: 'DELETE' }, token);
      setResumeText(''); setResumeUploaded(false);
      showToast('Resume removed.', 'info');
    } catch { }
  };

  // ── Start interview ───────────────────────────────────────────────────────
  const startInterview = async () => {
    setStartDisabled(true);
    setStartBtnText('Generating questions…');

    const personaMap = {
      friendly: 'You are a friendly, encouraging startup interviewer.',
      aggressive: 'You are a tough, direct Google-style interviewer who challenges every answer with follow-ups.',
      formal: 'You are a formal, corporate HR manager who expects structured, professional answers.',
    };

    const prompt = `${personaMap[persona]}
Generate ${numQ} ${difficulty} ${interviewType} interview questions${targetRole ? ' for ' + targetRole : ''}.
${resumeText ? 'Tailor questions specifically to this candidate resume:\n' + resumeText.substring(0, 1500) : ''}
${jdText ? 'Tailor questions to match this job description:\n' + jdText.substring(0, 1500) : ''}
${userBg ? 'Candidate background: ' + userBg : ''}
Return ONLY a JSON array: [{"q":"question","hint":"1-sentence hint"},...]`;
    try {
      const raw = await callClaude(prompt, 'Return only valid JSON arrays, nothing else.');
      const qs = JSON.parse(raw.replace(/```json|```/g, '').trim());

      const newS = {
        questions: qs, currentQ: 0, answers: new Array(qs.length).fill(''),
        transcripts: new Array(qs.length).fill(''),
        feedbacks: new Array(qs.length).fill(null),
        scores: new Array(qs.length).fill(0),
        totalQ: qs.length, difficulty, interviewType, role: targetRole,
        background: userBg, mode,
        speechOK: SRef.current.speechOK, ttsOK: SRef.current.ttsOK,
      };
      updateS(newS);
      SRef.current = { ...SRef.current, ...newS };

      setTypeBadge(interviewType.toUpperCase());
      setDiffBadge(difficulty.toUpperCase());
      setScreen('interview');
      loadQuestion(0, newS);
      if (mode === 'voice' && SRef.current.ttsOK) setTimeout(speakQuestion, 500);
    } catch (e) {
      showToast('Failed to generate questions. Check your API key.', 'err');
      setStartDisabled(false);
      setStartBtnText(mode === 'voice' ? '🎙️ Start Voice Interview →' : '⌨️ Start Text Interview →');
    }
  };

  const loadQuestion = (idx, stateOverride = null) => {
    const st = stateOverride || SRef.current;
    const q = st.questions[idx];
    if (!q) return;
    setQText(q.q);
    setQHint(q.hint || '');
    setHintVisible(false);
    setAnswerBox('');
    setCharCount(0);
    clearTranscript();
    setFbVisible(false);
    setFbContent('');
    setSubmitDisabled(false);
    setNextVisible(false);
    // ── NEW: reset follow-up for each question ─────────────
    setShowFollowUp(false);
    setFollowUpQuestion('');
    setFollowUpAnswer('');
    setFollowUpSubmitted(false);
    const pct = Math.round((idx / st.totalQ) * 100);
    setProgPct(pct);
    setProgLabel(`Q ${idx + 1}/${st.totalQ}`);
    isListenRef.current = false;
    setIsListening(false);
    setRecVisible(false);
    animateWave(false);
    try { recognRef.current?.stop(); } catch (e) { }
    recognRef.current = null;
    startTimer(120);
  };

  // ── Submit answer ─────────────────────────────────────────────────────────
  const submitAnswer = async (auto = false) => {
    clearInterval(timerRef.current);
    if (isListenRef.current) {
      isListenRef.current = false;
      setIsListening(false);
      setRecVisible(false);
      animateWave(false);
      try { recognRef.current?.stop(); } catch (e) { }
    }

    const combinedAnswer = (transcript.final + ' ' + answerBox).trim();
    if (!combinedAnswer && !auto) { showToast('Please speak or type your answer first.', 'err'); return; }

    setSubmitDisabled(true);
    setFbVisible(true);
    setFbContent(`<div class="loading-indicator"><div class="spinner"></div><span>Analysing your answer…</span></div>`);

    const st = SRef.current;
    const evalPrompt = `Interview question: "${st.questions[st.currentQ]?.q}"\nCandidate answer: "${combinedAnswer || '(no answer)'}"\nDifficulty: ${st.difficulty}\n\nEvaluate and return ONLY JSON:\n{"score":0-100,"clarity":0-100,"relevance":0-100,"depth":0-100,"communication":0-100,"strengths":"2 sentences","improvement":"2 sentences","commErrors":[{"type":"grammar|filler|unclear|pacing","original":"exact phrase","correction":"fixed version","explanation":"why"}],"modelAnswer":"3-4 sentence model answer","suggestion":"1 actionable tip"}`;

    try {
      const raw = await callClaude(evalPrompt, 'Return only valid JSON, nothing else.');
      const fb = JSON.parse(raw.replace(/```json|```/g, '').trim());
      fb.score = Math.max(0, Math.min(100, fb.score));

      const newAnswers = [...st.answers]; newAnswers[st.currentQ] = combinedAnswer;
      const newTranscripts = [...st.transcripts]; newTranscripts[st.currentQ] = transcript.final;
      const newFeedbacks = [...st.feedbacks]; newFeedbacks[st.currentQ] = fb;
      const newScores = [...st.scores]; newScores[st.currentQ] = fb.score;
      updateS({ answers: newAnswers, transcripts: newTranscripts, feedbacks: newFeedbacks, scores: newScores });

      setFbContent(renderFeedback(fb));
      setNextVisible(true);

      // ── NEW: Generate follow-up question ─────────────────
      try {
        const fuPrompt = `The candidate just answered this interview question: "${st.questions[st.currentQ]?.q}"
Their answer was: "${combinedAnswer}"
Ask ONE natural follow-up question that a real interviewer would ask to dig deeper.
Return only the question text, nothing else.`;
        const fuQ = await callClaude(fuPrompt);
        setFollowUpQuestion(fuQ.trim());
        setShowFollowUp(true);
      } catch { /* follow-up is optional, silently skip */ }
    } catch (e) {
      setFbContent('<p style="color:var(--danger)">Failed to analyse. Please try again.</p>');
      setSubmitDisabled(false);
    }
  };

  const renderFeedback = (fb) => {
    const scoreColor = (v) => v >= 75 ? 'var(--accent3)' : v >= 50 ? 'var(--warn)' : 'var(--danger)';
    const chips = [
      { label: 'Overall', val: fb.score },
      { label: 'Clarity', val: fb.clarity },
      { label: 'Relevance', val: fb.relevance },
      { label: 'Depth', val: fb.depth },
      { label: 'Comm', val: fb.communication },
    ].map(c => `<div class="sc-chip" style="background:${scoreColor(c.val)}18;border:1px solid ${scoreColor(c.val)}33">
      <span class="sc-lbl">${c.label}</span><span class="sc-val" style="color:${scoreColor(c.val)}">${c.val}</span>
    </div>`).join('');

    const errHtml = fb.commErrors?.length
      ? fb.commErrors.map(e => `<div class="err-item err-${e.type}">
          <div class="err-type-tag">${e.type}</div>
          ${e.original ? `<div class="err-orig">"${e.original}"</div>` : ''}
          <div class="err-fix">→ ${e.correction}</div>
          <div class="err-why">${e.explanation}</div>
        </div>`).join('')
      : '<div class="no-errors">✅ No communication errors detected</div>';

    return `
      <div class="score-row">${chips}</div>
      <div class="two-col">
        <div class="mini-card" style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.2)">
          <div class="mini-lbl" style="color:var(--accent3)">✅ Strengths</div>
          <div class="mini-text">${fb.strengths}</div>
        </div>
        <div class="mini-card" style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.2)">
          <div class="mini-lbl" style="color:var(--warn)">📈 Improve</div>
          <div class="mini-text">${fb.improvement}</div>
        </div>
      </div>
      <div class="comm-section">
        <div class="comm-title">🗣️ Communication Analysis</div>
        <div class="err-list">${errHtml}</div>
      </div>
      <div class="model-box">
        <div class="model-lbl">💡 Model Answer</div>
        <div class="model-text">${fb.modelAnswer}</div>
        <button class="speak-btn" onclick="window.__speakModelAnswer && window.__speakModelAnswer()">🔊 Read aloud</button>
      </div>
      <div class="tip-box">
        <div class="tip-lbl">💡 Coach's Top Tip</div>
        <div class="tip-text">${fb.suggestion}</div>
      </div>`;
  };

  useEffect(() => {
    window.__speakModelAnswer = () => {
      const st = SRef.current;
      const fb = st.feedbacks[st.currentQ];
      if (fb?.modelAnswer) speakText(fb.modelAnswer);
    };
    return () => { delete window.__speakModelAnswer; };
  });

  // ── Navigation ────────────────────────────────────────────────────────────
  const nextQuestion = () => {
    const st = SRef.current;
    const next = st.currentQ + 1;
    if (next >= st.totalQ) { showResults(); }
    else {
      updateS({ currentQ: next });
      SRef.current = { ...SRef.current, currentQ: next };
      loadQuestion(next);
      if (st.mode === 'voice' && st.ttsOK) setTimeout(speakQuestion, 500);
    }
  };

  const skipQuestion = () => {
    clearInterval(timerRef.current);
    isListenRef.current = false; setIsListening(false);
    try { recognRef.current?.stop(); } catch (e) { }
    const st = SRef.current;
    const next = st.currentQ + 1;
    updateS({ currentQ: next });
    SRef.current = { ...SRef.current, currentQ: next };
    if (next >= st.totalQ) { showResults(); }
    else {
      loadQuestion(next);
      if (st.mode === 'voice' && st.ttsOK) setTimeout(speakQuestion, 500);
    }
  };

  // ── Results ───────────────────────────────────────────────────────────────
  const showResults = async () => {
    clearInterval(timerRef.current);
    setScreen('results');
    window.scrollTo(0, 0);
    const st = SRef.current;
    const avg = st.scores.length ? Math.round(st.scores.reduce((a, b) => a + (b || 0), 0) / st.totalQ) : 0;
    setOverallScore(avg + '%');
    setVerdict(avg >= 85 ? '🏆 Outstanding' : avg >= 70 ? '✅ Strong Candidate' : avg >= 55 ? '📈 Promising — Keep Practicing' : '💪 Needs More Prep');

    const allFb = st.feedbacks.filter(Boolean);
    const avg4 = (k) => allFb.length ? Math.round(allFb.reduce((a, f) => a + (f[k] || 0), 0) / allFb.length) : 0;
    const metrics = [
      { label: 'Clarity', val: avg4('clarity'), color: '#00d4ff' },
      { label: 'Relevance', val: avg4('relevance'), color: '#a78bfa' },
      { label: 'Depth', val: avg4('depth'), color: '#10b981' },
      { label: 'Communication', val: avg4('communication'), color: '#f59e0b' },
    ];
    setMetricsHtml(metrics.map(m => `<div class="m-card">
      <div class="m-lbl">${m.label}</div>
      <div class="m-val" style="color:${m.color}">${m.val}</div>
      <div class="m-bar"><div class="m-fill" style="width:${m.val}%;background:${m.color}"></div></div>
    </div>`).join(''));

    setReviewHtml(st.questions.map((q, i) => {
      const sc = st.scores[i] || 0;
      const c = sc >= 75 ? 'var(--accent3)' : sc >= 50 ? 'var(--warn)' : 'var(--danger)';
      const fb = st.feedbacks[i];
      const errs = fb?.commErrors?.length || 0;
      return `<div class="ri">
        <span class="ri-sc" style="background:${c}22;color:${c};border:1px solid ${c}44">${sc}/100</span>
        <span class="ri-sc" style="${errs > 0 ? 'background:rgba(239,68,68,0.1);color:var(--danger);border:1px solid rgba(239,68,68,0.25)' : 'background:rgba(16,185,129,0.1);color:var(--accent3);border:1px solid rgba(16,185,129,0.25)'}">${errs > 0 ? errs + ' error' + (errs > 1 ? 's' : '') : '✓ Clean'}</span>
        <div class="ri-q">${i + 1}. ${q.q}</div>
        <div class="ri-a"><strong style="color:var(--text-muted)">You said:</strong> ${st.answers[i] ? st.answers[i].substring(0, 180) + (st.answers[i].length > 180 ? '…' : '') : '<em>Skipped</em>'}</div>
        ${fb?.commErrors?.length ? `<div class="ri-err"><strong style="color:var(--danger)">Issues:</strong> ${fb.commErrors.map(e => (e.original ? '"' + e.original + '"' : '') + ' → ' + e.correction).join(' • ')}</div>` : ''}
        ${fb?.modelAnswer ? `<div class="ri-model"><strong>Model:</strong> ${fb.modelAnswer.substring(0, 180)}…</div>` : ''}
      </div>`;
    }).join(''));

    // Save session to backend
    try {
      const saved = await apiFetch('/sessions', {
        method: 'POST',
        body: JSON.stringify({
          interviewType: st.interviewType, difficulty: st.difficulty,
          role: st.role, mode: st.mode, totalQ: st.totalQ,
          overallScore: avg, questions: st.questions.map(q => q.q),
          answers: st.answers, scores: st.scores, feedbacks: st.feedbacks,
          persona,
          generatedFrom: resumeText ? 'resume' : jdText ? 'jobDescription' : 'default',
        }),
      }, token);
      // ── NEW: Show streak notification ─────────────────────
      if (saved?.streak) {
        setStreakInfo(saved.streak);
      }
    } catch (e) {
      console.warn('Could not save session:', e.message);
    }

    // Personalised tips
    const totalErrors = st.feedbacks.filter(Boolean).reduce((a, f) => a + (f.commErrors?.length || 0), 0);
    const tp = `Based on a ${st.difficulty} ${st.interviewType} interview scoring ${avg}% with ${totalErrors} total communication errors, give 4 personalised improvement tips. ONLY JSON array: [{"icon":"emoji","tip":"2 clear sentences"},...]`;
    try {
      const raw = await callClaude(tp, 'Return only valid JSON arrays, nothing else.');
      const tips = JSON.parse(raw.replace(/```json|```/g, '').trim());
      setTipsHtml(tips.map(t => `<div class="tip-item"><div class="tip-icon">${t.icon}</div><p>${t.tip}</p></div>`).join(''));
    } catch {
      setTipsHtml(`
        <div class="tip-item"><div class="tip-icon">🎤</div><p>Record yourself answering questions daily and listen back to catch filler words.</p></div>
        <div class="tip-item"><div class="tip-icon">⭐</div><p>Use the STAR method: Situation, Task, Action, Result for every behavioral answer.</p></div>
        <div class="tip-item"><div class="tip-icon">🔢</div><p>Quantify achievements. "I reduced load time by 40%" beats "I made things faster".</p></div>
        <div class="tip-item"><div class="tip-icon">⏸️</div><p>Replace filler words with confident pauses — a 2-second pause signals confidence.</p></div>`);
    }
  };

  const restart = () => {
    clearInterval(timerRef.current);
    isListenRef.current = false;
    setIsListening(false);
    try { recognRef.current?.stop(); } catch (e) { }
    window.speechSynthesis?.cancel();
    animateWave(false);
    setStartDisabled(false);
    setStartBtnText(mode === 'voice' ? '🎙️ Start Voice Interview →' : '⌨️ Start Text Interview →');
    setScreen('home');
    updateS(initState());
    // ── NEW: reset follow-up and streak state ─────────────
    setShowFollowUp(false);
    setFollowUpQuestion('');
    setFollowUpAnswer('');
    setFollowUpSubmitted(false);
    setStreakInfo(null);
  };

  const handleModeChange = (m) => {
    setMode(m);
    setStartBtnText(m === 'voice' ? '🎙️ Start Voice Interview →' : '⌨️ Start Text Interview →');
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Overlay */}
      {!overlayHidden && (
        <div id="overlay">
          <div className="ov-logo">InterviewAI</div>
          <div className="ov-bar"><div className="ov-fill" /></div>
          <div className="ov-msg">Initialising voice systems…</div>
        </div>
      )}

      {/* Toast */}
      {toast.visible && (
        <div className={`toast toast-${toast.type} visible`}>{toast.msg}</div>
      )}

      <div id="app">
        {/* Header */}
        <header>
          <div className="logo">Interview<span>AI</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {user && (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                👤 {user.name}
              </span>
            )}
            {/* ── NEW: Dashboard button ── */}
            <button
              onClick={() => navigate('/dashboard')}
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '0.7rem', padding: '5px 12px', cursor: 'pointer', fontFamily: "'Space Mono', monospace" }}
            >
              📊 Dashboard
            </button>
            <div className={micBadge.cls} id="micBadge">
              {micBadge.cls.includes('ok') && <div className="dot" />}
              <span>{micBadge.text}</span>
            </div>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-muted)', fontSize: '0.7rem', padding: '5px 12px', cursor: 'pointer', fontFamily: "'Space Mono', monospace" }}
            >
              Sign out
            </button>
          </div>
        </header>

        {/* ── HOME ── */}
        {screen === 'home' && (
          <div className="screen active" id="home">
            <div style={{ maxWidth: '920px', margin: '0 auto', padding: '60px 40px' }}>
              <div className="hero-tag">🎙️ Voice-Powered AI Coach</div>
              <h1 className="hero-title">Speak Your Way<br />to <span className="hl">Interview Success</span></h1>
              <p className="hero-sub">Answer out loud — our AI listens, transcribes in real-time, catches every grammar mistake and filler word, corrects your speech, and shows you the perfect model answer instantly.</p>
              <div className="pills">
                <div className="pill">🎙️ Live Voice Recognition</div>
                <div className="pill">📝 Real-time Transcription</div>
                <div className="pill">❌ Grammar Error Detection</div>
                <div className="pill">🚫 Filler Word Alerts</div>
                <div className="pill">✅ Model Answers</div>
                <div className="pill">🔊 AI Reads Questions</div>
                <div className="pill">📊 Communication Score</div>
              </div>
              <div className="setup-card">
                <h2>Configure Your Session</h2>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Interview Type</label>
                    <select value={interviewType} onChange={e => setInterviewType(e.target.value)}>
                      <option value="software">Software Engineering</option>
                      <option value="behavioral">Behavioral / HR</option>
                      <option value="product">Product Management</option>
                      <option value="data">Data Science / ML</option>
                      <option value="design">UX / Product Design</option>
                      <option value="leadership">Leadership / Management</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Number of Questions</label>
                    <select value={numQ} onChange={e => setNumQ(Number(e.target.value))}>
                      <option value={3}>3 — Quick Drill</option>
                      <option value={5}>5 — Standard</option>
                      <option value={8}>8 — Full Round</option>
                      <option value={10}>10 — Marathon</option>
                    </select>
                  </div>
                  <div className="form-group full">
                    <label>Target Role (optional)</label>
                    <input type="text" placeholder="e.g. Senior Frontend Engineer at Google" value={targetRole} onChange={e => setTargetRole(e.target.value)} />
                  </div>
                  <div className="form-group full">
                    <label>Difficulty</label>
                    <div className="diff-row">
                      {['Junior', 'Mid-level', 'Senior'].map((d, i) => (
                        <button key={d} className={`diff-btn${i === 1 ? ' mid' : i === 2 ? ' hard' : ''}${difficulty === d ? ' active' : ''}`} onClick={() => setDifficulty(d)}>
                          {i === 0 ? '🌱' : i === 1 ? '⚡' : '🔥'} {d}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="form-group full">
                    <label>Answer Mode</label>
                    <div className="mode-row">
                      <button className={`mode-opt${mode === 'voice' ? ' active' : ''}`} onClick={() => handleModeChange('voice')}>🎙️ Voice (Recommended)</button>
                      <button className={`mode-opt${mode === 'text' ? ' active' : ''}`} onClick={() => handleModeChange('text')}>⌨️ Text Only</button>
                    </div>
                  </div>
                  <div className="form-group full">
                    <label>Your Background (optional)</label>
                    <textarea placeholder="Describe your experience or skills…" value={userBg} onChange={e => setUserBg(e.target.value)} />
                  </div>

                  {/* ── NEW: Interviewer Persona ── */}
                  <div className="form-group full">
                    <label>Interviewer Persona</label>
                    <div className="mode-row">
                      {[['friendly', '😊 Friendly'], ['aggressive', '🔥 Aggressive'], ['formal', '🎩 Formal']].map(([p, label]) => (
                        <button key={p} className={`mode-opt${persona === p ? ' active' : ''}`} onClick={() => setPersona(p)}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ── NEW: Resume Upload ── */}
                  <div className="form-group full">
                    <label>Resume — AI tailors questions to your experience (optional)</label>
                    {resumeUploaded ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--accent3)' }}>✅ Resume loaded</span>
                        <button className="hint-btn" onClick={handleRemoveResume}>✕ Remove</button>
                      </div>
                    ) : (
                      <input
                        type="file"
                        accept=".pdf,.txt"
                        onChange={handleResumeUpload}
                        style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}
                      />
                    )}
                  </div>

                  {/* ── NEW: Job Description paste ── */}
                  <div className="form-group full">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <label style={{ marginBottom: 0 }}>Job Description — paste from LinkedIn/Naukri (optional)</label>
                      <button className="hint-btn" onClick={() => setJdExpanded(v => !v)}>
                        {jdExpanded ? '▲ Hide' : '▼ Paste JD'}
                      </button>
                    </div>
                    {jdExpanded && (
                      <textarea
                        placeholder="Paste the job description here — Claude will generate questions matching this exact role…"
                        value={jdText}
                        onChange={e => setJdText(e.target.value)}
                        style={{ minHeight: 100 }}
                      />
                    )}
                    {jdText && !jdExpanded && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--accent3)' }}>✅ JD loaded ({jdText.length} chars)</span>
                    )}
                  </div>
                </div>
                <button className="start-btn" disabled={startDisabled} onClick={startInterview}>{startBtnText}</button>
              </div>
            </div>
          </div>
        )}

        {/* ── INTERVIEW ── */}
        {screen === 'interview' && (
          <div className="screen active" id="interview">
            <div className="int-hdr">
              <div className="badges">
                <span className="badge bt">{typeBadge}</span>
                <span className="badge bd">{diffBadge}</span>
              </div>
              <div className="prog-wrap">
                <div className="prog-info">
                  <span>{progLabel}</span>
                  <span>{progPct}%</span>
                </div>
                <div className="prog-bar"><div className="prog-fill" style={{ width: progPct + '%' }} /></div>
              </div>
              <div className={`timer-box${timerClass ? ' ' + timerClass : ''}`}>{timerDisplay}</div>
            </div>

            <div className="q-card">
              <div className="q-label">
                <span>Question {SRef.current.currentQ + 1}</span>
                <button className="speak-q" onClick={speakQuestion}>🔊 Read Aloud</button>
              </div>
              <div className="q-text">{qText}</div>
              {hintVisible && <div className="q-hint visible">{qHint}</div>}
            </div>

            <div className="voice-panel">
              <div className="vp-top">
                <h3>🎙️ Speak Your Answer</h3>
                <div className="vp-controls">
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{micLabel}</span>
                  <button className={`mic-btn ${isListening ? 'listening' : 'idle'}`} onClick={toggleMic}>{isListening ? '⏹' : '🎤'}</button>
                </div>
              </div>

              <div className="waveform">
                {Array.from({ length: 38 }).map((_, i) => (
                  <div key={i} ref={el => waveBarRefs.current[i] = el} className="wb" style={{ height: '4px', flex: 1 }} />
                ))}
              </div>

              <div className="transcript-box">
                {transcript.final || transcript.interim
                  ? <><span className="tr-final">{transcript.final}</span><span className="tr-interim">{transcript.interim}</span></>
                  : <span className="tr-placeholder">Your spoken answer will appear here in real-time…</span>}
              </div>
              <div className="transcript-meta">
                <div className="rec-dot-wrap" style={{ display: recVisible ? 'flex' : 'none', alignItems: 'center', gap: '5px' }}>
                  <div className="rec-dot" />
                  <span>Recording…</span>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: '0.67rem', color: 'var(--text-muted)' }}>{wordCount} words</span>
              </div>

              <div className="text-fallback">
                <div className="tf-label">
                  <label style={{ fontSize: '0.67rem', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>Type answer (or use mic above)</label>
                  <button className="hint-btn" onClick={toggleHint}>💡 Hint</button>
                </div>
                <textarea id="answerBox" placeholder="Type here, or speak above — both are combined for analysis…" value={answerBox} onChange={e => { setAnswerBox(e.target.value); setCharCount(e.target.value.length); }} />
                <div className="char-count">{charCount} characters</div>
              </div>
            </div>

            <div className="action-bar">
              <button className="btn btn-primary" disabled={submitDisabled} onClick={() => submitAnswer(false)}>✓ Submit &amp; Analyse</button>
              {nextVisible && <button className="btn btn-sec" onClick={nextQuestion}>Next →</button>}
              <button className="btn btn-sec" onClick={clearTranscript}>🗑 Clear</button>
              <button className="btn btn-sec" onClick={skipQuestion}>Skip</button>
            </div>

            {fbVisible && (
              <div className="fb-panel visible">
                <div className="fb-title">🤖 AI Communication Analysis</div>
                <div dangerouslySetInnerHTML={{ __html: fbContent }} />
              </div>
            )}

            {/* ── NEW: Follow-up question panel ── */}
            {showFollowUp && (
              <div className="q-card" style={{ marginTop: 16, borderColor: 'rgba(124,58,237,0.3)' }}>
                <div className="q-label">
                  <span>🔄 Follow-up Question</span>
                  <span style={{ fontSize: '0.6rem', color: 'var(--accent2)' }}>Dig deeper</span>
                </div>
                <div className="q-text" style={{ fontSize: '1rem' }}>{followUpQuestion}</div>
                {!followUpSubmitted ? (
                  <div style={{ marginTop: 14 }}>
                    <textarea
                      placeholder="Answer the follow-up (optional)…"
                      value={followUpAnswer}
                      onChange={e => setFollowUpAnswer(e.target.value)}
                      style={{ width: '100%', minHeight: 70, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', padding: 12, fontFamily: "'Space Mono', monospace", fontSize: '0.82rem', resize: 'vertical' }}
                    />
                    <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                      <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setFollowUpSubmitted(true)}>
                        ✓ Submit Follow-up
                      </button>
                      <button className="btn btn-sec" onClick={() => setShowFollowUp(false)}>
                        Skip
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, fontSize: '0.78rem', color: 'var(--accent3)' }}>
                    ✅ Follow-up answer recorded
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── RESULTS ── */}
        {screen === 'results' && (
          <div className="screen active" id="results">
            <div className="res-hero">
              <div className="big-score">{overallScore}</div>
              <div className="score-sub">Overall Score</div>
              <div className="verdict">{verdict}</div>
            </div>

            {/* ── NEW: Streak notification ── */}
            {streakInfo && (
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, padding: '16px 22px', marginBottom: 22, display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: '1.8rem' }}>🔥</span>
                <div>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: 'var(--warn)' }}>
                    {streakInfo.current === 1 ? 'Practice streak started!' : `${streakInfo.current}-day streak! Keep it up!`}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 3 }}>
                    Longest streak: {streakInfo.longest} days · Come back tomorrow to continue
                  </div>
                </div>
                <button className="btn btn-sec" style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }} onClick={() => navigate('/dashboard')}>
                  📊 View Progress
                </button>
              </div>
            )}
            <div className="metrics-grid" dangerouslySetInnerHTML={{ __html: metricsHtml }} />
            <div className="review-section">
              <h2>📋 Full Session Review</h2>
              <div dangerouslySetInnerHTML={{ __html: reviewHtml }} />
            </div>
            <div className="tips-section">
              <h2>🎯 Personalised Improvement Plan</h2>
              <div dangerouslySetInnerHTML={{ __html: tipsHtml }} />
            </div>
            <button className="restart-btn" onClick={restart}>↩ Start New Session</button>
          </div>
        )}
      </div>
    </>
  );
}