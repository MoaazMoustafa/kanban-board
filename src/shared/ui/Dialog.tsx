import { useEffect, useId, useRef, type ReactNode } from 'react'
import { IconButton } from './Button'
import styles from './Dialog.module.css'
import { CloseIcon } from './icons'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

/**
 * Modal built on the native <dialog> element. `showModal()` gives us, for free:
 * a focus trap (the rest of the page becomes inert), Escape to close, a ::backdrop,
 * and rendering in the top layer, above every z-index.
 *
 * React stays the source of truth: `open` drives the element, and every way of closing
 * (Escape, backdrop click, close button) goes through `onClose`.
 */
export function Dialog({ open, onClose, title, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog || !open) return

    // Return focus to whatever opened the dialog, if it still exists.
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialog.showModal()
    return () => {
      dialog.close()
      if (opener?.isConnected) opener.focus()
    }
  }, [open])

  return (
    // Clicking the backdrop is a mouse convenience; keyboard users have Escape and the close button.
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        // Escape: let React decide whether to close, instead of the browser closing it behind our back.
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      {open && (
        <>
          <header className={styles.header}>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            <IconButton label="Close" icon={<CloseIcon />} onClick={onClose} />
          </header>
          <div className={styles.body}>{children}</div>
        </>
      )}
    </dialog>
  )
}
