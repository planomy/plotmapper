import { compareSlotOrder } from './gridLayout'
import type { PlotCard } from '../store/plotStore'

/**
 * Cumulative manuscript position (0–1) for milestone word counts.
 * Anchors follow common three-act teaching and beat guides used in publishing / screenwriting craft:
 * — Act I ends ~20–30% of length (often quoted ~25%).
 * — Midpoint ~50% (Save the Cat / Blake Snyder midpoint ~55% in 110-page screenplay; novels often ~48–52%).
 * — “All is lost” / crisis band ~70–75% before Act III turn.
 * — Climax in final ~10–20%; resolution in closing ~5–10%.
 * Chapter-level labels are placed in plausible bands between those anchors.
 */

/** Default cumulative fraction for a beat label (first occurrence). */
const BEAT_FRACTION: Record<string, number> = {
  Beginning: 0.02,
  Setup: 0.07,
  'Inciting Event': 0.12,
  'Call to Action': 0.18,
  'Act One Climax': 0.25,
  'Rising Action': 0.34,
  Complication: 0.42,
  'Midpoint Twist': 0.5,
  Crisis: 0.72,
  'Act Two Climax': 0.78,
  'Final Confrontation': 0.84,
  'Novel Climax': 0.88,
  'Falling Action': 0.93,
  Resolution: 0.97,
  End: 1,
  Reaction: 0.27,
  'Pressure Builds': 0.44,
  Conflict: 0.48,
  Subplot: 0.36,
  'Relationship Shift': 0.41,
  Discovery: 0.46,
  'Secret Revealed': 0.52,
  Consequence: 0.58,
  'Failed Attempt': 0.67,
  'Small Win': 0.43,
  'Small Loss': 0.61,
  'Emotional Shift': 0.54,
  Foreshadowing: 0.14,
  'Stakes Raised': 0.65,
  Reversal: 0.74,
  'New Plan': 0.69,
}

/** Labels that repeat: nth occurrence uses nth fraction (reading order). */
const SEQUENCE_FRACTIONS: Record<string, readonly number[]> = {
  Obstacle: [0.29, 0.55, 0.64],
  Complication: [0.4, 0.58],
}

function rawFractionFor(card: PlotCard, sorted: PlotCard[]): number {
  const idx = sorted.findIndex((c) => c.id === card.id)
  if (idx < 0) return 0.5
  const sameBefore = sorted.slice(0, idx).filter((c) => c.label === card.label).length
  const seq = SEQUENCE_FRACTIONS[card.label]
  if (seq && sameBefore < seq.length) return seq[sameBefore]
  if (seq && sameBefore >= seq.length) {
    return Math.min(0.98, seq[seq.length - 1] + 0.02 * (sameBefore - seq.length + 1))
  }

  const base = BEAT_FRACTION[card.label]
  if (base !== undefined) return base

  const n = sorted.length
  if (n <= 1) return 0.5
  return 0.05 + (idx / (n - 1)) * 0.9
}

/**
 * For each card in reading order, cumulative fraction then monotonic smoothing
 * so later beats never show a lower word target than an earlier one.
 */
export function milestoneWordsByCardId(targetWords: number, cards: PlotCard[]): Map<string, number> {
  const out = new Map<string, number>()
  if (targetWords <= 0 || !cards.length) {
    for (const c of cards) out.set(c.id, 0)
    return out
  }

  const sorted = [...cards].sort(compareSlotOrder)
  const fracs: number[] = sorted.map((c) => rawFractionFor(c, sorted))

  for (let i = 1; i < fracs.length; i++) {
    fracs[i] = Math.max(fracs[i], fracs[i - 1] + 0.015)
  }
  fracs[fracs.length - 1] = Math.min(1, Math.max(fracs[fracs.length - 1], 0.985))

  sorted.forEach((c, i) => {
    out.set(c.id, Math.round(targetWords * fracs[i]))
  })
  return out
}

export function milestoneWordsForCard(targetWords: number, card: PlotCard, cards: PlotCard[]): number {
  return milestoneWordsByCardId(targetWords, cards).get(card.id) ?? 0
}
