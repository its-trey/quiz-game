import { useEffect, useRef, useState } from 'react'
import { GameFrame } from '../../components/GameFrame'
import { MEMORY_ITEMS } from './items'
import type { MemoryItem } from './items'
import type { VanishingScene } from './scene'

type Phase = 'showing' | 'hiding' | 'guessing' | 'success' | 'failed'

type Round = {
  items: MemoryItem[]
  missingIndex: number
  options: MemoryItem[]
  duration: number
}

const BEST_KEY = 'vanishing-memory-best'

const itemCountFor = (level: number) => Math.min(4 + (level - 1) * 2, 18)
const durationFor = (level: number) => Math.max(4800 - (level - 1) * 200, 2400)

const shuffle = <T,>(values: T[]) => {
  const copy = [...values]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]]
  }
  return copy
}

const createRound = (level: number): Round => {
  const count = itemCountFor(level)
  const pool = shuffle(MEMORY_ITEMS)
  const items = pool.slice(0, count)
  const decoys = pool.slice(count, count + 3)
  const missingIndex = Math.floor(Math.random() * count)
  const options = shuffle([items[missingIndex], ...decoys])

  return { items, missingIndex, options, duration: durationFor(level) }
}

export function VanishingGame() {
  const [level, setLevel] = useState(1)
  const [round, setRound] = useState(() => createRound(1))
  const [phase, setPhase] = useState<Phase>('showing')
  const [best, setBest] = useState(() => Number(localStorage.getItem(BEST_KEY)) || 0)
  const [sceneReady, setSceneReady] = useState(false)
  const [sceneError, setSceneError] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<VanishingScene | null>(null)

  useEffect(() => {
    const host = stageRef.current
    if (!host) return

    let disposed = false
    let scene: VanishingScene | null = null

    void import('./scene')
      .then(({ createVanishingScene }) => (disposed ? null : createVanishingScene(host)))
      .then((created) => {
        if (!created) return
        if (disposed) {
          created.destroy()
          return
        }
        scene = created
        sceneRef.current = created
        setSceneReady(true)
      })
      .catch(() => {
        if (!disposed) setSceneError(true)
      })

    return () => {
      disposed = true
      sceneRef.current = null
      scene?.destroy()
    }
  }, [])

  useEffect(() => {
    if (phase !== 'showing' || !sceneReady) return
    sceneRef.current?.setItems(round.items.map((item) => item.emoji))
  }, [phase, round, sceneReady])

  useEffect(() => {
    if (phase !== 'showing' || !sceneReady) return
    const timeout = window.setTimeout(() => setPhase('hiding'), round.duration)
    return () => window.clearTimeout(timeout)
  }, [phase, round.duration, sceneReady])

  useEffect(() => {
    if (phase !== 'hiding') return
    sceneRef.current?.conceal()
    const timeout = window.setTimeout(() => setPhase('guessing'), 520)
    return () => window.clearTimeout(timeout)
  }, [phase])

  useEffect(() => {
    if (phase !== 'guessing') return
    sceneRef.current?.reveal(
      round.items.map((item, index) => (index === round.missingIndex ? null : item.emoji)),
    )
  }, [phase, round])

  const beginLevel = (nextLevel: number) => {
    setLevel(nextLevel)
    setRound(createRound(nextLevel))
    setPhase('showing')
  }

  useEffect(() => {
    if (phase !== 'success') return
    const timeout = window.setTimeout(() => beginLevel(level + 1), 1500)
    return () => window.clearTimeout(timeout)
  }, [level, phase])

  const answer = (option: MemoryItem) => {
    if (phase !== 'guessing') return

    const missing = round.items[round.missingIndex]
    const correct = option.emoji === missing.emoji
    sceneRef.current?.markAnswer(missing.emoji, correct)

    if (!correct) {
      setPhase('failed')
      return
    }

    const newBest = Math.max(best, level)
    if (newBest !== best) {
      localStorage.setItem(BEST_KEY, String(newBest))
      setBest(newBest)
    }
    setPhase('success')
  }

  const missing = round.items[round.missingIndex]

  return (
    <GameFrame
      title="VẬT NÀO BỊ MẤT"
      best={best ? `Màn ${best}` : '—'}
      level={level}
      detail={`${round.items.length} vật · ${(round.duration / 1000).toLocaleString('vi-VN')} giây`}
    >
      <div className="vanishing-area">
        <p className="instruction">
          {phase === 'showing' && `Ghi nhớ ${round.items.length} vật này`}
          {phase === 'hiding' && 'Đang tráo vật...'}
          {phase === 'guessing' && 'Vật nào đã biến mất?'}
          {phase === 'success' && 'Chính xác!'}
          {phase === 'failed' && 'Chưa đúng rồi'}
        </p>

        <div ref={stageRef} className="vanishing-stage" aria-hidden="true" />

        {sceneError && <p className="scene-error">Trình duyệt của bạn không hỗ trợ WebGL để chạy game này.</p>}

        {phase === 'showing' && (
          <div className="progress">
            <span style={{ animationDuration: `${round.duration}ms` }} />
          </div>
        )}

        {phase === 'guessing' && (
          <div className="choice-grid">
            {round.options.map((option) => (
              <button key={option.emoji} type="button" className="choice-button" onClick={() => answer(option)}>
                <span className="choice-emoji" aria-hidden="true">{option.emoji}</span>
                <span>{option.name}</span>
              </button>
            ))}
          </div>
        )}

        {phase === 'success' && (
          <p className="vanishing-note">
            Vật bị mất là <strong>{missing.emoji} {missing.name}</strong>. Chuẩn bị màn tiếp theo...
          </p>
        )}

        {phase === 'failed' && (
          <div className="vanishing-note">
            <p>Vật bị mất là <strong>{missing.emoji} {missing.name}</strong>.</p>
            <button className="primary-button" onClick={() => beginLevel(1)}>Chơi lại <span>↻</span></button>
          </div>
        )}
      </div>
    </GameFrame>
  )
}
