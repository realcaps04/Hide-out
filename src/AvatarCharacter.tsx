import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Environment } from '@react-three/drei'
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

function shift(hex: string, h = 0, s = 0, l = 0) {
  const c = new THREE.Color(hex)
  const hsl = { h: 0, s: 0, l: 0 }
  c.getHSL(hsl)
  return new THREE.Color().setHSL(
    (hsl.h + h + 1) % 1,
    THREE.MathUtils.clamp(hsl.s + s, 0, 1),
    THREE.MathUtils.clamp(hsl.l + l, 0, 1),
  )
}

function Cloth({ color, roughness = 0.62, metalness = 0.04 }: { color: string; roughness?: number; metalness?: number }) {
  return <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} envMapIntensity={0.55} />
}

function Skin({ color }: { color: string }) {
  return <meshStandardMaterial color={color} roughness={0.48} metalness={0.08} envMapIntensity={0.35} />
}

function useAvatarMotion(action: AvatarAction, active: boolean) {
  const phase = useRef(Math.random() * Math.PI * 2)
  return (rig: RigRefs, delta: number, elapsed: number) => {
    const t = elapsed + phase.current
    const energy = active ? 1 : 0.4
    rig.torso.position.y = Math.sin(t * 1.9) * 0.012 * energy
    rig.torso.rotation.y = THREE.MathUtils.damp(rig.torso.rotation.y, Math.sin(t * 0.55) * 0.05 * energy, 4, delta)
    rig.head.rotation.x = THREE.MathUtils.damp(rig.head.rotation.x, Math.sin(t * 1.25) * 0.035, 5, delta)

    const swing = Math.sin(t * (active ? 4.4 : 2)) * energy
    const resetLimb = (limb: THREE.Group, x = 0, z = 0) => {
      limb.rotation.x = THREE.MathUtils.damp(limb.rotation.x, x, 6, delta)
      limb.rotation.z = THREE.MathUtils.damp(limb.rotation.z, z, 6, delta)
    }

    let liftTarget = 0
    let torsoPitch = 0

    switch (action) {
      case 'wave':
        resetLimb(rig.leftArm, 0.12, 0.16)
        rig.rightArm.rotation.x = THREE.MathUtils.damp(rig.rightArm.rotation.x, -2.05, 8, delta)
        rig.rightArm.rotation.z = THREE.MathUtils.damp(rig.rightArm.rotation.z, -0.3 + Math.sin(t * 6.5) * 0.5 * energy, 10, delta)
        resetLimb(rig.leftLeg, Math.sin(t * 1.8) * 0.04, 0.04)
        resetLimb(rig.rightLeg, -Math.sin(t * 1.8) * 0.04, -0.04)
        rig.head.rotation.y = THREE.MathUtils.damp(rig.head.rotation.y, Math.sin(t * 2) * 0.22, 5, delta)
        break
      case 'search':
        rig.head.rotation.y = THREE.MathUtils.damp(rig.head.rotation.y, Math.sin(t * 1.45) * 0.5 * energy, 4, delta)
        rig.head.rotation.x = THREE.MathUtils.damp(rig.head.rotation.x, -0.1 + Math.sin(t * 2.1) * 0.07, 5, delta)
        resetLimb(rig.leftArm, 0.3, 0.22)
        resetLimb(rig.rightArm, -0.5 + Math.sin(t * 1.8) * 0.18, -0.18)
        rig.prop.rotation.x = THREE.MathUtils.damp(rig.prop.rotation.x, -0.35 + Math.sin(t * 1.8) * 0.22, 6, delta)
        resetLimb(rig.leftLeg, swing * 0.1, 0)
        resetLimb(rig.rightLeg, -swing * 0.1, 0)
        break
      case 'sneak':
        liftTarget = -0.08
        torsoPitch = 0.24
        rig.head.rotation.x = THREE.MathUtils.damp(rig.head.rotation.x, 0.16, 5, delta)
        rig.head.rotation.y = THREE.MathUtils.damp(rig.head.rotation.y, Math.sin(t * 1.6) * 0.3, 4, delta)
        resetLimb(rig.leftArm, 0.62, 0.12)
        resetLimb(rig.rightArm, 0.62, -0.12)
        resetLimb(rig.leftLeg, 0.4 + swing * 0.12, 0)
        resetLimb(rig.rightLeg, -0.12 - swing * 0.12, 0)
        break
      case 'ready':
        resetLimb(rig.leftArm, 0.35, 0.4)
        resetLimb(rig.rightArm, 0.35, -0.4)
        resetLimb(rig.leftLeg, 0.14, 0.07)
        resetLimb(rig.rightLeg, -0.04, -0.07)
        rig.head.rotation.y = THREE.MathUtils.damp(rig.head.rotation.y, Math.sin(t * 1.3) * 0.12, 5, delta)
        break
      case 'flash':
        resetLimb(rig.leftArm, 0.16, 0.18)
        rig.rightArm.rotation.x = THREE.MathUtils.damp(rig.rightArm.rotation.x, -1.1 + Math.sin(t * 1.5) * 0.16, 7, delta)
        rig.rightArm.rotation.z = THREE.MathUtils.damp(rig.rightArm.rotation.z, -0.32, 7, delta)
        rig.prop.rotation.y = THREE.MathUtils.damp(rig.prop.rotation.y, Math.sin(t * 1.5) * 0.45, 6, delta)
        rig.head.rotation.y = THREE.MathUtils.damp(rig.head.rotation.y, Math.sin(t * 1.5) * 0.3, 5, delta)
        resetLimb(rig.leftLeg, swing * 0.06, 0)
        resetLimb(rig.rightLeg, -swing * 0.06, 0)
        break
      case 'look':
        rig.head.rotation.y = THREE.MathUtils.damp(rig.head.rotation.y, Math.sin(t * 1.1) * 0.62 * energy, 3.5, delta)
        rig.head.rotation.x = THREE.MathUtils.damp(rig.head.rotation.x, Math.sin(t * 0.85) * 0.1, 4, delta)
        resetLimb(rig.leftArm, 0.08, 0.1)
        resetLimb(rig.rightArm, 0.08, -0.1)
        resetLimb(rig.leftLeg, 0, 0.04)
        resetLimb(rig.rightLeg, 0, -0.04)
        break
      case 'bounce':
        liftTarget = Math.abs(Math.sin(t * 5.2)) * 0.08 * energy
        resetLimb(rig.leftArm, -0.35 + swing * 0.3, 0.22)
        resetLimb(rig.rightArm, -0.35 - swing * 0.3, -0.22)
        resetLimb(rig.leftLeg, swing * 0.3, 0)
        resetLimb(rig.rightLeg, -swing * 0.3, 0)
        break
      case 'signal':
        resetLimb(rig.leftArm, 0.16, 0.18)
        rig.rightArm.rotation.x = THREE.MathUtils.damp(rig.rightArm.rotation.x, -1.65, 8, delta)
        rig.rightArm.rotation.z = THREE.MathUtils.damp(rig.rightArm.rotation.z, -0.12 + Math.sin(t * 6) * 0.22, 9, delta)
        rig.prop.position.y = THREE.MathUtils.damp(rig.prop.position.y, 0.04 + Math.sin(t * 6) * 0.03, 8, delta)
        resetLimb(rig.leftLeg, 0.08, 0)
        resetLimb(rig.rightLeg, -0.04, 0)
        break
    }

    rig.lift.position.y = THREE.MathUtils.damp(rig.lift.position.y, liftTarget, 8, delta)
    rig.torso.rotation.x = THREE.MathUtils.damp(rig.torso.rotation.x, torsoPitch, 6, delta)
  }
}

