import { Application, Container, Graphics, Text } from 'pixi.js'

export type VanishingScene = {
  setItems: (items: string[]) => void
  conceal: () => void
  reveal: (items: Array<string | null>) => void
  markAnswer: (emoji: string, correct: boolean) => void
  destroy: () => void
}

type Entry = {
  root: Container
  bob: Container
  phase: number
  speed: number
  amplitude: number
}

type Tween = {
  elapsed: number
  delay?: number
  duration: number
  ease: (progress: number) => number
  update: (progress: number) => void
  done?: () => void
}

const EMOJI_FONT = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "Segoe UI Symbol", sans-serif'
const ACCENT = 0x94f5c3
const DANGER = 0xff9f9f

const easeOutCubic = (progress: number) => 1 - (1 - progress) ** 3

const createChip = (size: number, accent: boolean) => {
  const half = size / 2
  return new Graphics()
    .roundRect(-half, -half, size, size, size * 0.22)
    .fill({ color: 0xffffff, alpha: accent ? 0.08 : 0.035 })
    .stroke({ color: accent ? ACCENT : 0x6c81a6, width: 1, alpha: accent ? 0.45 : 0.35 })
}

export async function createVanishingScene(host: HTMLElement): Promise<VanishingScene> {
  const app = new Application()
  await app.init({
    resizeTo: host,
    backgroundAlpha: 0,
    antialias: true,
    autoDensity: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
  })

  host.appendChild(app.canvas)
  app.canvas.style.display = 'block'

  const board = new Container()
  const effects = new Container()
  app.stage.addChild(board, effects)

  let entries: Entry[] = []
  let missingText: Text | null = null
  let questionActive = false
  let elapsed = 0
  let destroyed = false
  const tweens: Tween[] = []

  const observer = new ResizeObserver(() => {
    if (!destroyed) app.resize()
  })
  observer.observe(host)

  const addTween = (tween: Omit<Tween, 'elapsed'>) => {
    tweens.push({ delay: 0, ...tween, elapsed: 0 })
  }

  const clearTweens = () => {
    tweens.length = 0
  }

  const getLayout = (count: number) => {
    const width = Math.max(1, app.screen.width)
    const height = Math.max(1, app.screen.height)
    const columns = Math.max(1, Math.ceil(Math.sqrt(count)))
    const rows = Math.max(1, Math.ceil(count / columns))
    const padX = Math.max(6, width * 0.035)
    const padY = Math.max(6, height * 0.035)
    const cellWidth = (width - padX * 2) / columns
    const cellHeight = (height - padY * 2) / rows
    return {
      columns,
      padX,
      padY,
      cellWidth,
      cellHeight,
      size: Math.min(cellWidth, cellHeight) * 0.86,
    }
  }

  const slotPosition = (index: number, count: number) => {
    const layout = getLayout(count)
    return {
      x: layout.padX + layout.cellWidth * ((index % layout.columns) + 0.5),
      y: layout.padY + layout.cellHeight * (Math.floor(index / layout.columns) + 0.5),
      size: layout.size,
    }
  }

  const clearBoard = () => {
    clearTweens()
    entries = []
    missingText = null
    questionActive = false
    for (const child of board.removeChildren()) child.destroy({ children: true })
    for (const child of effects.removeChildren()) child.destroy({ children: true })
  }

  const makeEntry = (emoji: string, x: number, y: number, size: number, index: number, animate: boolean) => {
    const root = new Container()
    root.position.set(x, y)

    const bob = new Container()
    root.addChild(bob)
    bob.addChild(createChip(size, true))

    const label = new Text({
      text: emoji,
      style: {
        fontFamily: EMOJI_FONT,
        fontSize: Math.max(14, Math.round(size * 0.54)),
      },
    })
    label.anchor.set(0.5)
    bob.addChild(label)
    board.addChild(root)

    entries.push({
      root,
      bob,
      phase: Math.random() * Math.PI * 2,
      speed: 0.0015 + Math.random() * 0.0013,
      amplitude: 2 + Math.random() * 2.5,
    })

    if (animate) {
      root.alpha = 0
      root.scale.set(0.7)
      addTween({
        delay: index * 30,
        duration: 320,
        ease: easeOutCubic,
        update: (progress) => {
          root.alpha = progress
          root.scale.set(0.7 + progress * 0.3)
        },
      })
    }

    return root
  }

  const setItems = (items: string[]) => {
    clearBoard()
    items.forEach((emoji, index) => {
      const position = slotPosition(index, items.length)
      makeEntry(emoji, position.x, position.y, position.size, index, true)
    })
  }

  const conceal = () => {
    for (const entry of entries) {
      const startScale = entry.root.scale.x
      addTween({
        duration: 240,
        ease: (progress) => progress,
        update: (progress) => {
          entry.root.alpha = 1 - progress
          entry.root.scale.set(startScale * (1 - progress * 0.3))
        },
      })
    }
  }

  const reveal = (items: Array<string | null>) => {
    clearBoard()

    items.forEach((emoji, index) => {
      const position = slotPosition(index, items.length)

      if (emoji) {
        makeEntry(emoji, position.x, position.y, position.size, index, true)
        return
      }

      const root = new Container()
      root.position.set(position.x, position.y)
      root.addChild(createChip(position.size, false))

      const mark = new Text({
        text: '?',
        style: {
          fontFamily: EMOJI_FONT,
          fontSize: Math.max(16, Math.round(position.size * 0.42)),
          fontWeight: '700',
          fill: 0x8fa5c9,
        },
      })
      mark.anchor.set(0.5)
      root.addChild(mark)
      board.addChild(root)

      root.alpha = 0
      root.scale.set(0.75)
      addTween({
        delay: 120,
        duration: 300,
        ease: easeOutCubic,
        update: (progress) => {
          root.alpha = progress
          root.scale.set(0.75 + progress * 0.25)
        },
      })

      missingText = mark
      questionActive = true
    })
  }

  const burst = (x: number, y: number, color: number) => {
    for (let index = 0; index < 18; index += 1) {
      const dot = new Graphics()
      dot.circle(0, 0, 2 + Math.random() * 3).fill({ color, alpha: 0.9 })
      dot.position.set(x, y)
      effects.addChild(dot)

      const angle = Math.random() * Math.PI * 2
      const speed = 80 + Math.random() * 170
      const velocityX = Math.cos(angle) * speed
      const velocityY = Math.sin(angle) * speed - 40
      const duration = 650 + Math.random() * 350

      addTween({
        duration,
        ease: (progress) => progress,
        update: (progress) => {
          const time = (progress * duration) / 1000
          dot.x = x + velocityX * time
          dot.y = y + velocityY * time + 220 * time * time
          dot.alpha = 1 - progress
        },
        done: () => dot.destroy(),
      })
    }
  }

  const markAnswer = (emoji: string, correct: boolean) => {
    if (!missingText) return

    questionActive = false
    missingText.text = emoji
    missingText.alpha = 1

    const root = missingText.parent
    if (!root) return

    const startScale = root.scale.x
    addTween({
      duration: 420,
      ease: (progress) => progress,
      update: (progress) => {
        root.scale.set(startScale + Math.sin(progress * Math.PI) * 0.22)
      },
    })
    burst(root.x, root.y, correct ? ACCENT : DANGER)

    if (!correct) {
      const startX = board.x
      addTween({
        duration: 360,
        ease: (progress) => progress,
        update: (progress) => {
          board.x = startX + Math.sin(progress * Math.PI * 6) * (1 - progress) * 8
        },
        done: () => {
          board.x = 0
        },
      })
    }
  }

  app.ticker.add((ticker) => {
    const delta = ticker.deltaMS
    elapsed += delta

    for (const entry of entries) {
      entry.bob.y = Math.sin(elapsed * entry.speed + entry.phase) * entry.amplitude
    }

    if (questionActive && missingText) {
      missingText.alpha = 0.55 + Math.sin(elapsed * 0.005) * 0.3
    }

    for (let index = tweens.length - 1; index >= 0; index -= 1) {
      const tween = tweens[index]

      if (tween.delay && tween.delay > 0) {
        tween.delay -= delta
        continue
      }

      tween.elapsed += delta
      const progress = Math.min(1, tween.elapsed / tween.duration)
      tween.update(tween.ease(progress))

      if (progress >= 1) {
        tween.done?.()
        tweens.splice(index, 1)
      }
    }
  })

  const destroy = () => {
    if (destroyed) return
    destroyed = true
    observer.disconnect()
    clearTweens()
    entries = []
    missingText = null
    app.destroy(true, { children: true })
  }

  return { setItems, conceal, reveal, markAnswer, destroy }
}
