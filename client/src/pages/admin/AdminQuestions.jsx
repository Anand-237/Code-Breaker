import { useState, useEffect, useRef } from 'react'
import api from '../../api/axios'
import { useToast } from '../../context/ToastContext'

const ROUND_SPECS = {
  1: { name: 'Basic', maxQ: 15, marksPerQ: 2, maxMarks: 30, color: 'var(--red-bright)', icon: '' },
  2: { name: 'Intermediate', maxQ: 10, marksPerQ: 3, maxMarks: 30, color: 'var(--amber-warn)', icon: '' },
  3: { name: 'Advanced', maxQ: 8, marksPerQ: 5, maxMarks: 40, color: '#4ade80', icon: '' },
}

const EMPTY_FORM = {
  round: 1,
  questionType: 'mcq',
  questionText: '',
  title: '',
  options: ['', '', '', ''],
  correctOptionIndex: 0,
  correctAnswer: '',
  codeSnippet: '',
  buggyCode: '',
  javaCode: '',
  javaCorrectCode: '',
  pythonCode: '',
  pythonCorrectCode: '',
  language: 'javascript',
  correctOutput: '',
  expectedOutput: '',
  explanation: '',
}

export default function AdminQuestions() {
  const toast = useToast()
  const [activeRound, setActiveRound] = useState(1)
  const [questions, setQuestions] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [search, setSearch] = useState('')

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [editQ, setEditQ] = useState(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // View Details Modal
  const [viewQ, setViewQ] = useState(null)

  // Track in-flight request to avoid duplicate concurrent calls
  const isFetchingRef = useRef(false)

  const fetchData = async () => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    setLoading(true)
    setErrorMsg('')

    try {
      const searchParam = search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ''
      const [qRes, statsRes] = await Promise.all([
        api.get(`/admin/questions?round=${activeRound}${searchParam}`),
        api.get('/admin/questions/stats'),
      ])
      setQuestions(qRes.data.questions || [])
      setStats(statsRes.data || null)
    } catch (err) {
      console.error('fetchData error:', err)
      const status = err.response?.status
      let msg = err.response?.data?.message

      if (status === 429) {
        msg = 'Rate limit exceeded (HTTP 429). Please wait a moment before retrying.'
      } else if (status === 401) {
        msg = 'Authentication session expired. Please sign in again.'
      } else if (status === 403) {
        msg = 'Access denied. Admin privileges required.'
      } else if (!msg) {
        msg = err.message || 'Failed to connect to backend database service.'
      }

      setErrorMsg(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }

  // Fetch when activeRound or search changes
  useEffect(() => {
    fetchData()
  }, [activeRound, search])

  const openCreateForRound = (rNum) => {
    const rSpec = ROUND_SPECS[rNum]
    const rStat = stats?.stats?.[rNum]

    if (rStat && rStat.count >= rSpec.maxQ) {
      toast.warning(`Round ${rNum} already contains ${rStat.count} questions. Maximum limit reached.`)
      return
    }

    setEditQ(null)
    setFormError('')
    setForm({
      ...EMPTY_FORM,
      round: rNum,
      questionType: rNum === 1 ? 'mcq' : rNum === 2 ? 'output' : 'debug',
      options: rNum === 1 ? ['', '', '', ''] : [],
    })
    setShowModal(true)
  }

  const openEdit = (q) => {
    setEditQ(q)
    setFormError('')
    setForm({
      round: q.round || 1,
      questionType: q.questionType || (q.round === 1 ? 'mcq' : q.round === 2 ? 'output' : 'debug'),
      questionText: q.questionText || '',
      title: q.title || '',
      options: q.options && q.options.length ? [...q.options] : ['', '', '', ''],
      correctOptionIndex: q.correctOptionIndex ?? 0,
      correctAnswer: q.correctAnswer || q.correctOutput || q.expectedOutput || q.java?.answer || q.python?.answer || '',
      codeSnippet: q.codeSnippet || '',
      buggyCode: q.buggyCode || '',
      javaCode: q.java?.code || q.codeSnippet || q.buggyCode || '',
      javaCorrectCode: q.java?.correctCode || '',
      pythonCode: q.python?.code || q.codeSnippetPython || q.buggyCode || '',
      pythonCorrectCode: q.python?.correctCode || '',
      language: q.language || 'javascript',
      correctOutput: q.correctOutput || '',
      expectedOutput: q.expectedOutput || '',
      explanation: q.explanation || '',
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    setFormError('')

    const rNum = parseInt(form.round, 10)
    const spec = ROUND_SPECS[rNum]

    if (rNum === 1) {
      if (!form.questionText.trim()) return setFormError('Question text is required.')
      if (form.options.some((o) => !o.trim())) return setFormError('All 4 options must be filled.')
    } else if (rNum === 2) {
      if (!form.codeSnippet.trim() && !form.questionText.trim()) return setFormError('Code snippet or question text is required.')
      if (!form.correctAnswer.trim() && !form.correctOutput.trim()) return setFormError('Correct output answer is required.')
    } else if (rNum === 3) {
      if (!form.javaCode.trim()) return setFormError('Java code is required.')
      if (!form.pythonCode.trim()) return setFormError('Python code is required.')
      if (!form.correctAnswer.trim() && !form.expectedOutput.trim()) return setFormError('Expected target output is required.')
    }

    setSaving(true)
    try {
      const payload = {
        ...form,
        round: rNum,
        marks: spec.marksPerQ,
        correctOutput: form.correctAnswer || form.correctOutput,
        expectedOutput: form.correctAnswer || form.expectedOutput,
        buggyCode: form.javaCode || form.buggyCode,
        codeSnippet: form.javaCode || form.codeSnippet,
        codeSnippetPython: form.pythonCode || form.codeSnippetPython,
        java: {
          code: form.javaCode,
          correctCode: form.javaCorrectCode,
          answer: form.correctAnswer,
        },
        python: {
          code: form.pythonCode,
          correctCode: form.pythonCorrectCode,
          answer: form.correctAnswer,
        },
      }

      if (editQ) {
        await api.patch(`/admin/questions/${editQ._id}`, payload)
        toast.success(`Question updated for Round ${rNum}`)
      } else {
        await api.post('/admin/questions', payload)
        toast.success(`Question added to Round ${rNum}`)
      }

      setShowModal(false)
      fetchData()
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save question'
      setFormError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return
    try {
      await api.delete(`/admin/questions/${id}`)
      toast.success('Question deleted')
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete question')
    }
  }

  const setOption = (i, val) => setForm((f) => ({ ...f, options: f.options.map((o, j) => (j === i ? val : o)) }))

  return (
    <div style={{ animation: 'fadeIn 300ms ease' }}>
      {/* ── Page Header ── */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', letterSpacing: '0.08em', marginBottom: '4px' }}>
          QUESTION MANAGEMENT & ROUND CONTROL
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>
          Manage questions strictly connected to Round 1 (30m), Round 2 (30m), and Round 3 (40m) = Total 100 Marks.
        </p>
      </div>

      {/* ── Error Banner & Retry ── */}
      {errorMsg && (
        <div
          style={{
            marginBottom: '24px',
            padding: '16px 20px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justify: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h4 style={{ fontFamily: 'var(--font-heading)', color: 'var(--red-bright)', margin: '0 0 4px 0' }}>
              Unable to load Question Bank
            </h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0, fontFamily: 'var(--font-mono)' }}>
              Reason: {errorMsg}
            </p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={fetchData}>
            Retry Loading
          </button>
        </div>
      )}

      {/* ── Pre-Start Readiness Check Banner ── */}
      {stats && !errorMsg && (
        <div
          style={{
            marginBottom: '24px',
            padding: '16px 20px',
            background: stats.isReady ? 'rgba(74, 222, 128, 0.08)' : 'rgba(239, 68, 68, 0.08)',
            border: `1px solid ${stats.isReady ? 'rgba(74, 222, 128, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>{stats.isReady ? 'READY' : 'PENDING'}</span>
            <h3
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '0.95rem',
                letterSpacing: '0.06em',
                color: stats.isReady ? '#4ade80' : 'var(--red-bright)',
                margin: 0,
              }}
            >
              {stats.isReady ? 'COMPETITION READY FOR START' : 'COMPETITION CANNOT START'}
            </h3>
          </div>
          <pre
            style={{
              margin: 0,
              fontFamily: 'var(--font-mono)',
              fontSize: '0.82rem',
              color: 'var(--text-primary)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {stats.validationMessage}
          </pre>
        </div>
      )}

      {/* ── 3 Round Management Cards ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          marginBottom: '28px',
        }}
      >
        {[1, 2, 3].map((rNum) => {
          const spec = ROUND_SPECS[rNum]
          const rStat = stats?.stats?.[rNum] || { count: 0, currentMarks: 0 }
          const isSelected = activeRound === rNum
          const isFull = rStat.count >= spec.maxQ

          return (
            <div
              key={rNum}
              className="card"
              style={{
                borderColor: isSelected ? spec.color : 'var(--border-subtle)',
                boxShadow: isSelected ? `0 0 16px ${spec.color}22` : 'none',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '16px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '1.4rem' }}>{spec.icon}</span>
                  <span className={`badge ${isFull ? 'badge-green' : 'badge-amber'}`} style={{ fontSize: '0.7rem' }}>
                    {isFull ? 'FULL ✓' : `${spec.maxQ - rStat.count} MISSING`}
                  </span>
                </div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', color: spec.color, letterSpacing: '0.06em', margin: '0 0 2px 0' }}>
                  ROUND {rNum}
                </h3>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>{spec.name}</p>

                <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-primary)' }}>
                    <span>Questions:</span>
                    <strong style={{ color: isFull ? '#4ade80' : 'var(--amber-warn)' }}>
                      {rStat.count} / {spec.maxQ}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-primary)' }}>
                    <span>Marks:</span>
                    <strong>
                      {rStat.currentMarks} / {spec.maxMarks}
                    </strong>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  id={`manage-round-${rNum}`}
                  className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                  onClick={() => setActiveRound(rNum)}
                  style={{ flex: 1 }}
                >
                  Manage Questions
                </button>
                <button
                  id={`add-q-round-${rNum}`}
                  className="btn btn-sm"
                  onClick={() => openCreateForRound(rNum)}
                  disabled={isFull}
                  style={{
                    background: isFull ? 'rgba(255,255,255,0.05)' : spec.color,
                    color: isFull ? 'var(--text-dim)' : '#000',
                    fontWeight: 700,
                    cursor: isFull ? 'not-allowed' : 'pointer',
                  }}
                  title={isFull ? 'Limit reached' : 'Add Question'}
                >
                  + Add
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Filter & Search Bar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justify: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', color: ROUND_SPECS[activeRound].color, margin: 0 }}>
            ROUND {activeRound} ({ROUND_SPECS[activeRound].name}) QUESTIONS
          </h2>
          <span className="badge badge-gray" style={{ fontFamily: 'var(--font-mono)' }}>
            {questions.length} / {ROUND_SPECS[activeRound].maxQ} questions
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: 'min(100%, 480px)' }}>
          <input
            type="text"
            className="input"
            placeholder="Search questions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ fontSize: '0.82rem', padding: '6px 12px', flex: 1 }}
          />
          <button
            className="btn btn-secondary btn-sm"
            onClick={async () => {
              if (window.confirm('Re-seed Question Bank with default questions and corrected codes?')) {
                try {
                  await api.post('/admin/questions/reseed')
                  toast.success('Question bank reseeded successfully!')
                  fetchData()
                } catch (err) {
                  toast.error(err.response?.data?.message || 'Reseed failed')
                }
              }
            }}
            title="Reload default Question Bank"
          >
            🔄 Reseed DB
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => openCreateForRound(activeRound)}
            disabled={(stats?.stats?.[activeRound]?.count || questions.length) >= ROUND_SPECS[activeRound].maxQ}
          >
            + Add Question
          </button>
        </div>
      </div>

      {/* ── Table Loading / Content ── */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '40px 0' }}>
          <div className="spinner" style={{ width: '24px', height: '24px' }} />
          <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-heading)', letterSpacing: '0.1em', fontSize: '0.8rem' }}>
            Loading questions...
          </span>
        </div>
      ) : errorMsg ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p style={{ color: 'var(--red-bright)', fontSize: '1.1rem', marginBottom: '8px', fontFamily: 'var(--font-heading)' }}>
            Error Loading Questions
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px', fontFamily: 'var(--font-mono)' }}>
            {errorMsg}
          </p>
          <button className="btn btn-primary btn-sm" onClick={fetchData}>
            Retry
          </button>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Round</th>
                <th>Question / Title</th>
                <th>Marks</th>
                <th>Correct Answer</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {questions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '36px' }}>
                    No questions found for Round {activeRound}. Click "+ Add Question" to create one.
                  </td>
                </tr>
              ) : (
                questions.map((q, idx) => (
                  <tr key={q._id}>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>{idx + 1}</td>
                    <td>
                      <span className="badge badge-gray" style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)' }}>
                        Round {q.round}
                      </span>
                    </td>
                    <td style={{ maxWidth: '320px' }}>
                      <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 2px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {q.title || q.questionText || q.codeSnippet?.substring(0, 50) + '...'}
                      </p>
                      {q.explanation && (
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          Explanation: {q.explanation}
                        </p>
                      )}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: ROUND_SPECS[q.round || activeRound].color, fontWeight: 700 }}>
                      {q.marks || ROUND_SPECS[q.round || activeRound].marksPerQ} pts
                    </td>
                    <td style={{ maxWidth: '200px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: '#4ade80' }}>
                        {q.correctAnswer || q.correctOutput || q.expectedOutput || q.java?.answer || q.python?.answer || (q.options && q.options[q.correctOptionIndex]) || '—'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setViewQ(q)}>
                          View
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(q)}>
                          Edit
                        </button>
                        <button
                          className="btn btn-sm"
                          onClick={() => handleDelete(q._id)}
                          style={{
                            background: 'rgba(185,28,28,0.15)',
                            color: 'var(--red-bright)',
                            border: '1px solid rgba(185,28,28,0.3)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '4px 10px',
                            cursor: 'pointer',
                            fontSize: '0.72rem',
                            fontFamily: 'var(--font-heading)',
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── View Question Modal ── */}
      {viewQ && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '640px', width: '95%' }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ color: ROUND_SPECS[viewQ.round]?.color }}>
                Question Details — Round {viewQ.round}
              </h2>
              <button onClick={() => setViewQ(null)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '1.2rem' }}>
                ✕
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.9rem' }}>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: '4px' }}>Title</p>
                <p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{viewQ.title || viewQ.questionText || 'Untitled'}</p>
              </div>

              {(viewQ.java?.code || viewQ.codeSnippet || viewQ.buggyCode) && (
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--amber-warn)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: '4px' }}>Java Code (Buggy)</p>
                  <pre style={{ background: '#0d0d0d', padding: '12px', borderRadius: '6px', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', whiteSpace: 'pre-wrap', maxHeight: '140px', overflowY: 'auto' }}>
                    {viewQ.java?.code || viewQ.codeSnippet || viewQ.buggyCode}
                  </pre>
                </div>
              )}

              {viewQ.java?.correctCode && (
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#4ade80', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: '4px' }}>Java Corrected Code (Solution)</p>
                  <pre style={{ background: '#0d0d0d', padding: '12px', borderRadius: '6px', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', whiteSpace: 'pre-wrap', maxHeight: '140px', overflowY: 'auto', border: '1px solid rgba(74, 222, 128, 0.3)' }}>
                    {viewQ.java.correctCode}
                  </pre>
                </div>
              )}

              {(viewQ.python?.code || viewQ.codeSnippetPython) && (
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#60a5fa', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: '4px' }}>Python Code (Buggy)</p>
                  <pre style={{ background: '#0d0d0d', padding: '12px', borderRadius: '6px', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', whiteSpace: 'pre-wrap', maxHeight: '140px', overflowY: 'auto' }}>
                    {viewQ.python?.code || viewQ.codeSnippetPython}
                  </pre>
                </div>
              )}

              {viewQ.python?.correctCode && (
                <div>
                  <p style={{ fontSize: '0.75rem', color: '#4ade80', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: '4px' }}>Python Corrected Code (Solution)</p>
                  <pre style={{ background: '#0d0d0d', padding: '12px', borderRadius: '6px', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', whiteSpace: 'pre-wrap', maxHeight: '140px', overflowY: 'auto', border: '1px solid rgba(74, 222, 128, 0.3)' }}>
                    {viewQ.python.correctCode}
                  </pre>
                </div>
              )}

              {viewQ.options && viewQ.options.length > 0 && (
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: '4px' }}>Options</p>
                  {viewQ.options.map((opt, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '6px 12px',
                        marginBottom: '4px',
                        borderRadius: '4px',
                        background: viewQ.correctOptionIndex === i ? 'rgba(74, 222, 128, 0.15)' : 'var(--bg-elevated)',
                        border: `1px solid ${viewQ.correctOptionIndex === i ? '#4ade80' : 'var(--border-subtle)'}`,
                        color: viewQ.correctOptionIndex === i ? '#4ade80' : 'var(--text-primary)',
                      }}
                    >
                      {['A', 'B', 'C', 'D'][i]}: {opt} {viewQ.correctOptionIndex === i && '✓ (Correct)'}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: '4px' }}>Target Output</p>
                  <p style={{ color: '#4ade80', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    {viewQ.correctAnswer || viewQ.correctOutput || viewQ.expectedOutput || viewQ.java?.answer || viewQ.python?.answer || (viewQ.options && viewQ.options[viewQ.correctOptionIndex])}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: '4px' }}>Automatic Marks</p>
                  <p style={{ color: ROUND_SPECS[viewQ.round]?.color, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    {viewQ.marks || ROUND_SPECS[viewQ.round]?.marksPerQ} Marks
                  </p>
                </div>
              </div>

              {viewQ.explanation && (
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: '4px' }}>Explanation</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{viewQ.explanation}</p>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button className="btn btn-secondary" onClick={() => setViewQ(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Question Modal ── */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '680px', width: '95%' }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ color: ROUND_SPECS[form.round]?.color }}>
                {editQ ? 'Edit Question' : '+ Add Question'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '1.2rem' }}>
                ✕
              </button>
            </div>

            {formError && (
              <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', color: 'var(--red-bright)', fontSize: '0.82rem', marginBottom: '14px' }}>
                {formError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Select Round */}
              <div className="form-group">
                <label className="form-label">Select Round *</label>
                <select
                  className="input"
                  value={form.round}
                  onChange={(e) => {
                    const r = parseInt(e.target.value, 10)
                    setForm((f) => ({
                      ...f,
                      round: r,
                      questionType: r === 1 ? 'mcq' : r === 2 ? 'output' : 'debug',
                      options: r === 1 ? ['', '', '', ''] : [],
                    }))
                  }}
                  disabled={!!editQ}
                >
                  <option value={1}>Round 1 – Basic (2 marks/question)</option>
                  <option value={2}>Round 2 – Intermediate (3 marks/question)</option>
                  <option value={3}>Round 3 – Advanced (8 marks/question)</option>
                </select>
              </div>

              {/* Automatic Marks Read-Only Badge */}
              <div style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: '6px', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>Automatic Marks Assigned:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: ROUND_SPECS[form.round]?.color, fontSize: '0.95rem' }}>
                  {ROUND_SPECS[form.round]?.marksPerQ} Marks
                </span>
              </div>

              {/* Round 1 (Basic MCQ) Form */}
              {parseInt(form.round, 10) === 1 && (
                <>
                  <div className="form-group">
                    <label className="form-label">Question Text *</label>
                    <textarea
                      className="input"
                      rows={3}
                      value={form.questionText}
                      onChange={(e) => setForm((f) => ({ ...f, questionText: e.target.value }))}
                      placeholder="e.g. What is the output of factorial(5)?"
                    />
                  </div>

                  {[0, 1, 2, 3].map((i) => (
                    <div className="form-group" key={i}>
                      <label className="form-label">
                        Option {['A', 'B', 'C', 'D'][i]} {form.correctOptionIndex === i && '✓ (Correct Answer)'}
                      </label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          className="input"
                          value={form.options[i] || ''}
                          onChange={(e) => setOption(i, e.target.value)}
                          placeholder={`Option ${['A', 'B', 'C', 'D'][i]}`}
                        />
                        <button
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, correctOptionIndex: i }))}
                          className={`btn btn-sm ${form.correctOptionIndex === i ? 'btn-primary' : 'btn-secondary'}`}
                        >
                          ✓
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Round 2 (Intermediate Output) Form */}
              {parseInt(form.round, 10) === 2 && (
                <>
                  <div className="form-group">
                    <label className="form-label">Title / Question Description *</label>
                    <input
                      className="input"
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="e.g. JavaScript Closures Output"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Language</label>
                    <select className="input" value={form.language} onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}>
                      {['javascript', 'python', 'cpp', 'java', 'c', 'typescript'].map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Code Snippet *</label>
                    <textarea
                      className="input"
                      rows={5}
                      value={form.codeSnippet}
                      onChange={(e) => setForm((f) => ({ ...f, codeSnippet: e.target.value }))}
                      placeholder="Paste code here..."
                      style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Correct Output *</label>
                    <input
                      className="input"
                      value={form.correctAnswer}
                      onChange={(e) => setForm((f) => ({ ...f, correctAnswer: e.target.value }))}
                      placeholder="Exact expected output"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    />
                  </div>
                </>
              )}

              {/* Round 3 (Advanced Debugging) Form */}
              {parseInt(form.round, 10) === 3 && (
                <>
                  <div className="form-group">
                    <label className="form-label">Question Title *</label>
                    <input
                      className="input"
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="e.g. SPIRAL MATRIX TRAVERSAL"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Java Buggy Code *</label>
                    <textarea
                      className="input"
                      rows={5}
                      value={form.javaCode}
                      onChange={(e) => setForm((f) => ({ ...f, javaCode: e.target.value }))}
                      placeholder="Paste Java buggy code here..."
                      style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Java Corrected Code (Solution)</label>
                    <textarea
                      className="input"
                      rows={5}
                      value={form.javaCorrectCode}
                      onChange={(e) => setForm((f) => ({ ...f, javaCorrectCode: e.target.value }))}
                      placeholder="Paste Java corrected code solution here..."
                      style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', borderColor: 'rgba(74, 222, 128, 0.4)' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Python Buggy Code *</label>
                    <textarea
                      className="input"
                      rows={5}
                      value={form.pythonCode}
                      onChange={(e) => setForm((f) => ({ ...f, pythonCode: e.target.value }))}
                      placeholder="Paste Python buggy code here..."
                      style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Python Corrected Code (Solution)</label>
                    <textarea
                      className="input"
                      rows={5}
                      value={form.pythonCorrectCode}
                      onChange={(e) => setForm((f) => ({ ...f, pythonCorrectCode: e.target.value }))}
                      placeholder="Paste Python corrected code solution here..."
                      style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', borderColor: 'rgba(74, 222, 128, 0.4)' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Expected Target Output *</label>
                    <input
                      className="input"
                      value={form.correctAnswer}
                      onChange={(e) => setForm((f) => ({ ...f, correctAnswer: e.target.value }))}
                      placeholder="Expected output when debugged"
                      style={{ fontFamily: 'var(--font-mono)' }}
                    />
                  </div>
                </>
              )}

              {/* Optional Explanation */}
              <div className="form-group">
                <label className="form-label">Optional Explanation</label>
                <input
                  className="input"
                  value={form.explanation}
                  onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))}
                  placeholder="Optional hint or answer explanation..."
                />
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : editQ ? 'Update Question' : 'Add Question'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
