import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SUGGESTED_TEMPLATE } from '../lib/constants'
import {
  actFromSlotRow,
  clampSlotIndex,
  clampSlotRow,
  GRID_ROWS,
  SLOTS_PER_ROW,
  type SlotRow,
} from '../lib/gridLayout'

export type PlotCard = {
  id: string
  label: string
  kind: 'major' | 'chapter'
  slotRow: SlotRow
  slotIndex: number
  notes: string
  characters: string
}

export const PILL_COLOR_IDS = ['sky', 'amber', 'rose', 'violet', 'emerald', 'zinc'] as const
export type PillColorId = (typeof PILL_COLOR_IDS)[number]

export type FloatingPill = {
  id: string
  text: string
  colorId: PillColorId
  /** When set, pill is docked to the top of this card (xPct/yPct ignored for layout). */
  attachedToCardId: string | null
  /** Board-relative position when detached (0–1), anchor at pill center. */
  xPct: number
  yPct: number
}

const CARD_SCALE_MIN = 0.55
const CARD_SCALE_MAX = 1.45

/** Drag-and-drop payload type (HTML5 dataTransfer). */
export const DT_CARD = 'application/x-plotmapper-card'

function firstEmptyCell(cards: PlotCard[]): { slotRow: SlotRow; slotIndex: number } | null {
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let i = 0; i < SLOTS_PER_ROW; i++) {
      if (!cards.some((c) => c.slotRow === r && c.slotIndex === i)) {
        return { slotRow: r as SlotRow, slotIndex: i }
      }
    }
  }
  return null
}

function normalizeCard(c: Record<string, unknown>): PlotCard | null {
  if (!c || typeof c.id !== 'string') return null
  if (typeof c.slotRow === 'number' && typeof c.slotIndex === 'number') {
    return {
      id: c.id,
      label: typeof c.label === 'string' ? c.label : 'Beat',
      kind: c.kind === 'chapter' ? 'chapter' : 'major',
      slotRow: clampSlotRow(c.slotRow),
      slotIndex: clampSlotIndex(c.slotIndex),
      notes: typeof c.notes === 'string' ? c.notes : '',
      characters: typeof c.characters === 'string' ? c.characters : '',
    }
  }
  return null
}

/** Map legacy stem position (0–1) to the same act rows as the UI (I / II / II / III). */
function stemTToPreferredRow(t: number): SlotRow {
  const x = Math.max(0, Math.min(1, t))
  if (x < 0.27) return 0
  if (x < 0.75) return x < 0.51 ? 1 : 2
  return 3
}

function firstFreeSlotIndex(out: PlotCard[], r: SlotRow): number {
  for (let i = 0; i < SLOTS_PER_ROW; i++) {
    if (!out.some((c) => c.slotRow === r && c.slotIndex === i)) return i
  }
  return -1
}

function migrateLegacyStemCards(raw: unknown[]): PlotCard[] {
  const valid = raw.filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === 'object')
  const sorted = [...valid].sort(
    (a, b) => (Number(a.stemT) || 0) - (Number(b.stemT) || 0),
  )
  const out: PlotCard[] = []

  for (const c of sorted) {
    const preferred = stemTToPreferredRow(Number(c.stemT) || 0)
    let r: SlotRow = preferred
    let i = firstFreeSlotIndex(out, r)
    if (i < 0) {
      for (let tryR = 0; tryR < GRID_ROWS; tryR++) {
        const fi = firstFreeSlotIndex(out, tryR as SlotRow)
        if (fi >= 0) {
          r = tryR as SlotRow
          i = fi
          break
        }
      }
    }
    if (i < 0) break

    const id = typeof c.id === 'string' ? c.id : `m_${Math.random().toString(36).slice(2)}`
    out.push({
      id,
      label: typeof c.label === 'string' ? c.label : 'Beat',
      kind: c.kind === 'chapter' ? 'chapter' : 'major',
      slotRow: r,
      slotIndex: i,
      notes: typeof c.notes === 'string' ? c.notes : '',
      characters: typeof c.characters === 'string' ? c.characters : '',
    })
  }
  return out
}

