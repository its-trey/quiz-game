export function getShellDifficulty(round: number) {
  const group = Math.floor((round - 1) / 3)
  const cups = Math.min(8, 3 + group)
  // Round 16 starts the final group (8 cups); speed keeps increasing after that.
  const step = cups === 8 ? round - 16 : (round - 1) % 3
  const speed = Number((2 + (cups - 3) * 0.2 + step * 0.2).toFixed(1))
  return { cups, speed }
}
