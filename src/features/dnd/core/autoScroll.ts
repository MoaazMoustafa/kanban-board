import { containsPoint } from './geometry'
import type { Point, Rect } from './types'

export interface AutoScrollOptions {
  /** Distance from an edge (px) where scrolling starts. */
  threshold?: number
  /** Scroll speed (px per frame) with the pointer right at the edge. */
  maxSpeed?: number
}

/** Speed for a pointer `distance` px inside an edge: 0 outside the threshold, ramping up to maxSpeed. */
function edgeSpeed(distance: number, threshold: number, maxSpeed: number): number {
  if (distance >= threshold) return 0
  const closeness = 1 - Math.max(distance, 0) / threshold
  return Math.ceil(maxSpeed * closeness * closeness)
}

/** How far to scroll a container this frame, given the pointer position. Pure, so it is easy to test. */
export function autoScrollDelta(
  point: Point,
  rect: Rect,
  { threshold = 56, maxSpeed = 20 }: AutoScrollOptions = {},
): Point {
  if (!containsPoint(rect, point)) return { x: 0, y: 0 }
  const t = Math.min(threshold, rect.width / 3, rect.height / 3)

  const x =
    edgeSpeed(rect.left + rect.width - point.x, t, maxSpeed) -
    edgeSpeed(point.x - rect.left, t, maxSpeed)
  const y =
    edgeSpeed(rect.top + rect.height - point.y, t, maxSpeed) -
    edgeSpeed(point.y - rect.top, t, maxSpeed)

  return { x, y }
}
