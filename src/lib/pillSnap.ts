/** Top band of each card (fraction of card height) used as invisible snap target for floating pills. */
const SNAP_HEIGHT_FR = 0.34
const SNAP_MIN_PX = 16
const SNAP_MAX_PX = 40

export function findPillSnapCardId(clientX: number, clientY: number): string | null {
  for (const el of document.elementsFromPoint(clientX, clientY)) {
    const shell = el.closest('[data-pill-snap-card]')
    if (!(shell instanceof HTMLElement)) continue
    const id = shell.getAttribute('data-pill-snap-card')
    if (!id) continue
    const r = shell.getBoundingClientRect()
    const band = Math.min(SNAP_MAX_PX, Math.max(SNAP_MIN_PX, r.height * SNAP_HEIGHT_FR))
    if (
      clientX >= r.left &&
      clientX <= r.right &&
      clientY >= r.top &&
      clientY <= r.top + band
    ) {
      return id
    }
  }
  return null
}
