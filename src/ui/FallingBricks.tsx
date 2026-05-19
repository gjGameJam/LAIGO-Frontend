import { useEffect, useRef } from 'react'

/**
 * Falling 3D LEGO bricks background.
 *
 * Geometry mirrors LegoBrickCard: top-right orthogonal projection, three
 * shaded faces (top lit, front medium, right shadow), studs as 3D cylinders
 * with cap ellipses derived from the depth projection.
 *
 * Each (color × studCount) variant is pre-rendered once to an offscreen
 * canvas; the animation loop is just clear + per-brick translate/rotate/
 * drawImage, which keeps cost low even with ~60 bricks at 60 fps.
 *
 * Alpha is intentionally lower than the legacy 0.18 — the user wanted the
 * effect more subtle, so it sits as ambient texture behind the content
 * rather than competing with it.
 */

// Render alpha for the whole layer — lower than legacy (0.18) per request.
const LAYER_ALPHA = 0.1

// Real-LEGO proportions at a small background scale.
const P = 20                                         // stud pitch (px)
const DEPTH_X = 5                                    // depth axis x-projection
const DEPTH_Y = 3                                    // depth axis y-projection
const STUD_W = Math.round(0.60 * P)                  // 12: stud diameter
const STUD_BODY_H = Math.round(0.225 * P)            // 5: stud body height
const STUD_CAP_RY = Math.max(1.5, (STUD_W / 2) * (DEPTH_Y / P))  // ~1.8
const BRICK_BODY_H = P                               // 1 unit thick

const STUD_COUNTS = [1, 2, 2, 3, 4, 4, 6]
const BRICK_COUNT = 60

interface Palette {
    top: string
    topHigh: string
    front: string
    frontHigh: string
    right: string
    rightDark: string
}

// Same hues as legacy LEGO_COLORS, expanded into the three-face palette
// that LegoBrickCard uses (lit top, medium front, shadow right).
const PALETTES: Palette[] = [
    // red
    { topHigh: '#FF7070', top: '#FF3A3A', frontHigh: '#FF1A1A', front: '#E3000B', right: '#7A0008', rightDark: '#4A0005' },
    // blue
    { topHigh: '#4878C5', top: '#2A5298', frontHigh: '#2454A3', front: '#1C3F6E', right: '#0F2547', rightDark: '#08182C' },
    // green
    { topHigh: '#1FB840', top: '#009624', frontHigh: '#0A8C28', front: '#007A1F', right: '#054515', rightDark: '#03290D' },
    // yellow
    { topHigh: '#FFF299', top: '#FFE866', frontHigh: '#FFDE3D', front: '#FFD400', right: '#8E7600', rightDark: '#5A4A00' },
    // orange
    { topHigh: '#FFA866', top: '#FF8C33', frontHigh: '#FF7D1F', front: '#FF6B00', right: '#8A3A00', rightDark: '#572400' },
    // purple
    { topHigh: '#D77ECF', top: '#C44DB8', frontHigh: '#AE36A0', front: '#9B2D8E', right: '#56194E', rightDark: '#33102E' },
    // pink
    { topHigh: '#FF66BF', top: '#FF33AA', frontHigh: '#FF1A99', front: '#E4008C', right: '#7B004B', rightDark: '#4A002D' },
]

interface Brick {
    cacheIndex: number
    x: number
    y: number
    speed: number
    rotation: number
    rotationSpeed: number
}

interface CachedVariant {
    canvas: HTMLCanvasElement
    w: number
    h: number
}

