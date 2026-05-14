import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { CHAPTER_LABELS, MAJOR_LABELS } from '../lib/constants'
import { milestoneWordsByCardId } from '../lib/beatMilestones'
import { findPillSnapCardId } from '../lib/pillSnap'
import { actFromSlotRow, GRID_ROWS, SLOTS_PER_ROW, type SlotRow } from '../lib/gridLayout'
import type { FloatingPill, PillColorId, PlotCard } from '../store/plotStore'
import { DT_CARD, usePlotStore } from '../store/plotStore'

const ACT_COLORS = {
  1: {
    row: 'border-sky-200/90 bg-sky-50/90 dark:border-sky-500/30 dark:bg-sky-950/20',
    card: 'border-sky-200/90 bg-white shadow-sm dark:border-sky-400/50 dark:bg-sky-950/50 dark:shadow-[0_0_0_1px_rgba(56,189,248,0.15)]',
    chip: 'bg-sky-500/15 text-sky-900 dark:bg-sky-500/20 dark:text-sky-200',
  },
  2: {
    row: 'border-amber-200/90 bg-amber-50/80 dark:border-amber-500/25 dark:bg-amber-950/15',
    card: 'border-amber-200/90 bg-white shadow-sm dark:border-amber-400/45 dark:bg-amber-950/35 dark:shadow-[0_0_0_1px_rgba(251,191,36,0.12)]',
    chip: 'bg-amber-500/15 text-amber-950 dark:bg-amber-500/20 dark:text-amber-100',
  },
  3: {
    row: 'border-emerald-200/90 bg-emerald-50/80 dark:border-emerald-500/25 dark:bg-emerald-950/15',
    card: 'border-emerald-200/90 bg-white shadow-sm dark:border-emerald-400/45 dark:bg-emerald-950/35 dark:shadow-[0_0_0_1px_rgba(52,211,153,0.12)]',
    chip: 'bg-emerald-500/15 text-emerald-950 dark:bg-emerald-500/20 dark:text-emerald-100',
  },
} as const

const PILL_SKIN: Record<PillColorId, string> = {
  sky: 'bg-sky-200/95 text-sky-950 ring-1 ring-sky-400/40 dark:bg-sky-500/35 dark:text-sky-50 dark:ring-sky-400/25',
  amber:
    'bg-amber-200/95 text-amber-950 ring-1 ring-amber-400/40 dark:bg-amber-500/28 dark:text-amber-50 dark:ring-amber-400/25',
  rose: 'bg-rose-200/95 text-rose-950 ring-1 ring-rose-400/40 dark:bg-rose-500/32 dark:text-rose-50 dark:ring-rose-400/25',
  violet:
    'bg-violet-200/95 text-violet-950 ring-1 ring-violet-400/40 dark:bg-violet-500/32 dark:text-violet-50 dark:ring-violet-400/25',
  emerald:
    'bg-emerald-200/95 text-emerald-950 ring-1 ring-emerald-400/40 dark:bg-emerald-500/28 dark:text-emerald-50 dark:ring-emerald-400/25',
  zinc: 'bg-zinc-200/95 text-zinc-900 ring-1 ring-zinc-400/40 dark:bg-zinc-600/45 dark:text-zinc-50 dark:ring-zinc-400/20',
}

const PILL_DOT: Record<PillColorId, string> = {
  sky: 'bg-sky-600 dark:bg-sky-300',
  amber: 'bg-amber-600 dark:bg-amber-300',
  rose: 'bg-rose-600 dark:bg-rose-300',
  violet: 'bg-violet-600 dark:bg-violet-300',
  emerald: 'bg-emerald-600 dark:bg-emerald-300',
  zinc: 'bg-zinc-600 dark:bg-zinc-300',
}

const ROW_HEADINGS = [
  { title: 'Act 1', detail: 'Act I · 12 slots' },
  { title: 'Act 2', detail: 'Act II · 12 slots' },
  { title: 'Act 2', detail: 'Act II · 12 slots' },
  { title: 'Act 3', detail: 'Act III · 12 slots' },
] as const

