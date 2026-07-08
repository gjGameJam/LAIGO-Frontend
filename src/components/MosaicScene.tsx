import { useMemo, useRef, useEffect, useImperativeHandle, useState, forwardRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { PreviewData } from '../api'

export type Vec3Tuple = [number, number, number]

export interface CameraState {
    position: Vec3Tuple
    target: Vec3Tuple
    /** True if auto-rotation is still active (user hasn't manually moved the camera). */
    isAutoRotating: boolean
}

// LEGO real-world ratios in stud-units (1 unit = 1 stud = 8mm).
const STUD_PITCH = 1
const PLATE_H = 3.2 / 8 // 0.4
const STUD_H = 1.8 / 8 // 0.225
const STUD_R = 2.4 / 8 // 0.3
const BASEPLATE_COLOR = '#222226'

// ── Back-face piece constants ────────────────────────────────────────────────
// Every back piece hangs off the baseplate underside (back face at Y = -PLATE_H).
// Element IDs / colors / placement mirror the backend build pack
// (MosiacToOrder.py counts, VisualMaker.py placement, piece_specs.py colors).
const BACK_Y = -1.5 * PLATE_H // -0.6: center of a plate spanning the underside (Y -0.4..-0.8)
// Connector pins share the bridge-plate depth so they're visible from behind.
// Their true side-hole height (-PLATE_H/2) sits inside the solid slab (Y -0.4..0),
// which — with a painted seam line rather than a real gap — would occlude them.
const PIN_Y = BACK_Y

const GREY_PLATE_COLOR = '#707070' // 4211094 — 2x2 corner/center support plates
const SEAM_GREEN = '#A5CA17' // 4621548 bridge + 6526672 pins — vertical seams
const SEAM_RED = '#CC1A1A' // 379521 bridge + 6347789 pins — horizontal seams
const SEAM_LINE_COLOR = '#3a3a44' // thin seam lines between 16x16 tiles (lighter than the
// baseplate so they stay perceptible on the dimly-lit back face — the whole point of the choice)
const HOOK_BRACKET_COLOR = '#4D4D4D' // 6302094 — nail-hook bracket
const HOOK_PIN_COLOR = '#1F1F1F' // 6279875 — black Technic mounting pins

const PIN_R = 0.25 // connector-pin radius
const PIN_LEN = 2 // connector-pin length (spans 1 stud each side of a seam)
const HOOK_BRACKET_W = 5 // widened mounting bracket (~5 studs)
const HOOK_INSET_Z = 1.5 // studs inset from the physical top edge

// Top-left stud of each 2x2 support plate within a 16x16 baseplate: four corners
// + center. A plate covering studs {lx,lx+1} is centered at (lx+0.5, ly+0.5).
const GREY_PLATE_LOCAL = [
    [0, 0],
    [14, 0],
    [14, 14],
    [0, 14],
    [7, 7],
] as const
const GREEN_PIN_LOCAL_Z = [3.9, 12.9] as const // ~25%/75% down a vertical seam
const RED_PIN_LOCAL_X = [2.15, 11.15] as const // ~25%/75% across a horizontal seam

// One merged geometry shared across every InstancedMesh — only the matrix and
// material change per instance/color. Built lazily on first scene mount so we
// don't pay for it when the placeholder cube is showing.
let cachedStudGeom: THREE.BufferGeometry | null = null
function getStudGeometry(): THREE.BufferGeometry {
    if (cachedStudGeom) return cachedStudGeom
    const plate = new THREE.BoxGeometry(STUD_PITCH, PLATE_H, STUD_PITCH)
    plate.translate(0, PLATE_H / 2, 0)
    const stud = new THREE.CylinderGeometry(STUD_R, STUD_R, STUD_H, 12)
    stud.translate(0, PLATE_H + STUD_H / 2, 0)
    const merged = mergeGeometries([plate, stud])
    if (!merged) throw new Error('Failed to merge stud geometry')
    cachedStudGeom = merged
    return merged
}

// Lazy module caches for the back-face pieces — one shared geometry per type,
// built on first use and reused across every InstancedMesh/mount (same idiom as
// getStudGeometry). Boxes are centered at origin; the instance matrix supplies
// the world position. Pins bake their rotation in so instance matrices stay
// translation-only, matching StudInstances.
let cachedGreyPlate: THREE.BufferGeometry | null = null
function getGreyPlateGeometry(): THREE.BufferGeometry {
    if (cachedGreyPlate) return cachedGreyPlate
    cachedGreyPlate = new THREE.BoxGeometry(2, PLATE_H, 2)
    return cachedGreyPlate
}

let cachedGreenPlate: THREE.BufferGeometry | null = null
function getGreenPlateGeometry(): THREE.BufferGeometry {
    // 2 wide (X, across seam) x 4 tall (Z, along seam) — straddles a vertical seam.
    if (cachedGreenPlate) return cachedGreenPlate
    cachedGreenPlate = new THREE.BoxGeometry(2, PLATE_H, 4)
    return cachedGreenPlate
}

let cachedRedPlate: THREE.BufferGeometry | null = null
function getRedPlateGeometry(): THREE.BufferGeometry {
    // 4 wide (X, along seam) x 2 tall (Z, across seam) — straddles a horizontal seam.
    if (cachedRedPlate) return cachedRedPlate
    cachedRedPlate = new THREE.BoxGeometry(4, PLATE_H, 2)
    return cachedRedPlate
}

let cachedPinX: THREE.BufferGeometry | null = null
function getPinXGeometry(): THREE.BufferGeometry {
    // Green pins: cylinder axis along X (across a vertical seam).
    if (cachedPinX) return cachedPinX
    const g = new THREE.CylinderGeometry(PIN_R, PIN_R, PIN_LEN, 10)
    g.rotateZ(Math.PI / 2)
    cachedPinX = g
    return cachedPinX
}

let cachedPinZ: THREE.BufferGeometry | null = null
function getPinZGeometry(): THREE.BufferGeometry {
    // Red pins: cylinder axis along Z (across a horizontal seam).
    if (cachedPinZ) return cachedPinZ
    const g = new THREE.CylinderGeometry(PIN_R, PIN_R, PIN_LEN, 10)
    g.rotateX(Math.PI / 2)
    cachedPinZ = g
    return cachedPinZ
}

interface InstanceGroup {
    paletteIdx: number
    hex: string
    positions: Float32Array // tightly packed [x, baseY, z, x, baseY, z, ...]
    count: number
}

/**
 * Bucket every stud (background + foreground) by palette index so we can
 * render one InstancedMesh per unique color — a few draw calls instead of
 * one per stud. Handles the 400k-cell worst case cleanly.
 */
function useStudGroups(data: PreviewData): InstanceGroup[] {
    return useMemo(() => {
        const buckets = new Map<number, number[]>()
        const push = (idx: number, x: number, y: number, z: number) => {
            let arr = buckets.get(idx)
            if (!arr) {
                arr = []
                buckets.set(idx, arr)
            }
            arr.push(x, y, z)
        }

        const { background_grid, foreground_grid, foreground_lift_plates, palette } = data
        const liftY = foreground_lift_plates * PLATE_H

        // Center the mosaic on origin so OrbitControls orbits the middle.
        const cols = background_grid[0]?.length ?? 0
        const rows = background_grid.length
        const offsetX = -(cols - 1) / 2
        const offsetZ = -(rows - 1) / 2

        for (let row = 0; row < rows; row++) {
            const r = background_grid[row]
            for (let col = 0; col < cols; col++) {
                const idx = r[col]
                if (idx < 0) continue
                push(idx, col + offsetX, 0, row + offsetZ)
            }
        }

        if (foreground_grid) {
            for (let row = 0; row < foreground_grid.length; row++) {
                const r = foreground_grid[row]
                for (let col = 0; col < r.length; col++) {
                    const idx = r[col]
                    if (idx === -1) continue
                    push(idx, col + offsetX, liftY, row + offsetZ)
                }
            }
        }

        return Array.from(buckets.entries()).map(([paletteIdx, flat]) => {
            const positions = new Float32Array(flat)
            return {
                paletteIdx,
                hex: palette[paletteIdx]?.hex ?? '#000000',
                positions,
                count: flat.length / 3,
            }
        })
    }, [data])
}

function StudInstances({ group }: { group: InstanceGroup }) {
    const meshRef = useRef<THREE.InstancedMesh>(null)
    const geom = useMemo(() => getStudGeometry(), [])

    useEffect(() => {
        const mesh = meshRef.current
        if (!mesh) return
        const dummy = new THREE.Object3D()
        const { positions, count } = group
        for (let i = 0; i < count; i++) {
            const x = positions[i * 3]
            const y = positions[i * 3 + 1]
            const z = positions[i * 3 + 2]
            dummy.position.set(x, y, z)
            dummy.updateMatrix()
            mesh.setMatrixAt(i, dummy.matrix)
        }
        mesh.instanceMatrix.needsUpdate = true
    }, [group])

    return (
        <instancedMesh ref={meshRef} args={[geom, undefined, group.count]} castShadow receiveShadow>
            <meshStandardMaterial color={group.hex} roughness={0.55} metalness={0.05} />
        </instancedMesh>
    )
}

interface BackPieceGroups {
    grey: Float32Array // 2x2 support plates — corners + center of every baseplate
    greenPlate: Float32Array // 2x4 bridge plate straddling each vertical seam
    greenPin: Float32Array // 2 connector pins per vertical seam
    redPlate: Float32Array // 4x2 bridge plate straddling each horizontal seam
    redPin: Float32Array // 2 connector pins per horizontal seam
}

/**
 * Compute world positions for every underside piece the backend adds to the
 * build pack, iterating the mosaic's grid of 16x16 baseplates. Uses the same
 * centering offsets as useStudGroups so pieces align to the stud grid. Counts
 * mirror MosiacToOrder.py: grey 5*bw*bh, green plates (bw-1)*bh (+2 pins each),
 * red plates (bh-1)*bw (+2 pins each).
 */
function useBackPieces(data: PreviewData): BackPieceGroups {
    return useMemo(() => {
        const { width_studs, height_studs } = data
        // Defensive: clamp to >=1; the backend guarantees 16-divisible dims.
        const bw = Math.max(1, Math.floor(data.block_width))
        const bh = Math.max(1, Math.floor(data.block_height))
        const offsetX = -(width_studs - 1) / 2
        const offsetZ = -(height_studs - 1) / 2

        const grey: number[] = []
        const greenPlate: number[] = []
        const greenPin: number[] = []
        const redPlate: number[] = []
        const redPin: number[] = []

        for (let bz = 0; bz < bh; bz++) {
            for (let bx = 0; bx < bw; bx++) {
                const baseCol = bx * 16 // left stud col of this baseplate
                const baseRow = bz * 16 // top stud row of this baseplate

                // (1) Five 2x2 grey support plates — four corners + center.
                for (const [lx, ly] of GREY_PLATE_LOCAL) {
                    grey.push(baseCol + lx + 0.5 + offsetX, BACK_Y, baseRow + ly + 0.5 + offsetZ)
                }

                // (2)+(3) Vertical seam — only when a right neighbor exists.
                if (bx < bw - 1) {
                    const seamX = baseCol + 15.5 + offsetX // between col 15 and 16
                    greenPlate.push(seamX, BACK_Y, baseRow + 7.5 + offsetZ) // centered vertically
                    for (const lz of GREEN_PIN_LOCAL_Z) {
                        greenPin.push(seamX, PIN_Y, baseRow + lz + offsetZ)
                    }
                }

                // (4)+(5) Horizontal seam — only when a bottom neighbor exists.
                if (bz < bh - 1) {
                    const seamZ = baseRow + 15.5 + offsetZ // between row 15 and 16
                    redPlate.push(baseCol + 7.5 + offsetX, BACK_Y, seamZ) // centered horizontally
                    for (const lx of RED_PIN_LOCAL_X) {
                        redPin.push(baseCol + lx + offsetX, PIN_Y, seamZ)
                    }
                }
            }
        }

        return {
            grey: new Float32Array(grey),
            greenPlate: new Float32Array(greenPlate),
            greenPin: new Float32Array(greenPin),
            redPlate: new Float32Array(redPlate),
            redPin: new Float32Array(redPin),
        }
    }, [data])
}

/**
 * One InstancedMesh for a single back-piece type. Writes translation-only
 * matrices via a shared dummy Object3D — a generalization of StudInstances.
 * Renders nothing when there are no positions (e.g. a single baseplate has no
 * seams, so the connector arrays are empty).
 */
function InstancedPieces({
    geom,
    color,
    positions,
    roughness = 0.5,
    metalness = 0.05,
}: {
    geom: THREE.BufferGeometry
    color: string
    positions: Float32Array
    roughness?: number
    metalness?: number
}) {
    const count = positions.length / 3
    const meshRef = useRef<THREE.InstancedMesh>(null)

    useEffect(() => {
        const mesh = meshRef.current
        if (!mesh) return
        const dummy = new THREE.Object3D()
        for (let i = 0; i < count; i++) {
            dummy.position.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2])
            dummy.updateMatrix()
            mesh.setMatrixAt(i, dummy.matrix)
        }
        mesh.instanceMatrix.needsUpdate = true
    }, [positions, count])

    if (count === 0) return null

    return (
        <instancedMesh ref={meshRef} args={[geom, undefined, count]} castShadow receiveShadow>
            <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} />
        </instancedMesh>
    )
}

