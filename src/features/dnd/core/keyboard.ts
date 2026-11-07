import { collapseActive } from './collision'
import { rectStart } from './geometry'
import type { DropTarget, MeasuredContainer } from './types'

type Step = { kind: 'index'; delta: -1 | 1 } | { kind: 'container'; delta: -1 | 1 }

/**
 * Arrow keys along a container's axis move within it; the other two arrows move to the
 * neighbouring container (e.g. Up/Down within a column, Left/Right between columns).
 */
function stepFor(key: string, axis: MeasuredContainer['axis']): Step | null {
  const along = axis === 'vertical' ? ['ArrowUp', 'ArrowDown'] : ['ArrowLeft', 'ArrowRight']
  const across = axis === 'vertical' ? ['ArrowLeft', 'ArrowRight'] : ['ArrowUp', 'ArrowDown']
  if (key === along[0]) return { kind: 'index', delta: -1 }
  if (key === along[1]) return { kind: 'index', delta: 1 }
  if (key === across[0]) return { kind: 'container', delta: -1 }
  if (key === across[1]) return { kind: 'container', delta: 1 }
  return null
}

/** The target after pressing `key`, or the current target when the key doesn't move anything. */
export function keyboardTarget(
  key: string,
  current: DropTarget,
  containers: readonly MeasuredContainer[],
  activeId: string,
): DropTarget {
  const container = containers.find((c) => c.id === current.containerId)
  if (!container) return current
  const step = stepFor(key, container.axis)
  if (!step) return current

  // Index bound: the number of *other* items, so the last position is "after all of them".
  const maxIndex = (c: MeasuredContainer) => collapseActive(c, activeId).length

  if (step.kind === 'index') {
    const index = Math.min(Math.max(current.index + step.delta, 0), maxIndex(container))
    return index === current.index ? current : { containerId: container.id, index }
  }

  // Neighbouring containers, ordered by position across the axis (columns left to right).
  const crossAxis = container.axis === 'vertical' ? 'horizontal' : 'vertical'
  const siblings = containers
    .filter((c) => c.axis === container.axis)
    .toSorted((a, b) => rectStart(a.rect, crossAxis) - rectStart(b.rect, crossAxis))
  const next = siblings[siblings.indexOf(container) + step.delta]
  if (!next) return current

  return { containerId: next.id, index: Math.min(current.index, maxIndex(next)) }
}
