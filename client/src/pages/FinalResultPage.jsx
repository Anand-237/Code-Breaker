import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import GreenDustParticles from '../components/GreenDustParticles'
import { downloadRankingsPdf, getRankingsPdfBlobUrl } from '../utils/clientPdfGenerator'

const POLL_INTERVAL = 3000 // 3 seconds live poll while waiting for participants

export default function FinalResultPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [resultData, setResultData] = useState(null)
  const [activeTab, setActiveTab] = useState('leaderboard') // 'leaderboard' | 'pdf'
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  
  const autoDownloadedRef = useRef(false)

  // Direct client-side PDF download
  const handleDownloadPdf = useCallback(() => {
    try {
      setDownloadingPdf(true)
      const leaderboard = resultData?.leaderboard || []
      const success = downloadRankingsPdf(leaderboard)
      if (!success) {
        // Fallback: direct server link
        const token = sessionStorage.getItem('cb_token') || localStorage.getItem('cb_token')
        const envUrl = import.meta.env.VITE_API_URL || '/api'
        const baseApi = envUrl.replace(/\/$/, '').endsWith('/api') ? envUrl.replace(/\/$/, '') : `${envUrl.replace(/\/$/, '')}/api`
        window.open(`${baseApi}/rounds/rankings-pdf?token=${token}`, '_blank')
      }
    } catch (err) {
      console.error('PDF download error:', err)
    } finally {
      setTimeout(() => setDownloadingPdf(false), 500)
    }
  }, [resultData?.leaderboard])

  // Fetch live contest completion & leaderboard status
  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await api.get('/rounds/final-result')
      setResultData(data)
      setLoading(false)

      // When all participants completed, generate PDF preview and trigger auto-download once
      if (data.allCompleted) {
        const leaderboard = data.leaderboard || []
        const blobUrl = getRankingsPdfBlobUrl(leaderboard)
        if (blobUrl) {
          setPdfBlobUrl(blobUrl)
        }

        if (!autoDownloadedRef.current) {
          autoDownloadedRef.current = true
          downloadRankingsPdf(leaderboard)
        }
      }
    } catch (err) {
      console.error('Final result status error:', err)
      setLoading(false)
    }
  }, [])

  // Auto-poll while not all completed
  useEffect(() => {
    fetchStatus()
    const timer = setInterval(() => {
      if (!resultData?.allCompleted) {
        fetchStatus()
      }
    }, POLL_INTERVAL)
    return () => clearInterval(timer)
  }, [fetchStatus, resultData?.allCompleted])

  // Update PDF preview blob when tab changes to pdf
  useEffect(() => {
    if (activeTab === 'pdf' && resultData?.leaderboard) {
      const url = getRankingsPdfBlobUrl(resultData.leaderboard)
      if (url) {
        setPdfBlobUrl(url)
      }
    }
  }, [activeTab, resultData?.leaderboard])

  if (loading) {
    return (
      <div className="page round-page-centered">
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <p style={{ fontFamily: 'var(--font-heading)', letterSpacing: '0.2em', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
            CHECKING EVENT COMPLETION STATUS...
          </p>
        </div>
      </div>
    )
  }

  const allCompleted = resultData?.allCompleted
  const totalCount = resultData?.totalParticipants || 0
  const completedCount = resultData?.completedParticipants || 0
  const progressPercent = totalCount > 0 ? Math.min(100, Math.round((completedCount / totalCount) * 100)) : 0
  const leaderboard = resultData?.leaderboard || []
  const top1 = leaderboard[0]
  const top2 = leaderboard[1]
  const top3 = leaderboard[2]

  const userToken = sessionStorage.getItem('cb_token') || localStorage.getItem('cb_token') || ''
  const directApiUrl = `/api/rounds/rankings-pdf?token=${userToken}`

  return (
    <div className="page" style={{ minHeight: '100vh', padding: '24px 16px', position: 'relative', overflowX: 'hidden' }}>
      <GreenDustParticles />

      <div style={{ maxWidth: '1080px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Navigation Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/')}>
            ← DASHBOARD
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--text-dim)' }}>
              Logged in: <strong style={{ color: '#4ade80' }}>{user?.teamName || user?.name || user?.username}</strong>
            </span>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────
            CASE A: WAITING FOR ALL PARTICIPANTS TO FINISH ALL ROUNDS
           ───────────────────────────────────────────────────────────────── */}
        {!allCompleted ? (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '30px' }}>
            <div
              className="card card-glow"
              style={{
                width: 'min(100%, 640px)',
                padding: '40px 32px',
                textAlign: 'center',
                borderColor: 'rgba(245, 158, 11, 0.4)',
                boxShadow: '0 0 50px rgba(245, 158, 11, 0.15)',
              }}
            >
              {/* Pulsing Status Pill */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 16px',
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  borderRadius: '20px',
                  marginBottom: '20px',
                }}
              >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', animation: 'pulse 1.5s infinite' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: '#f59e0b', fontWeight: 700, letterSpacing: '0.08em' }}>
                  CONTEST IN PROGRESS • LIVE WAITING ROOM
                </span>
              </div>

              <h1
                className="display-title"
                style={{
                  fontSize: 'clamp(1.8rem, 5vw, 2.4rem)',
                  letterSpacing: '0.08em',
                  background: 'linear-gradient(135deg, #f59e0b, #4ade80)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  marginBottom: '8px',
                }}
              >
                ALL ROUNDS SUBMITTED!
              </h1>

              <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '28px', lineHeight: 1.5 }}>
                Final scores and participant ranks are confidential until all teams finish all rounds.
              </p>

              {/* Live Completion Progress Card */}
              <div
                style={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '24px 20px',
                  marginBottom: '28px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.8rem', letterSpacing: '0.1em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                    Participant Completion Status
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 700, color: '#4ade80' }}>
                    {completedCount} / {totalCount} Teams Finished
                  </span>
                </div>

                {/* Progress Bar */}
                <div style={{ width: '100%', height: '10px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '5px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${progressPercent}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #f59e0b, #4ade80)',
                      borderRadius: '5px',
                      transition: 'width 0.6s ease',
                    }}
                  />
                </div>

                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '12px', textAlign: 'left' }}>
                  ℹ As soon as all {totalCount} participants complete Round 3, the final PDF ranking sheet will automatically download and display on this screen.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-dim)', fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}>
                <div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />
                <span>Checking live submissions automatically every 3 seconds...</span>
              </div>
            </div>
          </div>
        ) : (
          /* ─────────────────────────────────────────────────────────────────
              CASE B: ALL PARTICIPANTS FINISHED — SHOW PDF & LEADERBOARD
             ───────────────────────────────────────────────────────────────── */
          <div style={{ animation: 'fadeIn 400ms ease' }}>
            {/* Header Banner */}
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 18px',
                  background: 'rgba(74, 222, 128, 0.15)',
                  border: '1px solid rgba(74, 222, 128, 0.4)',
                  borderRadius: '20px',
                  marginBottom: '14px',
                }}
              >
                <span style={{ color: '#4ade80', fontSize: '0.85rem' }}>✓</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#4ade80', fontWeight: 700, letterSpacing: '0.08em' }}>
                  EVENT COMPLETED • ALL TEAMS FINISHED
                </span>
              </div>

              <h1
                className="display-title"
                style={{
                  fontSize: 'clamp(2rem, 5vw, 2.8rem)',
                  letterSpacing: '0.08em',
                  background: 'linear-gradient(135deg, #4ade80, #60a5fa)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  marginBottom: '6px',
                }}
              >
                OFFICIAL FINAL RANKINGS
              </h1>

              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', color: 'var(--text-dim)' }}>
                Certified Leaderboard of all {totalCount} participants across 3 Rounds
              </p>

              {/* Quick Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '18px', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary"
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  style={{
                    background: '#4ade80',
                    color: '#000',
                    fontWeight: 800,
                    boxShadow: '0 0 25px rgba(74, 222, 128, 0.45)',
                    padding: '10px 24px',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                  }}
                >
                  {downloadingPdf ? 'Downloading PDF...' : '📥 DOWNLOAD PDF CERTIFICATE'}
                </button>

                {pdfBlobUrl && (
                  <a
                    href={pdfBlobUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary"
                    style={{ padding: '10px 20px', fontSize: '0.92rem' }}
                  >
                    🖨️ OPEN PDF IN NEW TAB
                  </a>
                )}
              </div>
            </div>

            {/* Top 3 Podium Cards */}
            {leaderboard.length >= 2 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                {/* 2nd Place */}
                {top2 && (
                  <div
                    className="card"
                    style={{
                      background: 'rgba(241, 245, 249, 0.05)',
                      borderColor: 'rgba(203, 213, 225, 0.3)',
                      textAlign: 'center',
                      padding: '24px 16px',
                      borderRadius: 'var(--radius-md)',
                      order: 1,
                    }}
                  >
                    <div style={{ fontSize: '2rem', marginBottom: '6px' }}>🥈</div>
                    <div style={{ fontFamily: 'var(--font-heading)', fontSize: '0.8rem', color: '#94a3b8', letterSpacing: '0.1em' }}>2ND PLACE</div>
                    <h3 style={{ fontSize: '1.2rem', color: '#f8fafc', margin: '6px 0 2px' }}>{top2.teamName}</h3>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '12px' }}>@{top2.username}</p>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.8rem', fontWeight: 800, color: '#cbd5e1' }}>
                      {top2.totalScore} <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>/ 100</span>
                    </div>
                  </div>
                )}

                {/* 1st Place Champion */}
                {top1 && (
                  <div
                    className="card"
                    style={{
                      background: 'rgba(254, 240, 138, 0.08)',
                      borderColor: 'rgba(250, 204, 21, 0.5)',
                      boxShadow: '0 0 35px rgba(250, 204, 21, 0.2)',
                      textAlign: 'center',
                      padding: '28px 16px',
                      borderRadius: 'var(--radius-md)',
                      order: 0,
                    }}
                  >
                    <div style={{ fontSize: '2.4rem', marginBottom: '6px' }}>🏆</div>
                    <div style={{ fontFamily: 'var(--font-heading)', fontSize: '0.85rem', color: '#facc15', letterSpacing: '0.12em', fontWeight: 700 }}>
                      1ST PLACE CHAMPION
                    </div>
                    <h2 style={{ fontSize: '1.4rem', color: '#fef08a', margin: '6px 0 2px' }}>{top1.teamName}</h2>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '12px' }}>@{top1.username}</p>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2.2rem', fontWeight: 800, color: '#4ade80' }}>
                      {top1.totalScore} <span style={{ fontSize: '1rem', color: 'var(--text-dim)' }}>/ 100</span>
                    </div>
                  </div>
                )}

                {/* 3rd Place */}
                {top3 && (
                  <div
                    className="card"
                    style={{
                      background: 'rgba(255, 237, 213, 0.05)',
                      borderColor: 'rgba(251, 146, 60, 0.3)',
                      textAlign: 'center',
                      padding: '24px 16px',
                      borderRadius: 'var(--radius-md)',
                      order: 2,
                    }}
                  >
                    <div style={{ fontSize: '2rem', marginBottom: '6px' }}>🥉</div>
                    <div style={{ fontFamily: 'var(--font-heading)', fontSize: '0.8rem', color: '#fb923c', letterSpacing: '0.1em' }}>3RD PLACE</div>
                    <h3 style={{ fontSize: '1.2rem', color: '#f8fafc', margin: '6px 0 2px' }}>{top3.teamName}</h3>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '12px' }}>@{top3.username}</p>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.8rem', fontWeight: 800, color: '#fdba74' }}>
                      {top3.totalScore} <span style={{ fontSize: '0.9rem', color: 'var(--text-dim)' }}>/ 100</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Display Switch Tabs: Leaderboard vs PDF Document */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
              <button
                className={`btn btn-sm ${activeTab === 'leaderboard' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('leaderboard')}
                style={activeTab === 'leaderboard' ? { background: '#4ade80', color: '#000', fontWeight: 700 } : {}}
              >
                📊 LEADERBOARD TABLE ({leaderboard.length})
              </button>
              <button
                className={`btn btn-sm ${activeTab === 'pdf' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('pdf')}
                style={activeTab === 'pdf' ? { background: '#4ade80', color: '#000', fontWeight: 700 } : {}}
              >
                📄 PDF RANKING SHEET PREVIEW
              </button>
            </div>

            {/* TAB 1: LEADERBOARD TABLE */}
            {activeTab === 'leaderboard' && (
              <div className="card" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ background: '#0f172a', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)', fontFamily: 'var(--font-heading)', fontSize: '0.75rem', letterSpacing: '0.08em' }}>
                        <th style={{ padding: '14px 16px', textAlign: 'center' }}>RANK</th>
                        <th style={{ padding: '14px 16px' }}>TEAM / PARTICIPANT</th>
                        <th style={{ padding: '14px 16px' }}>USERNAME</th>
                        <th style={{ padding: '14px 16px', textAlign: 'center' }}>ROUND 1 (/30)</th>
                        <th style={{ padding: '14px 16px', textAlign: 'center' }}>ROUND 2 (/30)</th>
                        <th style={{ padding: '14px 16px', textAlign: 'center' }}>ROUND 3 (/40)</th>
                        <th style={{ padding: '14px 16px', textAlign: 'center', color: '#4ade80' }}>TOTAL (/100)</th>
                        <th style={{ padding: '14px 16px', textAlign: 'center' }}>ACCURACY</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((p, idx) => {
                        const isMe = p.userId === user?._id || p.userId === user?.id
                        const rank = idx + 1
                        const isGold = rank === 1
                        const isSilver = rank === 2
                        const isBronze = rank === 3

                        return (
                          <tr
                            key={p.userId || idx}
                            style={{
                              background: isMe ? 'rgba(74, 222, 128, 0.1)' : idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)',
                              borderBottom: '1px solid var(--border-subtle)',
                              fontWeight: isMe ? 700 : 400,
                            }}
                          >
                            <td style={{ padding: '14px 16px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 800 }}>
                              {isGold ? '🥇 #1' : isSilver ? '🥈 #2' : isBronze ? '🥉 #3' : `#${rank}`}
                            </td>
                            <td style={{ padding: '14px 16px' }}>
                              <span style={{ color: isMe ? '#4ade80' : 'var(--text-primary)', fontWeight: isMe ? 800 : 600 }}>
                                {p.teamName || p.name || p.username}
                              </span>
                              {isMe && (
                                <span style={{ marginLeft: '8px', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: '#4ade80', color: '#000', fontWeight: 700 }}>
                                  YOU
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '14px 16px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                              @{p.username}
                            </td>
                            <td style={{ padding: '14px 16px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                              {p.roundScores?.[1] ?? 0}
                            </td>
                            <td style={{ padding: '14px 16px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                              {p.roundScores?.[2] ?? 0}
                            </td>
                            <td style={{ padding: '14px 16px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                              {p.roundScores?.[3] ?? 0}
                            </td>
                            <td style={{ padding: '14px 16px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 800, color: '#4ade80' }}>
                              {p.totalScore}
                            </td>
                            <td style={{ padding: '14px 16px', textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                              {Math.round((p.totalScore / 100) * 100)}%
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 2: EMBEDDED PDF DOCUMENT PREVIEW */}
            {activeTab === 'pdf' && (
              <div className="card" style={{ padding: '16px', background: '#0f172a', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.88rem', color: '#4ade80', fontWeight: 700 }}>
                      📄 Official PDF Certificate Document
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={handleDownloadPdf}
                      disabled={downloadingPdf}
                      style={{ background: '#4ade80', color: '#000', fontWeight: 700, padding: '8px 16px' }}
                    >
                      {downloadingPdf ? 'Downloading...' : '📥 DOWNLOAD PDF'}
                    </button>
                    {pdfBlobUrl && (
                      <a
                        href={pdfBlobUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-sm btn-secondary"
                        style={{ padding: '8px 14px' }}
                      >
                        🖨️ Open in New Tab
                      </a>
                    )}
                  </div>
                </div>

                {pdfBlobUrl ? (
                  <div style={{ width: '100%', borderRadius: '8px', overflow: 'hidden', background: '#fff' }}>
                    <iframe
                      src={pdfBlobUrl}
                      title="Code Breakers Final Rankings PDF"
                      style={{
                        width: '100%',
                        height: '750px',
                        border: 'none',
                        display: 'block',
                      }}
                    />
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', gap: '16px' }}>
                    <div className="spinner" />
                    <p style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>Loading official PDF ranking certificate...</p>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={handleDownloadPdf}
                    >
                      Click here to Download PDF directly
                    </button>
                  </div>
                )}

                <div style={{ marginTop: '14px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                  💡 Having trouble viewing the PDF preview?{' '}
                  <button
                    onClick={handleDownloadPdf}
                    style={{ background: 'none', border: 'none', color: '#4ade80', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
                  >
                    Click here to save the PDF file directly to your device
                  </button>.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