/** All backend build-pack hardware on the underside: grey supports + seam connectors. */
function BackPieces({ data }: { data: PreviewData }) {
    const pieces = useBackPieces(data)
    const greyGeom = useMemo(() => getGreyPlateGeometry(), [])
    const greenGeom = useMemo(() => getGreenPlateGeometry(), [])
    const redGeom = useMemo(() => getRedPlateGeometry(), [])
    const pinXGeom = useMemo(() => getPinXGeometry(), [])
    const pinZGeom = useMemo(() => getPinZGeometry(), [])

    return (
        <>
            <InstancedPieces geom={greyGeom} color={GREY_PLATE_COLOR} positions={pieces.grey} roughness={0.7} />
            <InstancedPieces geom={greenGeom} color={SEAM_GREEN} positions={pieces.greenPlate} roughness={0.55} />
            <InstancedPieces geom={pinXGeom} color={SEAM_GREEN} positions={pieces.greenPin} roughness={0.5} />
            <InstancedPieces geom={redGeom} color={SEAM_RED} positions={pieces.redPlate} roughness={0.55} />
            <InstancedPieces geom={pinZGeom} color={SEAM_RED} positions={pieces.redPin} roughness={0.5} />
        </>
    )
}

function Baseplate({ widthStuds, heightStuds, hasFrame }: { widthStuds: number; heightStuds: number; hasFrame: boolean }) {
    const w = widthStuds + (hasFrame ? 2 : 0)
    const h = heightStuds + (hasFrame ? 2 : 0)
    return (
        <mesh position={[0, -PLATE_H / 2, 0]} receiveShadow>
            <boxGeometry args={[w, PLATE_H, h]} />
            <meshStandardMaterial color={BASEPLATE_COLOR} roughness={0.85} />
        </mesh>
    )
}

