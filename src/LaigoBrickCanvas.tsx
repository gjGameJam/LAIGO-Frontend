import { useEffect, useRef } from "react"

interface Brick {
    x: number
    y: number
    speed: number
    rotation: number
    rotationSpeed: number
    studs: number
    color: string
    topColor: string
}

interface LegoBrickCanvasProps {
    panelLeft: number
    panelRight: number
}

const LEGO_COLORS = [
    { body: "#e3000b", top: "#ff3333" },
    { body: "#1C3F6E", top: "#2A5298" },
    { body: "#007A1F", top: "#009624" },
    { body: "#ffd400", top: "#ffe866" },
    { body: "#ff6b00", top: "#ff8c33" },
    { body: "#9b2d8e", top: "#c44db8" },
    { body: "#e4008c", top: "#ff33aa" },
]

const STUD_COUNTS = [1, 2, 2, 4, 4, 4]

function sideWeightedX(canvasWidth: number, panelLeft: number, panelRight: number): number {
    const r = Math.random()
    const hasLeftZone = panelLeft > 20
    const hasRightZone = panelRight < canvasWidth - 20

    if (r < 0.15 && hasLeftZone) return Math.random() * panelLeft
    if (r < 0.30 && hasRightZone) return panelRight + Math.random() * (canvasWidth - panelRight)
    return Math.random() * canvasWidth
}

function randomBrick(canvasWidth: number, panelLeft: number, panelRight: number, startOffscreen = false): Brick {
    const color = LEGO_COLORS[Math.floor(Math.random() * LEGO_COLORS.length)]
    const studs = STUD_COUNTS[Math.floor(Math.random() * STUD_COUNTS.length)]
    return {
        x: sideWeightedX(canvasWidth, panelLeft, panelRight),
        y: startOffscreen ? -Math.random() * 600 - 60 : Math.random() * -2000,
        speed: 0.3 + Math.random() * 0.45,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.008,
        studs,
        color: color.body,
        topColor: color.top,
    }
}

function drawBrick(ctx: CanvasRenderingContext2D, brick: Brick) {
    const STUD_W = 16
    const STUD_H = 10
    const STUD_GAP = 4
    const BODY_H = 20
    const CAP_H = 6
    const BORDER = 1.5

    const brickW = brick.studs * STUD_W + (brick.studs - 1) * STUD_GAP + 8

    ctx.save()
    ctx.translate(brick.x, brick.y)
    ctx.rotate(brick.rotation)

    const halfW = brickW / 2
    const halfH = (BODY_H + CAP_H) / 2

    ctx.fillStyle = brick.color
    ctx.fillRect(-halfW, -halfH + CAP_H, brickW, BODY_H)

    ctx.fillStyle = brick.topColor
    ctx.fillRect(-halfW, -halfH, brickW, CAP_H)

    ctx.fillStyle = "#000"
    ctx.fillRect(-halfW, -halfH + CAP_H - 1, brickW, 1)

    ctx.strokeStyle = "#000"
    ctx.lineWidth = BORDER
    ctx.strokeRect(-halfW, -halfH, brickW, BODY_H + CAP_H)

    const totalStudW = brick.studs * STUD_W + (brick.studs - 1) * STUD_GAP
    const studStartX = -totalStudW / 2

    for (let i = 0; i < brick.studs; i++) {
        const sx = studStartX + i * (STUD_W + STUD_GAP) + STUD_W / 2
        const sy = -halfH - (CAP_H * 1.2) / 2

        ctx.fillStyle = brick.color
        ctx.strokeStyle = "#000"
        ctx.lineWidth = BORDER
        ctx.fillRect(sx - STUD_W / 2, sy - STUD_H / 2, STUD_W, STUD_H)
        ctx.strokeRect(sx - STUD_W / 2, sy - STUD_H / 2, STUD_W, STUD_H)

        ctx.fillStyle = brick.topColor
        ctx.beginPath()
        ctx.ellipse(sx, sy - STUD_H / 2 + 1, STUD_W / 2 - 1, 3, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = "#000"
        ctx.lineWidth = BORDER
        ctx.stroke()
    }

    ctx.restore()
}

export function LegoBrickCanvas({ panelLeft, panelRight }: LegoBrickCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const bricksRef = useRef<Brick[]>([])
    const rafRef = useRef<number>(0)
    const panelRef = useRef({ left: panelLeft, right: panelRight })

    // Keep panel bounds up to date without restarting the animation loop
    useEffect(() => {
        panelRef.current = { left: panelLeft, right: panelRight }
    }, [panelLeft, panelRight])

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        const resize = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
            // Respawn bricks with updated panel bounds on resize
            const { left, right } = panelRef.current
            bricksRef.current = Array.from({ length: 84 }, () =>
                randomBrick(canvas.width, left, right, false)
            )
        }

        resize()
        window.addEventListener("resize", resize)

        const loop = () => {
            const { width, height } = canvas
            ctx.clearRect(0, 0, width, height)

            for (const brick of bricksRef.current) {
                brick.y += brick.speed
                brick.rotation += brick.rotationSpeed

                if (brick.y > height + 80) {
                    const { left, right } = panelRef.current
                    Object.assign(brick, randomBrick(width, left, right, true))
                    brick.y = -60
                }

                ctx.globalAlpha = 0.18
                drawBrick(ctx, brick)
            }

            rafRef.current = requestAnimationFrame(loop)
        }

        rafRef.current = requestAnimationFrame(loop)

        return () => {
            cancelAnimationFrame(rafRef.current)
            window.removeEventListener("resize", resize)
        }
    }, [])

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                zIndex: 0
            }}
        />
    )
}