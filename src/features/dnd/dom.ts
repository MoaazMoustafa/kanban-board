import type { Axis, Rect } from './core/types'

/**
 * An item's layout position in viewport coordinates, ignoring CSS transforms.
 *
 * getBoundingClientRect() includes transforms, so it would report in-flight FLIP animations
 * instead of where items actually are. offsetTop/offsetLeft ignore transforms, so we combine
 * them with the container's position. Requires the container to be the item's offsetParent
 * (give it `position: relative`).
 */
export function measureLayoutRect(
  item: HTMLElement,
  container: HTMLElement,
  containerRect: Rect,
): Rect {
  if (import.meta.env.DEV && item.offsetParent !== container) {
    console.warn(
      '[dnd] Sortable containers need `position: relative` for accurate measuring.',
      container,
    )
  }
  return {
    left: containerRect.left + container.clientLeft + item.offsetLeft - container.scrollLeft,
    top: containerRect.top + container.clientTop + item.offsetTop - container.scrollTop,
    width: item.offsetWidth,
    height: item.offsetHeight,
  }
}

function isScrollable(element: HTMLElement): boolean {
  const { overflowX, overflowY } = getComputedStyle(element)
  return /auto|scroll/.test(overflowX + overflowY)
}

/** The element itself (if it scrolls) and every scrolling ancestor, nearest first. */
export function getScrollableAncestors(element: HTMLElement): HTMLElement[] {
  const result: HTMLElement[] = []
  for (let node: HTMLElement | null = element; node; node = node.parentElement) {
    if (isScrollable(node)) result.push(node)
  }
  return result
}

export function canScroll(element: HTMLElement, axis: Axis): boolean {
  const style = getComputedStyle(element)
  const overflow = axis === 'vertical' ? style.overflowY : style.overflowX
  if (!/auto|scroll/.test(overflow)) return false
  return axis === 'vertical'
    ? element.scrollHeight > element.clientHeight
    : element.scrollWidth > element.clientWidth
}

export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export const MOTION = { duration: 180, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' } as const