/**
 * Thin dark strips at each internal 16x16 boundary, sitting a hair proud of the
 * back face so the mosaic reads as a grid of separate baseplates. The seam
 * connectors then visibly bridge real seams. Only a handful of strips
 * ((bw-1)+(bh-1)), so plain mapped meshes — no instancing needed.
 */
function BaseplateSeams({ data }: { data: PreviewData }) {
    const { width_studs, height_studs } = data
    const bw = Math.max(1, Math.floor(data.block_width))
    const bh = Math.max(1, Math.floor(data.block_height))
    const offsetX = -(width_studs - 1) / 2
    const offsetZ = -(height_studs - 1) / 2
    const seamY = -PLATE_H - 0.03 // just behind the back face at -0.4

    const verticals: number[] = []
    for (let bx = 0; bx < bw - 1; bx++) verticals.push(bx * 16 + 15.5 + offsetX)
    const horizontals: number[] = []
    for (let bz = 0; bz < bh - 1; bz++) horizontals.push(bz * 16 + 15.5 + offsetZ)

    if (verticals.length === 0 && horizontals.length === 0) return null

    return (
        <>
            {verticals.map((x) => (
                <mesh key={`v${x}`} position={[x, seamY, 0]}>
                    <boxGeometry args={[0.12, 0.06, height_studs]} />
                    <meshStandardMaterial color={SEAM_LINE_COLOR} roughness={0.9} />
                </mesh>
            ))}
            {horizontals.map((z) => (
                <mesh key={`h${z}`} position={[0, seamY, z]}>
                    <boxGeometry args={[width_studs, 0.06, 0.12]} />
                    <meshStandardMaterial color={SEAM_LINE_COLOR} roughness={0.9} />
                </mesh>
            ))}
        </>
    )
}