function kindForLabel(label: string): 'major' | 'chapter' {
  const inM = (MAJOR_LABELS as readonly string[]).includes(label)
  const inC = (CHAPTER_LABELS as readonly string[]).includes(label)
  if (inM && !inC) return 'major'
  if (inC && !inM) return 'chapter'
  if (inM && inC) return 'chapter'
  return 'major'
}

const LABEL_OPTIONS: readonly string[] = [
  ...MAJOR_LABELS,
  ...CHAPTER_LABELS.filter((l) => !(MAJOR_LABELS as readonly string[]).includes(l)),
]

function actForRow(slotRow: SlotRow): 1 | 2 | 3 {
  return actFromSlotRow(slotRow)
}

type DragSession = {
  pillId: string
  originCX: number
  originCY: number
  startX: number
  startY: number
  lastX: number
  lastY: number
  retainXPct: number
  retainYPct: number
}

function PillEditor({
  pill,
  dragging,
  onPointerDownDrag,
}: {
  pill: FloatingPill
  dragging: boolean
  onPointerDownDrag: (e: ReactPointerEvent<HTMLSpanElement>) => void
}) {
  const updateFloatingPill = usePlotStore((s) => s.updateFloatingPill)
  const removeFloatingPill = usePlotStore((s) => s.removeFloatingPill)
  const cycleFloatingPillColor = usePlotStore((s) => s.cycleFloatingPillColor)

  return (
    <span
      className={`inline-flex max-w-[11rem] shrink-0 cursor-grab items-center gap-0.5 rounded-full py-px pl-1 pr-0.5 text-[10px] font-medium leading-none shadow-sm active:cursor-grabbing ${PILL_SKIN[pill.colorId]} ${dragging ? 'pointer-events-none opacity-0' : ''}`}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest('input, button, textarea')) return
        onPointerDownDrag(e)
      }}
    >
      <button
        type="button"
        title="Cycle colour"
        draggable={false}
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          e.stopPropagation()
          cycleFloatingPillColor(pill.id)
        }}
        className={`size-2 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/20 ${PILL_DOT[pill.colorId]}`}
      />
      <input
        draggable={false}
        className="min-w-0 max-w-[7rem] flex-1 border-0 bg-transparent py-0 text-[10px] outline-none placeholder:text-slate-500/70 dark:placeholder:text-slate-400/70"
        value={pill.text}
        onChange={(e) => updateFloatingPill(pill.id, { text: e.target.value })}
        onPointerDown={(e) => e.stopPropagation()}
      />
      <button
        type="button"
        draggable={false}
        title="Remove"
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          e.stopPropagation()
          removeFloatingPill(pill.id)
        }}
        className="shrink-0 rounded px-0.5 leading-none opacity-70 hover:opacity-100"
      >
        ×
      </button>
    </span>
  )
}

function AttachedPillsRow({
  cardId,
  dragPillId,
  beginDrag,
}: {
  cardId: string
  dragPillId: string | null
  beginDrag: (pill: FloatingPill, el: HTMLElement, e: ReactPointerEvent<HTMLSpanElement>) => void
}) {
  const floatingPills = usePlotStore((s) => s.floatingPills)
  const pills = useMemo(
    () => floatingPills.filter((p) => p.attachedToCardId === cardId),
    [floatingPills, cardId],
  )

  if (!pills.length) return null

  return (
    <div className="mb-1 flex min-h-[1.125rem] flex-wrap items-center gap-0.5">
      {pills.map((pill) => (
        <PillEditor
          key={pill.id}
          pill={pill}
          dragging={dragPillId === pill.id}
          onPointerDownDrag={(e) => beginDrag(pill, e.currentTarget, e)}
        />
      ))}
    </div>
  )
}

