import { compareSlotOrder, slotProgress } from './gridLayout'
import type { PlotCard } from '../store/plotStore'

/**
 * Cumulative manuscript position (0–1) for milestone word counts.
 * Uses each card’s place on the four act rows (left-to-right, top-to-bottom) so
 * reordered beats, custom chapter titles, and extra cards stay aligned with the
 * board instead of mixing fixed “beat name” percentages with slot interpolation.
 */

const MIN_STEP = 0.015

/**
 * For each card in reading order, cumulative fraction from board slots then
 * monotonic smoothing so later beats never show a lower word target than an earlier one.
 */
export function milestoneWordsByCardId(targetWords: number, cards: PlotCard[]): Map<string, number> {
  const out = new Map<string, number>()
  if (targetWords <= 0 || !cards.length) {
    for (const c of cards) out.set(c.id, 0)
    return out
  }

  const sorted = [...cards].sort(compareSlotOrder)
  const fracs: number[] = sorted.map((c) => slotProgress(c))
  fracs[0] = Math.max(fracs[0], 0.02)

  for (let i = 1; i < fracs.length; i++) {
    fracs[i] = Math.max(fracs[i], fracs[i - 1] + MIN_STEP)
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
