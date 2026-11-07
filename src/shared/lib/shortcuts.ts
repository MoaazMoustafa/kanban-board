export type HistoryShortcut = 'undo' | 'redo'

/**
 * Matches Ctrl/Cmd+Z (undo), Ctrl/Cmd+Shift+Z and Ctrl+Y (redo).
 *
 * `event.key` follows the user's layout, so it handles AZERTY or Dvorak. On non-Latin layouts
 * (e.g. Arabic) `key` isn't a letter at all, so we fall back to the physical key (`code`).
 */
export function matchHistoryShortcut(
  event: Pick<KeyboardEvent, 'key' | 'code' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>,
): HistoryShortcut | null {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return null

  const isLatin = /^[a-z]$/i.test(event.key)
  const letter = isLatin ? event.key.toLowerCase() : event.code.replace(/^Key/, '').toLowerCase()

  if (letter === 'z') return event.shiftKey ? 'redo' : 'undo'
  if (letter === 'y' && !event.shiftKey) return 'redo'
  return null
}

/** Typing targets keep their own native undo. */
export function isEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || target.matches('input, textarea, select'))
  )
}
