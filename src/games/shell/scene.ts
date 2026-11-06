import { Application, Container, Graphics, Text } from 'pixi.js'

export type ShellSceneState = {
  cups: number
  positions: number[]
  ballCup: number
  choice: number | null
  phase: 'hiding' | 'shuffling' | 'choosing' | 'revealing'
}

export type ShellScene = {
  update: (state: ShellSceneState) => void
  destroy: () => void
}

type CupEntry = {
  root: Container
  cup: Graphics
  ball: Graphics
  label: Text
  targetX: number
  targetY: number
  moveTime: number
}

const CUP = 0x719ed8
const SUCCESS = 0x94f5c3
const DANGER = 0xf49f9f

export async function createShellScene(host: HTMLElement, onChoose: (id: number) => void): Promise<ShellScene> {
  const app = new Application()
  await app.init({ resizeTo: host, backgroundAlpha: 0, antialias: true, autoDensity: true, resolution: Math.min(window.devicePixelRatio || 1, 2) })
  host.appendChild(app.canvas)
  app.canvas.style.display = 'block'

  const table = new Graphics()
  const cupLayer = new Container()
  app.stage.addChild(table, cupLayer)
  let entries: CupEntry[] = []
  let current: ShellSceneState | null = null
  let destroyed = false

  const createEntry = (id: number) => {
    const root = new Container()
    const shadow = new Graphics().ellipse(0, 40, 40, 9).fill({ color: 0x000000, alpha: 0.3 })
    const ball = new Graphics().circle(0, 29, 11).fill(0xffc95c).stroke({ color: 0xfff1bc, width: 2 })
    const cup = new Graphics()
      .moveTo(-35, -48).quadraticCurveTo(0, -59, 35, -48).lineTo(45, 36).quadraticCurveTo(0, 50, -45, 36).closePath()
      .fill(CUP).stroke({ color: 0xddeeff, width: 2, alpha: 0.9 })
    const shine = new Graphics().moveTo(-22, -33).lineTo(-28, 19).stroke({ color: 0xffffff, alpha: 0.2, width: 7, cap: 'round' })
    const label = new Text({ text: String(id + 1), style: { fill: 0xaebbd4, fontFamily: 'system-ui', fontSize: 13, fontWeight: '700' } })
    label.anchor.set(0.5)
    label.y = 72
    root.addChild(shadow, ball, cup, shine, label)
    root.eventMode = 'none'
    root.cursor = 'pointer'
    root.on('pointertap', () => onChoose(id))
    cupLayer.addChild(root)
    return { root, cup, ball, label, targetX: 0, targetY: 0, moveTime: 0 }
  }

  const drawTable = () => {
    const { width, height } = app.screen
    table.clear()
      .ellipse(width / 2, height * 0.83, width * 0.48, height * 0.18).fill({ color: 0x273a5b, alpha: 0.42 })
      .rect(0, height * 0.83, width, 2).fill({ color: 0x60749d, alpha: 0.72 })
  }

  const layout = () => {
    if (!current) return
    const { width, height } = app.screen
    const sidePadding = Math.max(42, width * 0.08)
    const step = current.cups === 1 ? 0 : (width - sidePadding * 2) / (current.cups - 1)
    entries.forEach((entry, id) => {
      const position = current!.positions[id]
      const targetX = sidePadding + position * step
      if (entry.targetX !== targetX) entry.moveTime = 1
      entry.targetX = targetX
      entry.targetY = height * 0.67
    })
  }

  const observer = new ResizeObserver(() => { if (!destroyed) { app.resize(); drawTable(); layout() } })
  observer.observe(host)

  app.ticker.add((ticker) => {
    const delta = Math.min(ticker.deltaMS / 1000, 0.05)
    entries.forEach((entry) => {
      entry.root.x += (entry.targetX - entry.root.x) * Math.min(1, delta * 7)
      entry.moveTime = Math.max(0, entry.moveTime - delta * 2)
      const arc = entry.moveTime > 0 ? Math.sin(entry.moveTime * Math.PI) * -20 : 0
      entry.root.y += (entry.targetY + arc - entry.root.y) * Math.min(1, delta * 10)
    })
  })

  const update = (state: ShellSceneState) => {
    current = state
    if (entries.length !== state.cups) {
      entries.forEach((entry) => entry.root.destroy({ children: true }))
      entries = Array.from({ length: state.cups }, (_, id) => createEntry(id))
    }
    drawTable()
    layout()
    entries.forEach((entry, id) => {
      const revealBall = state.phase === 'hiding' || (state.phase === 'revealing' && id === state.ballCup)
      const selected = state.phase === 'revealing' && id === state.choice
      entry.ball.visible = revealBall
      entry.label.visible = state.phase === 'choosing'
      entry.root.eventMode = state.phase === 'choosing' ? 'static' : 'none'
      entry.cup.tint = selected ? (id === state.ballCup ? SUCCESS : DANGER) : CUP
      entry.cup.y = selected || (state.phase === 'revealing' && id === state.ballCup) ? -55 : 0
    })
  }

  return {
    update,
    destroy: () => {
      destroyed = true
      observer.disconnect()
      app.destroy(true, { children: true })
    },
  }
}