function renderVariant(p: Palette, studCount: number): CachedVariant {
    const w = studCount * P                          // front-face width
    const h = BRICK_BODY_H                           // front-face height
    const studOverhead = Math.ceil(STUD_BODY_H + STUD_CAP_RY)
    const pad = 4

    const canvasW = w + DEPTH_X + pad * 2
    const canvasH = h + DEPTH_Y + studOverhead + pad * 2

    const c = document.createElement('canvas')
    c.width = canvasW
    c.height = canvasH
    const ctx = c.getContext('2d')!

    // Origin: top-left of the front face
    const ox = pad
    const oy = pad + studOverhead

    ctx.lineWidth = 1
    ctx.strokeStyle = '#000'

    // FRONT face (medium, vertical gradient)
    const fg = ctx.createLinearGradient(ox, oy, ox, oy + h)
    fg.addColorStop(0, p.frontHigh)
    fg.addColorStop(1, p.front)
    ctx.fillStyle = fg
    ctx.beginPath()
    ctx.rect(ox, oy, w, h)
    ctx.fill()
    ctx.stroke()

    // RIGHT face (shadow, horizontal gradient darker rightward)
    const rg = ctx.createLinearGradient(ox + w, oy, ox + w + DEPTH_X, oy)
    rg.addColorStop(0, p.right)
    rg.addColorStop(1, p.rightDark)
    ctx.fillStyle = rg
    ctx.beginPath()
    ctx.moveTo(ox + w, oy)
    ctx.lineTo(ox + w + DEPTH_X, oy - DEPTH_Y)
    ctx.lineTo(ox + w + DEPTH_X, oy - DEPTH_Y + h)
    ctx.lineTo(ox + w, oy + h)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // TOP face (lit, vertical gradient)
    const tg = ctx.createLinearGradient(ox, oy - DEPTH_Y, ox, oy)
    tg.addColorStop(0, p.topHigh)
    tg.addColorStop(1, p.top)
    ctx.fillStyle = tg
    ctx.beginPath()
    ctx.moveTo(ox, oy)
    ctx.lineTo(ox + w, oy)
    ctx.lineTo(ox + w + DEPTH_X, oy - DEPTH_Y)
    ctx.lineTo(ox + DEPTH_X, oy - DEPTH_Y)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // Studs — exact P spacing, centered on the brick width
    for (let i = 0; i < studCount; i++) {
        const fx = ox + (i + 0.5) * P
        const baseX = fx + DEPTH_X / 2                   // project to mid-depth
        const baseY = oy - DEPTH_Y / 2
        const bodyTopY = baseY - STUD_BODY_H
        const bodyX = baseX - STUD_W / 2

        // Stud cylinder body
        ctx.fillStyle = p.front
        ctx.fillRect(bodyX, bodyTopY, STUD_W, STUD_BODY_H)
        ctx.strokeRect(bodyX, bodyTopY, STUD_W, STUD_BODY_H)

        // Cap ellipse
        ctx.fillStyle = p.top
        ctx.beginPath()
        ctx.ellipse(baseX, bodyTopY, STUD_W / 2, STUD_CAP_RY, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()

        // Cap highlight
        ctx.fillStyle = 'rgba(255,255,255,0.5)'
        ctx.beginPath()
        ctx.ellipse(
            baseX - STUD_W * 0.18,
            bodyTopY - 0.4,
            STUD_W * 0.22,
            STUD_CAP_RY * 0.5,
            0, 0, Math.PI * 2,
        )
        ctx.fill()
    }

    return { canvas: c, w: canvasW, h: canvasH }
}

function spawn(cacheLen: number, viewportW: number, viewportH: number, fromTop: boolean): Brick {
    return {
        cacheIndex: Math.floor(Math.random() * cacheLen),
        x: Math.random() * viewportW,
        y: fromTop ? -80 - Math.random() * 200 : Math.random() * viewportH * -2,
        speed: 0.35 + Math.random() * 0.55,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.006,
    }
}

export function FallingBricks() {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        let ctx = canvas.getContext('2d')
        if (!ctx) return

        // Build the variant cache once (rebuilt only on contextrestored).
        let cache: CachedVariant[] = []
        const rebuildCache = () => {
            cache = []
            for (const p of PALETTES) {
                for (const s of STUD_COUNTS) {
                    cache.push(renderVariant(p, s))
                }
            }
        }
        rebuildCache()

        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const bricks: Brick[] = Array.from({ length: BRICK_COUNT }, () =>
            spawn(cache.length, window.innerWidth, window.innerHeight, false),
        )

        const applyCanvasSize = () => {
            const vw = window.innerWidth
            const vh = window.innerHeight
            canvas.width = vw * dpr
            canvas.height = vh * dpr
            canvas.style.width = vw + 'px'
            canvas.style.height = vh + 'px'
            ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
        }
        applyCanvasSize()

        const resize = () => {
            const prevVw = window.innerWidth
            applyCanvasSize()
            // Preserve existing positions; just keep x within the new viewport
            // so bricks aren't permanently offscreen on a shrink.
            const vw = window.innerWidth
            if (vw !== prevVw) {
                for (const b of bricks) {
                    if (b.x > vw) b.x = Math.random() * vw
                }
            }
        }
        window.addEventListener('resize', resize)

        // prefers-reduced-motion: read initial value and subscribe to changes.
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
        let reduce = mq.matches
        const onMqChange = (e: MediaQueryListEvent) => {
            const wasReduce = reduce
            reduce = e.matches
            if (wasReduce && !reduce) {
                // Re-enable animation
                if (!raf) raf = requestAnimationFrame(loop)
            } else if (!wasReduce && reduce) {
                // Pause animation, paint final static frame
                if (raf) {
                    cancelAnimationFrame(raf)
                    raf = 0
                }
                draw()
            }
        }
        mq.addEventListener('change', onMqChange)

        const draw = () => {
            if (!ctx) return
            const vw = window.innerWidth
            const vh = window.innerHeight
            ctx.clearRect(0, 0, vw, vh)
            ctx.globalAlpha = LAYER_ALPHA
            for (const b of bricks) {
                const v = cache[b.cacheIndex]
                ctx.save()
                ctx.translate(b.x, b.y)
                ctx.rotate(b.rotation)
                ctx.drawImage(v.canvas, -v.w / 2, -v.h / 2)
                ctx.restore()
            }
        }

        let raf = 0
        const loop = () => {
            const vw = window.innerWidth
            const vh = window.innerHeight
            for (const b of bricks) {
                b.y += b.speed
                b.rotation += b.rotationSpeed
                if (b.y > vh + 100) {
                    Object.assign(b, spawn(cache.length, vw, vh, true))
                }
            }
            draw()
            raf = requestAnimationFrame(loop)
        }

        // Canvas context loss (memory pressure, GPU reset, tab discard).
        // The browser clears the backing store; we have to rebuild the cache
        // and resize the canvas before drawing resumes.
        const onContextLost = (e: Event) => {
            e.preventDefault()
            if (raf) {
                cancelAnimationFrame(raf)
                raf = 0
            }
        }
        const onContextRestored = () => {
            const restored = canvas.getContext('2d')
            if (!restored) return
            ctx = restored
            rebuildCache()
            applyCanvasSize()
            if (!reduce) raf = requestAnimationFrame(loop)
            else draw()
        }
        canvas.addEventListener('contextlost', onContextLost as EventListener)
        canvas.addEventListener('contextrestored', onContextRestored as EventListener)

        if (reduce) {
            draw()
        } else {
            raf = requestAnimationFrame(loop)
        }

        return () => {
            if (raf) cancelAnimationFrame(raf)
            window.removeEventListener('resize', resize)
            mq.removeEventListener('change', onMqChange)
            canvas.removeEventListener('contextlost', onContextLost as EventListener)
            canvas.removeEventListener('contextrestored', onContextRestored as EventListener)
        }
    }, [])

    return (
        <canvas
            ref={canvasRef}
            aria-hidden
            className="fixed inset-0 pointer-events-none"
            style={{ zIndex: 0 }}
        />
    )
}
