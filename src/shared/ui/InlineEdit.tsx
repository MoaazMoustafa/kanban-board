import { useEffect, useRef, useState } from 'react'
import { cx } from '@/shared/lib/cx'
import styles from './InlineEdit.module.css'

interface InlineEditProps {
  value: string
  onSave: (value: string) => void
  /** Accessible label for the input, e.g. "Column title". */
  label: string
  /** aria-describedby for the text button, e.g. extra keyboard instructions. */
  describedBy?: string | undefined
  className?: string
}

/**
 * Click-to-edit text. Enter or blur saves, Escape cancels.
 * After Enter/Escape focus returns to the text button; after a blur it stays wherever
 * the user clicked, so we never steal focus back.
 */
export function InlineEdit({ value, onSave, label, describedBy, className }: InlineEditProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const restoreFocus = useRef(false)
  const editing = draft !== null

  useEffect(() => {
    if (editing) {
      inputRef.current?.select()
    } else if (restoreFocus.current) {
      restoreFocus.current = false
      buttonRef.current?.focus()
    }
  }, [editing])

  function finish(save: boolean, returnFocus: boolean) {
    if (draft === null) return
    if (save && draft.trim() && draft.trim() !== value) onSave(draft.trim())
    restoreFocus.current = returnFocus
    setDraft(null)
  }

  if (!editing) {
    return (
      <button
        ref={buttonRef}
        type="button"
        className={cx(styles.display, className)}
        title={`Edit ${label.toLowerCase()}`}
        aria-describedby={describedBy}
        onClick={() => setDraft(value)}
      >
        {value}
      </button>
    )
  }

  return (
    <input
      ref={inputRef}
      className={cx(styles.input, className)}
      aria-label={label}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => finish(true, false)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          // Without this, the same keypress would "click" the button we move focus back to,
          // reopening the editor immediately.
          event.preventDefault()
          finish(true, true)
        }
        if (event.key === 'Escape') finish(false, true)
      }}
    />
  )
}
