import { useState, useEffect, useRef } from 'react'

export default function RealtimeTimer({
  initialSeconds = null,
  unlockedAt = null,
  durationMinutes = null,
  onExpire = null,
  label = 'TIME REMAINING',
  showBar = true,
  compact = false,
}) {
  const expiredRef = useRef(false)

  // Calculate target deadline timestamp (ms)
  const getDeadline = () => {
    if (unlockedAt && durationMinutes) {
      return new Date(unlockedAt).getTime() + durationMinutes * 60 * 1000
    }
    if (initialSeconds !== null) {
      return Date.now() + initialSeconds * 1000
    }
    return null
  }

  const deadlineMs = getDeadline()

  const calculateRemaining = () => {
    if (!deadlineMs) return null
    const diff = Math.max(0, Math.floor((deadlineMs - Date.now()) / 1000))
    return diff
  }

  const [secondsLeft, setSecondsLeft] = useState(calculateRemaining)

  useEffect(() => {
    if (!deadlineMs) return

    const initialRem = calculateRemaining()
    setSecondsLeft(initialRem)

    const timer = setInterval(() => {
      const rem = calculateRemaining()
      setSecondsLeft(rem)

      if (rem === 0 && !expiredRef.current) {
        expiredRef.current = true
        if (onExpire) onExpire()
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [unlockedAt, durationMinutes, initialSeconds])

  if (secondsLeft === null) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: compact ? '0.78rem' : '0.9rem', color: 'var(--text-muted)' }}>
        
        <span>UNLIMITED TIME</span>
      </div>
    )
  }

  // Formatting MM:SS or HH:MM:SS
  const formatTime = (totalSec) => {
    const hrs = Math.floor(totalSec / 3600)
    const mins = Math.floor((totalSec % 3600) / 60)
    const secs = totalSec % 60

    const pad = (n) => String(n).padStart(2, '0')
    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`
    }
    return `${pad(mins)}:${pad(secs)}`
  }

  const totalDurationSec = durationMinutes ? durationMinutes * 60 : (initialSeconds || 3600)
  const percent = Math.min(100, Math.max(0, (secondsLeft / totalDurationSec) * 100))

  const isLow = secondsLeft <= 300 // < 5 mins (Royal Gold)
  const isCritical = secondsLeft <= 60 // < 1 min (Red warning)

  const colorClass = isCritical
    ? 'text-red flicker'
    : isLow
    ? 'text-amber'
    : 'glow-text'

  const barColor = isCritical
    ? 'var(--red-bright)'
    : isLow
    ? 'var(--gold-royal)'
    : 'var(--green-core)'

  if (compact) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontFamily: 'var(--font-mono)' }}>
        
        <span className={colorClass} style={{ fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.05em' }}>
          {formatTime(secondsLeft)}
        </span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'var(--font-mono)' }}>
        <span style={{ fontSize: '0.75rem', letterSpacing: '0.12em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
          {label}
        </span>
        <span className={colorClass} style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '0.08em' }}>
          {formatTime(secondsLeft)}
        </span>
      </div>

      {showBar && (
        <div style={{ height: '6px', width: '100%', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${percent}%`,
              background: barColor,
              boxShadow: `0 0 10px ${barColor}`,
              transition: 'width 1s linear',
            }}
          />
        </div>
      )}
    </div>
  )
}
