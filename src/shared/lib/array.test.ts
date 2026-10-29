import { describe, expect, it } from 'vitest'
import { arrayMove, clamp, insertAt, removeAt } from './array'

describe('clamp', () => {
  it('keeps values inside the range', () => {
    expect(clamp(-1, 0, 5)).toBe(0)
    expect(clamp(3, 0, 5)).toBe(3)
    expect(clamp(9, 0, 5)).toBe(5)
  })
})

describe('insertAt', () => {
  it('inserts at the start, middle and end', () => {
    expect(insertAt(['a', 'b'], 0, 'x')).toEqual(['x', 'a', 'b'])
    expect(insertAt(['a', 'b'], 1, 'x')).toEqual(['a', 'x', 'b'])
    expect(insertAt(['a', 'b'], 2, 'x')).toEqual(['a', 'b', 'x'])
  })

  it('clamps out-of-range indexes', () => {
    expect(insertAt(['a'], -5, 'x')).toEqual(['x', 'a'])
    expect(insertAt(['a'], 99, 'x')).toEqual(['a', 'x'])
  })

  it('does not mutate the input', () => {
    const input = Object.freeze(['a', 'b'])
    insertAt(input, 1, 'x')
    expect(input).toEqual(['a', 'b'])
  })
})

describe('removeAt', () => {
  it('removes the element at the index', () => {
    expect(removeAt(['a', 'b', 'c'], 1)).toEqual(['a', 'c'])
  })

  it('returns a copy for out-of-range indexes', () => {
    expect(removeAt(['a'], 3)).toEqual(['a'])
  })
})

describe('arrayMove', () => {
  it.each([
    [0, 2, ['b', 'c', 'a', 'd']],
    [3, 0, ['d', 'a', 'b', 'c']],
    [1, 1, ['a', 'b', 'c', 'd']],
    [1, 99, ['a', 'c', 'd', 'b']],
    [2, -1, ['c', 'a', 'b', 'd']],
  ])('moves index %i to %i', (from, to, expected) => {
    expect(arrayMove(['a', 'b', 'c', 'd'], from, to)).toEqual(expected)
  })

  it('returns a copy when `from` is out of range', () => {
    expect(arrayMove(['a', 'b'], 5, 0)).toEqual(['a', 'b'])
  })
})
