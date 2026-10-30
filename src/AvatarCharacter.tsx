import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type CSSProperties } from 'react'
import * as THREE from 'three'

export type AvatarAction = 'wave' | 'search' | 'sneak' | 'ready' | 'flash' | 'look' | 'bounce' | 'signal'
export type AvatarGender = 'boys' | 'girls'
export type AvatarAccessory = 'hood' | 'headlamp' | 'cap' | 'beanie' | 'goggles' | 'knit' | 'glasses' | 'earmuffs'

export type AvatarLook = {
  id: string
  gender: AvatarGender
  codename: string
  label: string
  tint: string
  bodyColor: string
  accentColor: string
  hairColor: string
  skinColor: string
  accessory: AvatarAccessory
  action: AvatarAction
}

type RigRefs = {
  lift: THREE.Group
  torso: THREE.Group
  head: THREE.Group
  leftArm: THREE.Group
  rightArm: THREE.Group
  leftLeg: THREE.Group
  rightLeg: THREE.Group
  prop: THREE.Group
}

function useAvatarMotion(action: AvatarAction, active: boolean) {
  const phase = useRef(Math.random() * Math.PI * 2)
  return (rig: RigRefs, delta: number, elapsed: number) => {
    const t = elapsed + phase.current
    const energy = active ? 1 : 0.45
    const breathe = Math.sin(t * 2.1) * 0.015 * energy
    rig.torso.position.y = breathe
    rig.torso.rotation.y = THREE.MathUtils.damp(rig.torso.rotation.y, Math.sin(t * 0.7) * 0.06 * energy, 4, delta)
    rig.head.rotation.x = THREE.MathUtils.damp(rig.head.rotation.x, Math.sin(t * 1.4) * 0.04, 5, delta)

    const swing = Math.sin(t * (active ? 4.6 : 2.2)) * energy
    const resetLimb = (limb: THREE.Group, x = 0, z = 0) => {
      limb.rotation.x = THREE.MathUtils.damp(limb.rotation.x, x, 6, delta)
      limb.rotation.z = THREE.MathUtils.damp(limb.rotation.z, z, 6, delta)
    }

    let liftTarget = 0
    let torsoPitch = 0

    switch (action) {
      case 'wave': {
        resetLimb(rig.leftArm, 0.15, 0.18)
        rig.rightArm.rotation.x = THREE.MathUtils.damp(rig.rightArm.rotation.x, -2.1, 8, delta)
        rig.rightArm.rotation.z = THREE.MathUtils.damp(rig.rightArm.rotation.z, -0.35 + Math.sin(t * 7) * 0.55 * energy, 10, delta)
        resetLimb(rig.leftLeg, Math.sin(t * 2) * 0.05, 0)
        resetLimb(rig.rightLeg, -Math.sin(t * 2) * 0.05, 0)
        rig.head.rotation.y = THREE.MathUtils.damp(rig.head.rotation.y, Math.sin(t * 2.2) * 0.25, 5, delta)
        break
      }
      case 'search': {
        rig.head.rotation.y = THREE.MathUtils.damp(rig.head.rotation.y, Math.sin(t * 1.6) * 0.55 * energy, 4, delta)
        rig.head.rotation.x = THREE.MathUtils.damp(rig.head.rotation.x, -0.12 + Math.sin(t * 2.4) * 0.08, 5, delta)
        resetLimb(rig.leftArm, 0.35, 0.25)
        resetLimb(rig.rightArm, -0.55 + Math.sin(t * 2) * 0.2, -0.2)
        rig.prop.rotation.x = THREE.MathUtils.damp(rig.prop.rotation.x, -0.4 + Math.sin(t * 2) * 0.25, 6, delta)
        resetLimb(rig.leftLeg, swing * 0.12, 0)
        resetLimb(rig.rightLeg, -swing * 0.12, 0)
        break
      }
      case 'sneak': {
        liftTarget = -0.1
        torsoPitch = 0.28
        rig.head.rotation.x = THREE.MathUtils.damp(rig.head.rotation.x, 0.2, 5, delta)
        rig.head.rotation.y = THREE.MathUtils.damp(rig.head.rotation.y, Math.sin(t * 1.8) * 0.35, 4, delta)
        resetLimb(rig.leftArm, 0.7, 0.15)
        resetLimb(rig.rightArm, 0.7, -0.15)
        resetLimb(rig.leftLeg, 0.45 + swing * 0.15, 0)
        resetLimb(rig.rightLeg, -0.15 - swing * 0.15, 0)
        break
      }
      case 'ready': {
        resetLimb(rig.leftArm, 0.4, 0.45)
        resetLimb(rig.rightArm, 0.4, -0.45)
        resetLimb(rig.leftLeg, 0.18, 0.08)
        resetLimb(rig.rightLeg, -0.05, -0.08)
        rig.head.rotation.y = THREE.MathUtils.damp(rig.head.rotation.y, Math.sin(t * 1.5) * 0.15, 5, delta)
        break
      }
      case 'flash': {
        resetLimb(rig.leftArm, 0.2, 0.2)
        rig.rightArm.rotation.x = THREE.MathUtils.damp(rig.rightArm.rotation.x, -1.15 + Math.sin(t * 1.7) * 0.2, 7, delta)
        rig.rightArm.rotation.z = THREE.MathUtils.damp(rig.rightArm.rotation.z, -0.35, 7, delta)
        rig.prop.rotation.y = THREE.MathUtils.damp(rig.prop.rotation.y, Math.sin(t * 1.7) * 0.5, 6, delta)
        rig.head.rotation.y = THREE.MathUtils.damp(rig.head.rotation.y, Math.sin(t * 1.7) * 0.35, 5, delta)
        resetLimb(rig.leftLeg, swing * 0.08, 0)
        resetLimb(rig.rightLeg, -swing * 0.08, 0)
        break
      }
      case 'look': {
        rig.head.rotation.y = THREE.MathUtils.damp(rig.head.rotation.y, Math.sin(t * 1.2) * 0.7 * energy, 3.5, delta)
        rig.head.rotation.x = THREE.MathUtils.damp(rig.head.rotation.x, Math.sin(t * 0.9) * 0.12, 4, delta)
        resetLimb(rig.leftArm, 0.1, 0.12)
        resetLimb(rig.rightArm, 0.1, -0.12)
        resetLimb(rig.leftLeg, 0, 0.05)
        resetLimb(rig.rightLeg, 0, -0.05)
        break
      }
      case 'bounce': {
        liftTarget = Math.abs(Math.sin(t * 5.5)) * 0.1 * energy
        resetLimb(rig.leftArm, -0.4 + swing * 0.35, 0.25)
        resetLimb(rig.rightArm, -0.4 - swing * 0.35, -0.25)
        resetLimb(rig.leftLeg, swing * 0.35, 0)
        resetLimb(rig.rightLeg, -swing * 0.35, 0)
        break
      }
      case 'signal': {
        resetLimb(rig.leftArm, 0.2, 0.2)
        rig.rightArm.rotation.x = THREE.MathUtils.damp(rig.rightArm.rotation.x, -1.7, 8, delta)
        rig.rightArm.rotation.z = THREE.MathUtils.damp(rig.rightArm.rotation.z, -0.15 + Math.sin(t * 6.5) * 0.25, 9, delta)
        rig.prop.position.y = THREE.MathUtils.damp(rig.prop.position.y, 0.05 + Math.sin(t * 6.5) * 0.04, 8, delta)
        resetLimb(rig.leftLeg, 0.1, 0)
        resetLimb(rig.rightLeg, -0.05, 0)
        break
      }
    }

    rig.lift.position.y = THREE.MathUtils.damp(rig.lift.position.y, liftTarget, 8, delta)
    rig.torso.rotation.x = THREE.MathUtils.damp(rig.torso.rotation.x, torsoPitch, 6, delta)
  }
}

