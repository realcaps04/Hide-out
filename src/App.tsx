import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Float, Sparkles, Text } from '@react-three/drei'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import hideoutLogo from './assets/hideout-logo.png'

type Role = 'Hider' | 'Finder'
type Phase = 'menu' | 'lobby' | 'hide' | 'hunt' | 'results'
type RoomPanel = 'none' | 'create' | 'public' | 'join'
type RoomVisibility = 'private' | 'public'
type Spot = { id: string; name: string; position: [number, number, number]; color: string }
type Vector = { x: number; z: number }

const HIDE_SPOTS: Spot[] = [
  { id: 'wardrobe', name: 'Dusty wardrobe', position: [-7.5, 0, -5.6], color: '#825b35' },
  { id: 'crate', name: 'Crate stack', position: [6.8, 0, -4.9], color: '#946f36' },
  { id: 'laundry', name: 'Laundry basket', position: [-7.4, 0, 5.2], color: '#567a86' },
  { id: 'table', name: 'Workbench table', position: [5.6, 0, 5.3], color: '#765131' },
  { id: 'bookshelf', name: 'Library shelf', position: [0, 0, 7.8], color: '#5b4032' },
]

const BOT_POSITIONS: [number, number, number][] = [
  [-7.5, 0, -5.6],
  [6.8, 0, -4.9],
  [5.6, 0, 5.3],
]

const roomLabels = [
  { name: 'STORAGE', pos: [-7.5, 0.1, -8.7] as [number, number, number] },
  { name: 'MAIN HALL', pos: [0, 0.1, -8.7] as [number, number, number] },
  { name: 'BOILER ROOM', pos: [7.2, 0.1, -8.7] as [number, number, number] },
  { name: 'LAUNDRY', pos: [-7.5, 0.1, 8.8] as [number, number, number] },
  { name: 'WORKSHOP', pos: [6.5, 0.1, 8.8] as [number, number, number] },
]

function formatTime(seconds: number) {
  const safe = Math.max(0, seconds)
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`
}

function makeRoomCode() {
  return `HIDE-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
}

function distance(a: Vector, b: [number, number, number]) {
  return Math.hypot(a.x - b[0], a.z - b[2])
}

