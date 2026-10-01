import { useState, useEffect } from 'react'
import api from '../../api/axios'
import { useToast } from '../../context/ToastContext'

const ROUNDS = [
  { num: 1, label: 'Trial I — The Reckoning', desc: 'MCQ Quiz', icon: '', color: 'var(--red-bright)' },
  { num: 2, label: 'Trial II — Decode or Die', desc: 'Find the Output', icon: '', color: 'var(--amber-warn)' },
  { num: 3, label: 'Trial III — The Final Breach', desc: 'Debug the Code', icon: '', color: '#4ade80' },
]

export default function AdminRoundControl() {
  const toast = useToast()
  const [controls, setControls] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState({})
  const [durations, setDurations] = useState({}) // { 1: '60', 2: '45', 3: '30' }

  const fetchControls = async () => {
    try {
      const { data } = await api.get('/admin/round-control')
      setControls(data.controls)
      const d = {}
      data.controls.forEach(c => { d[c.round] = c.durationMinutes ? String(c.durationMinutes) : '' })
      setDurations(d)
    } catch { toast.error('Failed to load round control') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchControls() }, [])

  const getControl = (round) => controls.find(c => c.round === round) || { round, isUnlocked: false, durationMinutes: null }

  const handleToggle = async (round, currentState) => {
    setSaving(s => ({ ...s, [round]: true }))
    try {
      const payload = { isUnlocked: !currentState }
      const dur = parseInt(durations[round], 10)
      if (!isNaN(dur) && dur > 0) payload.durationMinutes = dur
      await api.patch(`/admin/round-control/${round}`, payload)
      toast.success(`Round ${round} ${!currentState ? 'UNLOCKED' : 'LOCKED'}`)
      fetchControls()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update')
    } finally { setSaving(s => ({ ...s, [round]: false })) }
  }

  const handleSetDuration = async (round) => {
    const dur = parseInt(durations[round], 10)
    if (isNaN(dur) || dur <= 0) {
      // Clear duration
      try {
        await api.patch(`/admin/round-control/${round}`, { durationMinutes: null })
        toast.success('Time limit cleared')
        fetchControls()
      } catch { toast.error('Failed to update') }
      return
    }
    try {
      await api.patch(`/admin/round-control/${round}`, { durationMinutes: dur })
      toast.success(`Round ${round} time limit set to ${dur} minutes`)
      fetchControls()
    } catch { toast.error('Failed to set duration') }
  }

  return (
    <div style={{ animation:'fadeIn 300ms ease' }}>
      <div style={{ marginBottom:'28px' }}>
        <h1 style={{ fontFamily:'var(--font-heading)', fontSize:'1.5rem', letterSpacing:'0.08em', marginBottom:'4px' }}>ROUND CONTROL</h1>
        <p style={{ color:'var(--text-dim)', fontSize:'0.82rem' }}>
          Lock or unlock sectors. Participants see changes within 20 seconds (polling interval).
        </p>
      </div>

      {/* Warning Banner */}
      <div style={{ marginBottom:'24px', padding:'14px 18px', background:'rgba(255,140,0,0.08)', border:'1px solid rgba(255,140,0,0.25)', borderRadius:'var(--radius-md)', display:'flex', alignItems:'center', gap:'12px' }}>
        
        <p style={{ fontSize:'0.82rem', color:'var(--amber-warn)', fontFamily:'var(--font-heading)', letterSpacing:'0.05em' }}>
          Unlocking a round cannot be undone by participants — they will immediately gain access.
          Locking again only prevents new access; submitted answers are preserved.
        </p>
      </div>

      {loading ? (
        <div style={{ display:'flex', alignItems:'center', gap:'12px', padding:'40px 0' }}>
          <div className="spinner" style={{ width:'24px', height:'24px' }} />
          <span style={{ color:'var(--text-dim)', fontFamily:'var(--font-heading)', letterSpacing:'0.1em', fontSize:'0.8rem' }}>Loading...</span>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
          {ROUNDS.map(r => {
            const ctrl = getControl(r.num)
            const isUnlocked = ctrl.isUnlocked
            const isSaving = saving[r.num]

            return (
              <div
                key={r.num}
                className="card"
                style={{
                  borderColor: isUnlocked ? r.color.replace('var(--', '').replace(')', '') === 'red-bright' ? 'rgba(225,29,46,0.4)' : 'rgba(74,222,128,0.3)' : 'var(--border-subtle)',
                  boxShadow: isUnlocked ? `0 0 20px ${r.color}22` : 'none',
                  transition:'all 0.3s ease'
                }}
              >
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'16px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
                    <span style={{ fontSize:'1.8rem', filter: isUnlocked ? 'none' : 'grayscale(100%)' }}>{r.icon}</span>
                    <div>
                      <p style={{ fontFamily:'var(--font-heading)', fontSize:'1rem', letterSpacing:'0.06em', color: isUnlocked ? r.color : 'var(--text-primary)' }}>
                        {r.label}
                      </p>
                      <p style={{ fontSize:'0.78rem', color:'var(--text-dim)', fontFamily:'var(--font-mono)' }}>{r.desc}</p>
                      {ctrl.unlockedAt && isUnlocked && (
                        <p style={{ fontSize:'0.72rem', color:'var(--text-dim)', marginTop:'2px' }}>
                          Unlocked at {new Date(ctrl.unlockedAt).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </div>

                  <div style={{ display:'flex', alignItems:'center', gap:'16px', flexWrap:'wrap' }}>
                    {/* Duration input */}
                    <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        placeholder="No limit"
                        value={durations[r.num] || ''}
                        onChange={e => setDurations(d => ({ ...d, [r.num]: e.target.value }))}
                        style={{ width:'100px', fontSize:'0.82rem', padding:'6px 10px' }}
                        title="Time limit in minutes (blank = no limit)"
                      />
                      <span style={{ fontSize:'0.72rem', color:'var(--text-dim)', fontFamily:'var(--font-heading)', letterSpacing:'0.08em', textTransform:'uppercase' }}>min</span>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleSetDuration(r.num)}
                        style={{ fontSize:'0.72rem' }}
                      >
                        Set
                      </button>
                    </div>

                    {/* Status + Toggle */}
                    <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                      <span className={`badge ${isUnlocked ? 'badge-green' : 'badge-red'}`} style={{ animation: isUnlocked ? 'none' : 'sirenPulse 1.8s ease infinite' }}>
                        {isUnlocked ? 'UNLOCKED' : 'LOCKED'}
                      </span>
                      <button
                        id={`toggle-round-${r.num}`}
                        className={`btn ${isUnlocked ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                        onClick={() => handleToggle(r.num, isUnlocked)}
                        disabled={isSaving}
                        style={{
                          boxShadow: !isUnlocked ? 'var(--shadow-red)' : 'none',
                          minWidth:'100px'
                        }}
                      >
                        {isSaving ? '...' : isUnlocked ? 'LOCK' : 'UNLOCK'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Duration info */}
                {ctrl.durationMinutes && (
                  <div style={{ marginTop:'12px', padding:'8px 14px', background:'rgba(255,140,0,0.06)', borderRadius:'var(--radius-sm)', fontSize:'0.78rem', color:'var(--amber-warn)', fontFamily:'var(--font-mono)' }}>
                    Time limit: {ctrl.durationMinutes} minutes
                    {ctrl.unlockedAt && isUnlocked && (
                      <> · Expires at {new Date(new Date(ctrl.unlockedAt).getTime() + ctrl.durationMinutes * 60000).toLocaleTimeString()}</>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
