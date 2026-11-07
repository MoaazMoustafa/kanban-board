import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Button, IconButton } from '@/shared/ui/Button'
import { CloseIcon, PlusIcon } from '@/shared/ui/icons'
import { useBoardActions } from '../../store/hooks'
import styles from './AddColumnForm.module.css'

export function AddColumnForm() {
  const actions = useBoardActions()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const wasOpen = useRef(false)

  useEffect(() => {
    if (open) inputRef.current?.focus()
    else if (wasOpen.current) toggleRef.current?.focus()
    wasOpen.current = open
  }, [open])

  function close() {
    setOpen(false)
    setTitle('')
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!title.trim()) return
    actions.addColumn({ title })
    close()
  }

  if (!open) {
    return (
      <Button ref={toggleRef} className={styles.toggle} onClick={() => setOpen(true)}>
        <PlusIcon />
        Add a column
      </Button>
    )
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <input
        ref={inputRef}
        onBlur={(event) => {
          // Clicking away from an empty composer closes it; a half-typed title is kept.
          if (!event.currentTarget.form?.contains(event.relatedTarget) && !title.trim()) close()
        }}
        className={styles.input}
        aria-label="New column title"
        placeholder="Column title…"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') close()
        }}
      />
      <div className={styles.actions}>
        <Button type="submit" variant="primary" disabled={!title.trim()}>
          Add column
        </Button>
        <IconButton label="Cancel adding column" icon={<CloseIcon />} onClick={close} />
      </div>
    </form>
  )
}
