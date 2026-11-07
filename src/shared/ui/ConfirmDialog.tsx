import type { ReactNode } from 'react'
import { Button } from './Button'
import { Dialog } from './Dialog'
import styles from './ConfirmDialog.module.css'

interface ConfirmDialogProps {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onCancel} title={title}>
      <div className={styles.message}>{children}</div>
      <div className={styles.actions}>
        {/* Safe choice first, so it gets focus when the dialog opens. */}
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="dangerSolid" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  )
}
