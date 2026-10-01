import { useEffect, useRef } from 'react'

export default function GreenDustParticles() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animationFrameId

    // 20 degrees upward from left-to-right (dx = speed * cos(20°), dy = -speed * sin(20°))
    const angleRad = (20 * Math.PI) / 180
    const cos20 = Math.cos(angleRad)
    const sin20 = Math.sin(angleRad)

    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    const particleCount = 140
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 0.5, // Fine dust particle size (0.5px to 2.5px)
      speed: Math.random() * 1.2 + 0.4,
      alpha: Math.random() * 0.7 + 0.2,
      pulseSpeed: Math.random() * 0.02 + 0.005,
      pulseDir: Math.random() > 0.5 ? 1 : -1,
    }))

    const render = () => {
      ctx.clearRect(0, 0, width, height)

      for (let p of particles) {
        // Move particle left to right, 20° upward
        p.x += p.speed * cos20
        p.y -= p.speed * sin20

        // Subtle opacity pulsing / twinkle
        p.alpha += p.pulseSpeed * p.pulseDir
        if (p.alpha >= 0.95) {
          p.alpha = 0.95
          p.pulseDir = -1
        } else if (p.alpha <= 0.15) {
          p.alpha = 0.15
          p.pulseDir = 1
        }

        // Respawn when particle exits screen boundaries
        if (p.x > width + 20 || p.y < -20) {
          if (Math.random() < 0.6) {
            p.x = -20
            p.y = Math.random() * (height + 200) - 100
          } else {
            p.x = Math.random() * (width + 200) - 100
            p.y = height + 20
          }
          p.alpha = Math.random() * 0.6 + 0.2
        }

        // Render particle with glowing emerald dust effect
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(52, 211, 153, ${p.alpha})`
        ctx.shadowBlur = p.size * 3
        ctx.shadowColor = 'rgba(16, 185, 129, 0.8)'
        ctx.fill()
      }

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1,
        pointerEvents: 'none',
        width: '100%',
        height: '100%',
      }}
    />
  )
}