function AccessoryGear({ accessory, accentColor }: { accessory: AvatarAccessory; accentColor: string; hairColor: string }) {
  const metal = shift(accentColor, 0.02, 0.05, 0.08)
  switch (accessory) {
    case 'hood':
      return (
        <group>
          <mesh position={[0, 0.16, -0.04]}>
            <sphereGeometry args={[0.33, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
            <Cloth color={accentColor} roughness={0.78} />
          </mesh>
          <mesh position={[0, 0.02, 0.18]} rotation={[0.35, 0, 0]}>
            <torusGeometry args={[0.2, 0.045, 10, 24, Math.PI * 1.15]} />
            <Cloth color={shift(accentColor, 0, -0.05, -0.08).getStyle()} roughness={0.82} />
          </mesh>
        </group>
      )
    case 'headlamp':
      return (
        <group position={[0, 0.26, 0.2]}>
          <mesh>
            <boxGeometry args={[0.24, 0.07, 0.1]} />
            <meshStandardMaterial color="#1a1d1b" metalness={0.65} roughness={0.28} />
          </mesh>
          <mesh position={[0, 0, 0.055]}>
            <cylinderGeometry args={[0.045, 0.05, 0.04, 16]} />
            <meshStandardMaterial color={metal} metalness={0.7} roughness={0.25} />
          </mesh>
          <mesh position={[0, 0, 0.08]}>
            <sphereGeometry args={[0.042, 16, 16]} />
            <meshStandardMaterial color="#fff4cf" emissive="#ffd27a" emissiveIntensity={2.8} />
          </mesh>
          <pointLight intensity={1.1} distance={2.2} color="#ffe3a0" />
        </group>
      )
    case 'cap':
      return (
        <group position={[0, 0.24, 0]} rotation={[0.05, Math.PI, 0]}>
          <mesh>
            <cylinderGeometry args={[0.27, 0.29, 0.11, 24]} />
            <Cloth color={accentColor} roughness={0.55} />
          </mesh>
          <mesh position={[0, -0.02, 0.2]} rotation={[-0.25, 0, 0]}>
            <boxGeometry args={[0.3, 0.025, 0.2]} />
            <Cloth color={shift(accentColor, 0, 0, -0.06).getStyle()} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.06, 0]}>
            <sphereGeometry args={[0.06, 12, 12]} />
            <meshStandardMaterial color="#f2e4b0" metalness={0.4} roughness={0.35} />
          </mesh>
        </group>
      )
    case 'beanie':
      return (
        <group>
          <mesh position={[0, 0.26, 0]}>
            <sphereGeometry args={[0.3, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.68]} />
            <Cloth color={accentColor} roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.42, -0.02]}>
            <sphereGeometry args={[0.06, 12, 12]} />
            <Cloth color={shift(accentColor, 0, -0.05, 0.08).getStyle()} roughness={0.92} />
          </mesh>
        </group>
      )
    case 'goggles':
      return (
        <group position={[0, 0.28, 0.06]}>
          <mesh rotation={[1.2, 0, 0]}>
            <torusGeometry args={[0.15, 0.028, 10, 28]} />
            <meshStandardMaterial color="#c9a45a" metalness={0.72} roughness={0.22} />
          </mesh>
          <mesh position={[-0.09, -0.16, 0.16]}>
            <cylinderGeometry args={[0.07, 0.07, 0.04, 18]} />
            <meshStandardMaterial color="#8fd0d4" metalness={0.35} roughness={0.12} transparent opacity={0.55} />
          </mesh>
          <mesh position={[0.09, -0.16, 0.16]}>
            <cylinderGeometry args={[0.07, 0.07, 0.04, 18]} />
            <meshStandardMaterial color="#8fd0d4" metalness={0.35} roughness={0.12} transparent opacity={0.55} />
          </mesh>
        </group>
      )
    case 'knit':
      return (
        <group>
          <mesh position={[0, 0.26, 0]}>
            <sphereGeometry args={[0.3, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.66]} />
            <Cloth color={accentColor} roughness={0.92} />
          </mesh>
          <mesh position={[0, -0.08, 0.16]} rotation={[0.4, 0, 0]}>
            <torusGeometry args={[0.2, 0.065, 10, 24]} />
            <Cloth color={shift(accentColor, 0.02, 0, -0.1).getStyle()} roughness={0.9} />
          </mesh>
        </group>
      )
    case 'glasses':
      return (
        <group position={[0, 0.05, 0.26]}>
          <mesh position={[-0.09, 0, 0]}>
            <torusGeometry args={[0.068, 0.01, 10, 24]} />
            <meshStandardMaterial color="#d7b56a" metalness={0.7} roughness={0.22} />
          </mesh>
          <mesh position={[0.09, 0, 0]}>
            <torusGeometry args={[0.068, 0.01, 10, 24]} />
            <meshStandardMaterial color="#d7b56a" metalness={0.7} roughness={0.22} />
          </mesh>
          <mesh>
            <boxGeometry args={[0.085, 0.012, 0.012]} />
            <meshStandardMaterial color="#d7b56a" metalness={0.65} roughness={0.25} />
          </mesh>
          <mesh position={[-0.09, 0, 0.005]}>
            <circleGeometry args={[0.055, 20]} />
            <meshStandardMaterial color="#9fd0d6" transparent opacity={0.28} metalness={0.2} roughness={0.1} />
          </mesh>
          <mesh position={[0.09, 0, 0.005]}>
            <circleGeometry args={[0.055, 20]} />
            <meshStandardMaterial color="#9fd0d6" transparent opacity={0.28} metalness={0.2} roughness={0.1} />
          </mesh>
        </group>
      )
    case 'earmuffs':
      return (
        <group>
          <mesh position={[-0.27, 0.04, 0]}>
            <sphereGeometry args={[0.095, 16, 16]} />
            <Cloth color={accentColor} roughness={0.88} />
          </mesh>
          <mesh position={[0.27, 0.04, 0]}>
            <sphereGeometry args={[0.095, 16, 16]} />
            <Cloth color={accentColor} roughness={0.88} />
          </mesh>
          <mesh position={[0, 0.27, 0]} rotation={[0, 0, 0]}>
            <torusGeometry args={[0.22, 0.03, 10, 24, Math.PI]} />
            <Cloth color={shift(accentColor, 0, -0.04, -0.08).getStyle()} roughness={0.86} />
          </mesh>
        </group>
      )
  }
}

