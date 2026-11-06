import { useEffect, useRef, useState } from 'react'
import { GameFrame } from '../../components/GameFrame'

type Phase = 'ready' | 'showing' | 'input' | 'success' | 'failed'

type Pad = {
  name: string
  icon: string
  frequency: number
}

const PADS: Pad[] = [
  { name: 'Xanh lá', icon: '●', frequency: 261.63 },
  { name: 'Đỏ', icon: '▲', frequency: 329.63 },
  { name: 'Xanh dương', icon: '■', frequency: 392 },
  { name: 'Vàng', icon: '★', frequency: 523.25 },
]

const START_LENGTH = 3
const BEST_KEY = 'simon-memory-best'

const createSequence = (length: number) =>
  Array.from({ length }, () => Math.floor(Math.random() * PADS.length))

export function SimonGame() {
  const [phase, setPhase] = useState<Phase>('ready')
  const [level, setLevel] = useState(1)
  const [sequence, setSequence] = useState<number[]>([])
  const [inputIndex, setInputIndex] = useState(0)
  const [litPad, setLitPad] = useState<number | null>(null)
  const [muted, setMuted] = useState(false)
  const [best, setBest] = useState(() => Number(localStorage.getItem(BEST_KEY)) || 0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const mutedRef = useRef(false)
  const flashTimerRef = useRef<number | null>(null)

  useEffect(() => {
    mutedRef.current = muted
  }, [muted])

  useEffect(() => () => {
    if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current)
    const context = audioContextRef.current
    audioContextRef.current = null
    void context?.close()
  }, [])

  const ensureAudio = () => {
    const AudioCtor = window.AudioContext
      ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtor) return null

    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new AudioCtor()
    }
    if (audioContextRef.current.state === 'suspended') void audioContextRef.current.resume()
    return audioContextRef.current
  }

  const playTone = (padIndex: number, duration = 0.3) => {
    if (mutedRef.current) return

    const context = ensureAudio()
    if (!context) return

    const now = context.currentTime
    const oscillator = context.createOscillator()
    const gain = context.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(PADS[padIndex].frequency, now)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(now)
    oscillator.stop(now + duration + 0.03)
    oscillator.onended = () => {
      oscillator.disconnect()
      gain.disconnect()
    }
  }

  const playBuzz = () => {
    if (mutedRef.current) return

    const context = ensureAudio()
    if (!context) return

    const now = context.currentTime
    const oscillator = context.createOscillator()
    const gain = context.createGain()

    oscillator.type = 'sawtooth'
    oscillator.frequency.setValueAtTime(130, now)
    oscillator.frequency.exponentialRampToValueAtTime(70, now + 0.35)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38)

    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start(now)
    oscillator.stop(now + 0.4)
    oscillator.onended = () => {
      oscillator.disconnect()
      gain.disconnect()
    }
  }

  useEffect(() => {
    if (phase !== 'showing' || sequence.length === 0) return

    const step = Math.max(380, 640 - level * 24)
    const timers: number[] = []

    sequence.forEach((pad, index) => {
      timers.push(window.setTimeout(() => {
        setLitPad(pad)
        playTone(pad)
      }, index * step))
      timers.push(window.setTimeout(() => {
        setLitPad((current) => (current === pad ? null : current))
      }, index * step + step * 0.55))
    })

    timers.push(window.setTimeout(() => {
      setLitPad(null)
      setInputIndex(0)
      setPhase('input')
    }, sequence.length * step + 150))

    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [level, phase, sequence])

  useEffect(() => {
    if (phase !== 'success') return

    const timeout = window.setTimeout(() => {
      setSequence((current) => [...current, Math.floor(Math.random() * PADS.length)])
      setLevel((current) => current + 1)
      setInputIndex(0)
      setPhase('showing')
    }, 1400)

    return () => window.clearTimeout(timeout)
  }, [phase])

  const startGame = () => {
    ensureAudio()
    setLevel(1)
    setSequence(createSequence(START_LENGTH))
    setInputIndex(0)
    setLitPad(null)
    setPhase('showing')
  }

  const succeed = () => {
    const newBest = Math.max(best, level)
    if (newBest !== best) {
      localStorage.setItem(BEST_KEY, String(newBest))
      setBest(newBest)
    }
    setPhase('success')
  }

  const handlePad = (index: number) => {
    if (phase !== 'input') return

    playTone(index)
    setLitPad(index)
    if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current)
    flashTimerRef.current = window.setTimeout(() => {
      setLitPad((current) => (current === index ? null : current))
    }, 180)

    if (sequence[inputIndex] !== index) {
      setPhase('failed')
      playBuzz()
      return
    }

    const nextIndex = inputIndex + 1
    setInputIndex(nextIndex)
    if (nextIndex === sequence.length) succeed()
  }

  const toggleMute = () => {
    setMuted((current) => {
      mutedRef.current = !current
      return !current
    })
  }

  const sequenceLength = sequence.length || START_LENGTH

  return (
    <GameFrame
      title="NHỚ THỨ TỰ"
      best={best ? `${best + START_LENGTH - 1} màu` : '—'}
      level={level}
      detail={`${sequenceLength} màu`}
    >
      <div className="simon-area">
        <p className="instruction">
          {phase === 'ready' && 'Nhấn bắt đầu để nghe chuỗi màu'}
          {phase === 'showing' && 'Nghe và ghi nhớ thứ tự'}
          {phase === 'input' && 'Lặp lại chuỗi vừa rồi'}
          {phase === 'success' && 'Chính xác!'}
          {phase === 'failed' && 'Chưa đúng rồi'}
        </p>

        <div className="simon-grid">
          {PADS.map((pad, index) => (
            <button
              key={pad.name}
              type="button"
              className={`simon-pad pad-${index} ${litPad === index ? 'is-lit' : ''}`}
              disabled={phase !== 'input'}
              onClick={() => handlePad(index)}
              aria-label={`Màu ${pad.name}`}
            >
              <span aria-hidden="true">{pad.icon}</span>
            </button>
          ))}
        </div>

        <div className="simon-toolbar">
          <button type="button" className="sound-toggle" onClick={toggleMute} aria-pressed={muted}>
            {muted ? '🔇' : '🔊'} Âm thanh
          </button>
          <span className="simon-progress">
            {phase === 'showing' && 'Đang phát...'}
            {phase === 'input' && `${inputIndex} / ${sequence.length}`}
          </span>
        </div>

        {phase === 'ready' && (
          <button className="primary-button simon-start" onClick={startGame}>Bắt đầu <span>▶</span></button>
        )}

        {phase === 'success' && (
          <p className="simon-note">Đúng rồi! Chuỗi tiếp theo dài hơn một màu.</p>
        )}

        {phase === 'failed' && (
          <div className="simon-note">
            <p>Sai ở màu thứ <strong>{inputIndex + 1}</strong>. Chuỗi đúng:</p>
            <div className="simon-sequence" aria-hidden="true">
              {sequence.map((pad, index) => <i key={index} className={`seq-${pad}`} />)}
            </div>
            <button className="primary-button" onClick={startGame}>Chơi lại <span>↻</span></button>
          </div>
        )}
      </div>
    </GameFrame>
  )
}
