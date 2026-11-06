import { useEffect, useRef, useState } from 'react'
import type { ShellScene } from './games/shell/scene'
import { getShellDifficulty } from './shellRules'

type Phase = 'hiding' | 'shuffling' | 'choosing' | 'revealing' | 'ended'
export default function ShellMemory() {
  const [round, setRound] = useState(1)
  const [lives, setLives] = useState(3)
  const [phase, setPhase] = useState<Phase>('hiding')
  const [attempt, setAttempt] = useState(0)
  const [positions, setPositions] = useState([0, 1, 2])
  const [ballCup, setBallCup] = useState(() => Math.floor(Math.random() * 3))
  const [choice, setChoice] = useState<number | null>(null)
  const [best, setBest] = useState(() => Number(localStorage.getItem('shell-memory-best')) || 0)
  const locked = useRef(false)
  const stageRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<ShellScene | null>(null)
  const chooseRef = useRef<(id: number) => void>(() => {})
  const [sceneReady, setSceneReady] = useState(false)
  const [sceneError, setSceneError] = useState(false)
  const { cups, speed } = getShellDifficulty(round)
  const correct = choice === ballCup

  const startRound = (nextRound: number) => {
    const count = getShellDifficulty(nextRound).cups
    setRound(nextRound)
    setPositions(Array.from({ length: count }, (_, index) => index))
    setBallCup(Math.floor(Math.random() * count))
    setChoice(null)
    setAttempt((current) => current + 1)
    locked.current = false
    setPhase('hiding')
  }

  useEffect(() => {
    if (phase !== 'hiding') return
    const timeout = window.setTimeout(() => setPhase('shuffling'), 1900)
    return () => window.clearTimeout(timeout)
  }, [phase, attempt])

  useEffect(() => {
    if (phase !== 'shuffling') return
    let timeout: number
    let previousPair = ''
    const deadline = performance.now() + 5000
    const shuffle = () => {
      const remaining = deadline - performance.now()
      if (remaining < 100) {
        setPhase('choosing')
        return
      }
      let first: number
      let second: number
      let pair: string
      do {
        first = Math.floor(Math.random() * cups)
        second = (first + 1 + Math.floor(Math.random() * (cups - 1))) % cups
        pair = [first, second].sort().join('-')
      } while (pair === previousPair)
      previousPair = pair
      const duration = Math.min(Math.max(90, 700 / speed), remaining)
      setPositions((current) => {
        const next = [...current]
        ;[next[first], next[second]] = [next[second], next[first]]
        return next
      })
      timeout = window.setTimeout(shuffle, duration)
    }
    shuffle()
    return () => window.clearTimeout(timeout)
  }, [phase, cups, speed])

  useEffect(() => {
    const host = stageRef.current
    if (!host) return
    let disposed = false
    let scene: ShellScene | null = null
    void import('./games/shell/scene')
      .then(({ createShellScene }) => (disposed ? null : createShellScene(host, (id) => chooseRef.current(id))))
      .then((created) => {
        if (!created) return
        if (disposed) { created.destroy(); return }
        scene = created
        sceneRef.current = created
        setSceneReady(true)
      })
      .catch(() => { if (!disposed) setSceneError(true) })
    return () => { disposed = true; sceneRef.current = null; scene?.destroy() }
  }, [])

  useEffect(() => {
    if (!sceneReady || phase === 'ended') return
    sceneRef.current?.update({ cups, positions, ballCup, choice, phase })
  }, [ballCup, choice, cups, phase, positions, sceneReady])

  useEffect(() => {
    if (phase !== 'revealing') return
    const timeout = window.setTimeout(() => {
      if (!correct && lives === 0) setPhase('ended')
      else startRound(correct ? round + 1 : round)
    }, 1600)
    return () => window.clearTimeout(timeout)
  }, [phase, correct, lives, round])

  const chooseCup = (id: number) => {
    if (phase !== 'choosing' || locked.current) return
    locked.current = true
    setChoice(id)
    if (id === ballCup) {
      const nextBest = Math.max(best, round)
      setBest(nextBest)
      localStorage.setItem('shell-memory-best', String(nextBest))
    } else setLives((current) => current - 1)
    setPhase('revealing')
  }
  chooseRef.current = chooseCup

  const instruction = phase === 'hiding' ? 'Theo dõi viên bi đi vào hũ'
    : phase === 'shuffling' ? 'Đừng rời mắt khỏi hũ có bi…'
    : phase === 'choosing' ? 'Viên bi ở dưới hũ nào?'
    : correct ? 'Chính xác! Chuẩn bị màn tiếp theo.'
    : lives > 0 ? 'Chưa đúng! Thử lại cùng màn nhé.' : 'Bạn đã hết mạng.'

  return <>
    <div className="game-heading"><span>ĐẢO BI</span><div className="best-score">Kỷ lục <strong>{best ? `${best} màn` : '—'}</strong></div></div>
    <section className="game-card shell-card">
      <div className="level-row"><span className="eyebrow">Màn {round}</span><span className="round-meta"><span className="duration">{cups} hũ · {speed.toLocaleString('vi-VN')}×</span><span className="lives">Mạng: {lives}/3</span></span></div>
      {phase === 'ended' ? <div className="result failed-result">
        <div className="result-icon">×</div><p className="eyebrow">Hết mạng rồi</p><h1>Thử lại nào!</h1><p>Bạn đã đến màn <strong>{round}</strong> với {cups} hũ.</p>
        <button className="primary-button" onClick={() => { setLives(3); startRound(1) }}>Chơi lại <span>↻</span></button>
      </div> : <div className="shell-area">
        <p className="instruction" role="status">{instruction}</p>
        <div ref={stageRef} className="shell-stage" aria-label={phase === 'choosing' ? 'Chọn hũ có viên bi' : undefined} />
        {sceneError && <p className="scene-error">Trình duyệt của bạn không hỗ trợ WebGL để chạy game này.</p>}
        <p className="shell-hint">{phase === 'shuffling' ? 'Tráo hũ trong 5 giây' : phase === 'choosing' ? 'Nhấn vào một hũ để mở' : phase === 'hiding' ? 'Một viên bi. Hãy nhớ đúng hũ.' : correct ? '+1 màn' : '−1 mạng'}</p>
      </div>}
    </section>
    <footer>Thắng 3 màn thêm 1 hũ, tối đa 8 hũ. Bạn có 3 mạng.</footer>
  </>
}
