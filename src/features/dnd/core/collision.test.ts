import { describe, expect, it } from 'vitest'
import { collapseActive, computeDropTarget, findClosestContainer } from './collision'
import type { MeasuredContainer, Rect } from './types'

const rect = (left: number, top: number, width: number, height: number): Rect => ({
  left,
  top,
  width,
  height,
})

/** A vertical column at x=`left` with 40px-tall items and 10px gaps, starting at y=0. */
function column(id: string, left: number, itemIds: string[]): MeasuredContainer {
  return {
    id,
    axis: 'vertical',
    rect: rect(left, 0, 100, Math.max(itemIds.length * 50, 10)),
    items: itemIds.map((itemId, i) => ({ id: itemId, rect: rect(left, i * 50, 100, 40) })),
  }
}

describe('collapseActive', () => {
  it('removes the active item and closes its gap', () => {
    const items = collapseActive(column('c', 0, ['a', 'b', 'c']), 'a')
    expect(items.map((item) => [item.id, item.rect.top])).toEqual([
      ['b', 0],
      ['c', 50],
    ])
  })

  it('leaves containers without the active item untouched', () => {
    expect(collapseActive(column('c', 0, ['a', 'b']), 'x').map((item) => item.id)).toEqual([
      'a',
      'b',
    ])
  })

  it('works for the last item', () => {
    expect(collapseActive(column('c', 0, ['a', 'b']), 'b').map((item) => item.id)).toEqual(['a'])
  })
})

describe('findClosestContainer', () => {
  const containers = [column('left', 0, ['a']), column('right', 200, ['b'])]

  it('returns the container under the pointer', () => {
    expect(findClosestContainer({ x: 250, y: 10 }, containers)?.id).toBe('right')
  })

  it('returns the nearest container when the pointer is in a gap', () => {
    expect(findClosestContainer({ x: 120, y: 10 }, containers)?.id).toBe('left')
    expect(findClosestContainer({ x: 180, y: 10 }, containers)?.id).toBe('right')
  })

  it('returns the nearest container when the pointer is below a short one', () => {
    expect(findClosestContainer({ x: 50, y: 900 }, containers)?.id).toBe('left')
  })

  it('returns undefined when there are no containers', () => {
    expect(findClosestContainer({ x: 0, y: 0 }, [])).toBeUndefined()
  })
})

describe('computeDropTarget', () => {
  const todo = column('todo', 0, ['a', 'b', 'c'])
  const done = column('done', 200, ['d'])

  it.each([
    [5, 0],
    [30, 1], // past b's midpoint in the collapsed layout (b now at 0–40)
    [75, 2],
    [500, 2],
  ])('within the same column: pointer y=%i gives index %i', (y, index) => {
    expect(computeDropTarget({ x: 50, y }, [todo, done], 'a')).toEqual({
      containerId: 'todo',
      index,
    })
  })

  it('targets another column', () => {
    expect(computeDropTarget({ x: 250, y: 5 }, [todo, done], 'a')).toEqual({
      containerId: 'done',
      index: 0,
    })
    expect(computeDropTarget({ x: 250, y: 30 }, [todo, done], 'a')).toEqual({
      containerId: 'done',
      index: 1,
    })
  })

  it('targets index 0 of an empty container', () => {
    expect(computeDropTarget({ x: 250, y: 5 }, [todo, column('done', 200, [])], 'a')).toEqual({
      containerId: 'done',
      index: 0,
    })
  })

  it('is stable no matter where the preview has placed the active item', () => {
    // The same items, but the preview has moved 'a' to the end of the column.
    const previewed = column('todo', 0, ['b', 'c', 'a'])
    for (const y of [5, 30, 75, 500]) {
      expect(computeDropTarget({ x: 50, y }, [previewed], 'a')).toEqual(
        computeDropTarget({ x: 50, y }, [todo], 'a'),
      )
    }
  })

  it('works on a horizontal axis', () => {
    const row: MeasuredContainer = {
      id: 'row',
      axis: 'horizontal',
      rect: rect(0, 0, 330, 100),
      items: ['x', 'y', 'z'].map((id, i) => ({ id, rect: rect(i * 110, 0, 100, 100) })),
    }
    expect(computeDropTarget({ x: 300, y: 50 }, [row], 'x')).toEqual({
      containerId: 'row',
      index: 2,
    })
  })

  it('returns null without containers', () => {
    expect(computeDropTarget({ x: 0, y: 0 }, [], 'a')).toBeNull()
  })
})
