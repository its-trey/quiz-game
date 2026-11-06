import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import { GameFrame, Result } from './components/GameFrame'
import { VanishingGame } from './games/vanishing/VanishingGame'

type NumberPhase = 'memorizing' | 'answering' | 'success' | 'failed'
type VisualPhase = 'showing' | 'playing' | 'success' | 'failed'
type Game = 'number' | 'visual' | 'vanishing' | null

const getNumberDuration = (digits: number) => 1000 + (digits - 1) * 300
const createRoundColor = () => `hsl(${Math.floor(Math.random() * 360)} 82% 72%)`

const createNumber = (digits: number) => {
  let value = String(Math.floor(Math.random() * 9) + 1)
  for (let index = 1; index < digits; index += 1) value += Math.floor(Math.random() * 10)
  return value
}

const createPattern = (count: number, cells: number) => {
  const positions = Array.from({ length: cells }, (_, index) => index)
  for (let index = positions.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[positions[index], positions[swapIndex]] = [positions[swapIndex], positions[index]]
  }
  return positions.slice(0, count)
}

function App() {
  const [game, setGame] = useState<Game>(null)

  return (
    <main className="app-shell">
      <header className="topbar">
        {game && <button className="back-button" onClick={() => setGame(null)}>← Chọn game</button>}
        <button className="brand home-button" onClick={() => setGame(null)}><span className="brand-mark">#</span> TRÍ NHỚ</button>
      </header>
      {game === null && <GameSelector onSelect={setGame} />}
      {game === 'number' && <NumberMemory />}
      {game === 'visual' && <VisualMemory />}
      {game === 'vanishing' && <VanishingGame />}
    </main>
  )
}

function GameSelector({ onSelect }: { onSelect: (game: Game) => void }) {
  return (
    <section className="selector">
      <p className="eyebrow">Luyện trí nhớ mỗi ngày</p>
      <h1>Chọn thử thách<br /><em>của bạn.</em></h1>
      <p className="selector-copy">Ba bài tập ngắn để kiểm tra khả năng ghi nhớ của bạn.</p>
      <div className="game-options">
        <button className="game-option number-option" onClick={() => onSelect('number')}>
          <span className="option-icon">123</span>
          <span><strong>Nhớ số</strong><small>Ghi nhớ dãy số trong thời gian ngắn</small></span>
          <b>→</b>
        </button>
        <button className="game-option visual-option" onClick={() => onSelect('visual')}>
          <span className="option-icon grid-icon"><i /><i /><i /><i /></span>
          <span><strong>Nhớ hình ảnh</strong><small>Ghi nhớ các ô sáng trên lưới</small></span>
          <b>→</b>
        </button>
        <button className="game-option vanish-option" onClick={() => onSelect('vanishing')}>
          <span className="option-icon vanish-icon"><i /><i /><i /><i /><i className="is-missing" /><i /><i /><i /><i /></span>
          <span><strong>Vật nào bị mất</strong><small>Nhớ các vật trên bàn và tìm vật biến mất</small></span>
          <b>→</b>
        </button>
      </div>
    </section>
  )
}

function NumberMemory() {
  const [level, setLevel] = useState(1)
  const [number, setNumber] = useState(() => createNumber(1))
  const [answer, setAnswer] = useState('')
  const [phase, setPhase] = useState<NumberPhase>('memorizing')
  const [best, setBest] = useState(() => Number(localStorage.getItem('number-memory-best')) || 0)
  const inputRef = useRef<HTMLInputElement>(null)
  const beginLevel = (nextLevel: number) => { setLevel(nextLevel); setNumber(createNumber(nextLevel)); setAnswer(''); setPhase('memorizing') }

  useEffect(() => {
    if (phase !== 'memorizing') return
    const timeout = window.setTimeout(() => setPhase('answering'), getNumberDuration(level))
    return () => window.clearTimeout(timeout)
  }, [level, phase, number])

  useEffect(() => { if (phase === 'answering') inputRef.current?.focus() }, [phase])
  useEffect(() => {
    if (phase !== 'success') return
    const timeout = window.setTimeout(() => beginLevel(level + 1), 1000)
    return () => window.clearTimeout(timeout)
  }, [level, phase])

  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    if (phase !== 'answering' || !answer) return
    if (answer === number) {
      const newBest = Math.max(best, level)
      if (newBest !== best) { localStorage.setItem('number-memory-best', String(newBest)); setBest(newBest) }
      setPhase('success')
    } else setPhase('failed')
  }

  return <GameFrame title="NHỚ SỐ" best={best ? `${best} chữ số` : '—'} level={level} detail={`${(getNumberDuration(level) / 1000).toLocaleString('vi-VN')} giây ghi nhớ`}>
    {phase === 'memorizing' && <><p className="instruction">Ghi nhớ dãy số này</p><div className="number-display" onCopy={(event) => event.preventDefault()} style={{ '--digits': number.length } as CSSProperties}>{number}</div><div className="progress"><span style={{ animationDuration: `${getNumberDuration(level)}ms` }} /></div></>}
    {phase === 'answering' && <form onSubmit={submit} className="answer-area"><p className="instruction">Dãy số vừa rồi là gì?</p><input ref={inputRef} value={answer} onChange={(event) => setAnswer(event.target.value.replace(/\D/g, ''))} inputMode="numeric" autoComplete="off" aria-label="Nhập dãy số bạn nhớ được" placeholder="Nhập đáp án" /><button className="primary-button" type="submit" disabled={!answer}>Kiểm tra <span>↵</span></button><Keypad onDigit={(digit) => setAnswer((current) => current + digit)} onDelete={() => setAnswer((current) => current.slice(0, -1))} /></form>}
    {phase === 'success' && <Result type="success" title="Trí nhớ tốt lắm." description={<>Bạn đã nhớ đúng <strong>{level} chữ số</strong>.</>} />}
    {phase === 'failed' && <Result type="failed" title={<>Dãy số là <span>{number}</span></>} description={<>Bạn đã nhập <strong>{answer}</strong>. Hãy thử lại từ màn 1.</>} onRestart={() => beginLevel(1)} />}
  </GameFrame>
}

