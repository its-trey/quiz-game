import type { ReactNode } from 'react'

export function GameFrame({ title, best, level, detail, children }: { title: string; best: string; level: number; detail: string; children: ReactNode }) {
  return <><div className="game-heading"><span>{title}</span><div className="best-score">Kỷ lục <strong>{best}</strong></div></div><section className="game-card" aria-live="polite"><div className="level-row"><span className="eyebrow">Màn {level}</span><span className="duration">{detail}</span></div>{children}</section><footer>Mỗi màn sẽ khó hơn một chút. Hãy tập trung nhé.</footer></>
}

export function Result({ type, title, description, onRestart }: { type: 'success' | 'failed'; title: ReactNode; description: ReactNode; onRestart?: () => void }) {
  return <div className={`result ${type}-result`}><div className="result-icon">{type === 'success' ? '✓' : '×'}</div><p className="eyebrow">{type === 'success' ? 'Chính xác' : 'Chưa đúng rồi'}</p><h1>{title}</h1><p>{description}</p>{onRestart && <button className="primary-button" onClick={onRestart}>Chơi lại <span>↻</span></button>}</div>
}
