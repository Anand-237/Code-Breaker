import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import api from '../api/axios'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import RealtimeTimer from '../components/RealtimeTimer'

export default function Round2Page() {
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()

  const storageKeyAnswers = user?._id ? `cb_r2_answers_${user._id}` : null
  const storageKeyIdx = user?._id ? `cb_r2_idx_${user._id}` : null
  const storageKeyLang = user?._id ? `cb_r2_lang_${user._id}` : null

  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState(() => {
    if (user?._id) {
      try {
        const saved = localStorage.getItem(`cb_r2_answers_${user._id}`)
        if (saved) return JSON.parse(saved)
      } catch (_) {}
    }
    return {}
  })
  const [currentIdx, setCurrentIdx] = useState(() => {
    if (user?._id) {
      try {
        const saved = localStorage.getItem(`cb_r2_idx_${user._id}`)
        if (saved !== null) return Number(saved)
      } catch (_) {}
    }
    return 0
  })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [finalScore, setFinalScore] = useState(0)
  const [roundCtrl, setRoundCtrl] = useState(null)
  const [error, setError] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [selectedLang, setSelectedLang] = useState(() => {
    if (user?._id) {
      try {
        const saved = localStorage.getItem(`cb_r2_lang_${user._id}`)
        if (saved) return saved
      } catch (_) {}
    }
    return 'java'
  })

  const startTimeRef = useRef(Date.now())

  useEffect(() => {
    if (storageKeyAnswers) {
      localStorage.setItem(storageKeyAnswers, JSON.stringify(answers))
    }
  }, [answers, storageKeyAnswers])

  useEffect(() => {
    if (storageKeyIdx) {
      localStorage.setItem(storageKeyIdx, String(currentIdx))
    }
  }, [currentIdx, storageKeyIdx])

  useEffect(() => {
    if (storageKeyLang) {
      localStorage.setItem(storageKeyLang, selectedLang)
    }
  }, [selectedLang, storageKeyLang])

  useEffect(() => {
    api
      .get('/rounds/round2/questions')
      .then(({ data }) => {
        setQuestions(data.questions || [])
        if (data.roundControl) setRoundCtrl(data.roundControl)
        setLoading(false)
      })
      .catch((err) => {
        console.error('[ROUND 2] fetch error:', err)
        const msg = err.response?.data?.message
        if (err.response?.status === 403) {
          setError(msg || 'Round 2 is locked Wait for a moment')
        } else if (err.response?.status === 409) {
          toast.info('Already submitted Round 2!')
          navigate('/')
        } else {
          setError(msg || 'UNABLE TO LOAD ROUND 2')
        }
        setLoading(false)
      })
  }, [navigate, toast])

  const setAnswer = (qId, val) => setAnswers((prev) => ({ ...prev, [qId]: val }))

  const handleSubmit = async () => {
    setShowConfirm(false)
    setSubmitting(true)
    try {
      const payload = questions.map((q) => ({
        questionId: q._id,
        submittedOutput: answers[q._id] ?? '',
        timeTakenSeconds: Math.floor((Date.now() - startTimeRef.current) / 1000),
      }))
      const { data } = await api.post('/rounds/round2/submit', { answers: payload })
      if (storageKeyAnswers) localStorage.removeItem(storageKeyAnswers)
      if (storageKeyIdx) localStorage.removeItem(storageKeyIdx)
      if (storageKeyLang) localStorage.removeItem(storageKeyLang)
      setFinalScore(data.totalScore ?? 0)
      setSubmitted(true)
    } catch (err) {
      if (err.response?.status === 409) {
        if (storageKeyAnswers) localStorage.removeItem(storageKeyAnswers)
        if (storageKeyIdx) localStorage.removeItem(storageKeyIdx)
        if (storageKeyLang) localStorage.removeItem(storageKeyLang)
        toast.info('Already submitted!')
        navigate('/')
      } else {
        toast.error(err.response?.data?.message || 'Submission failed')
        setSubmitting(false)
      }
    }
  }

  if (loading) return <LoadingView label="ROUND 2 (INTERMEDIATE)" />
  if (error) return <ErrorView error={error} onBack={() => navigate('/')} />

  if (submitted)
    return (
      <div className="page success-screen round-page-centered">
        
        <h1
          className="display-title"
          style={{
            fontSize: 'clamp(1.8rem, 5vw, 2.5rem)',
            background: 'linear-gradient(135deg, var(--amber-warn), #fde047)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          ROUND 2 COMPLETED
        </h1>
        <p style={{ fontFamily: 'var(--font-heading)', fontSize: '0.8rem', letterSpacing: '0.2em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
          Intermediate Round — 10 Questions
        </p>
        <div className="card card-glow" style={{ padding: '28px 36px', textAlign: 'center', width: 'min(100%, 420px)' }}>
          <p style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem', color: '#4ade80', marginBottom: '8px', textTransform: 'uppercase' }}>
            ✓ SUBMITTED SUCCESSFULLY
          </p>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginTop: '8px', lineHeight: 1.5 }}>
            Your responses for Round 2 have been recorded. Proceed to Round 3 to continue.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/')}>
            ← RETURN TO DASHBOARD
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/round/3')} style={{ background: 'var(--amber-warn)', color: '#000', border: 'none' }}>
            PROCEED TO ROUND 3 →
          </button>
        </div>
      </div>
    )

  if (questions.length === 0)
    return (
      <div className="page round-page-centered">
        <div className="card" style={{ textAlign: 'center', padding: '36px 24px', width: 'min(100%, 440px)' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', marginBottom: '8px' }}>NO ACTIVE QUESTIONS</h3>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>No active questions available for Round 2 at this moment.</p>
          <button className="btn btn-secondary" style={{ marginTop: '20px' }} onClick={() => navigate('/')}>
            ← Return to Dashboard
          </button>
        </div>
      </div>
    )

  const q = questions[currentIdx] || {}

  const currentCode = selectedLang === 'python'
    ? (q.python?.code || q.codeSnippetPython || q.codeSnippet || q.questionText || '')
    : (q.java?.code || q.codeSnippet || q.questionText || '')
  const currentLang = selectedLang === 'python' ? 'python' : 'java'

  return (
    <div className="page round-page-wrapper">
      {/* Header */}
      <header className="round-header">
        <div className="round-header-title">
          <p className="round-tag">ROUND 2</p>
          <h1 className="round-title">INTERMEDIATE (3 MARKS EACH)</h1>
        </div>
        <div className="round-header-timer">
          {roundCtrl ? (
            <RealtimeTimer
              unlockedAt={roundCtrl.unlockedAt}
              durationMinutes={roundCtrl.durationMinutes}
              initialSeconds={roundCtrl.timeRemainingSeconds}
              onExpire={() => {
                toast.warning('TIME EXPIRED! Submitting Round 2 automatically...')
                handleSubmit()
              }}
              label="ROUND TIME REMAINING"
            />
          ) : (
            <RealtimeTimer label="ROUND TIME REMAINING" />
          )}
        </div>
        <div className="round-header-actions">
          <span className="badge badge-amber">
            Q {currentIdx + 1} / {questions.length}
          </span>
          {user && (
            <div className="round-username-display">
              <p style={{ fontFamily: 'var(--font-heading)', fontSize: '0.82rem', color: 'var(--text-primary)', margin: 0 }}>
                {user?.teamName || user?.name || user?.username}
              </p>
            </div>
          )}
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/')}>
            ← Exit
          </button>
        </div>
      </header>

      <div className="progress-bar" style={{ borderRadius: 0, height: '3px' }}>
        <div className="progress-bar-fill" style={{ width: `${((currentIdx + 1) / questions.length) * 100}%`, background: 'var(--amber-warn)' }} />
      </div>

      {/* Main content */}
      <div className="round-main-container">
        <div className="question-content-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {q.title ? (
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', color: 'var(--text-primary)', letterSpacing: '0.05em', margin: 0 }}>
                {q.title}
              </h2>
            ) : <span />}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--amber-warn)', fontWeight: 700 }}>
              3 MARKS
            </span>
          </div>

          {/* Code Snippet */}
          <div className="code-wrapper">
            <div className="code-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.72rem', color: 'var(--text-dim)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Predict the Code Output:
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className={`btn btn-sm ${selectedLang === 'java' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setSelectedLang('java')}
                  style={{
                    fontSize: '0.72rem',
                    padding: '3px 12px',
                    background: selectedLang === 'java' ? 'var(--amber-warn)' : 'transparent',
                    color: selectedLang === 'java' ? '#000' : 'var(--text-dim)',
                    borderColor: selectedLang === 'java' ? 'var(--amber-warn)' : 'var(--border-subtle)',
                  }}
                >
                  Java
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${selectedLang === 'python' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setSelectedLang('python')}
                  style={{
                    fontSize: '0.72rem',
                    padding: '3px 12px',
                    background: selectedLang === 'python' ? 'var(--amber-warn)' : 'transparent',
                    color: selectedLang === 'python' ? '#000' : 'var(--text-dim)',
                    borderColor: selectedLang === 'python' ? 'var(--amber-warn)' : 'var(--border-subtle)',
                  }}
                >
                  Python
                </button>
              </div>
            </div>
            <SyntaxHighlighter
              language={currentLang}
              style={vscDarkPlus}
              customStyle={{ margin: 0, padding: '16px 20px', background: '#0d0d0d', fontSize: '0.88rem', lineHeight: 1.6 }}
            >
              {currentCode}
            </SyntaxHighlighter>
          </div>

          {/* Answer input */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Your predicted output</label>
            <textarea
              id={`output-answer-${currentIdx}`}
              className="input code-textarea-input"
              placeholder="Type exact output here (e.g. 120 or 25)"
              value={answers[q._id] || ''}
              onChange={(e) => setAnswer(q._id, e.target.value)}
              disabled={submitting}
              rows={3}
            />
          </div>

          {/* Navigation */}
          <div className="question-nav-bar">
            <button className="btn btn-secondary" onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))} disabled={currentIdx === 0}>
              ← Prev
            </button>
            <div className="question-nav-numbers">
              {questions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIdx(i)}
                  className={`nav-num-btn ${answers[questions[i]._id] ? 'answered' : ''} ${i === currentIdx ? 'active' : ''}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            {currentIdx < questions.length - 1 ? (
              <button className="btn btn-secondary" onClick={() => setCurrentIdx((i) => i + 1)}>
                Next →
              </button>
            ) : (
              <button id="submit-round2" className="btn btn-primary" onClick={() => setShowConfirm(true)} disabled={submitting} style={{ background: 'var(--amber-warn)', color: '#000', border: 'none' }}>
                {submitting ? 'Submitting...' : 'SUBMIT ROUND 2'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Modal */}
      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal responsive-modal">
            <div className="modal-header">
              <h2 className="modal-title">FINAL SUBMISSION (ROUND 2)</h2>
              <button onClick={() => setShowConfirm(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '1.2rem' }}>
                ✕
              </button>
            </div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
              You answered <strong style={{ color: 'var(--text-primary)' }}>{Object.keys(answers).length}</strong> / {questions.length} questions.
            </p>
            <p style={{ color: 'var(--amber-warn)', fontFamily: 'var(--font-heading)', fontSize: '0.82rem', marginBottom: '24px' }}>
              THIS CANNOT BE UNDONE.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" onClick={() => setShowConfirm(false)}>
                CANCEL
              </button>
              <button id="confirm-submit-round2" className="btn btn-primary" onClick={handleSubmit} style={{ background: 'var(--amber-warn)', color: '#000', border: 'none' }}>
                CONFIRM SUBMISSION
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function LoadingView({ label }) {
  return (
    <div className="page round-page-centered">
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 16px' }} />
        <p style={{ fontFamily: 'var(--font-heading)', letterSpacing: '0.2em', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
          LOADING {label}...
        </p>
      </div>
    </div>
  )
}

function ErrorView({ error, onBack }) {
  return (
    <div className="page round-page-centered">
      <div className="card card-glow round-error-card" style={{ textAlign: 'center', padding: '36px 28px' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', color: 'var(--amber-warn)', marginBottom: '12px', letterSpacing: '0.1em' }}>
          ROUND LOCKED
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '1.05rem', lineHeight: '1.5' }}>{error}</p>
        <button className="btn btn-secondary" onClick={onBack}>
          ← RETURN TO DASHBOARD
        </button>
      </div>
    </div>
  )
}