function migrateOrNormalizeCards(raw: unknown): PlotCard[] {
  if (!Array.isArray(raw) || raw.length === 0) return []
  const isLegacy = raw.some(
    (c) =>
      c &&
      typeof c === 'object' &&
      typeof (c as Record<string, unknown>).stemT === 'number' &&
      typeof (c as Record<string, unknown>).slotRow !== 'number',
  )
  if (isLegacy) return migrateLegacyStemCards(raw)
  const out: PlotCard[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const n = normalizeCard(item as Record<string, unknown>)
    if (n) out.push(n)
  }
  return out
}

function isPillColorId(x: unknown): x is PillColorId {
  return typeof x === 'string' && (PILL_COLOR_IDS as readonly string[]).includes(x)
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

function normalizeFloatingPill(raw: unknown): FloatingPill | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (typeof o.id !== 'string') return null
  const textRaw = typeof o.text === 'string' ? o.text : 'Note'
  const text = textRaw.trim().slice(0, 200) || 'Note'
  const colorId = isPillColorId(o.colorId) ? o.colorId : 'sky'
  const attachedToCardId = typeof o.attachedToCardId === 'string' ? o.attachedToCardId : null
  const xPct = typeof o.xPct === 'number' && Number.isFinite(o.xPct) ? clamp01(o.xPct) : 0.5
  const yPct = typeof o.yPct === 'number' && Number.isFinite(o.yPct) ? clamp01(o.yPct) : 0.1
  return { id: o.id, text, colorId, attachedToCardId, xPct, yPct }
}

function migrateFloatingPills(raw: unknown): FloatingPill[] {
  if (!Array.isArray(raw)) return []
  const out: FloatingPill[] = []
  for (const item of raw) {
    const p = normalizeFloatingPill(item)
    if (p) out.push(p)
  }
  return out.slice(0, 80)
}

type PlotStore = {
  manuscriptTitle: string
  targetWordCount: number
  cardScale: number
  theme: 'light' | 'dark'
  cards: PlotCard[]
  floatingPills: FloatingPill[]
  startedWithSuggestion: boolean
  setManuscriptTitle: (title: string) => void
  setTargetWordCount: (n: number) => void
  setCardScale: (n: number) => void
  setTheme: (t: 'light' | 'dark') => void
  loadSuggestedStructure: () => void
  clearBoard: () => void
  addCardToSlot: (slotRow: SlotRow, slotIndex: number, label: string, kind: 'major' | 'chapter') => void
  addFirstCard: (label: string, kind: 'major' | 'chapter') => void
  moveCardToSlot: (cardId: string, slotRow: SlotRow, slotIndex: number) => void
  updateCard: (id: string, patch: Partial<Omit<PlotCard, 'id'>>) => void
  removeCard: (id: string) => void
  addFloatingPill: () => void
  updateFloatingPill: (id: string, patch: Partial<Pick<FloatingPill, 'text' | 'colorId' | 'attachedToCardId' | 'xPct' | 'yPct'>>) => void
  removeFloatingPill: (id: string) => void
  setFloatingPillDragResult: (id: string, args: { attachedToCardId: string | null; xPct: number; yPct: number }) => void
  cycleFloatingPillColor: (id: string) => void
  /** Replace board state from a v1 JSON save (cards are normalized; orphan pills detached). */
  restoreFromSave: (data: {
    manuscriptTitle: string
    targetWordCount: number
    cardScale: number
    cards: unknown
    floatingPills?: unknown
    startedWithSuggestion: boolean
    theme?: 'light' | 'dark'
  }) => void
}

let idCounter = 0
function newId(): string {
  idCounter += 1
  return `c_${Date.now().toString(36)}_${idCounter}`
}

let pillIdCounter = 0
function newPillId(): string {
  pillIdCounter += 1
  return `p_${Date.now().toString(36)}_${pillIdCounter}`
}