function AccessoryGear({ accessory, accentColor, hairColor }: { accessory: AvatarAccessory; accentColor: string; hairColor: string }) {
  switch (accessory) {
    case 'hood':
      return (
        <group>
          <mesh position={[0, 0.18, -0.02]} castShadow>
            <sphereGeometry args={[0.34, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
            <meshStandardMaterial color={accentColor} roughness={0.85} />
          </mesh>
        </group>
      )
    case 'headlamp':
      return (
        <group position={[0, 0.28, 0.22]}>
          <mesh castShadow>
            <boxGeometry args={[0.22, 0.08, 0.1]} />
            <meshStandardMaterial color="#222" roughness={0.5} metalness={0.4} />
          </mesh>
          <mesh position={[0, 0, 0.06]}>
            <sphereGeometry args={[0.05, 12, 12]} />
            <meshStandardMaterial color="#fff2c2" emissive="#ffd27a" emissiveIntensity={2.4} />
          </mesh>
          <pointLight intensity={1.4} distance={2.4} color="#ffe3a0" />
        </group>
      )
    case 'cap':
      return (
        <group position={[0, 0.26, 0]} rotation={[0, Math.PI, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.28, 0.3, 0.12, 16]} />
            <meshStandardMaterial color={accentColor} roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.02, 0.2]} rotation={[-0.2, 0, 0]} castShadow>
            <boxGeometry args={[0.28, 0.03, 0.18]} />
            <meshStandardMaterial color={accentColor} roughness={0.7} />
          </mesh>
        </group>
      )
    case 'beanie':
      return (
        <mesh position={[0, 0.28, 0]} castShadow>
          <sphereGeometry args={[0.3, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
          <meshStandardMaterial color={accentColor} roughness={0.95} />
        </mesh>
      )
    case 'goggles':
      return (
        <group position={[0, 0.3, 0.08]}>
          <mesh castShadow>
            <torusGeometry args={[0.14, 0.035, 8, 16]} />
            <meshStandardMaterial color="#c9a45a" metalness={0.55} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0, 0.02]}>
            <torusGeometry args={[0.14, 0.02, 8, 16]} />
            <meshStandardMaterial color="#89c4c8" metalness={0.2} roughness={0.2} transparent opacity={0.55} />
          </mesh>
        </group>
      )
    case 'knit':
      return (
        <group>
          <mesh position={[0, 0.28, 0]} castShadow>
            <sphereGeometry args={[0.3, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
            <meshStandardMaterial color={accentColor} roughness={0.95} />
          </mesh>
          <mesh position={[0, -0.05, 0.18]} castShadow>
            <torusGeometry args={[0.2, 0.07, 8, 16]} />
            <meshStandardMaterial color={hairColor} roughness={0.9} />
          </mesh>
        </group>
      )
    case 'glasses':
      return (
        <group position={[0, 0.06, 0.27]}>
          <mesh position={[-0.09, 0, 0]}>
            <torusGeometry args={[0.07, 0.012, 8, 16]} />
            <meshStandardMaterial color="#d7b56a" metalness={0.5} roughness={0.3} />
          </mesh>
          <mesh position={[0.09, 0, 0]}>
            <torusGeometry args={[0.07, 0.012, 8, 16]} />
            <meshStandardMaterial color="#d7b56a" metalness={0.5} roughness={0.3} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.08, 0.015, 0.015]} />
            <meshStandardMaterial color="#d7b56a" />
          </mesh>
        </group>
      )
    case 'earmuffs':
      return (
        <group>
          <mesh position={[-0.28, 0.05, 0]} castShadow>
            <sphereGeometry args={[0.1, 12, 12]} />
            <meshStandardMaterial color={accentColor} roughness={0.9} />
          </mesh>
          <mesh position={[0.28, 0.05, 0]} castShadow>
            <sphereGeometry args={[0.1, 12, 12]} />
            <meshStandardMaterial color={accentColor} roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.28, 0]} castShadow>
            <torusGeometry args={[0.22, 0.035, 8, 18, Math.PI]} />
            <meshStandardMaterial color={accentColor} roughness={0.9} />
          </mesh>
        </group>
      )
  }
}

