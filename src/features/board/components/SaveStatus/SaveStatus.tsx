import { useEffect, useState } from 'react'
import { Button } from '@/shared/ui/Button'
import { CheckIcon, CloudOffIcon } from '@/shared/ui/icons'
import { useSyncStatus } from '../../store/syncContext'
import styles from './SaveStatus.module.css'

/**
 * A quiet indicator: "Saved", "Saving…", or "Not saved, retrying in 4s". It is deliberately
 * not a live region (announcing every save would be noise); failures are announced by a toast.
 */
export function SaveStatus() {
  const { status, retryNow } = useSyncStatus()

  if (status.kind === 'retrying') {
    return (
      <span className={`${styles.status} ${styles.error}`}>
        <CloudOffIcon />
        <span>
          Not saved · <RetryCountdown retryAt={status.retryAt} />
        </span>
        <Button className={styles.retry} onClick={retryNow}>
          Retry now
        </Button>
      </span>
    )
  }

  return (
    <span className={styles.status}>
      {status.kind === 'saved' ? (
        <>
          <CheckIcon />
          Saved
        </>
      ) : (
        <>
          <span className={styles.spinner} aria-hidden="true" />
          Saving…
        </>
      )}
    </span>
  )
}

function RetryCountdown({ retryAt }: { retryAt: number }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])
  const seconds = Math.max(0, Math.ceil((retryAt - now) / 1000))
  return <>{seconds > 0 ? `retrying in ${seconds}s` : 'retrying…'}</>
}
