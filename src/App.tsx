import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'

type Phase = 'memorizing' | 'answering' | 'success' | 'failed'

const getDuration = (digits: number) => 1000 + (digits - 1) * 300

const createNumber = (digits: number) => {
  const firstDigit = Math.floor(Math.random() * 9) + 1
  let value = String(firstDigit)

  for (let index = 1; index < digits; index += 1) {
    value += Math.floor(Math.random() * 10)
  }

  return value
}

function App() {
  const [level, setLevel] = useState(1)
  const [number, setNumber] = useState(() => createNumber(1))
  const [answer, setAnswer] = useState('')
  const [phase, setPhase] = useState<Phase>('memorizing')
  const [best, setBest] = useState(() => Number(localStorage.getItem('number-memory-best')) || 0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (phase !== 'memorizing') return

    const timeout = window.setTimeout(() => setPhase('answering'), getDuration(level))
    return () => window.clearTimeout(timeout)
  }, [level, phase, number])

  useEffect(() => {
    if (phase === 'answering') inputRef.current?.focus()
  }, [phase])

  useEffect(() => {
    if (phase !== 'success') return

    const timeout = window.setTimeout(() => beginLevel(level + 1), 1000)
    return () => window.clearTimeout(timeout)
  }, [level, phase])

  const beginLevel = (nextLevel: number) => {
    setLevel(nextLevel)
    setNumber(createNumber(nextLevel))
    setAnswer('')
    setPhase('memorizing')
  }

  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    if (phase !== 'answering' || !answer) return

    if (answer === number) {
      const newBest = Math.max(best, level)
      if (newBest !== best) {
        localStorage.setItem('number-memory-best', String(newBest))
        setBest(newBest)
      }
      setPhase('success')
      return
    }

    setPhase('failed')
  }

  const appendDigit = (digit: string) => {
    if (phase !== 'answering') return
    setAnswer((current) => current + digit)
    inputRef.current?.focus()
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">#</span> NHỚ SỐ</div>
        <div className="best-score">Kỷ lục <strong>{best || '—'}</strong> chữ số</div>
      </header>

      <section className="game-card" aria-live="polite">
        <div className="level-row">
          <span className="eyebrow">Màn {level}</span>
          <span className="duration">{(getDuration(level) / 1000).toLocaleString('vi-VN')} giây ghi nhớ</span>
        </div>

        {phase === 'memorizing' && (
          <>
            <p className="instruction">Ghi nhớ dãy số này</p>
            <div className="number-display" style={{ '--digits': number.length } as CSSProperties}>{number}</div>
            <div className="progress" aria-hidden="true"><span style={{ animationDuration: `${getDuration(level)}ms` }} /></div>
          </>
        )}

        {phase === 'answering' && (
          <form onSubmit={submit} className="answer-area">
            <p className="instruction">Dãy số vừa rồi là gì?</p>
            <input
              ref={inputRef}
              value={answer}
              onChange={(event) => setAnswer(event.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              autoComplete="off"
              aria-label="Nhập dãy số bạn nhớ được"
              placeholder="Nhập đáp án"
            />
            <button className="primary-button" type="submit" disabled={!answer}>Kiểm tra <span>↵</span></button>
            <Keypad onDigit={appendDigit} onDelete={() => setAnswer((current) => current.slice(0, -1))} />
          </form>
        )}

        {phase === 'success' && (
          <div className="result success-result">
            <div className="result-icon">✓</div>
            <p className="eyebrow">Chính xác</p>
            <h1>Trí nhớ tốt lắm.</h1>
            <p>Bạn đã nhớ đúng <strong>{level} chữ số</strong>.</p>
          </div>
        )}

        {phase === 'failed' && (
          <div className="result failed-result">
            <div className="result-icon">×</div>
            <p className="eyebrow">Chưa đúng rồi</p>
            <h1>Dãy số là <span>{number}</span></h1>
            <p>Bạn đã nhập <strong>{answer}</strong>. Hãy thử lại từ màn 1.</p>
            <button className="primary-button" onClick={() => beginLevel(1)}>Chơi lại <span>↻</span></button>
          </div>
        )}
      </section>

      <footer>Mỗi màn tăng thêm một chữ số và 0,3 giây ghi nhớ.</footer>
    </main>
  )
}

function Keypad({ onDigit, onDelete }: { onDigit: (digit: string) => void; onDelete: () => void }) {
  return (
    <div className="keypad" aria-label="Bàn phím số">
      {'123456789'.split('').map((digit) => <button type="button" key={digit} onClick={() => onDigit(digit)}>{digit}</button>)}
      <span />
      <button type="button" onClick={() => onDigit('0')}>0</button>
      <button type="button" className="delete-key" onClick={onDelete} aria-label="Xóa số cuối">⌫</button>
    </div>
  )
}

export default App
