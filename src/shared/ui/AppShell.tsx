import type { ReactNode } from 'react'
import styles from './AppShell.module.css'

interface AppShellProps {
  /** Controls on the right of the header, e.g. save status and undo/redo. */
  actions?: ReactNode
  children: ReactNode
}

export function AppShell({ actions, children }: AppShellProps) {
  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>Kanban</h1>
        {actions && <div className={styles.actions}>{actions}</div>}
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  )
}