export function actForCard(c: PlotCard): 1 | 2 | 3 {
  return actFromSlotRow(c.slotRow)
}

export const usePlotStore = create<PlotStore>()(
  persist(
    (set, get) => ({
      manuscriptTitle: '',
      targetWordCount: 80000,
      cardScale: 1,
      theme: 'dark',
      cards: [],
      floatingPills: [],
      startedWithSuggestion: false,

      setManuscriptTitle: (title) => set({ manuscriptTitle: title }),

      setTheme: (theme) => set({ theme }),

      setCardScale: (n) => {
        const v = Math.min(CARD_SCALE_MAX, Math.max(CARD_SCALE_MIN, Number(n) || 1))
        set({ cardScale: Math.round(v * 1000) / 1000 })
      },

      setTargetWordCount: (n) => {
        const v = Math.max(0, Math.floor(Number(n) || 0))
        set({ targetWordCount: v })
      },

      loadSuggestedStructure: () => {
        const cards: PlotCard[] = SUGGESTED_TEMPLATE.map((row) => ({
          id: newId(),
          label: row.label,
          kind: row.kind,
          slotRow: row.slotRow,
          slotIndex: row.slotIndex,
          notes: '',
          characters: '',
        }))
        set({
          cards,
          startedWithSuggestion: true,
          floatingPills: [],
        })
      },

      clearBoard: () =>
        set({
          cards: [],
          startedWithSuggestion: false,
          floatingPills: [],
        }),

      addCardToSlot: (slotRow, slotIndex, label, kind) => {
        const sr = clampSlotRow(slotRow)
        const si = clampSlotIndex(slotIndex)
        const cards = [...get().cards]
        if (cards.some((c) => c.slotRow === sr && c.slotIndex === si)) return
        cards.push({
          id: newId(),
          label,
          kind,
          slotRow: sr,
          slotIndex: si,
          notes: '',
          characters: '',
        })
        set({ cards })
      },

      addFirstCard: (label, kind) => {
        const cards = get().cards
        const spot = firstEmptyCell(cards)
        if (!spot) return
        get().addCardToSlot(spot.slotRow, spot.slotIndex, label, kind)
      },

      moveCardToSlot: (cardId, slotRow, slotIndex) => {
        const sr = clampSlotRow(slotRow)
        const si = clampSlotIndex(slotIndex)
        const cards = [...get().cards]
        const moving = cards.find((c) => c.id === cardId)
        if (!moving) return
        if (moving.slotRow === sr && moving.slotIndex === si) return

        const target = cards.find((c) => c.slotRow === sr && c.slotIndex === si)
        if (!target) {
          set({
            cards: cards.map((c) => (c.id === cardId ? { ...c, slotRow: sr, slotIndex: si } : c)),
          })
        } else {
          set({
            cards: cards.map((c) => {
              if (c.id === cardId) return { ...c, slotRow: sr, slotIndex: si }
              if (c.id === target.id) return { ...c, slotRow: moving.slotRow, slotIndex: moving.slotIndex }
              return c
            }),
          })
        }
      },

      updateCard: (id, patch) => {
        const { slotRow: _r, slotIndex: _i, ...safe } = patch
        void _r
        void _i
        set((s) => ({
          cards: s.cards.map((c) => (c.id === id ? { ...c, ...safe } : c)),
        }))
      },

      removeCard: (id) => {
        set((s) => ({
          cards: s.cards.filter((c) => c.id !== id),
          floatingPills: s.floatingPills.filter((p) => p.attachedToCardId !== id),
        }))
      },

      addFloatingPill: () => {
        const pills = get().floatingPills
        if (pills.length >= 60) return
        set({
          floatingPills: [
            ...pills,
            {
              id: newPillId(),
              text: 'Note',
              colorId: 'sky',
              attachedToCardId: null,
              xPct: 0.5,
              yPct: 0.06,
            },
          ],
        })
      },

      updateFloatingPill: (id, patch) => {
        set((s) => ({
          floatingPills: s.floatingPills.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        }))
      },

      removeFloatingPill: (id) => {
        set((s) => ({
          floatingPills: s.floatingPills.filter((p) => p.id !== id),
        }))
      },

      setFloatingPillDragResult: (id, { attachedToCardId, xPct, yPct }) => {
        set((s) => ({
          floatingPills: s.floatingPills.map((p) =>
            p.id === id
              ? {
                  ...p,
                  attachedToCardId,
                  xPct: clamp01(xPct),
                  yPct: clamp01(yPct),
                }
              : p,
          ),
        }))
      },

      cycleFloatingPillColor: (id) => {
        set((s) => ({
          floatingPills: s.floatingPills.map((p) => {
            if (p.id !== id) return p
            const ix = PILL_COLOR_IDS.indexOf(p.colorId)
            const next = PILL_COLOR_IDS[(ix < 0 ? 0 : ix + 1) % PILL_COLOR_IDS.length]
            return { ...p, colorId: next }
          }),
        }))
      },

      restoreFromSave: (data) => {
        const cards = migrateOrNormalizeCards(data.cards)
        const idSet = new Set(cards.map((c) => c.id))
        let floatingPills = migrateFloatingPills(data.floatingPills ?? [])
        floatingPills = floatingPills.map((fp) => ({
          ...fp,
          attachedToCardId:
            fp.attachedToCardId && idSet.has(fp.attachedToCardId) ? fp.attachedToCardId : null,
        }))
        const tw = Math.max(0, Math.floor(Number(data.targetWordCount) || 0))
        const rawScale = Number(data.cardScale)
        const cardScale = Number.isFinite(rawScale)
          ? Math.min(CARD_SCALE_MAX, Math.max(CARD_SCALE_MIN, rawScale))
          : get().cardScale
        const th = data.theme
        const theme = th === 'light' || th === 'dark' ? th : get().theme
        set({
          manuscriptTitle: typeof data.manuscriptTitle === 'string' ? data.manuscriptTitle : '',
          targetWordCount: tw,
          cardScale,
          theme,
          cards,
          floatingPills,
          startedWithSuggestion: Boolean(data.startedWithSuggestion),
        })
      },
    }),
    {
      name: 'plotmapper-v1',
      merge: (persisted, current) => {
        try {
          const p = persisted as Record<string, unknown> | null
          if (!p || typeof p !== 'object') return { ...current }
          const cards = migrateOrNormalizeCards(p.cards as unknown)
          const rawTw = Number(p.targetWordCount)
          const tw = Number.isFinite(rawTw) ? Math.max(0, Math.floor(rawTw)) : current.targetWordCount
          const th = p.theme
          const theme = th === 'light' || th === 'dark' ? th : current.theme
          const idSet = new Set(cards.map((c) => c.id))
          let floatingPills = Array.isArray(p.floatingPills)
            ? migrateFloatingPills(p.floatingPills)
            : current.floatingPills
          floatingPills = floatingPills.map((fp) => ({
            ...fp,
            attachedToCardId:
              fp.attachedToCardId && idSet.has(fp.attachedToCardId) ? fp.attachedToCardId : null,
          }))
          return {
            ...current,
            manuscriptTitle: typeof p.manuscriptTitle === 'string' ? p.manuscriptTitle : current.manuscriptTitle,
            cardScale: typeof p.cardScale === 'number' && Number.isFinite(p.cardScale) ? p.cardScale : current.cardScale,
            startedWithSuggestion: Boolean(p.startedWithSuggestion),
            theme,
            cards,
            targetWordCount: tw,
            floatingPills,
          }
        } catch (e) {
          console.error('plotmapper: failed to merge persisted state', e)
          return { ...current }
        }
      },
      partialize: (s) => ({
        manuscriptTitle: s.manuscriptTitle,
        targetWordCount: s.targetWordCount,
        cardScale: s.cardScale,
        theme: s.theme,
        cards: s.cards,
        floatingPills: s.floatingPills,
        startedWithSuggestion: s.startedWithSuggestion,
      }),
    },
  ),
)