function Frame({ data }: { data: PreviewData }) {
    if (!data.has_frame) return null
    const { width_studs, height_studs, frame, palette } = data
    const t = frame.thickness_studs
    const fh = frame.height_plates * PLATE_H
    const color = palette[frame.palette_index]?.hex ?? '#1B2A34'

    // The mosaic occupies cells centered on origin. With the centering offset,
    // the leftmost stud center is at -W/2 + 0.5, rightmost at W/2 - 0.5. The
    // frame sits one stud OUTSIDE that on every edge.
    const halfW = width_studs / 2
    const halfH = height_studs / 2
    const yCenter = fh / 2

    return (
        <group>
            {/* Top edge (negative Z) */}
            <mesh position={[0, yCenter, -halfH - t / 2]} castShadow receiveShadow>
                <boxGeometry args={[width_studs + 2 * t, fh, t]} />
                <meshStandardMaterial color={color} roughness={0.6} />
            </mesh>
            {/* Bottom edge (positive Z) */}
            <mesh position={[0, yCenter, halfH + t / 2]} castShadow receiveShadow>
                <boxGeometry args={[width_studs + 2 * t, fh, t]} />
                <meshStandardMaterial color={color} roughness={0.6} />
            </mesh>
            {/* Left edge (negative X) */}
            <mesh position={[-halfW - t / 2, yCenter, 0]} castShadow receiveShadow>
                <boxGeometry args={[t, fh, height_studs]} />
                <meshStandardMaterial color={color} roughness={0.6} />
            </mesh>
            {/* Right edge (positive X) */}
            <mesh position={[halfW + t / 2, yCenter, 0]} castShadow receiveShadow>
                <boxGeometry args={[t, fh, height_studs]} />
                <meshStandardMaterial color={color} roughness={0.6} />
            </mesh>
        </group>
    )
}

