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
            {/* Flat mounting plate flush against back face */}
            <mesh>
                <boxGeometry args={[2.0, 0.15, 1.0]} />
                <meshStandardMaterial color="#888888" metalness={0.75} roughness={0.25} />
            </mesh>
            {/* Angled catch — leans away from the back so a nail can slot in */}
            <mesh position={[0, -0.35, -0.3]} rotation={[Math.PI * 0.1, 0, 0]}>
                <boxGeometry args={[0.35, 0.7, 0.15]} />
                <meshStandardMaterial color="#888888" metalness={0.75} roughness={0.25} />
            </mesh>
        </group>
    )
}

function WallHooks({ data }: { data: PreviewData }) {
    const { width_studs, height_studs, block_width, block_height } = data
    // Mirror backend logic: nailHooks = min(blockW * blockH, 2)
    const hookCount = Math.min(block_width * block_height, 2)
    // Hooks sit just proud of the baseplate's back face
    const hookY = -PLATE_H - 0.2
    // Place hooks 25% down from the top edge (negative Z = top of mosaic image)
    const hookZ = -(height_studs * 0.25)
    const hookXs: number[] = hookCount === 1
        ? [0]
        : [-(width_studs * 0.25), width_studs * 0.25]

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
            <WallHooks data={data} />
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