function HairStyle({ gender, hairColor }: { gender: AvatarGender; hairColor: string }) {
  if (gender === 'girls') {
    return (
      <group>
        <mesh position={[0, 0.12, -0.05]} castShadow>
          <sphereGeometry args={[0.3, 16, 12]} />
          <meshStandardMaterial color={hairColor} roughness={0.85} />
        </mesh>
        <mesh position={[-0.16, -0.05, -0.08]} castShadow>
          <capsuleGeometry args={[0.07, 0.28, 4, 8]} />
          <meshStandardMaterial color={hairColor} roughness={0.85} />
        </mesh>
        <mesh position={[0.16, -0.05, -0.08]} castShadow>
          <capsuleGeometry args={[0.07, 0.28, 4, 8]} />
          <meshStandardMaterial color={hairColor} roughness={0.85} />
        </mesh>
      </group>
    )
  }
  return (
    <mesh position={[0, 0.14, -0.02]} castShadow>
      <sphereGeometry args={[0.29, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.72]} />
      <meshStandardMaterial color={hairColor} roughness={0.88} />
    </mesh>
  )
}

export function AvatarCharacter({
  look,
  active = true,
  scale = 1,
  showShadow = false,
}: {
  look: AvatarLook
  active?: boolean
  scale?: number
  showShadow?: boolean
}) {
  const lift = useRef<THREE.Group>(null)
  const torso = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const leftArm = useRef<THREE.Group>(null)
  const rightArm = useRef<THREE.Group>(null)
  const leftLeg = useRef<THREE.Group>(null)
  const rightLeg = useRef<THREE.Group>(null)
  const prop = useRef<THREE.Group>(null)
  const animate = useAvatarMotion(look.action, active)
  const backpackColor = useMemo(() => new THREE.Color(look.bodyColor).offsetHSL(0, -0.05, -0.12).getStyle(), [look.bodyColor])

  useFrame((state, delta) => {
    if (!lift.current || !torso.current || !head.current || !leftArm.current || !rightArm.current || !leftLeg.current || !rightLeg.current || !prop.current) return
    animate(
      {
        lift: lift.current,
        torso: torso.current,
        head: head.current,
        leftArm: leftArm.current,
        rightArm: rightArm.current,
        leftLeg: leftLeg.current,
        rightLeg: rightLeg.current,
        prop: prop.current,
      },
      delta,
      state.clock.elapsedTime,
    )
  })

  return (
    <group scale={scale}>
      <group ref={lift}>
        <group ref={torso}>
          <mesh position={[0, 1.05, 0]}>
            <capsuleGeometry args={[0.28, 0.55, 4, 10]} />
            <meshStandardMaterial color={look.bodyColor} roughness={0.72} />
          </mesh>
          <mesh position={[0, 1.15, -0.22]}>
            <boxGeometry args={[0.42, 0.48, 0.18]} />
            <meshStandardMaterial color={backpackColor} roughness={0.8} />
          </mesh>
          <group ref={head} position={[0, 1.58, 0]}>
            <mesh>
              <sphereGeometry args={[0.27, 14, 12]} />
              <meshStandardMaterial color={look.skinColor} roughness={0.78} />
            </mesh>
            <mesh position={[-0.08, 0.04, 0.23]}>
              <sphereGeometry args={[0.035, 8, 8]} />
              <meshStandardMaterial color="#1d2420" />
            </mesh>
            <mesh position={[0.08, 0.04, 0.23]}>
              <sphereGeometry args={[0.035, 8, 8]} />
              <meshStandardMaterial color="#1d2420" />
            </mesh>
            <HairStyle gender={look.gender} hairColor={look.hairColor} />
            <AccessoryGear accessory={look.accessory} accentColor={look.accentColor} hairColor={look.hairColor} />
          </group>

          <group ref={leftArm} position={[-0.38, 1.28, 0]}>
            <mesh position={[0, -0.28, 0]}>
              <capsuleGeometry args={[0.08, 0.42, 3, 8]} />
              <meshStandardMaterial color={look.bodyColor} roughness={0.72} />
            </mesh>
            <mesh position={[0, -0.55, 0]}>
              <sphereGeometry args={[0.08, 8, 8]} />
              <meshStandardMaterial color={look.skinColor} roughness={0.78} />
            </mesh>
          </group>
          <group ref={rightArm} position={[0.38, 1.28, 0]}>
            <mesh position={[0, -0.28, 0]}>
              <capsuleGeometry args={[0.08, 0.42, 3, 8]} />
              <meshStandardMaterial color={look.bodyColor} roughness={0.72} />
            </mesh>
            <mesh position={[0, -0.55, 0]}>
              <sphereGeometry args={[0.08, 8, 8]} />
              <meshStandardMaterial color={look.skinColor} roughness={0.78} />
            </mesh>
            <group ref={prop} position={[0, -0.62, 0.05]}>
              {(look.action === 'flash' || look.action === 'search' || look.accessory === 'goggles') && (
                <>
                  <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.045, 0.055, 0.28, 8]} />
                    <meshStandardMaterial color="#b8893a" metalness={0.45} roughness={0.4} />
                  </mesh>
                  <mesh position={[0, 0, 0.16]}>
                    <sphereGeometry args={[0.04, 8, 8]} />
                    <meshStandardMaterial color="#fff1c2" emissive="#ffd27a" emissiveIntensity={active ? 1.6 : 0.6} />
                  </mesh>
                </>
              )}
              {look.action === 'signal' && (
                <mesh>
                  <boxGeometry args={[0.12, 0.18, 0.04]} />
                  <meshStandardMaterial color={look.tint} emissive={look.tint} emissiveIntensity={0.8} />
                </mesh>
              )}
            </group>
          </group>
        </group>

        <group ref={leftLeg} position={[-0.14, 0.7, 0]}>
          <mesh position={[0, -0.28, 0]}>
            <capsuleGeometry args={[0.09, 0.4, 3, 8]} />
            <meshStandardMaterial color="#2b322c" roughness={0.85} />
          </mesh>
        </group>
        <group ref={rightLeg} position={[0.14, 0.7, 0]}>
          <mesh position={[0, -0.28, 0]}>
            <capsuleGeometry args={[0.09, 0.4, 3, 8]} />
            <meshStandardMaterial color="#2b322c" roughness={0.85} />
          </mesh>
        </group>
      </group>

      {showShadow && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <circleGeometry args={[0.55, 20]} />
          <meshBasicMaterial color="#000" transparent opacity={0.28} />
        </mesh>
      )}
    </group>
  )
}