function GridCard({
  card,
  milestoneWords,
  dragPillId,
  beginDrag,
}: {
  card: PlotCard
  milestoneWords: number
  dragPillId: string | null
  beginDrag: (pill: FloatingPill, el: HTMLElement, e: ReactPointerEvent<HTMLSpanElement>) => void
}) {
  const updateCard = usePlotStore((s) => s.updateCard)
  const removeCard = usePlotStore((s) => s.removeCard)
  const cardScale = usePlotStore((s) => s.cardScale ?? 1)
  const targetWordCount = usePlotStore((s) => s.targetWordCount)
  const act = actFromSlotRow(card.slotRow)
  const colors = ACT_COLORS[act]
  const rem = 0.6875 * cardScale

  return (
    <div className="flex h-full min-h-0 w-full flex-col" style={{ fontSize: `${rem}rem` }}>
      <div
        data-pill-snap-card={card.id}
        draggable
        title="Drag card to another slot"
        onDragStart={(e) => {
          e.dataTransfer.setData(DT_CARD, card.id)
          e.dataTransfer.effectAllowed = 'move'
        }}
        className={`relative flex min-h-0 flex-1 cursor-grab flex-col rounded-lg border px-2 py-1.5 active:cursor-grabbing ${colors.card}`}
      >
        <AttachedPillsRow cardId={card.id} dragPillId={dragPillId} beginDrag={beginDrag} />
        <div className="flex items-start justify-between gap-1">
          <input
            draggable={false}
            className="min-w-0 flex-1 cursor-text border-0 bg-transparent py-0.5 pr-1 font-display text-[1.05em] font-semibold leading-tight text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:underline focus:decoration-sky-500/50 focus:underline-offset-2 dark:text-white dark:placeholder:text-slate-600 dark:focus:decoration-sky-400/50"
            value={card.label}
            onChange={(e) => updateCard(card.id, { label: e.target.value })}
            onPointerDown={(e) => e.stopPropagation()}
            maxLength={200}
            aria-label="Beat title"
            placeholder="Title"
          />
          <button
            type="button"
            draggable={false}
            className="shrink-0 rounded px-1 leading-none text-slate-400 hover:bg-slate-200 hover:text-rose-600 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-rose-300"
            title="Remove card"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              removeCard(card.id)
            }}
          >
            ×
          </button>
        </div>
        <textarea
          draggable={false}
          className="mt-1 min-h-[4.5em] w-full flex-1 cursor-text resize-none rounded border border-slate-200 bg-white px-1.5 py-1 text-slate-800 outline-none placeholder:text-slate-400 dark:border-white/10 dark:bg-black/30 dark:text-slate-200 dark:placeholder:text-slate-600"
          placeholder="Notes…"
          value={card.notes}
          onChange={(e) => updateCard(card.id, { notes: e.target.value })}
          onPointerDown={(e) => e.stopPropagation()}
        />
        <div className="mt-1 flex items-center gap-1 border-t border-slate-100 pt-1 dark:border-white/5">
          <span className="shrink-0 text-[0.65em] uppercase tracking-wide text-slate-500 dark:text-slate-500">By</span>
          <input
            readOnly
            tabIndex={-1}
            draggable={false}
            className="min-w-0 flex-1 cursor-default rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-right font-mono text-[0.85em] text-slate-800 tabular-nums outline-none dark:border-white/8 dark:bg-black/20 dark:text-slate-300"
            value={targetWordCount > 0 ? milestoneWords.toLocaleString() : '—'}
            title="Approximate cumulative draft length: Act One Climax ≈ 25%, Act Two Climax ≈ 75%, End ≈ 100%; other beats interpolate by reading order"
          />
          <span className="shrink-0 text-[0.65em] text-slate-500 dark:text-slate-500">w</span>
        </div>
        <input
          draggable={false}
          className="mt-1 w-full shrink-0 cursor-text rounded border border-slate-200 bg-white px-1.5 py-1 text-slate-700 outline-none placeholder:text-slate-400 dark:border-white/10 dark:bg-black/25 dark:text-slate-300 dark:placeholder:text-slate-600"
          placeholder="Characters"
          value={card.characters}
          onChange={(e) => updateCard(card.id, { characters: e.target.value })}
          onPointerDown={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  )
}

