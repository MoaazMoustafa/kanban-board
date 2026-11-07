import { describe, expect, it } from 'vitest'
import { keyboardTarget } from './keyboard'
import type { MeasuredContainer } from './types'

function column(id: string, left: number, itemIds: string[]): MeasuredContainer {
  return {
    id,
    axis: 'vertical',
    rect: { left, top: 0, width: 100, height: 500 },
    items: itemIds.map((itemId, i) => ({
      id: itemId,
      rect: { left, top: i * 50, width: 100, height: 40 },
    })),
  }
}

// Registered out of visual order on purpose: neighbours must follow position, not registration.
const containers = [
  column('done', 400, ['e']),
  column('todo', 0, ['a', 'b', 'c']),
  column('doing', 200, []),
]

describe('keyboardTarget', () => {
  it.each([
    ['ArrowDown', 0, 1],
    ['ArrowUp', 1, 0],
    ['ArrowUp', 0, 0],
    ['ArrowDown', 2, 2], // 'a' is active, so there are 2 others: the last index is 2
  ])('%s from index %i in the same column gives %i', (key, index, expected) => {
    expect(keyboardTarget(key, { containerId: 'todo', index }, containers, 'a')).toEqual({
      containerId: 'todo',
      index: expected,
    })
  })

  it('moves to the neighbouring column by position, keeping the index when possible', () => {
    expect(
      keyboardTarget('ArrowRight', { containerId: 'todo', index: 1 }, containers, 'a'),
    ).toEqual(
      { containerId: 'doing', index: 0 }, // empty column: clamped to 0
    )
    expect(
      keyboardTarget('ArrowRight', { containerId: 'doing', index: 0 }, containers, 'a'),
    ).toEqual({ containerId: 'done', index: 0 })
    expect(keyboardTarget('ArrowLeft', { containerId: 'done', index: 1 }, containers, 'a')).toEqual(
      {
        containerId: 'doing',
        index: 0,
      },
    )
  })

  it('stays put at the outermost columns', () => {
    const start = { containerId: 'todo', index: 0 }
    expect(keyboardTarget('ArrowLeft', start, containers, 'a')).toBe(start)
  })

  it('ignores other keys', () => {
    const start = { containerId: 'todo', index: 0 }
    expect(keyboardTarget('KeyX', start, containers, 'a')).toBe(start)
  })

  it('uses Left/Right along a horizontal container', () => {
    const row: MeasuredContainer = {
      id: 'row',
      axis: 'horizontal',
      rect: { left: 0, top: 0, width: 300, height: 100 },
      items: ['x', 'y', 'z'].map((id, i) => ({
        id,
        rect: { left: i * 100, top: 0, width: 90, height: 100 },
      })),
    }
    expect(keyboardTarget('ArrowRight', { containerId: 'row', index: 0 }, [row], 'x')).toEqual({
      containerId: 'row',
      index: 1,
    })
    expect(keyboardTarget('ArrowDown', { containerId: 'row', index: 0 }, [row], 'x')).toEqual({
      containerId: 'row',
      index: 0,
    })
  })
})