function SingleHook({ position }: { position: [number, number, number] }) {
    return (
        <group position={position}>
            {/* ~5-stud-wide mounting bracket (element 6302094) */}
            <mesh castShadow receiveShadow>
                <boxGeometry args={[HOOK_BRACKET_W, 0.15, 1.0]} />
                <meshStandardMaterial color={HOOK_BRACKET_COLOR} metalness={0.35} roughness={0.55} />
            </mesh>
            {/* Angled catch — leans away from the back so a nail can slot in */}
            <mesh position={[0, -0.35, -0.3]} rotation={[Math.PI * 0.1, 0, 0]} castShadow>
                <boxGeometry args={[1.2, 0.7, 0.15]} />
                <meshStandardMaterial color={HOOK_BRACKET_COLOR} metalness={0.35} roughness={0.55} />
            </mesh>
            {/* Two black Technic mounting pins (element 6279875) into the plate */}
            {[-HOOK_BRACKET_W * 0.32, HOOK_BRACKET_W * 0.32].map((px) => (
                <mesh key={px} position={[px, 0.12, 0]} castShadow>
                    <cylinderGeometry args={[0.18, 0.18, 0.25, 10]} />
                    <meshStandardMaterial color={HOOK_PIN_COLOR} metalness={0.2} roughness={0.6} />
                </mesh>
            ))}
        </group>
    )
}

