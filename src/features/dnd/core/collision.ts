import { distanceToRect, pointOn, rectMid, rectSize, rectStart, shiftRect } from './geometry'
import type { DropTarget, MeasuredContainer, MeasuredItem, Point } from './types'

/**
 * The container's items laid out as if the active item were not in it: items after the active
 * one move back by the active item's slot (its size plus the gap to the next item).
 *
 * Computing targets against this collapsed layout makes the result independent of where the
 * live preview currently shows the active item, so the target cannot flip back and forth.
 */
export function collapseActive(container: MeasuredContainer, activeId: string): MeasuredItem[] {
  const { axis, items } = container
  const activeIndex = items.findIndex((item) => item.id === activeId)
  const active = items[activeIndex]
  if (!active) return [...items]

  const next = items[activeIndex + 1]
  const slot = next
    ? rectStart(next.rect, axis) - rectStart(active.rect, axis)
    : rectSize(active.rect, axis)

  return items.flatMap((item, i) => {
    if (i === activeIndex) return []
    if (i < activeIndex) return [item]
    return [{ id: item.id, rect: shiftRect(item.rect, axis, -slot) }]
  })
}

/** The container under the pointer, or the nearest one when the pointer is between containers. */
export function findClosestContainer(
  point: Point,
  containers: readonly MeasuredContainer[],
): MeasuredContainer | undefined {
  let best: MeasuredContainer | undefined
  let bestDistance = Infinity
  for (const container of containers) {
    const d = distanceToRect(point, container.rect)
    if (d < bestDistance) {
      best = container
      bestDistance = d
    }
  }
  return best
}

/**
 * Picks the container closest to the pointer, then the index among its other items:
 * the number of items whose midpoint lies before the pointer on the container's axis.
 */
export function computeDropTarget(
  point: Point,
  containers: readonly MeasuredContainer[],
  activeId: string,
): DropTarget | null {
  const container = findClosestContainer(point, containers)
  if (!container) return null

  const position = pointOn(point, container.axis)
  const index = collapseActive(container, activeId).filter(
    (item) => rectMid(item.rect, container.axis) < position,
  ).length

  return { containerId: container.id, index }
}

export function sameTarget(a: DropTarget | null, b: DropTarget | null): boolean {
  return a?.containerId === b?.containerId && a?.index === b?.index
}
