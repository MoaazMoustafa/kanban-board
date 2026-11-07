import type { Rect } from './core/types'
import { MOTION, prefersReducedMotion } from './dom'

export interface Overlay {
  moveTo: (left: number, top: number) => void
  /** Animates to `rect` (where the item landed), resolving when done. */
  settleTo: (rect: Rect | undefined) => Promise<void>
  destroy: () => void
}

const transformFor = (p: { left: number; top: number }) => `translate3d(${p.left}px, ${p.top}px, 0)`

/**
 * The floating copy that follows the pointer. It is a DOM clone managed outside React:
 * moving it is a single style write per frame and never triggers a React render, and a clone
 * looks exactly like the original without the component having to support an "overlay mode".
 */
export function createOverlay(source: HTMLElement, rect: Rect): Overlay {
  const node = document.createElement('div')
  node.dataset['dndOverlay'] = ''
  node.setAttribute('aria-hidden', 'true')
  node.inert = true
  node.style.width = `${rect.width}px`
  node.style.height = `${rect.height}px`

  const clone = source.cloneNode(true) as HTMLElement
  // A clone must not duplicate IDs (aria-labelledby, label/for) that live in the real element.
  for (const el of [clone, ...clone.querySelectorAll<HTMLElement>('[id]')]) el.removeAttribute('id')
  clone.removeAttribute('data-dnd-active')
  node.append(clone)
  document.body.append(node)

  let current = { left: rect.left, top: rect.top }

  const moveTo = (left: number, top: number) => {
    current = { left, top }
    node.style.transform = transformFor(current)
  }
  moveTo(rect.left, rect.top)

  return {
    moveTo,
    async settleTo(target) {
      if (!target || prefersReducedMotion()) return
      node.dataset['dndOverlay'] = 'settling'
      const animation = node.animate(
        [{ transform: transformFor(current) }, { transform: transformFor(target) }],
        { ...MOTION, fill: 'forwards' },
      )
      await animation.finished.catch(() => undefined)
    },
    destroy: () => node.remove(),
  }
}
