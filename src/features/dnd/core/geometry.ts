import type { Axis, Point, Rect } from './types'

export const toRect = ({ left, top, width, height }: Rect): Rect => ({ left, top, width, height })

export const rectStart = (rect: Rect, axis: Axis) => (axis === 'vertical' ? rect.top : rect.left)
export const rectSize = (rect: Rect, axis: Axis) => (axis === 'vertical' ? rect.height : rect.width)
export const rectMid = (rect: Rect, axis: Axis) => rectStart(rect, axis) + rectSize(rect, axis) / 2
export const pointOn = (point: Point, axis: Axis) => (axis === 'vertical' ? point.y : point.x)

export function shiftRect(rect: Rect, axis: Axis, delta: number): Rect {
  return axis === 'vertical'
    ? { ...rect, top: rect.top + delta }
    : { ...rect, left: rect.left + delta }
}

export function containsPoint(rect: Rect, point: Point): boolean {
  return (
    point.x >= rect.left &&
    point.x <= rect.left + rect.width &&
    point.y >= rect.top &&
    point.y <= rect.top + rect.height
  )
}

/** Distance from a point to the nearest edge of a rect; 0 when the point is inside. */
export function distanceToRect(point: Point, rect: Rect): number {
  const dx = Math.max(rect.left - point.x, 0, point.x - (rect.left + rect.width))
  const dy = Math.max(rect.top - point.y, 0, point.y - (rect.top + rect.height))
  return Math.hypot(dx, dy)
}

export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