export default function App() {
  const [phase, setPhase] = useState<Phase>('menu')
  const [role, setRole] = useState<Role>('Hider')
  const [seconds, setSeconds] = useState(45)
  const [position, setPosition] = useState<Vector>({ x: 0, z: 2.8 })
  const [hiddenSpot, setHiddenSpot] = useState<Spot | null>(null)
  const [flashlight, setFlashlight] = useState(true)
  const [caughtBots, setCaughtBots] = useState<number[]>([])
  const [successfulHides, setSuccessfulHides] = useState(0)
  const [notice, setNotice] = useState('Explore the basement. Find a clever hiding place.')
  const [roomCode, setRoomCode] = useState<string | null>(null)
  const [roomVisibility, setRoomVisibility] = useState<RoomVisibility>('private')

  const nearbySpot = useMemo(
    () => HIDE_SPOTS.find((spot) => distance(position, spot.position) < 2.35) ?? null,
    [position],
  )
  const nearbyBot = useMemo(
    () => BOT_POSITIONS.findIndex((bot, i) => !caughtBots.includes(i) && distance(position, bot) < 2.15),
    [position, caughtBots],
  )

  const startMatch = useCallback((nextRole: Role, lobbyCode?: string, visibility: RoomVisibility = 'private') => {
    setRole(nextRole)
    setPhase('lobby')
    setSeconds(0)
    setHiddenSpot(null)
    setCaughtBots([])
    setSuccessfulHides(0)
    setRoomCode(lobbyCode ?? null)
    setRoomVisibility(visibility)
    setPosition(nextRole === 'Finder' ? { x: 0, z: -0.5 } : { x: 0, z: 3.2 })
    setNotice('Waiting in the pre-game lobby.')
  }, [])

  const endMatch = useCallback((winner: 'HIDERS' | 'FINDER') => {
    setPhase('results')
    setHiddenSpot(null)
    setNotice(winner === 'HIDERS' ? 'The hunt is over. At least one Hider endured.' : 'Every Hider has been found.')
  }, [])

  useEffect(() => {
    if (phase !== 'hide' && phase !== 'hunt') return
    const timer = window.setInterval(() => {
      setSeconds((current) => {
        if (current > 1) return current - 1
        if (phase === 'hide') {
          setPhase('hunt')
          setNotice(role === 'Finder' ? 'The hatch unlocks. Start searching.' : 'The Finder is loose. Stay quiet.')
          return 180
        }
        endMatch('HIDERS')
        return 0
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [phase, role, endMatch])

  const interact = useCallback(() => {
    if (phase === 'menu' || phase === 'results') return
    if (role === 'Finder') {
      if (phase === 'hide') {
        setNotice('The Finder’s hatch unlocks when the hide timer ends.')
        return
      }
      if (nearbyBot >= 0) {
        const next = [...caughtBots, nearbyBot]
        setCaughtBots(next)
        setNotice(`Caught a Hider — ${3 - next.length} remain.`)
        if (next.length === BOT_POSITIONS.length) endMatch('FINDER')
      } else {
        setNotice('No Hider close enough to catch. Search the cupboards, crates, and tables.')
      }
      return
    }
    if (hiddenSpot) {
      setHiddenSpot(null)
      setNotice('You slip back out. Find another place or keep moving.')
      return
    }
    if (nearbySpot) {
      setHiddenSpot(nearbySpot)
      setSuccessfulHides((total) => total + 1)
      setNotice(`Hidden in ${nearbySpot.name}. Press E or the button to leave.`)
    } else {
      setNotice('Move closer to a glowing hiding place, then press E.')
    }
  }, [phase, role, nearbyBot, caughtBots, endMatch, hiddenSpot, nearbySpot])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.code === 'KeyE' && !event.repeat) interact()
      if (event.code === 'KeyF' && !event.repeat) setFlashlight((value) => !value)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [interact])

  if (phase === 'menu') {
    return <MainMenu onStart={startMatch} />
  }

  if (phase === 'lobby') {
    return <PreGameLobby
      key={roomCode ?? 'TRAINING'}
      role={role}
      roomCode={roomCode ?? 'TRAINING'}
      visibility={roomVisibility}
      onLeave={() => setPhase('menu')}
      onStart={() => {
        setPhase('hide')
        setSeconds(45)
        setNotice(role === 'Finder' ? 'The hatch is locked. The Hiders are choosing their spots.' : 'Hide phase: 45 seconds. Make yourself hard to find.')
      }}
    />
  }

  const phaseTitle = phase === 'hide' ? 'HIDE PHASE' : phase === 'hunt' ? 'HUNT PHASE' : 'MATCH COMPLETE'
  const interactionText = role === 'Finder'
    ? phase === 'hide' ? 'The hatch is locked' : nearbyBot >= 0 ? 'Catch nearby Hider' : 'Search for a Hider'
    : hiddenSpot ? `Leave ${hiddenSpot.name}` : nearbySpot ? `Hide in ${nearbySpot.name}` : 'Find a hiding place'

  return (
    <main className="game-shell">
      <Canvas className="game-canvas" shadows camera={{ fov: 50, position: [0, 4, 9] }}>
        <Basement
          phase={phase}
          role={role}
          playerHidden={Boolean(hiddenSpot)}
          flashlight={flashlight}
          caughtBots={caughtBots}
          onMove={setPosition}
        />
      </Canvas>

      <header className="top-hud">
        <div className="brand-mini"><span className="brand-mark">H</span><span>HIDEOUT</span></div>
        <div className="phase-clock">
          <span>{phaseTitle}</span>
          <strong>{formatTime(seconds)}</strong>
        </div>
        <div className="role-badge"><i className={role.toLowerCase()}></i>{role}</div>
      </header>

      <aside className="mission-card">
        <span className="eyebrow">THE FORGOTTEN BASEMENT</span>
        <p>{notice}</p>
      </aside>

      {roomCode && <div className="room-code-hud"><span>{roomVisibility.toUpperCase()} ROOM</span><strong>{roomCode}</strong></div>}

      <aside className="status-card">
        <div><span>HIDERS</span><strong>{role === 'Finder' ? 3 - caughtBots.length : hiddenSpot ? 'HIDDEN' : 'ALIVE'}</strong></div>
        <div><span>LIGHT</span><strong>{flashlight ? 'ON' : 'OFF'}</strong></div>
      </aside>

      <div className="action-area">
        <button className="action-button" onClick={interact}><kbd>E</kbd><span>{interactionText}</span></button>
        <button className={`flashlight-button ${flashlight ? 'active' : ''}`} onClick={() => setFlashlight((value) => !value)} title="Toggle flashlight"><kbd>F</kbd> ◒</button>
      </div>

      <div className="control-hint">WASD <span>move</span><b>•</b> drag <span>look</span><b>•</b> E <span>interact</span></div>

      {phase === 'results' && (
        <div className="results-overlay">
          <section className="results-card">
            <span className="eyebrow">MATCH REPORT</span>
            <h1>{role === 'Finder' && caughtBots.length === 3 ? 'THE FINDER WINS' : 'THE HIDERS ENDURE'}</h1>
            <p>{notice}</p>
            <div className="result-stats"><div><strong>{role}</strong><span>your role</span></div><div><strong>{role === 'Finder' ? caughtBots.length : successfulHides}</strong><span>{role === 'Finder' ? 'hiders found' : 'successful hides'}</span></div></div>
            <button className="primary-button" onClick={() => startMatch(role)}>Play again</button>
            <button className="text-button" onClick={() => setPhase('menu')}>Back to hideout</button>
          </section>
        </div>
      )}
    </main>
  )
}

function PreGameLobby({ role, roomCode, visibility, onLeave, onStart }: { role: Role; roomCode: string; visibility: RoomVisibility; onLeave: () => void; onStart: () => void }) {
  const [ready, setReady] = useState(false)
  const isTraining = roomCode === 'TRAINING'
  const players = [
    { name: 'YOU', role, ready, local: true, tint: '#e3c96d' },
  ]
  const minimumPlayers = isTraining ? 1 : 4
  const openSlots = Math.max(minimumPlayers - players.length, 0)
  const canStart = isTraining || (players.length >= minimumPlayers && players.every((player) => player.ready))
  return <main className="lobby-shell">
    <div className="lobby-ambient" /><div className="lobby-grid" />
    <header className="lobby-topbar"><div className="brand-mini"><span className="brand-mark">H</span><span>HIDEOUT</span></div><span className="lobby-status"><i /> ROOM ASSEMBLING</span><button onClick={onLeave}>Leave Lobby</button></header>
    <section className="lobby-layout">
      <div className="lobby-title"><span className="eyebrow">{visibility.toUpperCase()} ROOM · {roomCode}</span><h1>Before the hunt,<br /><em>know your shadows.</em></h1><p>Check who is ready, choose your role, then enter The Forgotten Basement together.</p><div className="lobby-map-chip"><span>MAP 01</span><strong>The Forgotten Basement</strong><small>4–12 PLAYERS · 1 FINDER</small></div></div>
      <section className="player-roster">
        <div className="roster-heading"><div><span className="eyebrow">PLAYERS IN LOBBY</span><h2>{players.length} <small>/ {minimumPlayers} minimum</small></h2></div><span className={`min-ready ${canStart ? 'met' : ''}`}>{canStart ? 'READY TO START' : `${openSlots} MORE NEEDED`}</span></div>
        <div className="player-list">{players.map((player) => <article className={`player-row ${player.local ? 'you' : ''}`} key={player.name}><span className="player-avatar" style={{ '--player-tint': player.tint } as React.CSSProperties}><i className="avatar-head" /><i className="avatar-body" /></span><div><strong>{player.name}</strong><small>{player.local ? 'HOST · ' : ''}{player.role}</small></div><span className={`ready-pill ${player.ready ? 'ready' : ''}`}>{player.ready ? 'READY' : 'NOT READY'}</span></article>)}{Array.from({ length: openSlots }, (_, index) => <article className="player-row waiting-seat" key={`open-${index}`}><span className="player-avatar empty"><i className="avatar-head" /><i className="avatar-body" /></span><div><strong>OPEN SEAT</strong><small>WAITING FOR PLAYER</small></div><span className="ready-pill">OPEN</span></article>)}</div>
        <div className="lobby-actions"><button className={`ready-button ${ready ? 'ready' : ''}`} onClick={() => setReady((value) => !value)}>{ready ? '✓ You are ready' : 'Mark as ready'}</button><button className="primary-button start-match" disabled={!canStart} onClick={onStart}>{isTraining ? 'Start Solo Training' : 'Start Hide Phase'} <span>→</span></button></div>
        <p className="lobby-note">{isTraining ? 'Solo training starts immediately when you are ready.' : 'The room waits for real players. The roster updates whenever players join, leave, or switch rooms.'}</p>
      </section>
    </section>
  </main>
}

function MainMenu({ onStart }: { onStart: (role: Role, roomCode?: string, visibility?: RoomVisibility) => void }) {
  const [showAbout, setShowAbout] = useState(false)
  const [roomPanel, setRoomPanel] = useState<RoomPanel>('none')
  return (
    <main className="menu-shell">
      <div className="menu-vignette" /><div className="menu-noise" />
      <div className="menu-light one" /><div className="menu-light two" /><div className="menu-orbit" />
      <section className="menu-copy">
        <div className="logo-lockup"><span className="eyebrow">A GAME OF DECEPTION</span><img src={hideoutLogo} alt="HIDEOUT" /></div>
        <p className="tagline"><span>Hide well.</span> Trust nobody. Survive the hunt.</p>
        <p className="intro">A stylized game of hide-and-seek inside a basement much too big for the people trapped in it.</p>
        <div className="menu-actions">
          <button className="primary-button" onClick={() => setRoomPanel('create')}>Create Private Room <span>→</span></button>
          <button className="public-room-button" onClick={() => setRoomPanel('public')}><i /> Create Public Room</button>
          <button className="secondary-button" onClick={() => setRoomPanel('join')}>Join with Code</button>
        </div>
        <div className="menu-quick-links"><button onClick={() => onStart('Hider')}>Solo Hider Training</button><i /> <button onClick={() => onStart('Finder')}>Finder Training</button></div>
        <button className="about-button" onClick={() => setShowAbout((open) => !open)}>{showAbout ? 'Close project note' : 'What is this first build?'}</button>
        {showAbout && <p className="project-note">This is the first local gameplay slice: a playable 3D basement, movement, hiding spots, a timed hunt, and catch rules. Live rooms, player accounts, voice, and deployment will plug in as the next stages.</p>}
      </section>
      <section className="menu-map-card">
        <div className="map-card-top"><span className="eyebrow">MAP 01</span><span className="live-dot">DISCOVERED</span></div><h2>The Forgotten<br />Basement</h2>
        <div className="map-lines"><i /><i /><i /><i /><i /></div>
        <p>Storage · Laundry · Workshop<br />Boiler Room · Old Library</p>
      </section>
      <footer className="menu-footer"><span>LOCAL PROTOTYPE 01</span><span>HEADPHONES RECOMMENDED</span></footer>
      {roomPanel !== 'none' && <RoomPanelDialog type={roomPanel} onClose={() => setRoomPanel('none')} onStart={onStart} />}
    </main>
  )
}

function RoomPanelDialog({ type, onClose, onStart }: { type: Exclude<RoomPanel, 'none'>; onClose: () => void; onStart: (role: Role, roomCode?: string, visibility?: RoomVisibility) => void }) {
  const [code] = useState(makeRoomCode)
  const [joinCode, setJoinCode] = useState('')
  const [copied, setCopied] = useState(false)
  const isCreate = type === 'create' || type === 'public'
  const isPublic = type === 'public'
  const copyCode = async () => {
    await navigator.clipboard?.writeText(code)
    setCopied(true)
  }
  return <div className="lobby-overlay" role="dialog" aria-modal="true" aria-label={isCreate ? 'Create private room' : 'Join a room'}>
    <section className="lobby-card">
      <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
      <span className="eyebrow">{isPublic ? 'PUBLIC LOBBY' : isCreate ? 'PRIVATE LOBBY' : 'ENTER THE HIDEOUT'}</span>
      <h2>{isPublic ? 'Open the doors.' : isCreate ? 'Gather your crew.' : 'Join the hunt.'}</h2>
      <p>{isPublic ? 'Your room will be discoverable in the public room browser while it is waiting for players.' : isCreate ? 'Share this code with friends. A full match begins once everyone is in the lobby.' : 'Ask the room host for their six-character Hideout code.'}</p>
      {isCreate ? <>
        <div className="room-code-display"><span>ROOM CODE</span><strong>{code}</strong></div>
        <button className="copy-button" onClick={copyCode}>{copied ? 'Copied to clipboard' : 'Copy room code'}</button>
        <button className="primary-button lobby-enter" onClick={() => onStart('Hider', code, isPublic ? 'public' : 'private')}>{isPublic ? 'Open Public Lobby' : 'Enter Lobby'} <span>→</span></button>
      </> : <>
        <label className="room-input"><span>ROOM CODE</span><input autoFocus value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="HIDE-AB12" maxLength={9} /></label>
        <button className="primary-button lobby-enter" disabled={joinCode.trim().length < 4} onClick={() => onStart('Hider', joinCode.trim())}>Join Room <span>→</span></button>
      </>}
      <small>{isPublic ? 'Public rooms are discoverable until the match starts.' : 'Creator exit before start closes this room.'} · server matchmaking is the next multiplayer milestone.</small>
    </section>
  </div>
}

function Basement({ phase, role, playerHidden, flashlight, caughtBots, onMove }: {
  phase: Phase; role: Role; playerHidden: boolean; flashlight: boolean; caughtBots: number[]; onMove: (position: Vector) => void
}) {
  return <>
    <color attach="background" args={['#121811']} />
    <fog attach="fog" args={['#121811', 13, 38]} />
    <ambientLight intensity={0.38} color="#8e9ba0" />
    <hemisphereLight intensity={0.45} color="#9bb7bd" groundColor="#312919" />
    <pointLight position={[-6, 5, -5]} intensity={42} color="#efb35a" distance={12} castShadow />
    <pointLight position={[6, 4, 5]} intensity={30} color="#88c4c9" distance={10} castShadow />
    <pointLight position={[0, 6, 0]} intensity={18} color="#d7b473" distance={11} />
    <Environment preset="warehouse" environmentIntensity={0.23} />
    <BasementShell />
    <Props />
    <Sparkles count={110} scale={[22, 5, 22]} size={1.7} speed={0.14} opacity={0.22} color="#efddae" />
    {roomLabels.map((room) => <Text key={room.name} position={room.pos} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.32} color="#d9c99a" fillOpacity={0.55}>{room.name}</Text>)}
    {HIDE_SPOTS.map((spot) => <HideSpot key={spot.id} spot={spot} active={role === 'Hider' && !playerHidden} />)}
    {role === 'Finder' && BOT_POSITIONS.map((pos, index) => !caughtBots.includes(index) && <BotHider key={index} position={pos} visible={phase === 'hide'} />)}
    <PlayerController
      disabled={playerHidden || (role === 'Finder' && phase === 'hide') || phase === 'results'}
      hidden={playerHidden}
      flashlight={flashlight}
      role={role}
      phase={phase}
      onMove={onMove}
    />
  </>
}

function BasementShell() {
  const wall = (position: [number, number, number], scale: [number, number, number]) => <mesh position={position} castShadow receiveShadow><boxGeometry args={scale} /><meshStandardMaterial color="#3e4236" roughness={0.9} /></mesh>
  return <group>
    <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[25, 25]} /><meshStandardMaterial color="#4c4738" roughness={0.97} /></mesh>
    <mesh position={[0, 6, 0]} receiveShadow><boxGeometry args={[25, 0.24, 25]} /><meshStandardMaterial color="#24281f" roughness={1} /></mesh>
    {wall([0, 2.7, -11.8], [24, 5.5, 0.4])}{wall([0, 2.7, 11.8], [24, 5.5, 0.4])}
    {wall([-11.8, 2.7, 0], [0.4, 5.5, 24])}{wall([11.8, 2.7, 0], [0.4, 5.5, 24])}
    {wall([-3.9, 2, -6.5], [0.22, 4, 7])}{wall([3.9, 2, -6.5], [0.22, 4, 7])}
    {wall([-3.9, 2, 6.8], [0.22, 4, 6])}{wall([3.9, 2, 6.8], [0.22, 4, 6])}
    <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><ringGeometry args={[1.25, 1.38, 32]} /><meshStandardMaterial color="#7c6c49" emissive="#292010" /></mesh>
  </group>
}

function Props() {
  return <group>
    <Cupboard position={[-7.5, 1.5, -5.6]} /><Crates position={[6.8, 0.9, -4.9]} /><Laundry position={[-7.3, 0.8, 5.2]} />
    <Workbench position={[5.6, 1, 5.3]} /><Bookshelf position={[0, 1.8, 7.8]} /><Boiler position={[7.8, 1.7, -7.3]} />
    <Table position={[-0.7, 0.8, -1.6]} /><Table position={[1.1, 0.8, 2.2]} />
    {[[-8.5, -8], [8.4, -8], [-8.8, 8], [8.5, 8]].map(([x, z], i) => <FloorLamp key={i} position={[x, 0, z]} />)}
    <Door position={[-3.9, 1.5, -1.8]} rotation={[0, Math.PI / 2, 0]} /><Door position={[3.9, 1.5, 2.2]} rotation={[0, -Math.PI / 2, 0]} />
  </group>
}

function Cupboard({ position }: { position: [number, number, number] }) { return <group position={position}><mesh castShadow receiveShadow><boxGeometry args={[1.8, 3, 0.7]} /><meshStandardMaterial color="#704d2e" roughness={0.8} /></mesh><mesh position={[0, 0, 0.38]}><boxGeometry args={[0.07, 2.75, 0.08]} /><meshStandardMaterial color="#201912" /></mesh><mesh position={[-0.42, 0, 0.4]}><sphereGeometry args={[0.07]} /><meshStandardMaterial color="#d9af57" metalness={0.5} /></mesh></group> }
function Crates({ position }: { position: [number, number, number] }) { return <group position={position}><mesh castShadow><boxGeometry args={[1.8, 1.8, 1.8]} /><meshStandardMaterial color="#8b6537" roughness={0.9} /></mesh><mesh position={[-0.9, 0.4, 0.45]} castShadow><boxGeometry args={[0.9, 0.9, 0.9]} /><meshStandardMaterial color="#a27742" /></mesh><mesh position={[0.55, 1.55, 0.1]} castShadow><boxGeometry args={[0.75, 0.55, 0.75]} /><meshStandardMaterial color="#9a7040" /></mesh></group> }
function Laundry({ position }: { position: [number, number, number] }) { return <group position={position}><mesh castShadow><boxGeometry args={[1.7, 1.6, 0.9]} /><meshStandardMaterial color="#52727a" metalness={0.12} roughness={0.58} /></mesh><mesh position={[-0.4, 0, 0.48]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.28, 0.1, 10, 20]} /><meshStandardMaterial color="#1e282a" /></mesh><mesh position={[1.1, -0.4, 0]}><cylinderGeometry args={[0.65, 0.52, 0.9, 16]} /><meshStandardMaterial color="#8a7650" /></mesh></group> }
function Workbench({ position }: { position: [number, number, number] }) { return <group position={position}><mesh castShadow><boxGeometry args={[2.5, 0.22, 1.1]} /><meshStandardMaterial color="#755131" /></mesh>{[-1, 1].map(x => [-0.4, 0.4].map(z => <mesh key={`${x}${z}`} position={[x, -0.85, z]}><boxGeometry args={[0.16, 1.5, 0.16]} /><meshStandardMaterial color="#3b3024" /></mesh>))}<mesh position={[0, 0.35, -0.25]}><boxGeometry args={[0.55, 0.35, 0.35]} /><meshStandardMaterial color="#768064" /></mesh></group> }
function Bookshelf({ position }: { position: [number, number, number] }) { return <group position={position}><mesh castShadow><boxGeometry args={[3.1, 3.6, 0.55]} /><meshStandardMaterial color="#4e3426" /></mesh>{[-1.1, -0.55, 0, 0.55, 1.1].map((x, i) => <mesh key={x} position={[x, 0, 0.31]}><boxGeometry args={[0.32, 2.9, 0.1]} /><meshStandardMaterial color={i % 2 ? '#859064' : '#a75e3c'} /></mesh>)}</group> }
function Boiler({ position }: { position: [number, number, number] }) { return <group position={position}><mesh castShadow><cylinderGeometry args={[0.95, 1.05, 3.4, 18]} /><meshStandardMaterial color="#59695c" metalness={0.45} roughness={0.47} /></mesh><mesh position={[0, 0.1, 1.05]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.5, 0.1, 10, 24]} /><meshStandardMaterial color="#b36f3f" metalness={0.4} /></mesh></group> }
function Table({ position }: { position: [number, number, number] }) { return <group position={position}><mesh castShadow><boxGeometry args={[2.1, 0.18, 1.1]} /><meshStandardMaterial color="#685036" /></mesh>{[-0.85, 0.85].map(x => [-0.4, 0.4].map(z => <mesh key={`${x}${z}`} position={[x, -0.75, z]}><cylinderGeometry args={[0.08, 0.1, 1.45, 8]} /><meshStandardMaterial color="#483625" /></mesh>))}</group> }
function FloorLamp({ position }: { position: [number, number, number] }) { return <group position={position}><mesh position={[0, 2.8, 0]}><sphereGeometry args={[0.2, 16, 16]} /><meshStandardMaterial color="#f2ba64" emissive="#e7892b" emissiveIntensity={2} /></mesh><mesh position={[0, 1.4, 0]}><cylinderGeometry args={[0.04, 0.04, 2.8]} /><meshStandardMaterial color="#25251b" /></mesh><pointLight position={[0, 2.75, 0]} intensity={9} color="#f3ad52" distance={5} /></group> }
function Door({ position, rotation }: { position: [number, number, number]; rotation: [number, number, number] }) { return <mesh position={position} rotation={rotation} castShadow><boxGeometry args={[1.8, 3, 0.15]} /><meshStandardMaterial color="#785333" /></mesh> }