// Hook X positions mirror the backend (draw_backhook_instruction). A single hook
// happens only for a single baseplate → dead center. Otherwise two hooks sit over
// the first and last top-row baseplates (or spread across a single-column mosaic).
function computeHookXs(data: PreviewData): number[] {
    const bw = Math.max(1, Math.floor(data.block_width))
    const bh = Math.max(1, Math.floor(data.block_height))
    const { width_studs } = data
    const offsetX = -(width_studs - 1) / 2

    if (Math.min(bw * bh, 2) === 1) return [0] // single baseplate → center
    if (bw >= 2) {
        // Centers of the first and last top-row baseplates (baseplate bx center = bx*16 + 7.5).
        return [7.5 + offsetX, (bw - 1) * 16 + 7.5 + offsetX]
    }
    // bw === 1 but multiple rows: spread across the single 16-wide column at 30%/70% of width.
    return [-0.2 * width_studs, 0.2 * width_studs]
}

function WallHooks({ data }: { data: PreviewData }) {
    const hookXs = computeHookXs(data)
    // Physical top edge of the (possibly framed) back plate; +2 mirrors Baseplate's frame margin.
    const halfDepth = (data.height_studs + (data.has_frame ? 2 : 0)) / 2
    const hookZ = -halfDepth + HOOK_INSET_Z // just below the top edge (most-negative Z)
    const hookY = -PLATE_H - 0.2 // sits proud of the back face

    return (
        <>
            {hookXs.map((x, i) => (
                <SingleHook key={i} position={[x, hookY, hookZ]} />
            ))}
        </>
    )
}

interface MosaicSceneContentProps {
    data: PreviewData
}

function MosaicSceneContent({ data }: MosaicSceneContentProps) {
    const groups = useStudGroups(data)
    return (
        <>
            <ambientLight intensity={0.55} />
            <directionalLight
                position={[12, 18, 10]}
                intensity={1.1}
                castShadow
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
            />
            <directionalLight position={[-8, 6, -4]} intensity={0.35} />
            <Baseplate
                widthStuds={data.width_studs}
                heightStuds={data.height_studs}
                hasFrame={data.has_frame}
            />
            <Frame data={data} />
            <BaseplateSeams data={data} />
            <WallHooks data={data} />
            <BackPieces data={data} />
            {groups.map((g) => (
                <StudInstances key={g.paletteIdx} group={g} />
            ))}
        </>
    )
}

export interface MosaicSceneHandle {
    reset: () => void
    /** Snapshot the current camera + controls state — used to hand off the view
     *  when popping the small preview into the expanded modal. Returns null
     *  before the scene has finished mounting. */
    getCameraState: () => CameraState | null
}

interface MosaicSceneProps {
    data: PreviewData
    autoRotate?: boolean
    /** When provided, the scene mounts with the camera direction taken from
     *  this position; the distance is still re-fitted to the canvas aspect. */
    initialCamera?: { position: Vec3Tuple; target: Vec3Tuple } | null
    /** When true, the scene mounts in the "user has interacted" state — no
     *  auto-rotation until Reset is pressed. */
    initialUserStopped?: boolean
    /** Multiplier applied to the minimum bounding-sphere fit distance. 1.0 is
     *  edge-to-edge; the default leaves room for chrome and rotating corners. */
    fitMargin?: number
}

type ControlsHandle = React.ComponentRef<typeof OrbitControls>

/**
 * Internal bridge: lets the parent imperative handle reach the Canvas's
 * camera + controls (which only exist inside the r3f tree).
 */
interface CameraBridgeRef {
    camera: THREE.Camera | null
    controls: ControlsHandle | null
}

