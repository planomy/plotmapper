import { useMemo } from 'react'
import { compareSlotOrder } from '../lib/gridLayout'
import type { PlotCard } from '../store/plotStore'
import { actForCard, usePlotStore } from '../store/plotStore'

function parseChars(s: string): string[] {
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
}

function headerTint(card: PlotCard): string {
  const a = actForCard(card)
  if (a === 1) return 'bg-sky-100/90 dark:bg-sky-950/40'
  if (a === 3) return 'bg-emerald-100/90 dark:bg-emerald-950/35'
  return 'bg-amber-100/90 dark:bg-amber-950/35'
}

function cellTint(card: PlotCard, filled: boolean): string {
  const a = actForCard(card)
  if (filled) return 'bg-sky-500/20 dark:bg-sky-500/25'
  if (a === 1) return 'bg-sky-50/40 dark:bg-sky-950/15'
  if (a === 3) return 'bg-emerald-50/40 dark:bg-emerald-950/12'
  return 'bg-amber-50/40 dark:bg-amber-950/12'
}

export function CastMatrix() {
  const cards = usePlotStore((s) => s.cards)
  const sorted = useMemo(() => [...cards].sort(compareSlotOrder), [cards])

  const beats = useMemo(() => {
    return sorted.map((card, index) => ({
      card,
      beatNum: index + 1,
      chars: parseChars(card.characters),
    }))
  }, [sorted])

  const cast = useMemo(() => {
    const order: string[] = []
    const seen = new Set<string>()
    for (const b of beats) {
      for (const ch of b.chars) {
        if (!seen.has(ch)) {
          seen.add(ch)
          order.push(ch)
        }
      }
    }
    return order
  }, [beats])

  if (!beats.length) {
    return (
      <div className="mt-6 rounded-xl border border-dashed border-slate-300/90 bg-slate-100/60 px-4 py-6 text-center text-sm text-slate-500 dark:border-white/15 dark:bg-slate-950/30 dark:text-slate-500">
        Add beats in the grid to open the cast matrix. Tag characters on each card (comma-separated); each column is
        a beat in reading order.
      </div>
    )
  }

  return (
    <section className="mt-8">
      <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">Cast matrix</h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Characters in rows; beats in columns (Act I row, then Act II rows, then Act III). A dot marks where someone is
        tagged on that card.
      </p>

      {cast.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300/90 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-600 dark:border-white/12 dark:bg-slate-900/30 dark:text-slate-400">
          Tag at least one character on a beat (Characters field on a card) to fill the matrix.
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200/90 bg-white/90 shadow-sm dark:border-white/10 dark:bg-slate-950/50">
          <table className="w-max min-w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10">
                <th
                  scope="col"
                  className="sticky left-0 z-20 whitespace-nowrap border-r border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-white/10 dark:bg-slate-950 dark:text-slate-500"
                >
                  Character
                </th>
                {beats.map((b) => (
                  <th
                    key={b.card.id}
                    scope="col"
                    title={`${b.card.label} · Act ${actForCard(b.card)} · slot ${b.card.slotIndex + 1}`}
                    className={`max-w-[6.5rem] min-w-[3.25rem] px-1.5 py-2 text-center align-bottom text-xs font-medium leading-tight text-slate-800 dark:text-slate-100 ${headerTint(b.card)}`}
                  >
                    <span className="block font-mono text-[10px] font-normal text-slate-500 dark:text-slate-400">
                      {b.beatNum}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block">{b.card.label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cast.map((name) => (
                <tr key={name} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 whitespace-nowrap border-r border-slate-200 bg-white px-3 py-2 text-left text-sm font-medium text-slate-900 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100"
                  >
                    {name}
                  </th>
                  {beats.map((b) => {
                    const on = b.chars.includes(name)
                    return (
                      <td
                        key={b.card.id}
                        className={`px-1 py-2 text-center ${cellTint(b.card, on)}`}
                        title={on ? `${name} · ${b.card.label}` : undefined}
                      >
                        {on ? (
                          <span
                            className="inline-block size-2.5 rounded-full bg-sky-600 shadow-sm dark:bg-sky-400"
                            aria-label={`${name} appears in ${b.card.label}`}
                          />
                        ) : (
                          <span className="inline-block size-2.5 opacity-0" aria-hidden />
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
