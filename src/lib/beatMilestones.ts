import { actFromSlotRow, compareSlotOrder } from './gridLayout'
import type { PlotCard } from '../store/plotStore'

/**
 * Cumulative manuscript position (0–1) for milestone word counts.
 * Anchors: Act One Climax ≈ 25%, Act Two Climax ≈ 75%, End ≈ 100% of the target draft.
 * Other cards (including custom chapters) linearly interpolate by reading order between those anchors.
 * Missing anchors fall back to act rows or position in the outline list.
 */

const MIN_STEP = 0.015

const ANCHOR_ACT_ONE_CLIMAX = 'Act One Climax'
const ANCHOR_ACT_TWO_CLIMAX = 'Act Two Climax'
const ANCHOR_END = 'End'

function firstLabelIndex(sorted: PlotCard[], label: string): number | null {
  const i = sorted.findIndex((c) => c.label === label)
  return i < 0 ? null : i
}

function lastSortedIndexWhere(sorted: PlotCard[], pred: (c: PlotCard) => boolean): number | null {
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (pred(sorted[i])) return i
  }
  return null
}

function clampInt(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.floor(n)))
}

/** Resolve anchor indices in reading order, then enforce a1 ≤ a2 ≤ end. */
function resolveAnchorIndices(sorted: PlotCard[]): { a1: number; a2: number; end: number } {
  const n = sorted.length
  if (n <= 0) return { a1: 0, a2: 0, end: 0 }
  if (n === 1) return { a1: 0, a2: 0, end: 0 }

  const maxIx = n - 1
  const iA1 =
    firstLabelIndex(sorted, ANCHOR_ACT_ONE_CLIMAX) ??
    lastSortedIndexWhere(sorted, (c) => c.slotRow === 0) ??
    clampInt(0.25 * maxIx, 0, maxIx)

  const iA2 =
    firstLabelIndex(sorted, ANCHOR_ACT_TWO_CLIMAX) ??
    lastSortedIndexWhere(sorted, (c) => {
      const a = actFromSlotRow(c.slotRow)
      return a === 2
    }) ??
    clampInt(0.75 * maxIx, 0, maxIx)

  const iEnd = firstLabelIndex(sorted, ANCHOR_END) ?? maxIx

  let a1 = clampInt(iA1, 0, maxIx)
  let a2 = clampInt(iA2, 0, maxIx)
  let end = clampInt(iEnd, 0, maxIx)
  if (a2 < a1) a2 = a1
  if (end < a2) end = a2
  return { a1, a2, end }
}

/** Piecewise-linear fraction at reading-order index i (0 … n-1) between anchor indices. */
function fractionAtIndex(i: number, n: number, a1: number, a2: number, end: number): number {
  if (n <= 1) return 1

  // [0, a1]: manuscript start → 25%
  if (i <= a1) {
    if (a1 <= 0) return i <= 0 ? 0.25 : 0
    return (0.25 * i) / a1
  }

  if (i <= a2) {
    if (a2 === end && i === end) return 1
    const span = a2 - a1
    if (span <= 0) return 0.75
    return 0.25 + ((i - a1) / span) * 0.5
  }

  if (i <= end) {
    const span = end - a2
    if (span <= 0) return 1
    return 0.75 + ((i - a2) / span) * 0.25
  }
  return 1
}

/**
 * For each card in reading order, cumulative fraction from three-act anchors then
 * monotonic smoothing so later beats never show a lower word target than an earlier one.
 */
export function milestoneWordsByCardId(targetWords: number, cards: PlotCard[]): Map<string, number> {
  const out = new Map<string, number>()
  if (targetWords <= 0 || !cards.length) {
    for (const c of cards) out.set(c.id, 0)
    return out
  }

  const sorted = [...cards].sort(compareSlotOrder)
  const n = sorted.length
  const { a1, a2, end } = resolveAnchorIndices(sorted)
  const fracs: number[] = sorted.map((_, i) => fractionAtIndex(i, n, a1, a2, end))
  fracs[0] = Math.max(fracs[0], 0.02)

  for (let k = 1; k < fracs.length; k++) {
    fracs[k] = Math.max(fracs[k], fracs[k - 1] + MIN_STEP)
  }
  fracs[fracs.length - 1] = Math.min(1, fracs[fracs.length - 1])

  sorted.forEach((c, i) => {
    out.set(c.id, Math.round(targetWords * fracs[i]))
  })
  return out
}

export function milestoneWordsForCard(targetWords: number, card: PlotCard, cards: PlotCard[]): number {
  return milestoneWordsByCardId(targetWords, cards).get(card.id) ?? 0
}
