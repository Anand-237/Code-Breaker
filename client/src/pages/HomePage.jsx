import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import RealtimeTimer from '../components/RealtimeTimer'
import GreenDustParticles from '../components/GreenDustParticles'

const POLL_INTERVAL = 4000 // 4 seconds for fast live status updates

const SECTOR_INFO = {
  1: { label: 'Round 1', subtitle: 'Basic', desc: '15 Questions • 2 Marks Each • Maximum 30 Marks', icon: '', type: 'Basic', rank: 'A', suit: '' },
  2: { label: 'Round 2', subtitle: 'Intermediate', desc: '10 Questions • 3 Marks Each • Maximum 30 Marks', icon: '', type: 'Intermediate', rank: 'K', suit: '' },
  3: { label: 'Round 3', subtitle: 'Advanced', desc: '5 Questions • 8 Marks Each • Maximum 40 Marks', icon: '', type: 'Advanced', rank: 'Q', suit: '' },
}

export default function HomePage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [rounds, setRounds] = useState([])
  const [loadingRounds, setLoadingRounds] = useState(true)
  const [activeModalRound, setActiveModalRound] = useState(null)

  /* ── Cinematic Entrance Sequence State ── */
  const [introPhase, setIntroPhase] = useState('receding')

  /* ── In-Place Centered 3D Card Flip State ── */
  const [tiltStyles, setTiltStyles] = useState({})
  const [selectedCardNum, setSelectedCardNum] = useState(null)
  const [cardStep, setCardStep] = useState(null)

  useEffect(() => {
    if (introPhase === 'receding') {
      const timer = setTimeout(() => {
        setIntroPhase('done')
      }, 2800)
      return () => clearTimeout(timer)
    }
  }, [introPhase])

  const fetchData = useCallback(async () => {
    try {
      const { data } = await api.get('/rounds/status')
      setRounds(data.rounds)
    } catch (err) {
      console.error('fetchData error:', err)
    } finally {
      setLoadingRounds(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [fetchData])

  const getRoundData = (num) => rounds.find((r) => r.round === num) || {}

  const handleEnter = (roundNum, roundData) => {
    if (!roundData.isUnlocked || roundData.submitted) return
    navigate(`/round/${roundNum}`)
  }

  const handleMouseMove = (e, num) => {
    if (selectedCardNum || introPhase !== 'done') return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2)
    const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2)
    setTiltStyles((prev) => ({
      ...prev,
      [num]: {
        transform: `perspective(1000px) rotateX(${-y * 10}deg) rotateY(${x * 10}deg) translateZ(16px) translateY(-8px) scale(1.03)`,
      },
    }))
  }

  const handleMouseLeave = (num) => {
    if (selectedCardNum || introPhase !== 'done') return
    setTiltStyles((prev) => ({
      ...prev,
      [num]: {
        transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px) translateY(0px) scale(1)',
      },
    }))
  }

  const handleCardClick = (num) => {
    if (selectedCardNum || activeModalRound || introPhase !== 'done') return

    fetchData()

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      setActiveModalRound(num)
      return
    }

    setSelectedCardNum(num)
    setCardStep('focus')

    setTimeout(() => {
      setCardStep('energy')
    }, 250)

    setTimeout(() => {
      setCardStep('flipping')
    }, 600)

    setTimeout(() => {
      setCardStep('burst')
    }, 1200)

    setTimeout(() => {
      setActiveModalRound(num)
      setSelectedCardNum(null)
      setCardStep(null)
    }, 1400)
  }

  const selectedModalInfo = activeModalRound ? SECTOR_INFO[activeModalRound] : null
  const selectedModalData = activeModalRound ? getRoundData(activeModalRound) : null
  const allSubmitted = rounds.length === 3 && rounds.every((r) => r.submitted)

  return (
    <div className="home-page-wrapper">
      {/* Background Artwork */}
      <div
        className={introPhase === 'receding' ? 'bg-receding' : ''}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          backgroundImage: 'url(/client_bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          opacity: 1,
          pointerEvents: 'none',
        }}
      />
      <GreenDustParticles />

      {/* Header Navbar */}
      <nav className="home-navbar">
        <div />

        <div className={`home-nav-user ${introPhase === 'receding' ? 'entry-right' : ''}`}>
          {user?.role === 'admin' && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/admin/round-control')}
              style={{ borderColor: 'var(--amber-warn)', color: 'var(--amber-warn)', fontSize: '0.75rem' }}
            >
              ⚙️ ADMIN PANEL
            </button>
          )}
          {allSubmitted && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => navigate('/final-result')}
              style={{ background: '#4ade80', color: '#000', fontWeight: 700 }}
            >
              VIEW FINAL RANKINGS & PDF
            </button>
          )}
          <div style={{ textAlign: 'right' }}>
            <p className="home-nav-username">{user?.teamName || user?.name || user?.username}</p>
          </div>
          <button className="btn btn-secondary btn-sm home-evacuate-btn" onClick={logout} id="logout-btn">
            LOGOUT
          </button>
        </div>
      </nav>

      <div className="home-layout-container">
        <main className="home-main-content">
          <div className={`home-hero-container ${introPhase === 'receding' ? 'entry-left' : ''}`}>
            <h1 className="display-title home-hero-title">CODE BREAKERS</h1>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
              3 ROUNDS • 100 MARKS TOTAL
            </p>
          </div>

          {loadingRounds ? (
            <div className="poker-cards-container">
              {[1, 2, 3].map((i) => (
                <div key={i} className="poker-card locked" style={{ height: '380px', animation: 'pulse 1.5s ease infinite' }} />
              ))}
            </div>
          ) : (
            <div className="poker-cards-container">
              {[1, 2, 3].map((num) => {
                const info = SECTOR_INFO[num]
                const roundData = getRoundData(num)
                const isCompleted = roundData.submitted
                const isUnlocked = roundData.isUnlocked

                let cardStatusClass = 'poker-card'

                if (introPhase === 'receding') {
                  if (num === 1) cardStatusClass += ' entry-left'
                  else if (num === 2) cardStatusClass += ' entry-center'
                  else if (num === 3) cardStatusClass += ' entry-right'
                } else if (introPhase === 'done') {
                  cardStatusClass += ` poker-card-float-${num}`
                }

                if (isCompleted) cardStatusClass += ' completed'
                else if (isUnlocked) cardStatusClass += ' unlocked'
                else cardStatusClass += ' locked'

                const isSelected = selectedCardNum === num
                const isDimmed = selectedCardNum !== null && !isSelected

                if (isSelected) {
                  if (cardStep === 'focus' || cardStep === 'energy') cardStatusClass += ' focus'
                  else if (cardStep === 'flipping' || cardStep === 'burst') cardStatusClass += ' flipping'
                } else if (isDimmed) {
                  cardStatusClass += ' dimmed'
                }

                return (
                  <div
                    key={num}
                    id={`poker-card-${num}`}
                    className={cardStatusClass}
                    style={isSelected ? {} : tiltStyles[num] || {}}
                    onMouseMove={(e) => handleMouseMove(e, num)}
                    onMouseLeave={() => handleMouseLeave(num)}
                    onClick={() => handleCardClick(num)}
                    title={`Click to open ${info.label}`}
                  >
                    <div className="card-top-round-badge">ROUND {num}</div>

                    {isSelected && (cardStep === 'energy' || cardStep === 'flipping') && (
                      <>
                        <div className="card-doom-aura" />
                        <div className="card-gold-ring" />
                      </>
                    )}

                    {isSelected && cardStep === 'burst' && <div className="card-impact-burst" />}

                    <img src="/poker_card.png" alt={`Poker Card ${info.label}`} className="poker-card-img" />
                  </div>
                )
              })}
            </div>
          )}
        </main>

        {/* Modal */}
        {activeModalRound && selectedModalInfo && (
          <div className="poker-modal-backdrop" onClick={() => setActiveModalRound(null)}>
            <div className="poker-modal-card" onClick={(e) => e.stopPropagation()}>
              <button className="poker-modal-close" onClick={() => setActiveModalRound(null)} title="Close">
                ✕
              </button>

              <div className="poker-modal-header">
                <img src="/poker_card.png" alt="Poker Card" className="poker-modal-card-img" />
                <p className="poker-trial-tag" style={{ fontSize: '0.85rem' }}>
                  {selectedModalInfo.label} &nbsp;•&nbsp; {selectedModalInfo.type}
                </p>
                <h2 className="display-title" style={{ fontSize: '2rem', color: '#00ff88', marginTop: '4px' }}>
                  {selectedModalInfo.subtitle}
                </h2>
              </div>

              <div className="poker-modal-details">
                <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '16px', lineHeight: '1.5', textAlign: 'center' }}>
                  {selectedModalInfo.desc}
                </p>

                {selectedModalData?.submitted ? (
                  <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(74, 222, 128, 0.1)', borderRadius: '8px', border: '1px solid rgba(74, 222, 128, 0.3)' }}>
                    <p style={{ color: '#4ade80', fontWeight: 700, fontSize: '1.1rem', fontFamily: 'var(--font-heading)' }}>✓ ROUND COMPLETED</p>
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginTop: '4px' }}>
                      Your answers have been submitted. Final score will be shown on completion of all rounds.
                    </p>
                  </div>
                ) : selectedModalData?.isUnlocked ? (
                  <div>
                    {selectedModalData.durationMinutes || selectedModalData.timeRemainingSeconds > 0 ? (
                      <RealtimeTimer
                        unlockedAt={selectedModalData.unlockedAt}
                        durationMinutes={selectedModalData.durationMinutes}
                        initialSeconds={selectedModalData.timeRemainingSeconds}
                        label="TIME REMAINING FOR THIS ROUND"
                      />
                    ) : (
                      <p style={{ textAlign: 'center', color: '#00ff88', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                        ✓ Round unlocked. Ready to start!
                      </p>
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(159, 169, 178, 0.08)', borderRadius: '8px' }}>
                    <p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.88rem' }}>
                      ROUND LOCKED
                    </p>
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.78rem', marginTop: '4px' }}>
                      Awaiting admin unlock.
                    </p>
                  </div>
                )}
              </div>

              {/* Action Button */}
              {selectedModalData?.submitted ? (
                <button
                  className="poker-modal-start-btn"
                  style={{ background: 'linear-gradient(135deg, #1f2a24 0%, #111a15 100%)', color: '#4ade80', border: '1px solid #4ade80', animation: 'none' }}
                  onClick={() => {
                    setActiveModalRound(null)
                    navigate('/final-result')
                  }}
                >
                  ✓ VIEW EVENT STATUS & PDF RANKINGS
                </button>
              ) : selectedModalData?.isUnlocked ? (
                <button id={`start-sector-${activeModalRound}`} className="poker-modal-start-btn" onClick={() => handleEnter(activeModalRound, selectedModalData)}>
                  START ROUND {activeModalRound} →
                </button>
              ) : (
                <button className="poker-modal-start-btn" style={{ opacity: 0.5, cursor: 'not-allowed', background: '#111a15', color: '#697682', animation: 'none' }} disabled>
                  ROUND LOCKED
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