function StageCamera() {
  const { camera } = useThree()
  useEffect(() => {
    camera.position.set(0, 1.05, 3.35)
    camera.lookAt(0, 0.95, 0)
    camera.updateProjectionMatrix()
  }, [camera])
  return null
}

export function AvatarStage({
  look,
  active = true,
  className,
  label,
}: {
  look: AvatarLook
  active?: boolean
  className?: string
  label?: string
}) {
  return (
    <div className={className} aria-label={label}>
      <Canvas
        dpr={1}
        frameloop="always"
        camera={{ position: [0, 1.05, 3.35], fov: 34, near: 0.1, far: 20 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#101714']} />
        <ambientLight intensity={0.7} />
        <hemisphereLight intensity={0.45} color="#d9e2c8" groundColor="#1b221c" />
        <directionalLight position={[2.2, 3.8, 2.4]} intensity={1.15} color="#fff1d0" />
        <pointLight position={[-1.4, 2.1, -0.8]} intensity={0.45} color={look.tint} />
        <StageCamera />
        <AvatarCharacter look={look} active={active} showShadow />
      </Canvas>
    </div>
  )
}

export function AvatarThumb({
  look,
  className,
  label,
}: {
  look: AvatarLook
  className?: string
  label?: string
}) {
  return (
    <div
      className={className}
      aria-label={label}
      style={{
        '--thumb-body': look.bodyColor,
        '--thumb-skin': look.skinColor,
        '--thumb-hair': look.hairColor,
        '--thumb-accent': look.accentColor,
        '--thumb-tint': look.tint,
      } as CSSProperties}
    >
      <span className="avatar-thumb-figure" data-accessory={look.accessory} data-gender={look.gender}>
        <i className="thumb-hair" />
        <i className="thumb-head" />
        <i className="thumb-body" />
        <i className="thumb-pack" />
      </span>
    </div>
  )
}
