import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Button, IconButton } from '@/shared/ui/Button'
import { CloseIcon, PlusIcon } from '@/shared/ui/icons'
import type { ColumnId } from '../../model/types'
import { useBoardActions } from '../../store/hooks'
import styles from './AddCardForm.module.css'

interface AddCardFormProps {
  columnId: ColumnId
  columnTitle: string
  onAdded?: () => void
}

/**
 * Collapsed "Add a card" button that expands into a composer.
 * Enter adds and keeps the composer open for rapid entry; Shift+Enter adds a newline;
 * Escape closes and returns focus to the button.
 */
export function AddCardForm({ columnId, columnTitle, onAdded }: AddCardFormProps) {
  const actions = useBoardActions()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const wasOpen = useRef(false)

  useEffect(() => {
    if (open) textareaRef.current?.focus()
    else if (wasOpen.current) toggleRef.current?.focus()
    wasOpen.current = open
  }, [open])

  function close() {
    setOpen(false)
    setTitle('')
  }

  function submit(event?: FormEvent) {
    event?.preventDefault()
    if (!title.trim()) return
    actions.addCard({ columnId, title })
    setTitle('')
    textareaRef.current?.focus()
    onAdded?.()
  }

  if (!open) {
    return (
      <Button
        ref={toggleRef}
        className={styles.toggle}
        // Every column has this button, so the label names the column. It starts with the visible text.
        aria-label={`Add a card to ${columnTitle}`}
        onClick={() => setOpen(true)}
      >
        <PlusIcon />
        Add a card
      </Button>
    )
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <textarea
        ref={textareaRef}
        onBlur={(event) => {
          // Clicking away from an empty composer closes it; a half-typed title is kept.
          if (!event.currentTarget.form?.contains(event.relatedTarget) && !title.trim()) close()
        }}
        className={styles.input}
        aria-label={`New card title in ${columnTitle}`}
        placeholder="Enter a title…"
        rows={2}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) submit(event)
          if (event.key === 'Escape') close()
        }}
      />
      <div className={styles.actions}>
        <Button type="submit" variant="primary" disabled={!title.trim()}>
          Add card
        </Button>
        <IconButton label="Cancel adding card" icon={<CloseIcon />} onClick={close} />
      </div>
    </form>
  )
}
