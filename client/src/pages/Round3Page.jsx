import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import Editor from '@monaco-editor/react'
import api from '../api/axios'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import RealtimeTimer from '../components/RealtimeTimer'

export default function Round3Page() {
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()

  const storageKeyAnswers = user?._id ? `cb_r3_answers_${user._id}` : null
  const storageKeyLangs = user?._id ? `cb_r3_langs_${user._id}` : null
  const storageKeyIdx = user?._id ? `cb_r3_idx_${user._id}` : null
  const storageKeyRuns = user?._id ? `cb_r3_runs_${user._id}` : null

  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState(() => {
    if (user?._id) {
      try {
        const saved = localStorage.getItem(`cb_r3_answers_${user._id}`)
        if (saved) return JSON.parse(saved)
      } catch (_) {}
    }
    return {}
  })
  const [selectedLangs, setSelectedLangs] = useState(() => {
    if (user?._id) {
      try {
        const saved = localStorage.getItem(`cb_r3_langs_${user._id}`)
        if (saved) return JSON.parse(saved)
      } catch (_) {}
    }
    return {}
  })
  const [currentIdx, setCurrentIdx] = useState(() => {
    if (user?._id) {
      try {
        const saved = localStorage.getItem(`cb_r3_idx_${user._id}`)
        if (saved !== null) return Number(saved)
      } catch (_) {}
    }
    return 0
  })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [finalScore, setFinalScore] = useState(0)
  const [solvedCount, setSolvedCount] = useState(0)
  const [roundCtrl, setRoundCtrl] = useState(null)
  const [error, setError] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [monacoFailed, setMonacoFailed] = useState(false)
  const [runStates, setRunStates] = useState(() => {
    if (user?._id) {
      try {
        const saved = localStorage.getItem(`cb_r3_runs_${user._id}`)
        if (saved) return JSON.parse(saved)
      } catch (_) {}
    }
    return {}
  })

  const startTimeRef = useRef(Date.now())

  useEffect(() => {
    if (storageKeyAnswers) {
      localStorage.setItem(storageKeyAnswers, JSON.stringify(answers))
    }
  }, [answers, storageKeyAnswers])

  useEffect(() => {
    if (storageKeyLangs) {
      localStorage.setItem(storageKeyLangs, JSON.stringify(selectedLangs))
    }
  }, [selectedLangs, storageKeyLangs])

  useEffect(() => {
    if (storageKeyIdx) {
      localStorage.setItem(storageKeyIdx, String(currentIdx))
    }
  }, [currentIdx, storageKeyIdx])

  useEffect(() => {
    if (storageKeyRuns) {
      localStorage.setItem(storageKeyRuns, JSON.stringify(runStates))
    }
  }, [runStates, storageKeyRuns])

  useEffect(() => {
    api
      .get('/rounds/round3/questions')
      .then(({ data }) => {
        setQuestions(data.questions || [])
        if (data.roundControl) setRoundCtrl(data.roundControl)
        setLoading(false)
      })
      .catch((err) => {
        console.error('[ROUND 3] fetch error:', err)
        const msg = err.response?.data?.message
        if (err.response?.status === 403) {
          setError(msg || 'Round 3 is locked Wait for a moment')
        } else if (err.response?.status === 409) {
          toast.info('Already submitted Round 3!')
          navigate('/final-result')
        } else {
          setError(msg || 'UNABLE TO LOAD ROUND 3')
        }
        setLoading(false)
      })
  }, [navigate, toast])

  const getInitialCode = (q, lang) => {
    if (lang === 'java') {
      return q.java?.code || q.codeSnippet || q.buggyCode || ''
    } else {
      return q.python?.code || q.codeSnippetPython || q.buggyCode || ''
    }
  }

  const getCode = (qId, lang) => {
    const qObj = questions.find((item) => item._id === qId)
    if (!qObj) return ''
    return answers[qId]?.[lang] ?? getInitialCode(qObj, lang)
  }

  const setCodeForLang = (qId, lang, newCode) => {
    setAnswers((prev) => ({
      ...prev,
      [qId]: {
        ...(prev[qId] || {}),
        [lang]: newCode,
      },
    }))
  }

  const handleLanguageSelect = (qId, lang) => {
    setSelectedLangs((prev) => ({ ...prev, [qId]: lang }))
  }

  const handleResetCode = (qId, lang) => {
    const qObj = questions.find((q) => q._id === qId)
    if (qObj) {
      const initial = getInitialCode(qObj, lang)
      setCodeForLang(qId, lang, initial)
      toast.info(`Reset ${lang.toUpperCase()} code to initial buggy version`)
    }
  }

  const handleRunCode = async (qId) => {
    const lang = selectedLangs[qId] || 'java'
    const currentCode = getCode(qId, lang)

    setRunStates((prev) => ({
      ...prev,
      [qId]: { ...prev[qId], running: true },
    }))

    try {
      const { data } = await api.post('/rounds/round3/run', {
        questionId: qId,
        code: currentCode,
        selectedLanguage: lang,
      })
      setRunStates((prev) => ({
        ...prev,
        [qId]: { running: false, result: data },
      }))

      if (data.isCorrect) {
        toast.success('MATCH! Code passed test.')
      } else if (data.error) {
        toast.error('Runtime / compilation error while running code.')
      } else {
        toast.warning('Output does not match expected result.')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to execute code')
      setRunStates((prev) => ({
        ...prev,
        [qId]: { running: false, result: { success: false, error: 'Execution request failed' } },
      }))
    }
  }

  const handleSubmit = async () => {
    setShowConfirm(false)
    setSubmitting(true)
    try {
      const payload = questions.map((q) => {
        const lang = selectedLangs[q._id] || 'java'
        const userCode = getCode(q._id, lang)
        return {
          questionId: q._id,
          selectedLanguage: lang,
          correctedCode: userCode,
          timeTakenSeconds: Math.floor((Date.now() - startTimeRef.current) / 1000),
        }
      })
      const { data } = await api.post('/rounds/round3/submit', { answers: payload })
      if (storageKeyAnswers) localStorage.removeItem(storageKeyAnswers)
      if (storageKeyLangs) localStorage.removeItem(storageKeyLangs)
      if (storageKeyIdx) localStorage.removeItem(storageKeyIdx)
      if (storageKeyRuns) localStorage.removeItem(storageKeyRuns)
      setFinalScore(data.totalScore ?? 0)
      const correctCount = data.submission?.answers?.filter((a) => a.isCorrect)?.length ?? 0
      setSolvedCount(correctCount)
      setSubmitted(true)
    } catch (err) {
      if (err.response?.status === 409) {
        if (storageKeyAnswers) localStorage.removeItem(storageKeyAnswers)
        if (storageKeyLangs) localStorage.removeItem(storageKeyLangs)
        if (storageKeyIdx) localStorage.removeItem(storageKeyIdx)
        if (storageKeyRuns) localStorage.removeItem(storageKeyRuns)
        toast.info('Already submitted!')
        navigate('/final-result')
      } else {
        toast.error(err.response?.data?.message || 'Submission failed')
        setSubmitting(false)
      }
    }
  }

  if (loading) return <LoadingView label="ROUND 3 (ADVANCED)" />
  if (error) return <ErrorView error={error} onBack={() => navigate('/')} />

  if (submitted)
    return (
      <div className="page success-screen round-page-centered">
        <h1
          className="display-title"
          style={{
            fontSize: 'clamp(1.8rem, 5vw, 2.5rem)',
            background: 'linear-gradient(135deg, #4ade80, #60a5fa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          ALL ROUNDS COMPLETED!
        </h1>
        <p style={{ fontFamily: 'var(--font-heading)', fontSize: '0.8rem', letterSpacing: '0.2em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
          Concept-Based Debugging Round — 8 Questions
        </p>

        <div className="card card-glow" style={{ padding: '28px 36px', textAlign: 'center', width: 'min(100%, 440px)' }}>
          <p style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem', color: '#4ade80', marginBottom: '8px', textTransform: 'uppercase' }}>
            ✓ ALL ROUNDS SUBMITTED
          </p>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginTop: '8px', lineHeight: 1.5 }}>
            Congratulations! You have submitted all rounds of Code Breakers. Click below to view your Final Score.
          </p>
        </div>

        <button className="btn btn-primary btn-lg" onClick={() => navigate('/final-result')}>
          VIEW FINAL RESULT (/100) →
        </button>
      </div>
    )

  if (questions.length === 0)
    return (
      <div className="page round-page-centered">
        <div className="card" style={{ textAlign: 'center', padding: '36px 24px', width: 'min(100%, 440px)' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', marginBottom: '8px' }}>NO ACTIVE QUESTIONS</h3>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>No active questions available for Round 3 at this moment.</p>
          <button className="btn btn-secondary" style={{ marginTop: '20px' }} onClick={() => navigate('/')}>
            ← Return to Dashboard
          </button>
        </div>
      </div>
    )

  const q = questions[currentIdx] || {}
  const currentLang = selectedLangs[q._id] || 'java'
  const monacoLang = currentLang === 'java' ? 'java' : 'python'
  const buggyCodeToShow = currentLang === 'java'
    ? (q.java?.code || q.codeSnippet || q.buggyCode || '')
    : (q.python?.code || q.codeSnippetPython || q.buggyCode || '')

  const currentRunState = runStates[q._id] || {}
  const runResult = currentRunState.result

  const sampleInput = (currentLang === 'java' ? q.java?.input : q.python?.input) || q.testInput || ''
  const sampleAnswer = (currentLang === 'java' ? q.java?.answer : q.python?.answer) || q.expectedOutput || q.correctOutput || q.correctAnswer || ''

  return (
    <div className="page round-page-wrapper">
      {/* Header */}
      <header className="round-header">
        <div className="round-header-title">
          <p className="round-tag">ROUND 3</p>
          <h1 className="round-title">CONCEPT-BASED DEBUGGING</h1>
        </div>
        <div className="round-header-timer">
          {roundCtrl ? (
            <RealtimeTimer
              unlockedAt={roundCtrl.unlockedAt}
              durationMinutes={roundCtrl.durationMinutes}
              initialSeconds={roundCtrl.timeRemainingSeconds}
              onExpire={() => {
                toast.warning('TIME EXPIRED! Submitting Round 3 automatically...')
                handleSubmit()
              }}
              label="ROUND TIME REMAINING"
            />
          ) : (
            <RealtimeTimer label="ROUND TIME REMAINING" />
          )}
        </div>
        <div className="round-header-actions">
          <span className="badge badge-green">5 MARKS / Q</span>
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

      <div className="progress-bar" style={{ borderRadius: 0, height: '3px' }}>
        <div className="progress-bar-fill" style={{ width: `${((currentIdx + 1) / questions.length) * 100}%`, background: '#4ade80' }} />
      </div>

      {/* Main Container */}
      <div className="round-main-container">
        <div className="question-content-box">
          {/* Buggy code display */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {q.title && (
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', color: 'var(--text-primary)', margin: 0, letterSpacing: '0.05em' }}>
                Q{currentIdx + 1} — {q.title}
              </h2>
            )}

            {/* Detailed Concept Card */}
            {q.questionText && (
              <div style={{ padding: '12px 16px', background: 'rgba(96, 165, 250, 0.08)', borderRadius: '8px', border: '1px solid rgba(96, 165, 250, 0.25)' }}>
                <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-heading)', letterSpacing: '0.12em', color: '#60a5fa', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                  Target Concept & Algorithmic Goal
                </span>
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.5, fontFamily: 'JetBrains Mono, monospace' }}>
                  {q.questionText}
                </p>
              </div>
            )}

            {/* Sample Test Case Card (Visible by Default) */}
            <div style={{ padding: '12px 16px', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-heading)', letterSpacing: '0.12em', color: '#60a5fa', textTransform: 'uppercase' }}>
                  Sample Test Case (Visible)
                </span>
                <span className="badge badge-green" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                  VISIBLE BY DEFAULT
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: sampleInput ? 'repeat(auto-fit, minmax(220px, 1fr))' : '1fr', gap: '12px' }}>
                {sampleInput ? (
                  <div>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: '4px' }}>
                      Sample Input:
                    </span>
                    <pre style={{ margin: 0, padding: '8px 12px', background: 'rgba(0,0,0,0.6)', borderRadius: '6px', fontSize: '0.82rem', color: '#e2e8f0', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'pre-wrap' }}>
                      {sampleInput}
                    </pre>
                  </div>
                ) : null}
                <div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)', display: 'block', marginBottom: '4px' }}>
                    Sample Expected Output:
                  </span>
                  <pre style={{ margin: 0, padding: '8px 12px', background: 'rgba(0,0,0,0.6)', borderRadius: '6px', fontSize: '0.82rem', color: '#4ade80', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'pre-wrap' }}>
                    {sampleAnswer}
                  </pre>
                </div>
              </div>
            </div>
            
            {/* Language Selector Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', margin: 0, fontFamily: 'var(--font-heading)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                Select Language & Debug:
              </p>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  id={`select-java-${currentIdx}`}
                  className={`btn btn-sm ${currentLang === 'java' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => handleLanguageSelect(q._id, 'java')}
                  style={{
                    fontSize: '0.78rem',
                    padding: '4px 16px',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    background: currentLang === 'java' ? '#3b82f6' : undefined,
                    color: currentLang === 'java' ? '#ffffff' : undefined,
                  }}
                >
                  JAVA
                </button>
                <button
                  type="button"
                  id={`select-python-${currentIdx}`}
                  className={`btn btn-sm ${currentLang === 'python' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => handleLanguageSelect(q._id, 'python')}
                  style={{
                    fontSize: '0.78rem',
                    padding: '4px 16px',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    background: currentLang === 'python' ? '#3b82f6' : undefined,
                    color: currentLang === 'python' ? '#ffffff' : undefined,
                  }}
                >
                  PYTHON
                </button>
              </div>
            </div>

            <div className="code-wrapper">
              <div className="code-header">
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.68rem', color: 'var(--amber-warn)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  BUGGY CODE ({currentLang.toUpperCase()})
                </span>
                <span className="code-lang-badge">{currentLang}</span>
              </div>
              <SyntaxHighlighter
                language={currentLang}
                style={vscDarkPlus}
                customStyle={{ margin: 0, padding: '14px 18px', background: '#0d0d0d', fontSize: '0.85rem', lineHeight: 1.6, maxHeight: '200px', overflowY: 'auto' }}
              >
                {buggyCodeToShow}
              </SyntaxHighlighter>
            </div>
          </div>

          {/* Editor Container */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ padding: '8px 14px', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.72rem', color: '#4ade80', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  Write Fixed Code ({currentLang.toUpperCase()}) Below
                </span>
                <span style={{ fontSize: '0.72rem', color: '#4ade80', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>5 MARKS</span>
              </div>

              {/* Action Buttons: Run Code & Reset */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleResetCode(q._id, currentLang)}
                  style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                  title="Reset to initial buggy code"
                >
                  Reset Code
                </button>
                <button
                  type="button"
                  id={`run-code-${currentIdx}`}
                  className="btn btn-primary btn-sm"
                  onClick={() => handleRunCode(q._id)}
                  disabled={currentRunState.running || submitting}
                  style={{
                    fontSize: '0.75rem',
                    padding: '4px 14px',
                    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                    boxShadow: '0 0 12px rgba(16, 185, 129, 0.3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {currentRunState.running ? (
                    <>
                      <div className="spinner" style={{ width: '12px', height: '12px', borderWidth: '2px' }} />
                      Running...
                    </>
                  ) : (
                    <>RUN CODE ({currentLang.toUpperCase()})</>
                  )}
                </button>
              </div>
            </div>

            <div className="monaco-editor-wrapper">
              {!monacoFailed ? (
                <Editor
                  height="100%"
                  language={monacoLang}
                  theme="vs-dark"
                  value={getCode(q._id, currentLang)}
                  onChange={(val) => setCodeForLang(q._id, currentLang, val || '')}
                  onMount={() => setMonacoFailed(false)}
                  onLoading={() => setMonacoFailed(false)}
                  options={{
                    fontSize: 13,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    lineNumbers: 'on',
                    wordWrap: 'on',
                    fontFamily: 'JetBrains Mono, monospace',
                    automaticLayout: true,
                  }}
                />
              ) : (
                <textarea
                  className="input code-textarea-input"
                  style={{ height: '100%', minHeight: '250px' }}
                  value={getCode(q._id, currentLang)}
                  onChange={(e) => setCodeForLang(q._id, currentLang, e.target.value)}
                  disabled={submitting}
                />
              )}
            </div>

            {/* Console Output */}
            {runResult && (
              <div
                style={{
                  marginTop: '6px',
                  padding: '14px',
                  background: 'rgba(13, 17, 23, 0.95)',
                  border: `1px solid ${runResult.isCorrect ? 'rgba(74, 222, 128, 0.4)' : runResult.error ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
                  borderRadius: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.82rem', fontFamily: 'var(--font-heading)', letterSpacing: '0.08em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                      Terminal Console
                    </span>
                    {runResult.isCorrect ? (
                      <span className="badge badge-green" style={{ fontSize: '0.72rem' }}>
                        ✓ ALL TEST CASES PASSED
                      </span>
                    ) : runResult.error ? (
                      <span className="badge badge-red" style={{ fontSize: '0.72rem' }}>
                        ✕ COMPILATION / RUNTIME ERROR
                      </span>
                    ) : (
                      <span className="badge badge-amber" style={{ fontSize: '0.72rem' }}>
                        TEST CASES FAILED
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      background: runResult.samplePassed ? 'rgba(74, 222, 128, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: runResult.samplePassed ? '#4ade80' : '#f87171',
                      border: `1px solid ${runResult.samplePassed ? 'rgba(74, 222, 128, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    Sample Test Case: {runResult.samplePassed ? '✓ Passed' : '✕ Output Mismatch'}
                  </span>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      background: runResult.hiddenPassed ? 'rgba(74, 222, 128, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: runResult.hiddenPassed ? '#4ade80' : '#f87171',
                      border: `1px solid ${runResult.hiddenPassed ? 'rgba(74, 222, 128, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    Hidden Test Case: {runResult.hiddenPassed ? '✓ Passed' : '✕ Failed'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginTop: '8px' }}>
                  <div>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '4px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                      Sample Case Output:
                    </p>
                    <pre style={{ margin: 0, padding: '10px 12px', background: 'rgba(0, 0, 0, 0.6)', borderRadius: '6px', color: runResult.error ? '#f87171' : '#ffffff', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.82rem', whiteSpace: 'pre-wrap', minHeight: '42px' }}>
                      {runResult.error ? runResult.error : runResult.output?.trim() || '(No output)'}
                    </pre>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '4px', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                      Hidden Test Case Output:
                    </p>
                    <pre style={{ margin: 0, padding: '10px 12px', background: 'rgba(0, 0, 0, 0.6)', borderRadius: '6px', color: runResult.hiddenPassed ? '#4ade80' : '#f87171', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.82rem', whiteSpace: 'pre-wrap', minHeight: '42px' }}>
                      {runResult.hiddenPassed ? '✓ Hidden Test Case Passed' : '✕ Hidden Test Case Failed (Output Hidden)'}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="question-nav-bar">
            <button className="btn btn-secondary" onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))} disabled={currentIdx === 0}>
              ← Prev
            </button>
            <div className="question-nav-numbers">
              {questions.map((qItem, i) => {
                const isTested = runStates[qItem._id]?.result?.isCorrect
                const lang = selectedLangs[qItem._id] || 'java'
                const hasEdits = !!answers[qItem._id]?.[lang]
                return (
                  <button
                    key={i}
                    onClick={() => setCurrentIdx(i)}
                    className={`nav-num-btn ${hasEdits ? 'answered' : ''} ${i === currentIdx ? 'active' : ''}`}
                    style={isTested ? { borderColor: '#4ade80', color: '#4ade80', background: 'rgba(74,222,128,0.15)' } : {}}
                  >
                    {isTested ? `✓ ${i + 1}` : i + 1}
                  </button>
                )
              })}
            </div>
            {currentIdx < questions.length - 1 ? (
              <button className="btn btn-secondary" onClick={() => setCurrentIdx((i) => i + 1)}>
                Next →
              </button>
            ) : (
              <button id="submit-round3" className="btn btn-primary" onClick={() => setShowConfirm(true)} disabled={submitting} style={{ background: '#4ade80', color: '#000', border: 'none' }}>
                {submitting ? 'Submitting...' : 'SUBMIT ROUND 3'}
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
              <h2 className="modal-title">FINAL SUBMISSION (ROUND 3)</h2>
              <button onClick={() => setShowConfirm(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '1.2rem' }}>
                ✕
              </button>
            </div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.5 }}>
              Submit your code for all {questions.length} challenges in Round 3.
            </p>
            <p style={{ color: '#4ade80', fontFamily: 'var(--font-heading)', fontSize: '0.82rem', marginBottom: '24px' }}>
              Your score will be calculated and final result breakdown out of 100 will be displayed.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" onClick={() => setShowConfirm(false)}>
                CANCEL
              </button>
              <button id="confirm-submit-round3" className="btn btn-primary" onClick={handleSubmit} style={{ background: '#4ade80', color: '#000', border: 'none' }}>
                CONFIRM & SEE RESULT
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
        <h2 style={{ fontFamily: 'var(--font-heading)', color: 'var(--purple-bright, #a855f7)', marginBottom: '12px', letterSpacing: '0.1em' }}>
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
