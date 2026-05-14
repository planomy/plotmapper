import type { FloatingPill, PlotCard } from '../store/plotStore'

export type PlotmapperSaveV1 = {
  version: 1
  manuscriptTitle: string
  targetWordCount: number
  cardScale: number
  cards: PlotCard[]
  floatingPills?: FloatingPill[]
  startedWithSuggestion: boolean
  theme?: 'light' | 'dark'
}

export function suggestedJsonFilename(title: string): string {
  const base = title.trim() || 'plotmapper'
  const slug = base
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 96)
  return `${slug || 'plotmapper'}.plotmapper.json`
}

export async function saveProjectJson(json: string, suggestedName: string): Promise<void> {
  const w = window as Window & {
    showSaveFilePicker?: (options: {
      suggestedName?: string
      types?: { description: string; accept: Record<string, string[]> }[]
    }) => Promise<FileSystemFileHandle>
  }

  if (typeof w.showSaveFilePicker === 'function') {
    try {
      const handle = await w.showSaveFilePicker({
        suggestedName,
        types: [{ description: 'Plotmapper', accept: { 'application/json': ['.json'] } }],
      })
      const writable = await handle.createWritable()
      await writable.write(new Blob([json], { type: 'application/json' }))
      await writable.close()
      return
    } catch (e) {
      if ((e as { name?: string }).name === 'AbortError') return
    }
  }

  const a = document.createElement('a')
  const blob = new Blob([json], { type: 'application/json' })
  a.href = URL.createObjectURL(blob)
  a.download = suggestedName
  a.click()
  URL.revokeObjectURL(a.href)
}

const OPEN_JSON_ACCEPT: Record<string, string[]> = { 'application/json': ['.json'] }

/** Pick a JSON file; uses File System Access API when available. */
export async function pickProjectJsonFile(): Promise<File | null> {
  const w = window as Window & {
    showOpenFilePicker?: (options: {
      multiple?: boolean
      types?: { description: string; accept: Record<string, string[]> }[]
    }) => Promise<FileSystemFileHandle[]>
  }

  if (typeof w.showOpenFilePicker === 'function') {
    try {
      const [handle] = await w.showOpenFilePicker({
        multiple: false,
        types: [{ description: 'Plotmapper', accept: OPEN_JSON_ACCEPT }],
      })
      return await handle.getFile()
    } catch (e) {
      if ((e as { name?: string }).name === 'AbortError') return null
      console.warn('plotmapper: showOpenFilePicker failed, using file input', e)
    }
  }

  return await pickProjectJsonFileLegacyInput()
}

function pickProjectJsonFileLegacyInput(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    let settled = false
    const finish = (file: File | null) => {
      if (settled) return
      settled = true
      resolve(file)
    }
    input.addEventListener('change', () => finish(input.files?.[0] ?? null))
    window.addEventListener(
      'focus',
      () => {
        setTimeout(() => {
          if (!input.files?.length) finish(null)
        }, 480)
      },
      { once: true },
    )
    input.click()
  })
}

export function parsePlotmapperSaveV1(
  text: string,
): { ok: true; data: PlotmapperSaveV1 } | { ok: false; error: string } {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, error: 'This file is not valid JSON.' }
  }
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'The file must contain a JSON object.' }
  }
  const o = parsed as Record<string, unknown>
  if (o.version !== 1) {
    return { ok: false, error: 'This file is not a Plotmapper save (expected "version": 1).' }
  }
  if (!Array.isArray(o.cards)) {
    return { ok: false, error: 'This file is missing a "cards" array.' }
  }

  const manuscriptTitle = typeof o.manuscriptTitle === 'string' ? o.manuscriptTitle : ''
  const rawTw = Number(o.targetWordCount)
  const targetWordCount = Number.isFinite(rawTw) ? Math.max(0, Math.floor(rawTw)) : 0
  const rawScale = Number(o.cardScale)
  const cardScale = Number.isFinite(rawScale) ? rawScale : 1
  const th = o.theme
  const theme = th === 'light' || th === 'dark' ? th : undefined

  const data: PlotmapperSaveV1 = {
    version: 1,
    manuscriptTitle,
    targetWordCount,
    cardScale,
    cards: o.cards as PlotmapperSaveV1['cards'],
    floatingPills: Array.isArray(o.floatingPills) ? (o.floatingPills as PlotmapperSaveV1['floatingPills']) : [],
    startedWithSuggestion: Boolean(o.startedWithSuggestion),
    theme,
  }
  return { ok: true, data }
}

