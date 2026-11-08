import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { cx } from '@/shared/lib/cx'
import { Button, IconButton } from './Button'
import { CloseIcon } from './icons'
import styles from './Toast.module.css'
import { ToastContext, type ToastOptions } from './toastContext'

interface Toast extends ToastOptions {
  id: number
}

const DURATION = { info: 5000, error: 8000 } as const

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const show = useCallback((toast: ToastOptions) => {
    nextId.current += 1
    const id = nextId.current
    // Newest last, at most three: a burst of errors shouldn't bury the page.
    setToasts((current) => [...current, { ...toast, id }].slice(-3))
  }, [])

  return (
    <ToastContext value={show}>
      {children}
      {/* The live region exists before any toast, so screen readers announce each one added. */}
      <section className={styles.region} aria-label="Notifications">
        <ol className={styles.list} aria-live="polite" aria-relevant="additions">
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
          ))}
        </ol>
      </section>
    </ToastContext>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const { id, message, tone = 'info', action } = toast
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const timer = setTimeout(() => onDismiss(id), DURATION[tone])
    return () => clearTimeout(timer)
  }, [id, tone, paused, onDismiss])

  return (
    // Hovering or focusing a toast keeps it open long enough to read or use its action.
    // Hover is a mouse convenience; keyboard users get the same through focus.
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <li
      className={cx(styles.toast, tone === 'error' && styles.error)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <p className={styles.message}>{message}</p>
      {action && (
        <Button
          variant="primary"
          onClick={() => {
            action.onClick()
            onDismiss(id)
          }}
        >
          {action.label}
        </Button>
      )}
      <IconButton label="Dismiss notification" icon={<CloseIcon />} onClick={() => onDismiss(id)} />
    </li>
  )
}