function HairStyle({ gender, hairColor }: { gender: AvatarGender; hairColor: string }) {
  if (gender === 'girls') {
    return (
      <group>
        <mesh position={[0, 0.12, -0.04]}>
          <sphereGeometry args={[0.3, 24, 18]} />
          <Cloth color={hairColor} roughness={0.7} />
        </mesh>
        <mesh position={[-0.15, -0.08, -0.06]} rotation={[0.15, 0, 0.12]}>
          <capsuleGeometry args={[0.065, 0.34, 6, 12]} />
          <Cloth color={hairColor} roughness={0.7} />
        </mesh>
        <mesh position={[0.15, -0.08, -0.06]} rotation={[0.15, 0, -0.12]}>
          <capsuleGeometry args={[0.065, 0.34, 6, 12]} />
          <Cloth color={hairColor} roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.22, 0.05]}>
          <sphereGeometry args={[0.1, 14, 12]} />
          <Cloth color={shift(hairColor, 0, 0, 0.06).getStyle()} roughness={0.68} />
        </mesh>
      </group>
    )
  }
  return (
    <group>
      <mesh position={[0, 0.13, -0.02]}>
        <sphereGeometry args={[0.285, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.74]} />
        <Cloth color={hairColor} roughness={0.72} />
      </mesh>
      <mesh position={[-0.12, 0.08, 0.12]} rotation={[0.4, 0, 0.3]}>
        <capsuleGeometry args={[0.04, 0.08, 4, 8]} />
        <Cloth color={shift(hairColor, 0, 0, 0.05).getStyle()} roughness={0.74} />
      </mesh>
      <mesh position={[0.12, 0.08, 0.12]} rotation={[0.4, 0, -0.3]}>
        <capsuleGeometry args={[0.04, 0.08, 4, 8]} />
        <Cloth color={shift(hairColor, 0, 0, 0.05).getStyle()} roughness={0.74} />
      </mesh>
    </group>
  )
}

