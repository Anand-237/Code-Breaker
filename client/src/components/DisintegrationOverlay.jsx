import { useEffect, useRef, useState } from 'react'

export default function DisintegrationOverlay({ active, duration = 7000, onComplete }) {
  const canvasRef = useRef(null)
  const imageRef = useRef(null)
  const [imageLoaded, setImageLoaded] = useState(false)

  // Preload background image for canvas pixel sampling & masking
  useEffect(() => {
    const img = new Image()
    img.src = '/doom_bg.jpg'
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      imageRef.current = img
      setImageLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (!active || !imageLoaded) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const img = imageRef.current
    let animationFrameId
    const startTime = performance.now()

    // ─────────────────────────────────────────────────────────────────────────────
    // Create Offscreen Buffer Canvas for Image Pixel Sampling
    // ─────────────────────────────────────────────────────────────────────────────
    const bufferCanvas = document.createElement('canvas')
    const bufferCtx = bufferCanvas.getContext('2d', { willReadFrequently: true })

    // ─────────────────────────────────────────────────────────────────────────────
    // Create Realistic Dust Grain & Ember Texture Sprite Canvases
    // ─────────────────────────────────────────────────────────────────────────────
    const createDustSprite = (isGlowing = false) => {
      const sCanvas = document.createElement('canvas')
      sCanvas.width = 32
      sCanvas.height = 32
      const sCtx = sCanvas.getContext('2d')

      const center = 16
      const rad = 14
      const grad = sCtx.createRadialGradient(center, center, 0, center, center, rad)

      if (isGlowing) {
        grad.addColorStop(0, 'rgba(255, 255, 255, 1)')
        grad.addColorStop(0.3, 'rgba(52, 211, 153, 0.8)')
        grad.addColorStop(0.7, 'rgba(16, 185, 129, 0.35)')
        grad.addColorStop(1, 'rgba(16, 185, 129, 0)')
      } else {
        grad.addColorStop(0, 'rgba(230, 240, 235, 0.95)')
        grad.addColorStop(0.4, 'rgba(180, 200, 190, 0.65)')
        grad.addColorStop(0.8, 'rgba(120, 140, 130, 0.25)')
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)')
      }

      sCtx.fillStyle = grad
      sCtx.beginPath()
      sCtx.arc(center, center, rad, 0, Math.PI * 2)
      sCtx.fill()

      // Add microscopic dust speckle texture
      for (let i = 0; i < 6; i++) {
        const angle = Math.random() * Math.PI * 2
        const dist = Math.random() * (rad * 0.7)
        const px = center + Math.cos(angle) * dist
        const py = center + Math.sin(angle) * dist
        const pSize = 0.5 + Math.random() * 1.2
        sCtx.fillStyle = isGlowing ? 'rgba(52, 211, 153, 0.6)' : 'rgba(209, 213, 219, 0.5)'
        sCtx.beginPath()
        sCtx.arc(px, py, pSize, 0, Math.PI * 2)
        sCtx.fill()
      }

      return sCanvas
    }

    const dustSpriteNormal = createDustSprite(false)
    const dustSpriteGlow = createDustSprite(true)

    const resize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = w
      canvas.height = h

      bufferCanvas.width = w
      bufferCanvas.height = h

      if (img) {
        const imgAspect = img.width / img.height
        const screenAspect = w / h
        let renderW, renderH, renderX, renderY

        if (screenAspect > imgAspect) {
          renderW = w
          renderH = w / imgAspect
          renderX = 0
          renderY = 0 // center top
        } else {
          renderH = h
          renderW = h * imgAspect
          renderX = (w - renderW) / 2
          renderY = 0
        }

        bufferCtx.clearRect(0, 0, w, h)
        bufferCtx.drawImage(img, renderX, renderY, renderW, renderH)
      }
    }

    resize()
    window.addEventListener('resize', resize)

    const width = window.innerWidth
    const height = window.innerHeight

    // Doctor Doom Theme Palette
    const colors = [
      'rgba(52, 211, 153, ',  // Emerald Light (#34d399)
      'rgba(16, 185, 129, ',  // Core Green (#10b981)
      'rgba(167, 243, 208, ', // Mint (#a7f3d0)
      'rgba(209, 213, 219, ', // Ash Gray (#d1d5db)
      'rgba(156, 163, 175, ', // Mid Gray (#9ca3af)
      'rgba(255, 255, 255, ', // Glowing White Ember (#ffffff)
      'rgba(5, 150, 105, '    // Deep Emerald (#059669)
    ]

    const particles = []
    const maxParticles = 3200

    class Particle {
      constructor(originX, originY, sampledColor) {
        this.x = originX
        this.y = originY

        // 3D Parallax Depth Layer
        this.depth = 0.4 + Math.random() * 1.4
        this.size = (1.2 + Math.random() * 3.6) * (this.depth * 0.85)

        // Strict Diagonal Velocity Vector (LEFT-BOTTOM  RIGHT-TOP)
        const speed = (3.2 + Math.random() * 7.5) * this.depth
        const angle = -Math.PI * (0.18 + Math.random() * 0.16) // ~ -32deg to -52deg

        this.vx = Math.cos(angle) * speed
        this.vy = Math.sin(angle) * speed

        // Micro turbulence & rotation
        this.wobbleFreq = 0.025 + Math.random() * 0.035
        this.wobbleAmp = 0.3 + Math.random() * 1.2
        this.wobblePhase = Math.random() * Math.PI * 2
        this.rotation = Math.random() * Math.PI * 2
        this.rotSpeed = (Math.random() - 0.5) * 0.08

        this.colorPrefix = sampledColor || colors[Math.floor(Math.random() * colors.length)]
        this.isGlowing = Math.random() > 0.65
        this.alpha = 0.85 + Math.random() * 0.15
        this.targetAlpha = this.alpha
        this.life = 0
        this.maxLife = 55 + Math.random() * 95

        this.hasTrail = Math.random() > 0.35
        this.trail = []
        this.maxTrailLength = Math.floor(2 + Math.random() * 5)
      }

      update(progress) {
        this.life += 1
        const lifeProgress = this.life / this.maxLife

        this.wobblePhase += this.wobbleFreq
        this.rotation += this.rotSpeed
        const dx = Math.sin(this.wobblePhase) * this.wobbleAmp
        const dy = Math.cos(this.wobblePhase) * (this.wobbleAmp * 0.6)

        if (this.hasTrail) {
          this.trail.unshift({ x: this.x, y: this.y })
          if (this.trail.length > this.maxTrailLength) {
            this.trail.pop()
          }
        }

        this.x += this.vx + dx
        this.y += this.vy + dy

        if (lifeProgress > 0.6) {
          this.alpha = (1 - (lifeProgress - 0.6) / 0.4) * this.targetAlpha
        }

        if (progress > 0.85) {
          const fadeFactor = 1 - (progress - 0.85) / 0.15
          this.alpha *= Math.max(0, fadeFactor)
        }
      }

      draw(ctx) {
        if (this.alpha <= 0.005) return

        // Render Pure Organic Dust Particle Texture Sprite
        ctx.save()
        ctx.translate(this.x, this.y)
        ctx.rotate(this.rotation)
        ctx.globalAlpha = Math.max(0, Math.min(1, this.alpha))

        const sprite = this.isGlowing ? dustSpriteGlow : dustSpriteNormal
        const drawRadius = this.size * 1.8
        ctx.drawImage(sprite, -drawRadius, -drawRadius, drawRadius * 2, drawRadius * 2)

        ctx.restore()
      }
    }

    const render = (currentTime) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(1, elapsed / duration)

      ctx.clearRect(0, 0, width, height)

      // ─────────────────────────────────────────────────────────────────────────────
      // 1. DRAW PROGRESSIVELY DISINTEGRATING IMAGE (LEFT-BOTTOM  RIGHT-TOP SWEEP)
      // Projection math:
      // p(x,y) = (x / width) + ((height - y) / height)
      // Range of p(x,y): 0 at (0, height) [Bottom-Left] to 2 at (width, 0) [Top-Right]
      // ─────────────────────────────────────────────────────────────────────────────

      const boundaryFront = progress * 2.25

      // Draw original buffered background image onto main canvas
      ctx.globalCompositeOperation = 'source-over'
      ctx.drawImage(bufferCanvas, 0, 0)

      // Mask out / Erase the area behind the disintegration boundary
      if (progress > 0.01) {
        ctx.globalCompositeOperation = 'destination-out'

        const maskStartX = (boundaryFront / 2.25) * (width * 1.4) - width * 0.3
        const maskStartY = height * 1.3 - (boundaryFront / 2.25) * (height * 1.4)

        const maskGradient = ctx.createLinearGradient(
          maskStartX - width * 0.45, maskStartY + height * 0.45,
          maskStartX + width * 0.15, maskStartY - height * 0.15
        )

        maskGradient.addColorStop(0, 'rgba(0,0,0,1)')
        maskGradient.addColorStop(0.75, 'rgba(0,0,0,1)')
        maskGradient.addColorStop(0.95, 'rgba(0,0,0,0.5)')
        maskGradient.addColorStop(1, 'rgba(0,0,0,0)')

        ctx.fillStyle = maskGradient
        ctx.fillRect(0, 0, width, height)
      }

      ctx.globalCompositeOperation = 'source-over'

      // ─────────────────────────────────────────────────────────────────────────────
      // 2. SPAWN DUST PARTICLE TEXTURES AT ACTIVE DISINTEGRATION BOUNDARY EDGE
      // ─────────────────────────────────────────────────────────────────────────────
      if (progress < 0.88 && particles.length < maxParticles) {
        const spawnCount = Math.min(45, Math.floor(15 + progress * 50))

        for (let i = 0; i < spawnCount; i++) {
          const randX = Math.random() * width
          const deltaP = (Math.random() - 0.5) * 0.18
          const targetP = boundaryFront + deltaP
          const randY = height * (1 - (targetP - randX / width))

          if (randY >= -50 && randY <= height + 50 && randX >= -20 && randX <= width + 20) {
            let sampledColorPrefix = null
            if (randX >= 0 && randX < width && randY >= 0 && randY < height) {
              try {
                const pixelData = bufferCtx.getImageData(Math.floor(randX), Math.floor(randY), 1, 1).data
                if (pixelData[3] > 30) {
                  sampledColorPrefix = `rgba(${pixelData[0]}, ${pixelData[1]}, ${pixelData[2]}, `
                }
              } catch (e) {
                /* ignore */
              }
            }

            particles.push(new Particle(randX, randY, sampledColorPrefix))
          }
        }
      }

      // ─────────────────────────────────────────────────────────────────────────────
      // 3. UPDATE & DRAW DUST PARTICLE TEXTURE SPRITES
      // ─────────────────────────────────────────────────────────────────────────────
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.update(progress)
        p.draw(ctx)

        if (p.life >= p.maxLife || p.x > width + 80 || p.y < -80 || (progress > 0.85 && p.alpha <= 0.01)) {
          particles.splice(i, 1)
        }
      }

      // Loop animation frame until 7s duration completes
      if (progress < 1) {
        animationFrameId = requestAnimationFrame(render)
      } else {
        ctx.clearRect(0, 0, width, height)
        if (onComplete) onComplete()
      }
    }

    animationFrameId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', resize)
    }
  }, [active, duration, imageLoaded, onComplete])

  if (!active) return null

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 4,
        pointerEvents: 'none',
        width: '100vw',
        height: '100vh'
      }}
    />
  )
}
