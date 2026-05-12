import type { SlotRow } from './gridLayout'

export const MAJOR_LABELS = [
  'Beginning',
  'Setup',
  'Inciting Event',
  'Call to Action',
  'Act One Climax',
  'Rising Action',
  'Obstacle',
  'Complication',
  'Midpoint Twist',
  'Crisis',
  'Act Two Climax',
  'Final Confrontation',
  'Novel Climax',
  'Falling Action',
  'Resolution',
  'End',
] as const

export const CHAPTER_LABELS = [
  'Reaction',
  'Obstacle',
  'Complication',
  'Pressure Builds',
  'Conflict',
  'Subplot',
  'Relationship Shift',
  'Discovery',
  'Secret Revealed',
  'Consequence',
  'Failed Attempt',
  'Small Win',
  'Small Loss',
  'Emotional Shift',
  'Foreshadowing',
  'Stakes Raised',
  'Reversal',
  'New Plan',
] as const

export type MajorLabel = (typeof MAJOR_LABELS)[number]
export type ChapterLabel = (typeof CHAPTER_LABELS)[number]

/** Suggested 13-beat layout on the grid (row + slot 0–11). */
export const SUGGESTED_TEMPLATE: {
  label: string
  kind: 'major' | 'chapter'
  slotRow: SlotRow
  slotIndex: number
}[] = [
  { label: 'Beginning', kind: 'major', slotRow: 0, slotIndex: 0 },
  { label: 'Inciting Event', kind: 'major', slotRow: 0, slotIndex: 1 },
  { label: 'Call to Action', kind: 'major', slotRow: 0, slotIndex: 2 },
  { label: 'Act One Climax', kind: 'major', slotRow: 0, slotIndex: 3 },
  { label: 'Obstacle', kind: 'chapter', slotRow: 1, slotIndex: 0 },
  { label: 'Midpoint Twist', kind: 'major', slotRow: 1, slotIndex: 1 },
  { label: 'Obstacle', kind: 'chapter', slotRow: 1, slotIndex: 2 },
  { label: 'Crisis', kind: 'major', slotRow: 2, slotIndex: 0 },
  { label: 'Act Two Climax', kind: 'major', slotRow: 2, slotIndex: 1 },
  { label: 'Novel Climax', kind: 'major', slotRow: 3, slotIndex: 0 },
  { label: 'Falling Action', kind: 'major', slotRow: 3, slotIndex: 1 },
  { label: 'Resolution', kind: 'major', slotRow: 3, slotIndex: 2 },
  { label: 'End', kind: 'major', slotRow: 3, slotIndex: 3 },
]
