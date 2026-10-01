import { useState, useEffect, useCallback } from 'react'
import api from '../api/axios'

export default function LeaderboardSidebar() {
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchLeaderboard = useCallback(async () => {
    try {
      const { data } = await api.get('/leaderboard/top3')
      setLeaderboard(data.leaderboard || [])
      setLastUpdated(new Date())
    } catch (err) {
      console.warn('Failed to fetch sidebar leaderboard:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLeaderboard()
    const interval = setInterval(fetchLeaderboard, 8000) // Poll every 8 seconds
    return () => clearInterval(interval)
  }, [fetchLeaderboard])

  const getRankStyle = (index) => {
    switch (index) {
      case 0:
        return {
          icon: '',
          badgeBg: 'linear-gradient(135deg, #ffe57f 0%, #ffb300 100%)',
          badgeColor: '#1e1b4b',
          cardBg: 'linear-gradient(135deg, rgba(255, 215, 0, 0.12) 0%, rgba(20, 25, 40, 0.85) 100%)',
          borderColor: 'rgba(255, 215, 0, 0.6)',
          glow: '0 0 20px rgba(255, 215, 0, 0.35)',
          tag: '1st PLACE'
        }
      case 1:
        return {
          icon: '',
          badgeBg: 'linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%)',
          badgeColor: '#0f172a',
          cardBg: 'linear-gradient(135deg, rgba(226, 232, 240, 0.08) 0%, rgba(20, 25, 40, 0.85) 100%)',
          borderColor: 'rgba(226, 232, 240, 0.5)',
          glow: '0 0 15px rgba(226, 232, 240, 0.25)',
          tag: '2nd PLACE'
        }
      case 2:
        return {
          icon: '',
          badgeBg: 'linear-gradient(135deg, #fde68a 0%, #b45309 100%)',
          badgeColor: '#ffffff',
          cardBg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(20, 25, 40, 0.85) 100%)',
          borderColor: 'rgba(245, 158, 11, 0.5)',
          glow: '0 0 15px rgba(245, 158, 11, 0.25)',
          tag: '3rd PLACE'
        }
      default:
        return {
          icon: `#${index + 1}`,
          badgeBg: 'rgba(52, 211, 153, 0.2)',
          badgeColor: '#34d399',
          cardBg: 'rgba(15, 23, 42, 0.75)',
          borderColor: 'rgba(52, 211, 153, 0.25)',
          glow: '0 0 10px rgba(16, 185, 129, 0.15)',
          tag: `RANK ${index + 1}`
        }
    }
  }

  return (
    <aside className={`leaderboard-sidebar-wrapper ${collapsed ? 'collapsed' : ''}`}>
      {/* Container Box */}
      <div className="leaderboard-sidebar-inner">
        {/* Toggle Collapse Button (Desktop Only) */}
        <button
          className="leaderboard-toggle-btn"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand Leaderboard' : 'Collapse Sidebar'}
        >
          {collapsed ? '<' : '>'}
        </button>

        {(!collapsed || window.innerWidth < 1024) && (
          <>
            {/* Header */}
            <div className="leaderboard-header">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '0.78rem',
                  letterSpacing: '0.12em',
                  color: '#ffffff',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  TOP OPERATORS
                </span>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.62rem',
                  color: '#34d399',
                  background: 'rgba(52, 211, 153, 0.15)',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  border: '1px solid rgba(52, 211, 153, 0.3)',
                  fontFamily: 'var(--font-mono)'
                }}>
                  <span className="live-dot" style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#34d399',
                    boxShadow: '0 0 8px #34d399'
                  }} />
                  LIVE
                </span>
              </div>
              <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-mono)' }}>
                Realtime Tactical Standings
              </span>
            </div>

            {/* Leaderboard Cards List */}
            <div style={{
              flex: 1,
              padding: '14px 12px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
                  <div className="spinner" style={{ margin: '0 auto 12px', width: '20px', height: '20px' }} />
                  Decrypting standings...
                </div>
              ) : leaderboard.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '30px 12px',
                  background: 'rgba(15, 23, 42, 0.4)',
                  borderRadius: '12px',
                  border: '1px dashed rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '0.78rem'
                }}>
                  Awaiting first trial submissions...
                </div>
              ) : (
                leaderboard.map((item, idx) => {
                  const styleInfo = getRankStyle(idx)
                  const displayName = item.teamName || item.name || item.username

                  return (
                    <div
                      key={item.userId || idx}
                      style={{
                        position: 'relative',
                        padding: '10px 12px',
                        borderRadius: '12px',
                        background: styleInfo.cardBg,
                        border: `1px solid ${styleInfo.borderColor}`,
                        boxShadow: styleInfo.glow,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        transition: 'transform 200ms ease, boxShadow 200ms ease',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Rank Icon / Badge */}
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '10px',
                        background: styleInfo.badgeBg,
                        color: styleInfo.badgeColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '800',
                        fontSize: '0.9rem',
                        flexShrink: 0,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                      }}>
                        {styleInfo.icon}
                      </div>

                      {/* Team Name Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '0.82rem',
                          fontWeight: '700',
                          color: '#ffffff',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {displayName}
                        </div>
                        <div style={{
                          fontSize: '0.62rem',
                          color: 'rgba(255,255,255,0.5)',
                          fontFamily: 'var(--font-mono)'
                        }}>
                          {styleInfo.tag}
                        </div>
                      </div>

                      {/* Score Badge */}
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{
                          fontSize: '0.95rem',
                          fontWeight: '900',
                          fontFamily: 'var(--font-heading)',
                          color: idx === 0 ? '#ffd700' : '#34d399',
                          textShadow: idx === 0 ? '0 0 10px rgba(255,215,0,0.5)' : '0 0 8px rgba(52,211,153,0.4)'
                        }}>
                          {item.cumulative ?? 0}
                        </div>
                        <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>
                          PTS
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Footer timestamp */}
            {lastUpdated && (
              <div style={{
                padding: '8px 14px',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(0,0,0,0.2)',
                fontSize: '0.62rem',
                color: 'rgba(255,255,255,0.4)',
                textAlign: 'center',
                fontFamily: 'var(--font-mono)'
              }}>
                Auto-synced at {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  )
}