function HideSpot({ spot, active }: { spot: Spot; active: boolean }) {
  return <Float speed={1.15} floatIntensity={0.08} position={[spot.position[0], 0.2, spot.position[2]]}>
    {active && <mesh position={[0, 0.25, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.76, 0.85, 32]} /><meshBasicMaterial color="#e4c670" transparent opacity={0.75} /></mesh>}
  </Float>
}

function BotHider({ position, visible }: { position: [number, number, number]; visible: boolean }) {
  if (!visible) return null
  return <group position={[position[0] + 0.25, 0.55, position[2] + 0.2]}><mesh castShadow><capsuleGeometry args={[0.26, 0.65, 6, 10]} /><meshStandardMaterial color="#9bb2b1" roughness={0.7} /></mesh><Text position={[0, 1, 0]} fontSize={0.2} color="#e2ddd0">HIDER</Text></group>
}

function PlayerController({ disabled, hidden, flashlight, role, phase, onMove }: { disabled: boolean; hidden: boolean; flashlight: boolean; role: Role; phase: Phase; onMove: (position: Vector) => void }) {
  const character = useRef<THREE.Group>(null)
  const keys = useRef(new Set<string>())
  const drag = useRef(false)
  const yaw = useRef(role === 'Finder' ? 0 : Math.PI)
  const pos = useRef(new THREE.Vector3(0, 0.67, role === 'Finder' ? -0.5 : 3.2))
  const { camera, gl } = useThree()
  const lastSent = useRef(0)

  useEffect(() => {
    pos.current.set(0, 0.67, role === 'Finder' ? -0.5 : 3.2)
    yaw.current = role === 'Finder' ? 0 : Math.PI
  }, [role, phase])
  useEffect(() => {
    const down = (event: KeyboardEvent) => keys.current.add(event.code)
    const up = (event: KeyboardEvent) => keys.current.delete(event.code)
    const move = (event: PointerEvent) => { if (drag.current) yaw.current -= event.movementX * 0.005 }
    const release = () => { drag.current = false }
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('pointermove', move); window.addEventListener('pointerup', release)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', release) }
  }, [])
  useFrame((state, delta) => {
    const k = keys.current
    if (!disabled) {
      const forward = new THREE.Vector3(Math.sin(yaw.current), 0, Math.cos(yaw.current))
      const right = new THREE.Vector3(forward.z, 0, -forward.x)
      const move = new THREE.Vector3()
      if (k.has('KeyW') || k.has('ArrowUp')) move.add(forward)
      if (k.has('KeyS') || k.has('ArrowDown')) move.sub(forward)
      if (k.has('KeyD') || k.has('ArrowRight')) move.add(right)
      if (k.has('KeyA') || k.has('ArrowLeft')) move.sub(right)
      if (move.lengthSq() > 0) {
        move.normalize().multiplyScalar((k.has('ShiftLeft') ? 5.2 : 3.15) * delta)
        pos.current.add(move)
        pos.current.x = THREE.MathUtils.clamp(pos.current.x, -10.6, 10.6)
        pos.current.z = THREE.MathUtils.clamp(pos.current.z, -10.6, 10.6)
      }
    }
    if (character.current) {
      character.current.position.copy(pos.current)
      character.current.rotation.y = yaw.current
      character.current.visible = !hidden
    }
    const forward = new THREE.Vector3(Math.sin(yaw.current), 0, Math.cos(yaw.current))
    const target = pos.current.clone().add(new THREE.Vector3(0, 0.65, 0))
    const desired = pos.current.clone().sub(forward.multiplyScalar(5.3)).add(new THREE.Vector3(0, 3.25, 0))
    camera.position.lerp(desired, 1 - Math.exp(-delta * 7))
    camera.lookAt(target)
    if (state.clock.elapsedTime - lastSent.current > 0.12) { onMove({ x: pos.current.x, z: pos.current.z }); lastSent.current = state.clock.elapsedTime }
  })
  return <group ref={character} onPointerDown={(event) => { event.stopPropagation(); drag.current = true; gl.domElement.style.cursor = 'grabbing' }}>
    <mesh castShadow><capsuleGeometry args={[0.32, 0.73, 6, 12]} /><meshStandardMaterial color={role === 'Finder' ? '#bc6c45' : '#739b94'} roughness={0.58} /></mesh>
    <mesh position={[0, 0.66, 0]} castShadow><sphereGeometry args={[0.3, 16, 12]} /><meshStandardMaterial color="#e4b18d" roughness={0.82} /></mesh>
    <mesh position={[0, 0.91, 0.12]}><sphereGeometry args={[0.06, 10, 10]} /><meshStandardMaterial color="#252b26" /></mesh>
    {flashlight && <spotLight position={[0.23, 0.4, 0]} rotation={[-Math.PI / 2, 0, 0]} angle={0.48} penumbra={0.8} intensity={15} distance={9} color="#fff1bc" target-position={[0, 0, 5]} />}
  </group>
}