/** Strip effects that often break or blow up html2canvas in cloned DOM. */
function stripHeavyEffectsOnClone(_document: Document, clonedRoot: HTMLElement): void {
  const all = clonedRoot.querySelectorAll<HTMLElement>('*')
  for (const el of all) {
    const cls = el.className
    if (typeof cls === 'string' && (cls.includes('backdrop-blur') || cls.includes('backdrop:'))) {
      el.style.backdropFilter = 'none'
      el.style.setProperty('-webkit-backdrop-filter', 'none')
    }
  }
}

async function renderToCanvas(
  html2canvas: (typeof import('html2canvas'))['default'],
  element: HTMLElement,
  scale: number,
  extra: Record<string, unknown> = {},
): Promise<HTMLCanvasElement> {
  return html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: false,
    logging: false,
    backgroundColor: '#f8fafc',
    scrollX: 0,
    scrollY: -window.scrollY,
    windowWidth: document.documentElement.clientWidth,
    windowHeight: document.documentElement.clientHeight,
    ...extra,
    onclone: stripHeavyEffectsOnClone,
  })
}

export async function exportElementToPdfLandscape(element: HTMLElement, titleForFilename: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])

  await document.fonts?.ready?.catch(() => undefined)

  const rawW = Math.max(1, Math.floor(element.offsetWidth))
  const rawH = Math.max(1, Math.floor(element.offsetHeight))
  /** Most engines allow ~8k per side; stay under to avoid blank / failed raster. */
  const MAX_EDGE = 4096
  const scale = Math.min(2, MAX_EDGE / rawW, MAX_EDGE / rawH)

  let canvas: HTMLCanvasElement
  try {
    canvas = await renderToCanvas(html2canvas, element, scale)
  } catch (first) {
    console.warn('plotmapper: html2canvas (primary) failed, retrying scale=1', first)
    try {
      canvas = await renderToCanvas(html2canvas, element, 1)
    } catch (second) {
      console.warn('plotmapper: html2canvas (fallback) failed, retrying foreignObjectRendering', second)
      canvas = await renderToCanvas(html2canvas, element, 1, { foreignObjectRendering: true })
    }
  }

  let imgData: string
  let fmt: 'JPEG' | 'PNG' = 'JPEG'
  try {
    imgData = canvas.toDataURL('image/jpeg', 0.92)
  } catch {
    try {
      fmt = 'PNG'
      imgData = canvas.toDataURL('image/png')
    } catch (e) {
      throw new Error(
        'Could not read the page snapshot (often caused by cross-origin images or fonts). Try another browser or temporarily simplify the board.',
        { cause: e },
      )
    }
  }

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const margin = 8
  const maxW = pageW - 2 * margin
  const maxH = pageH - 2 * margin

  const props = pdf.getImageProperties(imgData)
  const iw = props.width
  const ih = props.height
  const aspect = iw / ih
  let dw = maxW
  let dh = dw / aspect
  if (dh > maxH) {
    dh = maxH
    dw = dh * aspect
  }
  const x = margin + (maxW - dw) / 2
  const y = margin + (maxH - dh) / 2
  pdf.addImage(imgData, fmt, x, y, dw, dh)

  const base = titleForFilename.trim() || 'plotmapper'
  const slug = base
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 96)
  pdf.save(`${slug || 'plotmapper'}.pdf`)
}
