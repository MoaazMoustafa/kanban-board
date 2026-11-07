import { useId, useRef, useState } from 'react'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { IconButton } from '@/shared/ui/Button'
import { InlineEdit } from '@/shared/ui/InlineEdit'
import { TrashIcon } from '@/shared/ui/icons'
import { VisuallyHidden } from '@/shared/ui/VisuallyHidden'
import { selectColumn } from '../../model/selectors'
import type { CardId, ColumnId } from '../../model/types'
import { useBoardActions, useBoardSelector } from '../../store/hooks'
import { AddCardForm } from '../AddCardForm/AddCardForm'
import { Card } from '../Card/Card'
import styles from './Column.module.css'

interface ColumnProps {
  columnId: ColumnId
  onOpenCard: (id: CardId) => void
}

export function Column({ columnId, onOpenCard }: ColumnProps) {
  const column = useBoardSelector((state) => selectColumn(state, columnId))
  const actions = useBoardActions()
  const headingId = useId()
  const listRef = useRef<HTMLOListElement>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  if (!column) return null
  const count = column.cardIds.length

  function requestDelete() {
    // Deleting an empty column loses nothing, so only ask when cards would go with it.
    if (count === 0) actions.deleteColumn(columnId)
    else setConfirmingDelete(true)
  }

  return (
    <section className={styles.column} aria-labelledby={headingId}>
      <header className={styles.header}>
        <span className={styles.dot} aria-hidden="true" />
        <h2 id={headingId} className={styles.title}>
          <InlineEdit
            value={column.title}
            label="Column title"
            onSave={(title) => actions.renameColumn(columnId, title)}
          />
        </h2>
        <span className={styles.count}>
          {count}
          <VisuallyHidden> {count === 1 ? 'card' : 'cards'}</VisuallyHidden>
        </span>
        <IconButton
          label={`Delete column ${column.title}`}
          icon={<TrashIcon />}
          className={styles.deleteButton}
          onClick={requestDelete}
        />
      </header>

      <ol ref={listRef} className={styles.cards} aria-labelledby={headingId}>
        {column.cardIds.map((cardId) => (
          <li key={cardId}>
            <Card cardId={cardId} onOpen={onOpenCard} />
          </li>
        ))}
      </ol>

      <footer className={styles.footer}>
        <AddCardForm
          columnId={columnId}
          columnTitle={column.title}
          onAdded={() => {
            // Wait a frame so the new card is in the DOM before scrolling to it.
            requestAnimationFrame(() =>
              listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }),
            )
          }}
        />
      </footer>

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete column?"
        confirmLabel="Delete column"
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={() => {
          setConfirmingDelete(false)
          actions.deleteColumn(columnId)
        }}
      >
        “{column.title}” and its {count} {count === 1 ? 'card' : 'cards'} will be deleted.
      </ConfirmDialog>
    </section>
  )
}