export function AvatarCharacter({
  look,
  active = true,
  scale = 1,
  showShadow = false,
  premium = false,
}: {
  look: AvatarLook
  active?: boolean
  scale?: number
  showShadow?: boolean
  premium?: boolean
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
  const pack = useMemo(() => shift(look.bodyColor, 0, -0.06, -0.14).getStyle(), [look.bodyColor])
  const cuff = useMemo(() => shift(look.bodyColor, 0, -0.04, -0.1).getStyle(), [look.bodyColor])
  const boot = '#232820'
  const detail = premium ? 1 : 0

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
          <mesh position={[0, 1.02, 0]}>
            <capsuleGeometry args={[0.27, 0.52, 8, 16]} />
            <Cloth color={look.bodyColor} roughness={0.58} />
          </mesh>
          <mesh position={[0, 1.28, 0.05]} rotation={[0.15, 0, 0]}>
            <torusGeometry args={[0.24, 0.05, 10, 24, Math.PI * 1.2]} />
            <Cloth color={cuff} roughness={0.64} />
          </mesh>
          <mesh position={[0, 0.86, 0.02]}>
            <torusGeometry args={[0.23, 0.028, 8, 24]} />
            <meshStandardMaterial color="#1c1812" metalness={0.45} roughness={0.4} />
          </mesh>
          <mesh position={[0, 1.12, -0.22]}>
            <boxGeometry args={[0.4, 0.46, 0.16]} />
            <Cloth color={pack} roughness={0.7} />
          </mesh>
          <mesh position={[-0.14, 1.28, -0.05]} rotation={[0.2, 0, 0.35]}>
            <capsuleGeometry args={[0.025, 0.42, 4, 8]} />
            <Cloth color="#2a2620" roughness={0.75} />
          </mesh>
          <mesh position={[0.14, 1.28, -0.05]} rotation={[0.2, 0, -0.35]}>
            <capsuleGeometry args={[0.025, 0.42, 4, 8]} />
            <Cloth color="#2a2620" roughness={0.75} />
          </mesh>
          {detail > 0 && (
            <mesh position={[0.12, 1.05, 0.24]}>
              <boxGeometry args={[0.08, 0.1, 0.03]} />
              <meshStandardMaterial color="#c9a45a" metalness={0.55} roughness={0.3} />
            </mesh>
          )}

          <group ref={head} position={[0, 1.55, 0]}>
            <mesh>
              <sphereGeometry args={[0.255, 28, 22]} />
              <Skin color={look.skinColor} />
            </mesh>
            <mesh position={[0, -0.02, 0.01]} scale={[0.92, 0.78, 0.9]}>
              <sphereGeometry args={[0.2, 18, 14]} />
              <Skin color={shift(look.skinColor, 0, -0.02, -0.04).getStyle()} />
            </mesh>
            <mesh position={[-0.075, 0.035, 0.22]}>
              <sphereGeometry args={[0.032, 12, 12]} />
              <meshStandardMaterial color="#141a17" roughness={0.35} />
            </mesh>
            <mesh position={[0.075, 0.035, 0.22]}>
              <sphereGeometry args={[0.032, 12, 12]} />
              <meshStandardMaterial color="#141a17" roughness={0.35} />
            </mesh>
            <mesh position={[-0.075, 0.04, 0.245]}>
              <sphereGeometry args={[0.01, 8, 8]} />
              <meshStandardMaterial color="#f5f0e4" emissive="#fff" emissiveIntensity={0.35} />
            </mesh>
            <mesh position={[0.075, 0.04, 0.245]}>
              <sphereGeometry args={[0.01, 8, 8]} />
              <meshStandardMaterial color="#f5f0e4" emissive="#fff" emissiveIntensity={0.35} />
            </mesh>
            <mesh position={[0, -0.03, 0.24]}>
              <sphereGeometry args={[0.02, 10, 10]} />
              <Skin color={shift(look.skinColor, 0, 0.05, -0.05).getStyle()} />
            </mesh>
            <HairStyle gender={look.gender} hairColor={look.hairColor} />
            <AccessoryGear accessory={look.accessory} accentColor={look.accentColor} hairColor={look.hairColor} />
          </group>

          <group ref={leftArm} position={[-0.36, 1.26, 0]}>
            <mesh position={[0, -0.26, 0]}>
              <capsuleGeometry args={[0.075, 0.4, 6, 12]} />
              <Cloth color={look.bodyColor} />
            </mesh>
            <mesh position={[0, -0.52, 0]}>
              <sphereGeometry args={[0.072, 14, 12]} />
              <Skin color={look.skinColor} />
            </mesh>
            <mesh position={[0, -0.12, 0]}>
              <torusGeometry args={[0.078, 0.018, 8, 16]} />
              <Cloth color={cuff} />
            </mesh>
          </group>
          <group ref={rightArm} position={[0.36, 1.26, 0]}>
            <mesh position={[0, -0.26, 0]}>
              <capsuleGeometry args={[0.075, 0.4, 6, 12]} />
              <Cloth color={look.bodyColor} />
            </mesh>
            <mesh position={[0, -0.52, 0]}>
              <sphereGeometry args={[0.072, 14, 12]} />
              <Skin color={look.skinColor} />
            </mesh>
            <mesh position={[0, -0.12, 0]}>
              <torusGeometry args={[0.078, 0.018, 8, 16]} />
              <Cloth color={cuff} />
            </mesh>
            <group ref={prop} position={[0, -0.58, 0.04]}>
              {(look.action === 'flash' || look.action === 'search' || look.accessory === 'goggles') && (
                <>
                  <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.04, 0.05, 0.26, 14]} />
                    <meshStandardMaterial color="#b8893a" metalness={0.62} roughness={0.28} />
                  </mesh>
                  <mesh position={[0, 0, 0.15]}>
                    <sphereGeometry args={[0.038, 12, 12]} />
                    <meshStandardMaterial color="#fff1c2" emissive="#ffd27a" emissiveIntensity={active ? 2 : 0.7} />
                  </mesh>
                </>
              )}
              {look.action === 'signal' && (
                <mesh>
                  <boxGeometry args={[0.11, 0.17, 0.035]} />
                  <meshStandardMaterial color={look.tint} emissive={look.tint} emissiveIntensity={0.9} metalness={0.2} roughness={0.35} />
                </mesh>
              )}
            </group>
          </group>
        </group>

        <group ref={leftLeg} position={[-0.13, 0.68, 0]}>
          <mesh position={[0, -0.24, 0]}>
            <capsuleGeometry args={[0.085, 0.36, 6, 12]} />
            <Cloth color={shift(look.bodyColor, 0, -0.08, -0.18).getStyle()} roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.48, 0.02]}>
            <boxGeometry args={[0.14, 0.1, 0.22]} />
            <meshStandardMaterial color={boot} roughness={0.55} metalness={0.12} />
          </mesh>
        </group>
        <group ref={rightLeg} position={[0.13, 0.68, 0]}>
          <mesh position={[0, -0.24, 0]}>
            <capsuleGeometry args={[0.085, 0.36, 6, 12]} />
            <Cloth color={shift(look.bodyColor, 0, -0.08, -0.18).getStyle()} roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.48, 0.02]}>
            <boxGeometry args={[0.14, 0.1, 0.22]} />
            <meshStandardMaterial color={boot} roughness={0.55} metalness={0.12} />
          </mesh>
        </group>
      </group>

      {showShadow && (
        <ContactShadows position={[0, 0.01, 0]} opacity={0.55} scale={4} blur={2.6} far={3.5} color="#050807" />
      )}
    </group>
  )
}

