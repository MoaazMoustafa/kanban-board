import { describe, expect, it } from 'vitest'
import { autoScrollDelta } from './autoScroll'

const rect = { left: 0, top: 0, width: 1000, height: 600 }

describe('autoScrollDelta', () => {
  it('does not scroll in the middle', () => {
    expect(autoScrollDelta({ x: 500, y: 300 }, rect)).toEqual({ x: 0, y: 0 })
  })

  it('scrolls toward the nearest edge, faster closer to it', () => {
    const near = autoScrollDelta({ x: 995, y: 300 }, rect)
    const far = autoScrollDelta({ x: 960, y: 300 }, rect)
    expect(near.x).toBeGreaterThan(far.x)
    expect(far.x).toBeGreaterThan(0)
    expect(autoScrollDelta({ x: 5, y: 300 }, rect).x).toBeLessThan(0)
    expect(autoScrollDelta({ x: 500, y: 595 }, rect).y).toBeGreaterThan(0)
  })

  it('never exceeds maxSpeed', () => {
    expect(autoScrollDelta({ x: 1000, y: 300 }, rect, { maxSpeed: 10 }).x).toBe(10)
  })

  it('does not scroll when the pointer is outside', () => {
    expect(autoScrollDelta({ x: 1200, y: 300 }, rect)).toEqual({ x: 0, y: 0 })
  })
})
