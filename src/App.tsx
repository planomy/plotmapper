import { useEffect, useRef, type RefObject } from 'react'
import { ActRowsBoard } from './components/ActRowsBoard'
import { CastMatrix } from './components/CastMatrix'
import {
  exportElementToPdfLandscape,
  parsePlotmapperSaveV1,
  pickProjectJsonFile,
  saveProjectJson,
  suggestedJsonFilename,
  type PlotmapperSaveV1,
} from './lib/projectIo'
import { usePlotStore } from './store/plotStore'

const CARD_SCALE_MIN = 0.55
const CARD_SCALE_MAX = 1.45

function HeaderBar({ exportRef }: { exportRef: RefObject<HTMLDivElement | null> }) {
  const manuscriptTitle = usePlotStore((s) => s.manuscriptTitle)
  const targetWordCount = usePlotStore((s) => s.targetWordCount)
  const cardScale = usePlotStore((s) => s.cardScale ?? 1)
  const cards = usePlotStore((s) => s.cards)
  const floatingPills = usePlotStore((s) => s.floatingPills)
  const theme = usePlotStore((s) => s.theme)
  const setManuscriptTitle = usePlotStore((s) => s.setManuscriptTitle)
  const setTargetWordCount = usePlotStore((s) => s.setTargetWordCount)
  const setCardScale = usePlotStore((s) => s.setCardScale)
  const setTheme = usePlotStore((s) => s.setTheme)
  const loadSuggestedStructure = usePlotStore((s) => s.loadSuggestedStructure)
  const clearBoard = usePlotStore((s) => s.clearBoard)
  const addFirstCard = usePlotStore((s) => s.addFirstCard)
  const restoreFromSave = usePlotStore((s) => s.restoreFromSave)

  const pct = Math.round(cardScale * 100)

  const btn =
    'rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors sm:text-[13px] border-slate-300/90 dark:border-white/12'
  const btnPrimary = `${btn} border-sky-600/50 bg-sky-600 text-white hover:bg-sky-500 dark:border-sky-500/40 dark:bg-sky-600/90`
  const btnGhost = `${btn} text-slate-700 hover:border-slate-400 hover:bg-slate-100 dark:text-slate-300 dark:hover:border-white/20 dark:hover:bg-white/5`
  const btnDanger = `${btn} border-rose-400/40 text-rose-700 hover:bg-rose-50 dark:border-rose-500/25 dark:text-rose-200/90 dark:hover:bg-rose-950/50`

  const handleSave = async () => {
    const st = usePlotStore.getState()
    const payload: PlotmapperSaveV1 = {
      version: 1,
      manuscriptTitle: st.manuscriptTitle,
      targetWordCount: st.targetWordCount,
      cardScale: st.cardScale,
      cards: st.cards,
      floatingPills: st.floatingPills,
      startedWithSuggestion: st.startedWithSuggestion,
      theme: st.theme,
    }
    const json = JSON.stringify(payload, null, 2)
    await saveProjectJson(json, suggestedJsonFilename(st.manuscriptTitle))
  }

  const handleLoad = async () => {
    const hasContent =
      cards.length > 0 || floatingPills.length > 0 || manuscriptTitle.trim().length > 0
    if (hasContent && !confirm('Replace the current project with the file you choose?')) return
    const file = await pickProjectJsonFile()
    if (!file) return
    let text: string
    try {
      text = await file.text()
    } catch (e) {
      console.error(e)
      window.alert('Could not read that file.')
      return
    }
    const parsed = parsePlotmapperSaveV1(text)
    if (!parsed.ok) {
      window.alert(parsed.error)
      return
    }
    restoreFromSave(parsed.data)
  }

  const handleExport = async () => {
    const el = exportRef.current
    if (!el) return
    try {
      await exportElementToPdfLandscape(el, manuscriptTitle)
    } catch (e) {
      console.error(e)
      const detail = e instanceof Error ? e.message : String(e)
      window.alert(`Could not create PDF.\n\n${detail.slice(0, 400)}`)
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/90 bg-white/90 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/92 dark:shadow-[0_1px_0_rgba(0,0,0,0.4)]">
      <div className="mx-auto flex max-w-[1920px] flex-col gap-2.5 px-3 py-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2 sm:px-5 sm:py-2">
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:min-w-[12rem] sm:max-w-xl">
          <label htmlFor="ms-title" className="sr-only">
            Manuscript title
          </label>
          <input
            id="ms-title"
            className="min-w-0 flex-1 border-b border-transparent bg-transparent py-0.5 font-display text-lg font-semibold leading-tight text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-600/50 dark:text-white dark:placeholder:text-slate-600 dark:focus:border-sky-500/40 sm:text-xl"
            placeholder="Untitled novel"
            value={manuscriptTitle}
            onChange={(e) => setManuscriptTitle(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:contents lg:contents">
          <div className="flex items-center gap-2">
            <label
              htmlFor="ms-words"
              className="whitespace-nowrap text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500"
            >
              Words
            </label>
            <input
              id="ms-words"
              type="number"
              min={0}
              className="w-[6.5rem] rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-xs text-slate-900 outline-none focus:border-sky-600/50 sm:text-sm dark:border-white/10 dark:bg-black/35 dark:text-slate-100 dark:focus:border-sky-500/35"
              value={targetWordCount || ''}
              onChange={(e) => setTargetWordCount(Number(e.target.value))}
            />
          </div>

          <div className="flex min-w-0 flex-1 items-center gap-2 sm:max-w-[11rem] sm:flex-none lg:max-w-[12rem]">
            <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-500">
              Size
            </span>
            <button
              type="button"
              className="h-7 w-7 shrink-0 rounded border border-slate-300 text-sm leading-none text-slate-600 hover:bg-slate-100 dark:border-white/12 dark:text-slate-300 dark:hover:bg-white/8"
              title="Smaller cards"
              onClick={() => setCardScale(cardScale - 0.05)}
            >
              −
            </button>
            <input
              type="range"
              min={CARD_SCALE_MIN * 100}
              max={CARD_SCALE_MAX * 100}
              step={1}
              value={Math.round(cardScale * 100)}
              onChange={(e) => setCardScale(Number(e.target.value) / 100)}
              className="h-1.5 min-w-0 flex-1 cursor-pointer accent-sky-600 dark:accent-sky-500"
              aria-label="Card size"
            />
            <button
              type="button"
              className="h-7 w-7 shrink-0 rounded border border-slate-300 text-sm leading-none text-slate-600 hover:bg-slate-100 dark:border-white/12 dark:text-slate-300 dark:hover:bg-white/8"
              title="Larger cards"
              onClick={() => setCardScale(cardScale + 0.05)}
            >
              +
            </button>
            <span className="w-8 shrink-0 text-right font-mono text-[10px] text-slate-500 dark:text-slate-500">
              {pct}%
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
          <button type="button" className={btnPrimary} onClick={() => loadSuggestedStructure()}>
            Suggested map
          </button>
          <button
            type="button"
            className={btnGhost}
            onClick={() => {
              if (!cards.length) addFirstCard('Beginning', 'major')
            }}
            disabled={cards.length > 0}
            title={cards.length ? 'Board already has cards' : 'Add Beginning in first empty slot'}
          >
            First beat
          </button>
          <button
            type="button"
            className={btnDanger}
            onClick={() => {
              if (confirm('Clear all cards from the board?')) clearBoard()
            }}
          >
            Clear
          </button>
          <button type="button" className={btnGhost} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <button type="button" className={btnGhost} onClick={() => void handleSave()}>
            Save
          </button>
          <button type="button" className={btnGhost} onClick={() => void handleLoad()}>
            Load
          </button>
          <button type="button" className={btnGhost} onClick={() => void handleExport()}>
            Export PDF
          </button>
        </div>
      </div>
    </header>
  )
}

export default function App() {
  const exportRef = useRef<HTMLDivElement>(null)
  const theme = usePlotStore((s) => s.theme)
  const manuscriptTitle = usePlotStore((s) => s.manuscriptTitle)
  const targetWordCount = usePlotStore((s) => s.targetWordCount)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <div className="min-h-screen w-full max-w-none pb-12 font-sans text-slate-800 dark:text-slate-200">
      <HeaderBar exportRef={exportRef} />
      <main className="w-full px-3 pt-4 sm:px-5 sm:pt-5 lg:px-8">
        <div
          ref={exportRef}
          className="w-full rounded-xl border border-slate-200/80 bg-slate-50/90 p-3 shadow-sm dark:border-white/10 dark:bg-slate-950/40 dark:shadow-none"
        >
          <div className="mb-3 border-b border-slate-200/90 pb-2 dark:border-white/10">
            <p className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              {manuscriptTitle.trim() || 'Untitled novel'}
            </p>
            <p className="mt-0.5 font-mono text-xs text-slate-500 tabular-nums dark:text-slate-400">
              Target {targetWordCount.toLocaleString()} words
            </p>
          </div>
          <ActRowsBoard />
        </div>
        <CastMatrix />
      </main>
    </div>
  )
}
