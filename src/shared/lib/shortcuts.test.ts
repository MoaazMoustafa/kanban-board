import { describe, expect, it } from 'vitest'
import { isEditableTarget, matchHistoryShortcut } from './shortcuts'

const key = (value: string, code: string, mods: Partial<KeyboardEvent> = {}) => ({
  key: value,
  code,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  altKey: false,
  ...mods,
})

describe('matchHistoryShortcut', () => {
  it.each([
    ['Ctrl+Z', key('z', 'KeyZ', { ctrlKey: true }), 'undo'],
    ['Cmd+Z', key('z', 'KeyZ', { metaKey: true }), 'undo'],
    ['Ctrl+Shift+Z', key('Z', 'KeyZ', { ctrlKey: true, shiftKey: true }), 'redo'],
    ['Ctrl+Y', key('y', 'KeyY', { ctrlKey: true }), 'redo'],
    ['AZERTY Ctrl+Z (physical W key)', key('z', 'KeyW', { ctrlKey: true }), 'undo'],
    ['Arabic layout Ctrl+Z', key('ئ', 'KeyZ', { ctrlKey: true }), 'undo'],
  ])('%s', (_, event, expected) => {
    expect(matchHistoryShortcut(event)).toBe(expected)
  })

  it.each([
    ['plain Z', key('z', 'KeyZ')],
    ['Ctrl+Alt+Z', key('z', 'KeyZ', { ctrlKey: true, altKey: true })],
    ['Ctrl+X', key('x', 'KeyX', { ctrlKey: true })],
    // On AZERTY, the physical Z key types "w": that is Ctrl+W, not undo.
    ['AZERTY Ctrl+W (physical Z key)', key('w', 'KeyZ', { ctrlKey: true })],
  ])('ignores %s', (_, event) => {
    expect(matchHistoryShortcut(event)).toBeNull()
  })
})

describe('isEditableTarget', () => {
  it('detects text fields', () => {
    expect(isEditableTarget(document.createElement('input'))).toBe(true)
    expect(isEditableTarget(document.createElement('textarea'))).toBe(true)
    expect(isEditableTarget(document.createElement('button'))).toBe(false)
    expect(isEditableTarget(null)).toBe(false)
  })
})
