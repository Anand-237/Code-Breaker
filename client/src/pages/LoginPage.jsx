import { useState, useRef, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function LoginPage() {
  const { login, logout, user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const videoRef = useRef(null)

  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  
  const [isAnimating, setIsAnimating] = useState(false)
  const [isPlayingVideo, setIsPlayingVideo] = useState(false)

  // Handle video playback reliably whenever isPlayingVideo becomes true
  useEffect(() => {
    if (isPlayingVideo && videoRef.current) {
      videoRef.current.currentTime = 0
      videoRef.current.muted = true
      const playPromise = videoRef.current.play()
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Autoplay fallback:', err)
          if (videoRef.current) {
            videoRef.current.play().catch(() => {})
          }
        })
      }
    }
  }, [isPlayingVideo])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.username.trim() || !form.password.trim()) {
      setError('Both fields are required')
      return
    }

    setLoading(true)
    try {
      // 1. Verify credentials & authenticate
      const loggedUser = await login(form.username, form.password)
      toast.success('ACCESS GRANTED! Deploying protocol...')

      // Lock redirect guard so component remains mounted for transition
      setIsAnimating(true)
      setIsPlayingVideo(true)

      // 2. Play video transition cleanly
      await new Promise((resolve) => {
        let resolved = false
        const done = () => {
          if (!resolved) {
            resolved = true
            resolve()
          }
        }

        // Safety timer matching transition video length (2.5 seconds)
        const timer = setTimeout(done, 2500)

        if (videoRef.current) {
          videoRef.current.onended = () => {
            clearTimeout(timer)
            done()
          }
        }
      })

      // 3. Clean transition to target page
      setIsPlayingVideo(false)
      setIsAnimating(false)

      const targetPath = (loggedUser?.role === 'admin' || user?.role === 'admin') ? '/admin/round-control' : '/'
      navigate(targetPath, { replace: true })
    } catch (err) {
      // Map HTTP status codes to human-readable messages
      const status = err.response?.status
      const serverMsg = err.response?.data?.message
      let friendlyMsg
      if (!err.response) {
        friendlyMsg = 'Unable to connect to the server. Check your network.'
      } else if (status === 400) {
        friendlyMsg = serverMsg || 'Username and password are required.'
      } else if (status === 401) {
        friendlyMsg = 'Invalid username or password.'
      } else if (status === 403) {
        friendlyMsg = serverMsg || 'Account deactivated. Contact admin.'
      } else if (status === 429) {
        friendlyMsg = 'Too many login attempts. Please wait a few minutes and try again.'
      } else {
        friendlyMsg = serverMsg || 'Server error. Please try again.'
      }
      setError(friendlyMsg)
      toast.error(friendlyMsg)
      setLoading(false)
      setIsAnimating(false)
      setIsPlayingVideo(false)
    }
  }

  return (
    <div className="page" style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', padding:'24px', position:'relative', overflow:'hidden' }}>
      {/* Full-Screen Video Transition Container */}
      {isPlayingVideo && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: '#040d1a',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <video
            ref={videoRef}
            src="/doom_transition.mp4"
            preload="auto"
            autoPlay
            muted
            playsInline
            style={{
              width: '100vw',
              height: '100vh',
              objectFit: 'cover'
            }}
          />
        </div>
      )}

      {/* Full-screen Background Artwork */}
      <div style={{
        position:'fixed', inset: 0, zIndex: 0,
        backgroundImage:'url(/doom_bg.jpg)',
        backgroundSize:'cover',
        backgroundPosition:'center top',
        backgroundRepeat:'no-repeat',
        opacity: 1,
        pointerEvents:'none'
      }} />

      {/* Main Login Box */}
      <div style={{
        width:'100%', maxWidth:'420px', zIndex: 1, position:'relative'
      }}>
        {/* Logo / Title */}
        <div style={{ textAlign:'center', marginBottom:'32px' }}>

          <h1 className="display-title flicker" style={{
            fontSize:'1.8rem',
            background:'linear-gradient(135deg, #34d399 0%, #ffffff 50%, #ff6b6b 100%)',
            WebkitBackgroundClip:'text',
            WebkitTextFillColor:'transparent',
            marginBottom:'6px',
            textShadow:'0 0 20px rgba(16,185,129,0.3)'
          }}>
            CODE BREAKERS
          </h1>
          <div className="divider" style={{ margin:'16px auto 0', width:'60px', height:'2px', background:'linear-gradient(90deg, transparent, #10b981, transparent)' }} />
        </div>

        {/* Glassmorphic Login Card */}
        <div className="card" style={{
          padding:'36px',
          background:'rgba(10, 15, 29, 0.78)',
          backdropFilter:'blur(20px)',
          WebkitBackdropFilter:'blur(20px)',
          border:'1px solid rgba(16, 185, 129, 0.35)',
          borderRadius:'20px',
          boxShadow:'0 20px 50px rgba(0, 0, 0, 0.85), 0 0 30px rgba(16, 185, 129, 0.2), inset 0 1px 1px rgba(255,255,255,0.1)'
        }}>
          <p style={{ fontFamily:'var(--font-heading)', fontSize:'0.72rem', letterSpacing:'0.2em', color:'#34d399', textTransform:'uppercase', marginBottom:'24px', textAlign:'center', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
            Welcome to the Doom's World
          </p>

          {/* Active Session Notification / Switcher */}
          {user && (
            <div
              style={{
                padding: '12px 14px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                borderRadius: '12px',
                marginBottom: '20px',
                fontSize: '0.8rem',
                textAlign: 'center',
              }}
            >
              <div style={{ color: '#34d399', marginBottom: '8px' }}>
                Active session: <strong>{user.teamName || user.name || user.username}</strong> ({user.role === 'admin' ? 'Admin' : 'Participant'})
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate(user.role === 'admin' ? '/admin/round-control' : '/')}
                  style={{ fontSize: '0.72rem', padding: '4px 10px', background: '#10b981', color: '#000', fontWeight: 700 }}
                >
                  Continue →
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={async () => {
                    await logout()
                    toast.info('Signed out. Ready for new login.')
                  }}
                  style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                >
                  Sign Out / Switch
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
            <div className="form-group">
              <label className="form-label" style={{ color:'rgba(255,255,255,0.9)' }}>Team Name / Username</label>
              <input
                id="login-username"
                className={`input${error ? ' input-error' : ''}`}
                type="text"
                placeholder="Enter your team name"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                autoComplete="username"
                autoFocus
                disabled={loading || isAnimating}
                style={{
                  background:'rgba(15, 23, 42, 0.8)',
                  borderColor:'rgba(16, 185, 129, 0.3)',
                  color:'#ffffff'
                }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ color:'rgba(255,255,255,0.9)' }}>Access Code (Password)</label>
              <div style={{ position:'relative' }}>
                <input
                  id="login-password"
                  className={`input${error ? ' input-error' : ''}`}
                  type={showPass ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  autoComplete="current-password"
                  disabled={loading || isAnimating}
                  style={{
                    paddingRight:'44px',
                    background:'rgba(15, 23, 42, 0.8)',
                    borderColor:'rgba(16, 185, 129, 0.3)',
                    color:'#ffffff'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  style={{
                    position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)',
                    background:'none', border:'none', cursor:'pointer', color:'var(--text-dim)', fontSize:'1rem'
                  }}
                >
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error && (
              <div className="form-error" style={{ padding:'10px 14px', background:'rgba(185,28,28,0.2)', borderRadius:'var(--radius-sm)', border:'1px solid rgba(239,68,68,0.5)', color:'#f87171' }}>
                {error}
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading || isAnimating}
              style={{
                marginTop:'6px',
                background:'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                border:'none',
                boxShadow:'0 0 20px rgba(16, 185, 129, 0.4)',
                cursor:'pointer'
              }}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width:'18px', height:'18px', borderWidth:'2px' }} />
                  AUTHENTICATING...
                </>
              ) : (
                'Breach In'
              )}
            </button>
          </form>
        </div>

        <p style={{ textAlign:'center', marginTop:'24px', fontSize:'0.72rem', color:'rgba(255,255,255,0.5)', fontFamily:'var(--font-mono)', letterSpacing:'0.05em' }}>
          SECTOR BREACH PROTOCOL ACTIVE — {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
