import { useState, useEffect } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import api from '../../api/axios'
import { useToast } from '../../context/ToastContext'

const LETTERS = ['A', 'B', 'C', 'D']

export default function AdminResults() {
  const toast = useToast()
  const [leaderboard, setLeaderboard] = useState([])
  const [pendingReviews, setPendingReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('leaderboard')
  const [search, setSearch] = useState('')

  // Answer Sheet Modal State
  const [sheetModal, setSheetModal] = useState(null) // { user, submissions, loading }
  const [sheetRound, setSheetRound] = useState(1)

  // Grading Review Modal State
  const [reviewModal, setReviewModal] = useState(null)
  const [reviewScores, setReviewScores] = useState({})
  const [reviewSaving, setReviewSaving] = useState(false)

  const fetchResults = async () => {
    try {
      const { data } = await api.get('/admin/results')
      setLeaderboard(data.leaderboard)
      setPendingReviews(data.pendingReviews)
    } catch { toast.error('Failed to load results') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchResults() }, [])

  const handleExport = async (round, format = 'xlsx') => {
    try {
      let endpoint = round === 'overall'
        ? `/admin/export/overall?format=${format}`
        : `/admin/export/${round}?format=${format}`
      if (format === 'pdf') {
        endpoint = '/admin/export/pdf'
      }

      const res = await api.get(endpoint, { responseType: 'blob' })
      const blob = new Blob([res.data], {
        type: format === 'pdf' ? 'application/octet-stream' : res.headers['content-type'] || 'application/octet-stream'
      })
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = downloadUrl
      a.download = format === 'pdf' ? 'CodeBreakers_Official_Rankings.pdf' : (round === 'overall' ? `overall_results.${format}` : `round${round}_results.${format}`)
      document.body.appendChild(a)
      a.click()
      setTimeout(() => {
        document.body.removeChild(a)
        window.URL.revokeObjectURL(downloadUrl)
      }, 3000)
      toast.success(`Export (${format.toUpperCase()}) downloaded`)
    } catch (err) {
      console.error('handleExport error:', err)
      toast.error('Export failed')
    }
  }

  const openAnswerSheet = async (userId) => {
    setSheetModal({ loading: true, user: null, submissions: [] })
    setSheetRound(1)
    try {
      const { data } = await api.get(`/admin/results/user/${userId}`)
      setSheetModal({ loading: false, user: data.user, submissions: data.submissions })
    } catch {
      toast.error('Failed to load team answer sheet')
      setSheetModal(null)
    }
  }

  const openReview = (sub) => {
    const scores = {}
    sub.answers.forEach(a => {
      scores[a.questionId?._id || a.questionId] = {
        isCorrect: a.isCorrect,
        pointsAwarded: a.pointsAwarded || 0,
        maxPoints: a.questionId?.points || 15
      }
    })
    setReviewScores(scores)
    setReviewModal(sub)
  }

  const handleSaveReview = async () => {
    setReviewSaving(true)
    try {
      const answers = Object.entries(reviewScores).map(([questionId, v]) => ({
        questionId,
        isCorrect: v.isCorrect,
        pointsAwarded: v.isCorrect ? v.pointsAwarded : 0,
      }))
      await api.patch(`/admin/results/review/${reviewModal._id}`, { answers })
      toast.success('Review saved')
      setReviewModal(null)
      fetchResults()
      if (sheetModal?.user?._id) {
        openAnswerSheet(sheetModal.user._id)
      }
    } catch { toast.error('Failed to save review') }
    finally { setReviewSaving(false) }
  }

  const filteredLeaderboard = leaderboard.filter(entry =>
    (entry.teamName || '').toLowerCase().includes(search.toLowerCase()) ||
    (entry.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (entry.username || '').toLowerCase().includes(search.toLowerCase())
  )

  const activeSubmission = sheetModal?.submissions?.find(s => s.round === sheetRound)

  return (
    <div style={{ animation:'fadeIn 300ms ease' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px', flexWrap:'wrap', gap:'16px' }}>
        <div>
          <h1 style={{ fontFamily:'var(--font-heading)', fontSize:'1.5rem', letterSpacing:'0.08em', marginBottom:'4px' }}>
            RESULTS & REPORT DASHBOARD
          </h1>
          <p style={{ color:'var(--text-dim)', fontSize:'0.82rem' }}>
            Leaderboard rankings, team answer sheets, and automated report exports
          </p>
        </div>

        {/* Prominent Export Report Buttons */}
        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center' }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => handleExport('overall', 'pdf')}
            style={{ fontSize:'0.78rem', gap:'6px', background: '#4ade80', color: '#000', fontWeight: 700 }}
            title="Download official PDF leaderboard rankings sheet"
          >
            📥 Official PDF Rankings
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => handleExport('overall', 'xlsx')}
            style={{ fontSize:'0.78rem', gap:'6px' }}
            title="Download full Excel report with cumulative scores"
          >
            Export Overall (.xlsx)
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => handleExport('overall', 'csv')}
            style={{ fontSize:'0.78rem' }}
          >
            ↓ Overall CSV
          </button>
          <div style={{ display:'flex', gap:'4px', marginLeft:'4px' }}>
            {[1, 2, 3].map(r => (
              <button
                key={r}
                className="btn btn-secondary btn-sm"
                onClick={() => handleExport(r, 'xlsx')}
                style={{ fontSize:'0.72rem', padding:'4px 8px' }}
                title={`Export Round ${r} detailed report`}
              >
                R{r} XLSX
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:'0', marginBottom:'20px', borderBottom:'1px solid var(--border-subtle)' }}>
        <button
          onClick={() => setTab('leaderboard')}
          style={{
            padding:'8px 20px', border:'none', background:'transparent',
            color: tab === 'leaderboard' ? 'var(--red-bright)' : 'var(--text-dim)',
            fontFamily:'var(--font-heading)', fontSize:'0.8rem', letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer',
            borderBottom: tab === 'leaderboard' ? '2px solid var(--red-bright)' : '2px solid transparent'
          }}
        >
          Leaderboard & Scores
        </button>
        <button
          onClick={() => setTab('review')}
          style={{
            padding:'8px 20px', border:'none', background:'transparent',
            color: tab === 'review' ? 'var(--amber-warn)' : 'var(--text-dim)',
            fontFamily:'var(--font-heading)', fontSize:'0.8rem', letterSpacing:'0.08em', textTransform:'uppercase', cursor:'pointer',
            borderBottom: tab === 'review' ? '2px solid var(--amber-warn)' : '2px solid transparent',
            display:'flex', alignItems:'center', gap:'6px'
          }}
        >
          Pending Reviews
          {pendingReviews.length > 0 && (
            <span className="badge badge-amber" style={{ fontSize:'0.68rem' }}>{pendingReviews.length}</span>
          )}
        </button>
      </div>

      {/* Search */}
      {tab === 'leaderboard' && (
        <div style={{ marginBottom:'16px' }}>
          <input
            className="input"
            placeholder="Search by team name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth:'340px' }}
          />
        </div>
      )}

      {loading ? (
        <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'40px 0' }}>
          <div className="spinner" style={{ width:'24px', height:'24px' }} />
          <span style={{ color:'var(--text-dim)', fontFamily:'var(--font-heading)', letterSpacing:'0.1em', fontSize:'0.8rem' }}>Loading results...</span>
        </div>
      ) : (
        <>
          {/* ── Leaderboard Tab ── */}
          {tab === 'leaderboard' && (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Team Name</th>
                    <th>R1 Score</th>
                    <th>R2 Score</th>
                    <th>R3 Score</th>
                    <th>Total Score</th>
                    <th>Answer Sheet</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeaderboard.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign:'center', color:'var(--text-dim)', padding:'32px' }}>No teams found</td></tr>
                  ) : filteredLeaderboard.map((entry, idx) => {
                    const r1 = entry.roundScores?.[1] ?? entry.rounds?.find(r => r.round === 1)?.score ?? 0
                    const r2 = entry.roundScores?.[2] ?? entry.rounds?.find(r => r.round === 2)?.score ?? 0
                    const r3 = entry.roundScores?.[3] ?? entry.rounds?.find(r => r.round === 3)?.score ?? 0
                    const teamName = entry.teamName || entry.name || entry.username

                    return (
                      <tr key={entry.userId} style={{ background: idx === 0 ? 'rgba(185,28,28,0.05)' : '' }}>
                        <td>
                          <div className={`rank-badge rank-${Math.min(idx + 1, 3)}`} style={{ background: idx >= 3 ? 'var(--bg-elevated)' : '' }}>
                            {idx + 1}
                          </div>
                        </td>
                        <td style={{ fontWeight: 600, color:'var(--text-primary)' }}>
                          {teamName}
                        </td>
                        <td style={{ fontFamily:'var(--font-mono)' }}>
                          <span style={{ color: r1 > 0 ? '#4ade80' : 'var(--text-dim)' }}>{r1} pts</span>
                        </td>
                        <td style={{ fontFamily:'var(--font-mono)' }}>
                          <span style={{ color: r2 > 0 ? '#4ade80' : 'var(--text-dim)' }}>{r2} pts</span>
                        </td>
                        <td style={{ fontFamily:'var(--font-mono)' }}>
                          <span style={{ color: r3 > 0 ? '#4ade80' : 'var(--text-dim)' }}>{r3} pts</span>
                        </td>
                        <td>
                          <span style={{ fontFamily:'var(--font-mono)', fontWeight:700, color: idx === 0 ? 'var(--red-bright)' : 'var(--text-primary)', fontSize:'1rem' }}>
                            {entry.cumulative} pts
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => openAnswerSheet(entry.userId)}
                            style={{ fontSize:'0.75rem', gap:'4px' }}
                          >
                            View Answer Sheet
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Review Tab ── */}
          {tab === 'review' && (
            <div>
              {pendingReviews.length === 0 ? (
                <div style={{ textAlign:'center', padding:'48px', color:'var(--text-dim)' }}>
                  
                  <p style={{ fontFamily:'var(--font-heading)', letterSpacing:'0.1em' }}>No pending reviews</p>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                  {pendingReviews.map(sub => (
                    <div key={sub._id} className="card" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'12px' }}>
                      <div>
                        <p style={{ fontWeight:600, color:'var(--text-primary)', marginBottom:'2px' }}>
                          {sub.userId?.teamName || sub.userId?.name || sub.userId?.username}
                        </p>
                        <p style={{ fontSize:'0.72rem', color:'var(--text-dim)', marginTop:'4px' }}>
                          Submitted: {new Date(sub.submittedAt).toLocaleString()}
                        </p>
                      </div>
                      <button className="btn btn-amber btn-sm" onClick={() => openReview(sub)}>
                        Review & Grade
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── ANSWER SHEET MODAL ── */}
      {sheetModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth:'880px', width:'95%', maxHeight:'90vh', display:'flex', flexDirection:'column' }}>
            {/* Modal Header */}
            <div className="modal-header" style={{ paddingBottom:'12px', borderBottom:'1px solid var(--border-subtle)' }}>
              <div>
                <h2 className="modal-title" style={{ fontSize:'1.2rem', color:'var(--red-bright)' }}>
                  Team Answer Sheet: {sheetModal.user?.teamName || sheetModal.user?.name || sheetModal.user?.username}
                </h2>
                <p style={{ fontSize:'0.75rem', color:'var(--text-dim)', marginTop:'2px' }}>
                  Detailed breakdown of submitted answers, test evaluations, and scores.
                </p>
              </div>
              <button onClick={() => setSheetModal(null)} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:'1.3rem' }}>✕</button>
            </div>

            {sheetModal.loading ? (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'60px 0' }}>
                <div className="spinner" style={{ width:'28px', height:'28px' }} />
                <span style={{ marginLeft:'12px', fontFamily:'var(--font-heading)', letterSpacing:'0.1em', fontSize:'0.82rem', color:'var(--text-dim)' }}>
                  Fetching Answer Sheet...
                </span>
              </div>
            ) : (
              <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
                {/* Round Sub-Tabs */}
                <div style={{ display:'flex', gap:'8px', padding:'12px 0', borderBottom:'1px solid var(--border-subtle)' }}>
                  {[1, 2, 3].map(r => {
                    const sub = sheetModal.submissions?.find(s => s.round === r)
                    return (
                      <button
                        key={r}
                        className={`btn btn-sm ${sheetRound === r ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setSheetRound(r)}
                        style={{ fontSize:'0.75rem' }}
                      >
                        Trial {r} {r === 1 ? '(MCQ)' : r === 2 ? '(Output)' : '(Debug)'}
                        {sub ? ` — ${sub.totalScore} pts` : ' — Not Submitted'}
                      </button>
                    )
                  })}
                </div>

                {/* Round Content */}
                <div style={{ flex:1, overflowY:'auto', padding:'16px 0' }}>
                  {!activeSubmission ? (
                    <div style={{ textAlign:'center', padding:'48px 0', color:'var(--text-dim)' }}>
                      
                      <p style={{ fontFamily:'var(--font-heading)', letterSpacing:'0.1em' }}>
                        No submission record found for Round {sheetRound}
                      </p>
                    </div>
                  ) : (
                    <div>
                      {/* Submission Summary Banner */}
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', background:'var(--bg-elevated)', borderRadius:'var(--radius-sm)', marginBottom:'16px', border:'1px solid var(--border-subtle)' }}>
                        <div>
                          <span style={{ fontSize:'0.75rem', color:'var(--text-dim)', textTransform:'uppercase', fontFamily:'var(--font-heading)' }}>Status: </span>
                          <span className={`badge ${activeSubmission.status === 'submitted' ? 'badge-green' : 'badge-amber'}`}>
                            {activeSubmission.status}
                          </span>
                        </div>
                        <div>
                          <span style={{ fontSize:'0.75rem', color:'var(--text-dim)', textTransform:'uppercase', fontFamily:'var(--font-heading)' }}>Submitted At: </span>
                          <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.8rem' }}>
                            {activeSubmission.submittedAt ? new Date(activeSubmission.submittedAt).toLocaleString() : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span style={{ fontSize:'0.75rem', color:'var(--text-dim)', textTransform:'uppercase', fontFamily:'var(--font-heading)' }}>Score: </span>
                          <span style={{ fontFamily:'var(--font-mono)', fontWeight:700, color:'var(--red-bright)', fontSize:'1rem' }}>
                            {activeSubmission.totalScore} pts
                          </span>
                        </div>
                      </div>

                      {/* Question Details List */}
                      <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
                        {activeSubmission.answers?.map((ans, idx) => {
                          const q = ans.question
                          const isCorrect = ans.isCorrect
                          const points = ans.pointsAwarded || 0
                          const maxPoints = q?.points || (sheetRound === 1 ? 5 : sheetRound === 2 ? 10 : 15)

                          return (
                            <div key={idx} className="card" style={{ padding:'16px', border:'1px solid var(--border-subtle)' }}>
                              {/* Q Header */}
                              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
                                <span style={{ fontFamily:'var(--font-heading)', fontSize:'0.82rem', color:'var(--red-bright)', letterSpacing:'0.05em' }}>
                                  QUESTION {idx + 1}: {q?.title || q?.questionText?.slice(0, 50) || `Question ${idx + 1}`}
                                </span>
                                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                                  <span className={`badge ${isCorrect ? 'badge-green' : activeSubmission.status === 'pending-review' ? 'badge-amber' : 'badge-red'}`}>
                                    {isCorrect ? `✔ Correct (+${points} pts)` : activeSubmission.status === 'pending-review' ? 'Pending Review' : '✖ Incorrect (0 pts)'}
                                  </span>
                                  <span style={{ fontFamily:'var(--font-mono)', fontSize:'0.75rem', color:'var(--text-dim)' }}>
                                    {points} / {maxPoints} pts
                                  </span>
                                </div>
                              </div>

                              {/* ROUND 1 (MCQ) Details */}
                              {sheetRound === 1 && q && (
                                <div>
                                  <p style={{ fontSize:'0.9rem', marginBottom:'12px', color:'var(--text-primary)' }}>{q.questionText}</p>
                                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'12px' }}>
                                    {q.options?.map((opt, oIdx) => {
                                      const isChosen = ans.submittedAnswer === oIdx
                                      const isCorrectOpt = q.correctOptionIndex === oIdx
                                      let bg = 'var(--bg-elevated)'
                                      let border = 'var(--border-subtle)'
                                      if (isChosen && isCorrectOpt) { bg = 'rgba(74,222,128,0.15)'; border = '#4ade80' }
                                      else if (isChosen && !isCorrectOpt) { bg = 'rgba(239,68,68,0.15)'; border = 'var(--red-bright)' }
                                      else if (isCorrectOpt) { bg = 'rgba(74,222,128,0.08)'; border = 'rgba(74,222,128,0.4)' }

                                      return (
                                        <div key={oIdx} style={{ padding:'8px 12px', borderRadius:'4px', background: bg, border:`1px solid ${border}`, fontSize:'0.82rem' }}>
                                          <span style={{ fontWeight:700, marginRight:'6px' }}>{LETTERS[oIdx]}:</span>
                                          {opt}
                                          {isChosen && <span style={{ marginLeft:'8px', fontWeight:600, fontSize:'0.72rem' }}>(Team's Answer)</span>}
                                          {isCorrectOpt && <span style={{ marginLeft:'8px', color:'#4ade80', fontWeight:600, fontSize:'0.72rem' }}>✓ Correct</span>}
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* ROUND 2 (Output) Details */}
                              {sheetRound === 2 && (
                                <div>
                                  {q?.codeSnippet && (
                                    <div style={{ marginBottom:'10px' }}>
                                      <p style={{ fontSize:'0.72rem', color:'var(--text-dim)', marginBottom:'4px', fontFamily:'var(--font-heading)', textTransform:'uppercase' }}>Code Snippet:</p>
                                      <SyntaxHighlighter language={q.language || 'javascript'} style={vscDarkPlus} customStyle={{ margin:0, padding:'10px 14px', fontSize:'0.8rem', borderRadius:'4px', maxHeight:'140px', overflowY:'auto' }}>
                                        {q.codeSnippet}
                                      </SyntaxHighlighter>
                                    </div>
                                  )}
                                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', fontSize:'0.82rem' }}>
                                    <div>
                                      <p style={{ fontSize:'0.72rem', color:'var(--text-dim)', marginBottom:'4px', fontFamily:'var(--font-heading)' }}>Team's Submitted Output:</p>
                                      <pre style={{ margin:0, padding:'8px 12px', background:'var(--bg-elevated)', border:`1px solid ${isCorrect ? '#4ade80' : 'var(--red-bright)'}`, borderRadius:'4px', fontFamily:'var(--font-mono)', fontSize:'0.82rem', whiteSpace:'pre-wrap' }}>
                                        {String(ans.submittedAnswer ?? 'No output submitted')}
                                      </pre>
                                    </div>
                                    <div>
                                      <p style={{ fontSize:'0.72rem', color:'var(--text-dim)', marginBottom:'4px', fontFamily:'var(--font-heading)' }}>Expected Output:</p>
                                      <pre style={{ margin:0, padding:'8px 12px', background:'rgba(74,222,128,0.08)', border:'1px solid rgba(74,222,128,0.3)', color:'#4ade80', borderRadius:'4px', fontFamily:'var(--font-mono)', fontSize:'0.82rem', whiteSpace:'pre-wrap' }}>
                                        {q?.correctOutput || 'N/A'}
                                      </pre>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* ROUND 3 (Debug) Details */}
                              {sheetRound === 3 && (
                                <div>
                                  {q?.buggyCode && (
                                    <div style={{ marginBottom:'10px' }}>
                                      <p style={{ fontSize:'0.72rem', color:'var(--text-dim)', marginBottom:'4px', fontFamily:'var(--font-heading)', textTransform:'uppercase' }}>Original Buggy Code:</p>
                                      <SyntaxHighlighter language={q.language || 'cpp'} style={vscDarkPlus} customStyle={{ margin:0, padding:'10px 14px', fontSize:'0.8rem', borderRadius:'4px', maxHeight:'120px', overflowY:'auto' }}>
                                        {q.buggyCode}
                                      </SyntaxHighlighter>
                                    </div>
                                  )}
                                  <div style={{ marginBottom:'10px' }}>
                                    <p style={{ fontSize:'0.72rem', color:'var(--text-dim)', marginBottom:'4px', fontFamily:'var(--font-heading)', textTransform:'uppercase' }}>Team's Submitted Code Fix:</p>
                                    <SyntaxHighlighter language={q?.language || 'cpp'} style={vscDarkPlus} customStyle={{ margin:0, padding:'10px 14px', fontSize:'0.8rem', borderRadius:'4px', maxHeight:'180px', overflowY:'auto' }}>
                                      {String(ans.submittedAnswer || 'No code submitted')}
                                    </SyntaxHighlighter>
                                  </div>
                                  {q?.expectedOutput && (
                                    <p style={{ fontSize:'0.78rem', color:'#4ade80' }}>
                                      Expected Behavior / Test Output: <code style={{ fontFamily:'var(--font-mono)', padding:'2px 6px', background:'rgba(74,222,128,0.1)', borderRadius:'3px' }}>{q.expectedOutput}</code>
                                    </p>
                                  )}
                                  {activeSubmission.status === 'pending-review' && (
                                    <div style={{ marginTop:'10px' }}>
                                      <button className="btn btn-amber btn-sm" onClick={() => { setSheetModal(null); openReview(activeSubmission) }}>
                                        Grade This Submission Now
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ display:'flex', justifyContent:'flex-end', paddingTop:'12px', borderTop:'1px solid var(--border-subtle)' }}>
              <button className="btn btn-secondary" onClick={() => setSheetModal(null)}>Close Answer Sheet</button>
            </div>
          </div>
        </div>
      )}

      {/* ── GRADE REVIEW MODAL ── */}
      {reviewModal && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth:'760px', width:'95%' }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ color:'var(--amber-warn)' }}>
                Grade Submission: {reviewModal.userId?.teamName || reviewModal.userId?.name || reviewModal.userId?.username}
              </h2>
              <button onClick={() => setReviewModal(null)} style={{ background:'none', border:'none', color:'var(--text-dim)', cursor:'pointer', fontSize:'1.2rem' }}>✕</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'20px', maxHeight:'70vh', overflowY:'auto' }}>
              {reviewModal.answers.map((ans, idx) => {
                const q = ans.questionId
                const qId = q?._id || ans.questionId
                const score = reviewScores[qId] || { isCorrect: false, pointsAwarded: 0, maxPoints: q?.points || 15 }
                return (
                  <div key={idx} style={{ borderBottom:'1px solid var(--border-subtle)', paddingBottom:'16px' }}>
                    <p style={{ fontFamily:'var(--font-heading)', fontSize:'0.78rem', color:'var(--amber-warn)', letterSpacing:'0.1em', marginBottom:'8px', textTransform:'uppercase' }}>
                      Question {idx + 1}: {q?.title || `Q${idx + 1}`} ({q?.points || 15} pts)
                    </p>
                    {q?.buggyCode && (
                      <div style={{ marginBottom:'10px' }}>
                        <p style={{ fontSize:'0.72rem', color:'var(--text-dim)', marginBottom:'4px' }}>Buggy Code:</p>
                        <SyntaxHighlighter language={q.language} style={vscDarkPlus} customStyle={{ margin:0, padding:'10px', fontSize:'0.78rem', borderRadius:'4px', maxHeight:'120px', overflowY:'auto' }}>
                          {q.buggyCode}
                        </SyntaxHighlighter>
                      </div>
                    )}
                    <div style={{ marginBottom:'10px' }}>
                      <p style={{ fontSize:'0.72rem', color:'var(--text-dim)', marginBottom:'4px' }}>Submitted Answer:</p>
                      <SyntaxHighlighter language={q?.language || 'text'} style={vscDarkPlus} customStyle={{ margin:0, padding:'10px', fontSize:'0.78rem', borderRadius:'4px', maxHeight:'180px', overflowY:'auto' }}>
                        {String(ans.submittedAnswer || '')}
                      </SyntaxHighlighter>
                    </div>
                    {q?.expectedOutput && (
                      <p style={{ fontSize:'0.78rem', color:'#4ade80', marginBottom:'10px' }}>
                        Expected: <code style={{ fontFamily:'var(--font-mono)', padding:'2px 6px', background:'rgba(74,222,128,0.1)', borderRadius:'3px' }}>{q.expectedOutput}</code>
                      </p>
                    )}
                    <div style={{ display:'flex', alignItems:'center', gap:'12px', flexWrap:'wrap' }}>
                      <label style={{ display:'flex', alignItems:'center', gap:'6px', cursor:'pointer', fontFamily:'var(--font-heading)', fontSize:'0.78rem', letterSpacing:'0.05em' }}>
                        <input
                          type="checkbox"
                          checked={score.isCorrect}
                          onChange={e => setReviewScores(s => ({ ...s, [qId]: { ...score, isCorrect: e.target.checked, pointsAwarded: e.target.checked ? score.maxPoints : 0 } }))}
                        />
                        Mark Correct
                      </label>
                      {score.isCorrect && (
                        <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                          <span style={{ fontSize:'0.72rem', color:'var(--text-dim)' }}>Points:</span>
                          <input
                            className="input"
                            type="number"
                            min={0}
                            max={score.maxPoints}
                            value={score.pointsAwarded}
                            onChange={e => setReviewScores(s => ({ ...s, [qId]: { ...score, pointsAwarded: Number(e.target.value) } }))}
                            style={{ width:'70px', padding:'4px 8px', fontSize:'0.82rem' }}
                          />
                          <span style={{ fontSize:'0.72rem', color:'var(--text-dim)' }}>/ {score.maxPoints}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end', marginTop:'16px' }}>
              <button className="btn btn-secondary" onClick={() => setReviewModal(null)}>Cancel</button>
              <button className="btn btn-amber" onClick={handleSaveReview} disabled={reviewSaving}>
                {reviewSaving ? 'Saving...' : '✓ Save Grades'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
