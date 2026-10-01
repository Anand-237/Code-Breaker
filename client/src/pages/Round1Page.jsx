import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import RealtimeTimer from '../components/RealtimeTimer'

const LETTERS = ['A', 'B', 'C', 'D']

export default function Round1Page() {
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()

  const storageKeyAnswers = user?._id ? `cb_r1_answers_${user._id}` : null
  const storageKeyIdx = user?._id ? `cb_r1_idx_${user._id}` : null

  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState(() => {
    if (user?._id) {
      try {
        const saved = localStorage.getItem(`cb_r1_answers_${user._id}`)
        if (saved) return JSON.parse(saved)
      } catch (_) {}
    }
    return {}
  })
  const [currentIdx, setCurrentIdx] = useState(() => {
    if (user?._id) {
      try {
        const saved = localStorage.getItem(`cb_r1_idx_${user._id}`)
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
    const fetchQuestions = async () => {
      try {
        const { data } = await api.get('/rounds/round1/questions')
        console.log('[ROUND 1] questions response:', data)
        setQuestions(data.questions || [])
        if (data.roundControl) setRoundCtrl(data.roundControl)
        setLoading(false)
      } catch (err) {
        console.error('[ROUND 1] fetch error:', err)
        const msg = err.response?.data?.message || 'Failed to load questions'
        if (err.response?.status === 401) {
          setError('SESSION EXPIRED. Please login again.')
        } else if (err.response?.status === 403) {
          setError(msg || 'Round 1 is locked Wait for a moment')
        } else if (err.response?.status === 409) {
          toast.info('You already submitted Round 1!')
          navigate('/')
        } else {
          setError(msg || 'UNABLE TO LOAD ROUND 1')
        }
        setLoading(false)
      }
    }
    fetchQuestions()
  }, [navigate, toast])

  const selectOption = (questionId, optionIndex) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }))
    if (currentIdx < questions.length - 1) {
      setTimeout(() => {
        setCurrentIdx((prevIdx) => Math.min(questions.length - 1, prevIdx + 1))
      }, 150)
    }
  }

  const handleSubmit = async () => {
    setShowConfirm(false)
    setSubmitting(true)
    try {
      const payload = questions.map((q) => ({
        questionId: q._id,
        selectedOptionIndex: answers[q._id] ?? -1,
        timeTakenSeconds: Math.floor((Date.now() - startTimeRef.current) / 1000),
      }))
      const { data } = await api.post('/rounds/round1/submit', { answers: payload })
      if (storageKeyAnswers) localStorage.removeItem(storageKeyAnswers)
      if (storageKeyIdx) localStorage.removeItem(storageKeyIdx)
      setFinalScore(data.totalScore ?? 0)
      setSubmitted(true)
    } catch (err) {
      const msg = err.response?.data?.message || 'Submission failed'
      if (err.response?.status === 409) {
        if (storageKeyAnswers) localStorage.removeItem(storageKeyAnswers)
        if (storageKeyIdx) localStorage.removeItem(storageKeyIdx)
        toast.info('Already submitted!')
        navigate('/')
      } else {
        toast.error(msg)
        setSubmitting(false)
      }
    }
  }

  const answeredCount = Object.keys(answers).length
  const progress = questions.length ? (currentIdx + 1) / questions.length : 0

  if (loading)
    return (
      <div className="page round-page-centered">
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <p style={{ fontFamily: 'var(--font-heading)', letterSpacing: '0.2em', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
            LOADING ROUND 1 (BASIC)...
          </p>
        </div>
      </div>
    )

  if (error)
    return (
      <div className="page round-page-centered">
        <div className="card card-glow round-error-card">
          
          <h2 style={{ fontFamily: 'var(--font-heading)', color: 'var(--red-bright)', marginBottom: '12px', letterSpacing: '0.1em' }}>
            ACCESS DENIED
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>{error}</p>
          <button className="btn btn-secondary" onClick={() => navigate('/')}>
            ← RETURN TO DASHBOARD
          </button>
        </div>
      </div>
    )

  if (submitted)
    return (
      <div className="page success-screen round-page-centered">
        
        <h1
          className="display-title"
          style={{
            fontSize: 'clamp(1.8rem, 5vw, 2.5rem)',
            background: 'linear-gradient(135deg, var(--red-bright), #ff8080)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          ROUND 1 COMPLETED
        </h1>
        <p style={{ fontFamily: 'var(--font-heading)', fontSize: '0.8rem', letterSpacing: '0.2em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
          Basic Round — 15 Questions
        </p>
        <div className="card card-glow" style={{ padding: '28px 36px', textAlign: 'center', width: 'min(100%, 420px)' }}>
          <p style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem', color: '#4ade80', marginBottom: '8px', textTransform: 'uppercase' }}>
            ✓ SUBMITTED SUCCESSFULLY
          </p>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginTop: '8px', lineHeight: 1.5 }}>
            Your responses for Round 1 have been recorded. Proceed to Round 2 to continue.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/')}>
            ← RETURN TO DASHBOARD
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/round/2')}>
            PROCEED TO ROUND 2 →
          </button>
        </div>
      </div>
    )

  if (!questions || questions.length === 0)
    return (
      <div className="page round-page-centered">
        <div className="card" style={{ textAlign: 'center', padding: '36px 24px', width: 'min(100%, 440px)' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', marginBottom: '8px' }}>NO ACTIVE QUESTIONS</h3>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>No active questions available for Round 1 at this moment.</p>
          <button className="btn btn-secondary" style={{ marginTop: '20px' }} onClick={() => navigate('/')}>
            ← Return to Dashboard
          </button>
        </div>
      </div>
    )

  const currentQ = questions[currentIdx]
  const selectedAnswer = answers[currentQ._id]

  return (
    <div className="page round-page-wrapper">
      {/* ── Header ── */}
      <header className="round-header">
        <div className="round-header-title">
          <p className="round-tag">ROUND 1</p>
          <h1 className="round-title">BASIC (2 MARKS EACH)</h1>
        </div>
        <div className="round-header-timer">
          {roundCtrl ? (
            <RealtimeTimer
              unlockedAt={roundCtrl.unlockedAt}
              durationMinutes={roundCtrl.durationMinutes}
              initialSeconds={roundCtrl.timeRemainingSeconds}
              onExpire={() => {
                toast.warning('TIME EXPIRED! Submitting Round 1 automatically...')
                handleSubmit()
              }}
              label="ROUND TIME REMAINING"
            />
          ) : (
            <RealtimeTimer label="ROUND TIME REMAINING" />
          )}
        </div>
        <div className="round-header-actions">
          <span className="badge badge-red">
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

      {/* ── Progress Bar ── */}
      <div className="progress-bar" style={{ borderRadius: 0, height: '3px' }}>
        <div className="progress-bar-fill" style={{ width: `${progress * 100}%` }} />
      </div>

      {/* ── Question Area ── */}
      <div className="round-main-container">
        <div className="question-content-box">
          {/* Question counter badge & points */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="badge badge-red">
              Question {currentIdx + 1} of {questions.length}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--red-bright)', fontWeight: 700 }}>
              2 MARKS
            </span>
          </div>

          {/* Question text */}
          <div className="card question-card" style={{ padding: '24px' }}>
            <p style={{ fontSize: '1.05rem', lineHeight: 1.6, color: 'var(--text-primary)', margin: 0 }}>
              {currentQ.questionText}
            </p>
          </div>

          {/* Options */}
          <div className="options-wrapper">
            {(currentQ.options || []).map((opt, i) => (
              <button
                key={i}
                id={`option-${currentIdx}-${i}`}
                className={`option-btn${selectedAnswer === i ? ' selected' : ''}`}
                onClick={() => selectOption(currentQ._id, i)}
                disabled={submitting}
              >
                <span className="option-letter">{LETTERS[i]}</span>
                <span className="option-text">{opt}</span>
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="question-nav-bar">
            <button className="btn btn-secondary" onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))} disabled={currentIdx === 0 || submitting}>
              ← Prev
            </button>

            <div className="question-nav-numbers">
              {questions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIdx(idx)}
                  className={`nav-num-btn ${answers[q._id] !== undefined ? 'answered' : ''} ${idx === currentIdx ? 'active' : ''}`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>

            {currentIdx < questions.length - 1 ? (
              <button className="btn btn-secondary" onClick={() => setCurrentIdx((i) => i + 1)} disabled={submitting}>
                Next →
              </button>
            ) : (
              <button id="submit-round1" className="btn btn-primary" onClick={() => setShowConfirm(true)} disabled={submitting}>
                {submitting ? 'Submitting...' : 'SUBMIT ROUND 1'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Confirm Modal ── */}
      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal responsive-modal">
            <div className="modal-header">
              <h2 className="modal-title">FINAL SUBMISSION (ROUND 1)</h2>
              <button onClick={() => setShowConfirm(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '1.2rem' }}>
                ✕
              </button>
            </div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
              You answered <strong style={{ color: 'var(--text-primary)' }}>{answeredCount}</strong> out of{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{questions.length}</strong> questions. Unanswered questions will receive 0 marks.
            </p>
            <p style={{ color: 'var(--red-bright)', fontFamily: 'var(--font-heading)', fontSize: '0.82rem', marginBottom: '24px' }}>
              THIS ACTION CANNOT BE UNDONE.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" onClick={() => setShowConfirm(false)}>
                CANCEL
              </button>
              <button id="confirm-submit-round1" className="btn btn-primary" onClick={handleSubmit}>
                CONFIRM SUBMISSION
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