function VisualMemory() {
  const [level, setLevel] = useState(1)
  const [phase, setPhase] = useState<VisualPhase>('showing')
  const [selected, setSelected] = useState<number[]>([])
  const [best, setBest] = useState(() => Number(localStorage.getItem('visual-memory-best')) || 0)
  const [roundColor, setRoundColor] = useState(createRoundColor)
  const [squares, setSquares] = useState(3)
  const [gridSide, setGridSide] = useState(3)
  const cells = gridSide ** 2
  const [pattern, setPattern] = useState(() => createPattern(3, 9))
  const beginLevel = (nextLevel: number, nextGridSide: number, nextSquares: number) => {
    setLevel(nextLevel); setGridSide(nextGridSide); setSquares(nextSquares); setPattern(createPattern(nextSquares, nextGridSide ** 2)); setSelected([]); setRoundColor(createRoundColor()); setPhase('showing')
  }

  useEffect(() => {
    if (phase !== 'showing') return
    const timeout = window.setTimeout(() => setPhase('playing'), 1100)
    return () => window.clearTimeout(timeout)
  }, [phase, pattern])

  useEffect(() => {
    if (phase !== 'success') return
    let nextGridSide = gridSide
    let nextSquares = squares + 1
    if (nextSquares > gridSide ** 2 / 2) {
      nextGridSide += 1
      nextSquares = nextGridSide
    }
    const timeout = window.setTimeout(() => beginLevel(level + 1, nextGridSide, nextSquares), 800)
    return () => window.clearTimeout(timeout)
  }, [gridSide, level, phase, squares])

  const selectSquare = (index: number) => {
    if (phase !== 'playing' || selected.includes(index)) return
    if (!pattern.includes(index)) { setPhase('failed'); return }
    const nextSelected = [...selected, index]
    setSelected(nextSelected)
    if (nextSelected.length === pattern.length) {
      const newBest = Math.max(best, level)
      if (newBest !== best) { localStorage.setItem('visual-memory-best', String(newBest)); setBest(newBest) }
      setPhase('success')
    }
  }

  return <GameFrame title="NHỚ HÌNH ẢNH" best={best ? `${best} màn` : '—'} level={level} detail={`${squares} ô cần nhớ`}>
    {(phase === 'showing' || phase === 'playing') && <div className="visual-area" style={{ '--round-color': roundColor } as CSSProperties}><p className="instruction">{phase === 'showing' ? 'Ghi nhớ các ô sáng' : `Chọn đủ ${squares} ô vừa sáng`}</p><div className="memory-grid" style={{ '--columns': gridSide } as CSSProperties}>{Array.from({ length: cells }, (_, index) => <button key={index} className={`memory-cell ${phase === 'showing' && pattern.includes(index) ? 'lit' : ''} ${selected.includes(index) ? 'selected' : ''}`} aria-label={`Ô ${index + 1}`} onClick={() => selectSquare(index)} />)}</div><p className="selection-count">{phase === 'playing' ? `${selected.length} / ${squares}` : 'Hãy tập trung'}</p></div>}
    {phase === 'success' && <Result type="success" title="Chính xác." description={<>Bạn đã nhớ đúng <strong>{squares} ô</strong>.</>} />}
    {phase === 'failed' && <Result type="failed" title="Chưa đúng rồi." description={<>Bạn đã chọn sai một ô. Hãy thử lại từ màn 1.</>} onRestart={() => beginLevel(1, 3, 3)} />}
  </GameFrame>
}

function Keypad({ onDigit, onDelete }: { onDigit: (digit: string) => void; onDelete: () => void }) {
  return <div className="keypad" aria-label="Bàn phím số">{'123456789'.split('').map((digit) => <button type="button" key={digit} onClick={() => onDigit(digit)}>{digit}</button>)}<span /><button type="button" onClick={() => onDigit('0')}>0</button><button type="button" className="delete-key" onClick={onDelete} aria-label="Xóa số cuối">⌫</button></div>
}

export default App
