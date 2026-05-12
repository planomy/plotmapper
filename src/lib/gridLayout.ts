/** Visual row index: 0 = Act I, 1–2 = Act II (two rows), 3 = Act III. */
export type SlotRow = 0 | 1 | 2 | 3

export const GRID_ROWS = 4 as const
export const SLOTS_PER_ROW = 12 as const

export function actFromSlotRow(slotRow: SlotRow): 1 | 2 | 3 {
  if (slotRow === 0) return 1
  if (slotRow === 3) return 3
  return 2
}

/** Reading order through the grid (left-to-right, top-to-bottom). */
export function compareSlotOrder(
  a: { slotRow: number; slotIndex: number },
  b: { slotRow: number; slotIndex: number },
): number {
  if (a.slotRow !== b.slotRow) return a.slotRow - b.slotRow
  return a.slotIndex - b.slotIndex
}

/** 0–1 progress through the full grid (for timeline bar). */
export function slotProgress(c: { slotRow: number; slotIndex: number }): number {
  const linear = c.slotRow * SLOTS_PER_ROW + c.slotIndex
  const max = GRID_ROWS * SLOTS_PER_ROW - 1
  return max <= 0 ? 0 : linear / max
}

export function clampSlotIndex(i: number): number {
  return Math.max(0, Math.min(SLOTS_PER_ROW - 1, Math.floor(i)))
}

export function clampSlotRow(r: number): SlotRow {
  const x = Math.max(0, Math.min(GRID_ROWS - 1, Math.floor(r)))
  return x as SlotRow
}
