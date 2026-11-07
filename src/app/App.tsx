import { Board, HistoryControls } from '@/features/board'
import styles from './App.module.css'
import { AppProviders } from './providers'

export function App() {
  return (
    <AppProviders>
      <div className={styles.app}>
        <header className={styles.header}>
          <h1 className={styles.title}>Kanban</h1>
          <HistoryControls />
        </header>
        <main className={styles.main}>
          <Board />
        </main>
      </div>
    </AppProviders>
  )
}
