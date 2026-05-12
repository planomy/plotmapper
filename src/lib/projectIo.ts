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