function EmptySlotPopover({
  slotRow,
  slotIndex,
}: {
  slotRow: SlotRow
  slotIndex: number
}) {
  const addCardToSlot = usePlotStore((s) => s.addCardToSlot)
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState<string>(LABEL_OPTIONS[0])

  return (
    <div className="flex h-full min-h-0 flex-1 items-center justify-center p-1">
      <button
        type="button"
        className="rounded-lg border border-dashed border-slate-300 px-3 py-8 text-xs text-slate-500 hover:border-sky-500/60 hover:text-slate-700 dark:border-white/20 dark:hover:border-sky-500/40 dark:hover:text-slate-300"
        onClick={() => setOpen((o) => !o)}
      >
        + Add
      </button>
      {open && (
        <div
          className="absolute left-1/2 top-1/2 z-30 w-48 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-slate-200 bg-white p-2 shadow-xl dark:border-white/15 dark:bg-slate-900"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <label className="text-[9px] font-medium uppercase text-slate-500 dark:text-slate-500">Label</label>
          <select
            className="mt-0.5 w-full rounded border border-slate-200 bg-white px-1 py-1 text-[11px] text-slate-900 dark:border-white/10 dark:bg-black/40 dark:text-slate-100"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          >
            {LABEL_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          <div className="mt-2 flex justify-end gap-1">
            <button
              type="button"
              className="rounded px-2 py-0.5 text-[10px] text-slate-500 dark:text-slate-500"
              onClick={() => setOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded bg-sky-600 px-2 py-0.5 text-[10px] text-white hover:bg-sky-500"
              onClick={() => {
                addCardToSlot(slotRow, slotIndex, label, kindForLabel(label))
                setOpen(false)
              }}
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SlotCell({
  slotRow,
  slotIndex,
  card,
  milestoneWords,
  dragPillId,
  beginDrag,
}: {
  slotRow: SlotRow
  slotIndex: number
  card: PlotCard | undefined
  milestoneWords?: number
  dragPillId: string | null
  beginDrag: (pill: FloatingPill, el: HTMLElement, e: ReactPointerEvent<HTMLSpanElement>) => void
}) {
  const moveCardToSlot = usePlotStore((s) => s.moveCardToSlot)
  const act = actForRow(slotRow)
  const rowTint = ACT_COLORS[act].row

  return (
    <div
      className={`relative flex h-full min-h-0 flex-col rounded-lg border p-1 ${rowTint} transition-colors`}
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
      }}
      onDrop={(e) => {
        e.preventDefault()
        const id = e.dataTransfer.getData(DT_CARD)
        if (id) moveCardToSlot(id, slotRow, slotIndex)
      }}
    >
      {card ? (
        <GridCard
          card={card}
          milestoneWords={milestoneWords ?? 0}
          dragPillId={dragPillId}
          beginDrag={beginDrag}
        />
      ) : (
        <EmptySlotPopover slotRow={slotRow} slotIndex={slotIndex} />
      )}
    </div>
  )
}

export function ActRowsBoard() {
  const boardRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<DragSession | null>(null)
  const [dragTick, setDragTick] = useState(0)

  const cards = usePlotStore((s) => s.cards)
  const floatingPills = usePlotStore((s) => s.floatingPills)
  const addFloatingPill = usePlotStore((s) => s.addFloatingPill)
  const targetWordCount = usePlotStore((s) => s.targetWordCount)

  const beginDrag = useCallback((pill: FloatingPill, el: HTMLElement, e: ReactPointerEvent<HTMLSpanElement>) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    const r = el.getBoundingClientRect()
    dragRef.current = {
      pillId: pill.id,
      originCX: r.left + r.width / 2,
      originCY: r.top + r.height / 2,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      retainXPct: pill.xPct,
      retainYPct: pill.yPct,
    }
    setDragTick((t) => t + 1)
  }, [])

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      d.lastX = e.clientX
      d.lastY = e.clientY
      setDragTick((t) => t + 1)
    }
    const onUp = (e: PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      const cx = d.originCX + (e.clientX - d.startX)
      const cy = d.originCY + (e.clientY - d.startY)
      const cardId = findPillSnapCardId(e.clientX, e.clientY)
      const board = boardRef.current?.getBoundingClientRect()
      const setRes = usePlotStore.getState().setFloatingPillDragResult
      if (cardId) {
        setRes(d.pillId, {
          attachedToCardId: cardId,
          xPct: d.retainXPct,
          yPct: d.retainYPct,
        })
      } else if (board) {
        const xPct = (cx - board.left) / board.width
        const yPct = (cy - board.top) / board.height
        setRes(d.pillId, { attachedToCardId: null, xPct, yPct })
      }
      dragRef.current = null
      setDragTick((t) => t + 1)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [])

  const milestoneById = useMemo(
    () => milestoneWordsByCardId(targetWordCount, cards),
    [targetWordCount, cards],
  )
  const bySlot = useMemo(() => {
    const m = new Map<string, PlotCard>()
    for (const c of cards) {
      m.set(`${c.slotRow}-${c.slotIndex}`, c)
    }
    return m
  }, [cards])

  const freePills = useMemo(() => floatingPills.filter((p) => !p.attachedToCardId), [floatingPills])
  const d = dragRef.current
  const dragPill = d ? floatingPills.find((p) => p.id === d.pillId) : undefined
  const ghostCx = d ? d.originCX + (d.lastX - d.startX) : 0
  const ghostCy = d ? d.originCY + (d.lastY - d.startY) : 0
  const dragPillId = d?.pillId ?? null

  void dragTick

  return (
    <div ref={boardRef} className="relative w-full space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          className="rounded-md border border-slate-300/90 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/10"
          onClick={() => addFloatingPill()}
        >
          + Floating note
        </button>
      </div>

      {Array.from({ length: GRID_ROWS }, (_, rowIdx) => {
        const slotRow = rowIdx as SlotRow
        const meta = ROW_HEADINGS[rowIdx]
        const act = actForRow(slotRow)
        const edge =
          act === 1
            ? 'from-sky-200/60 dark:from-sky-500/20'
            : act === 3
              ? 'from-emerald-200/60 dark:from-emerald-500/20'
              : 'from-amber-200/60 dark:from-amber-500/20'

        return (
          <section
            key={rowIdx}
            style={{ ['--slot-h' as string]: 'clamp(11.16rem, 20.16vh, 17.28rem)' }}
            className={`relative z-0 rounded-xl border border-slate-200/90 bg-white/70 px-3 pb-2 pt-2 bg-gradient-to-r ${edge} to-transparent dark:border-white/10 dark:bg-slate-950/50`}
          >
            <div className="mb-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
              <h2 className="font-display text-sm font-semibold leading-none text-slate-900 dark:text-white">
                {meta.title}
              </h2>
              <span className="text-[10px] leading-none text-slate-500 dark:text-slate-500">{meta.detail}</span>
            </div>
            <div className="overflow-x-auto pb-1">
              <div
                className="relative z-10 grid min-w-[720px] grid-cols-12 items-stretch gap-1.5 md:min-w-0"
                style={{ gridAutoRows: 'var(--slot-h)' }}
              >
                {Array.from({ length: SLOTS_PER_ROW }, (_, slotIndex) => {
                  const card = bySlot.get(`${slotRow}-${slotIndex}`)
                  return (
                    <SlotCell
                      key={slotIndex}
                      slotRow={slotRow}
                      slotIndex={slotIndex}
                      card={card}
                      milestoneWords={card ? milestoneById.get(card.id) : undefined}
                      dragPillId={dragPillId}
                      beginDrag={beginDrag}
                    />
                  )
                })}
              </div>
            </div>
          </section>
        )
      })}

      <div className="pointer-events-none absolute inset-0 z-20 overflow-visible">
        {freePills.map((pill) => (
          <div
            key={pill.id}
            className="pointer-events-auto absolute"
            style={{
              left: `${pill.xPct * 100}%`,
              top: `${pill.yPct * 100}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <PillEditor
              pill={pill}
              dragging={dragPillId === pill.id}
              onPointerDownDrag={(e) => beginDrag(pill, e.currentTarget, e)}
            />
          </div>
        ))}
      </div>

      {d && dragPill && (
        <div
          className="pointer-events-none fixed z-[100] whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-medium shadow-lg ring-1 ring-black/10 dark:ring-white/20"
          style={{
            left: ghostCx,
            top: ghostCy,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <span className={`rounded-full px-1.5 py-0.5 ${PILL_SKIN[dragPill.colorId]}`}>{dragPill.text || 'Note'}</span>
        </div>
      )}
    </div>
  )
}