function StageCamera() {
  const { camera } = useThree()
  useEffect(() => {
    camera.position.set(1.15, 1.35, 2.85)
    camera.lookAt(0, 0.95, 0)
    camera.updateProjectionMatrix()
  }, [camera])
  return null
}

function StageSet({ tint }: { tint: string }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[1.35, 48]} />
        <meshStandardMaterial color="#161c18" roughness={0.92} metalness={0.05} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.72, 0.9, 48]} />
        <meshStandardMaterial color={tint} emissive={tint} emissiveIntensity={0.18} roughness={0.45} metalness={0.35} transparent opacity={0.55} />
      </mesh>
      <mesh position={[0, -0.04, 0]}>
        <cylinderGeometry args={[0.95, 1.05, 0.08, 48]} />
        <meshStandardMaterial color="#0f1411" roughness={0.85} metalness={0.2} />
      </mesh>
    </group>
  )
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
        dpr={[1, 1.5]}
        shadows
        frameloop="always"
        camera={{ position: [1.15, 1.35, 2.85], fov: 32, near: 0.1, far: 30 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#0b100d']} />
        <fog attach="fog" args={['#0b100d', 6, 14]} />
        <ambientLight intensity={0.35} />
        <hemisphereLight intensity={0.55} color="#e8efd8" groundColor="#1a221c" />
        <directionalLight castShadow position={[2.8, 4.2, 2.2]} intensity={1.45} color="#fff1d0" shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[-2.2, 2.4, -1.2]} intensity={0.45} color={look.tint} />
        <spotLight position={[0.2, 3.4, 1.8]} angle={0.45} penumbra={0.7} intensity={1.1} color="#ffe6b5" />
        <Environment preset="warehouse" environmentIntensity={0.28} />
        <StageCamera />
        <StageSet tint={look.tint} />
        <AvatarCharacter look={look} active={active} showShadow premium />
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
        <i className="thumb-glow" />
        <i className="thumb-hair" />
        <i className="thumb-head" />
        <i className="thumb-body" />
        <i className="thumb-pack" />
        <i className="thumb-boot left" />
        <i className="thumb-boot right" />
      </span>
    </div>
  )
}
