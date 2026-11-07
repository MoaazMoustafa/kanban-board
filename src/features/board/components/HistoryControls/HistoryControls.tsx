import { useEffect, useEffectEvent, useState } from 'react'
import { useDragState } from '@/features/dnd'
import { isEditableTarget, matchHistoryShortcut } from '@/shared/lib/shortcuts'
import { IconButton } from '@/shared/ui/Button'
import { RedoIcon, UndoIcon } from '@/shared/ui/icons'
import { VisuallyHidden } from '@/shared/ui/VisuallyHidden'
import { useBoardHistory } from '../../store/hooks'
import styles from './HistoryControls.module.css'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent)
const UNDO_KEYS = isMac ? '⌘Z' : 'Ctrl+Z'
const REDO_KEYS = isMac ? '⇧⌘Z' : 'Ctrl+Shift+Z'

/** Undo/redo buttons plus their keyboard shortcuts, with screen-reader announcements. */
export function HistoryControls() {
  const { undoLabel, redoLabel, undo, redo } = useBoardHistory()
  const { status } = useDragState()
  const [announcement, setAnnouncement] = useState('')

  function announce(message: string) {
    // Repeating the same text must still be announced, so alternate a trailing space.
    setAnnouncement((previous) => (previous === message ? `${message} ` : message))
  }

  function handleUndo() {
    if (!undoLabel) return
    undo()
    announce(`Undid: ${undoLabel}.`)
  }

  function handleRedo() {
    if (!redoLabel) return
    redo()
    announce(`Redid: ${redoLabel}.`)
  }

  // An Effect Event always sees the latest props/state, so the listener never needs re-adding.
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const shortcut = matchHistoryShortcut(event)
    if (!shortcut || event.defaultPrevented) return
    // Text fields keep their own undo; a modal dialog and an active drag own the keyboard.
    // ('dropping' is fine: the drop is already committed, only its landing animation remains.)
    if (isEditableTarget(event.target) || status === 'dragging') return
    if (event.target instanceof Element && event.target.closest('dialog')) return

    event.preventDefault()
    if (shortcut === 'undo') handleUndo()
    else handleRedo()
  })

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className={styles.controls}>
      {/* aria-disabled instead of disabled: a disabled button would drop keyboard focus
          the moment the last step is undone. */}
      <IconButton
        label="Undo"
        title={undoLabel ? `Undo: ${undoLabel} (${UNDO_KEYS})` : 'Nothing to undo'}
        icon={<UndoIcon />}
        aria-disabled={!undoLabel}
        onClick={handleUndo}
      />
      <IconButton
        label="Redo"
        title={redoLabel ? `Redo: ${redoLabel} (${REDO_KEYS})` : 'Nothing to redo'}
        icon={<RedoIcon />}
        aria-disabled={!redoLabel}
        onClick={handleRedo}
      />
      <VisuallyHidden aria-live="polite" aria-atomic="true">
        {announcement}
      </VisuallyHidden>
    </div>
  )
}