function CameraBridge({
    bridgeRef,
    controlsRef,
    initialCamera,
    diag,
    fitMargin,
}: {
    bridgeRef: React.MutableRefObject<CameraBridgeRef>
    controlsRef: React.MutableRefObject<ControlsHandle | null>
    initialCamera: { position: Vec3Tuple; target: Vec3Tuple } | null | undefined
    diag: number
    fitMargin: number
}) {
    const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
    const size = useThree((s) => s.size)
    const appliedRef = useRef(false)

    // Keep the bridge populated so getCameraState() can read fresh refs.
    // Runs after every commit; the controls handle is stable, so this is
    // effectively a one-shot wiring on first mount.
    useEffect(() => {
        bridgeRef.current.camera = camera
        bridgeRef.current.controls = controlsRef.current
    })

    useEffect(() => {
        if (appliedRef.current) return
        if (size.width === 0 || size.height === 0) return
        const controls = controlsRef.current
        if (!controls) return

        if (initialCamera) {
            camera.position.set(...initialCamera.position)
            controls.target.set(...initialCamera.target)
        }

        const dir = camera.position.clone().sub(controls.target)
        if (dir.lengthSq() === 0) dir.set(0.55, 0.85, 0.75)
        dir.normalize()

        // The mosaic is a flat plate in the X-Z plane (Y up). During Y-axis
        // rotation, its projected bounding box on screen is at most `diag` wide
        // (the in-plane diagonal) and sin(elevation)*diag tall (depth
        // foreshortened by camera elevation). Fitting this rectangle instead
        // of the bounding sphere keeps the framing tight without clipping.
        const elevation = Math.abs(Math.asin(Math.min(1, Math.max(-1, dir.y))))
        const screenW = diag
        const screenH = Math.sin(elevation) * diag
        const aspect = size.width / size.height
        const tanV = Math.tan(((camera.fov || 45) * Math.PI) / 180 / 2)
        const distance =
            Math.max(screenW / (2 * tanV * aspect), screenH / (2 * tanV)) * fitMargin

        camera.position.copy(controls.target).addScaledVector(dir, distance)
        camera.updateProjectionMatrix()
        controls.update()
        // Make this the new "initial" so the reset button returns to a fitted view.
        controls.saveState()
        appliedRef.current = true
    }, [camera, controlsRef, initialCamera, size.width, size.height, diag, fitMargin])

    return null
}

/**
 * Three.js mosaic preview. Wraps the canvas, lighting, camera, and orbit
 * controls — caller just passes preview JSON. Exposes a `reset()` imperative
 * handle so the parent's Reset button can recenter the camera.
 */
export const MosaicScene = forwardRef<MosaicSceneHandle, MosaicSceneProps>(function MosaicScene(
    { data, autoRotate = true, initialCamera = null, initialUserStopped = false, fitMargin = 1.08 },
    ref,
) {
    const controlsRef = useRef<ControlsHandle | null>(null)
    const bridgeRef = useRef<CameraBridgeRef>({ camera: null, controls: null })
    // Once the user actively rotates/drags, freeze auto-rotation until Reset.
    // Wheel zoom doesn't fire pointerdown, so it stays spinning on zoom alone.
    const [userStopped, setUserStopped] = useState(initialUserStopped)

    useImperativeHandle(ref, () => ({
        reset: () => {
            controlsRef.current?.reset()
            setUserStopped(false)
        },
        getCameraState: () => {
            const cam = bridgeRef.current.camera
            const ctrl = bridgeRef.current.controls
            if (!cam || !ctrl) return null
            return {
                position: [cam.position.x, cam.position.y, cam.position.z],
                target: [ctrl.target.x, ctrl.target.y, ctrl.target.z],
                isAutoRotating: autoRotate && !userStopped,
            }
        },
    }))

    const diag = Math.hypot(data.width_studs, data.height_studs) + 2
    // Direction hint only — CameraBridge re-fits the distance from the actual
    // canvas aspect on mount so corners stay on-screen during rotation.
    const defaultCameraPos: Vec3Tuple = [diag * 0.66, diag * 1.02, diag * 0.9]
    const cameraPos = initialCamera?.position ?? defaultCameraPos
    const span = Math.max(data.width_studs, data.height_studs)

    return (
        <Canvas
            shadows
            dpr={[1, 2]}
            camera={{ position: cameraPos, fov: 45, near: 0.1, far: diag * 8 }}
            gl={{ antialias: true, alpha: true }}
            style={{ background: 'transparent' }}
            onPointerDown={() => setUserStopped(true)}
        >
            <OrbitControls
                ref={controlsRef}
                makeDefault
                enablePan={false}
                enableDamping
                dampingFactor={0.12}
                autoRotate={autoRotate && !userStopped}
                autoRotateSpeed={0.8}
                minDistance={span * 0.4}
                maxDistance={span * 3}
                />
            <CameraBridge
                bridgeRef={bridgeRef}
                controlsRef={controlsRef}
                initialCamera={initialCamera}
                diag={diag}
                fitMargin={fitMargin}
            />
            <MosaicSceneContent data={data} />
        </Canvas>
    )
})
