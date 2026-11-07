import { useCallback, useId, useRef, useState, type CSSProperties } from 'react'
import { useSortableContainer, type SortableItem } from '@/features/dnd'
import { IconButton } from '@/shared/ui/Button'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { InlineEdit } from '@/shared/ui/InlineEdit'
import { TrashIcon } from '@/shared/ui/icons'
import { VisuallyHidden } from '@/shared/ui/VisuallyHidden'
import { DRAG_TYPE } from '../../model/drag'
import { selectColumn } from '../../model/selectors'
import type { CardId, ColumnId } from '../../model/types'
import { useBoardActions, useBoardSelector } from '../../store/hooks'
import { AddCardForm } from '../AddCardForm/AddCardForm'
import { CardItem } from '../Card/CardItem'
import styles from './Column.module.css'

const ACCENTS = ['#6366f1', '#f59e0b', '#0ea5e9', '#10b981', '#ec4899']

/** A stable accent per column, derived from its ID, so colors don't shuffle when columns move. */
function accentFor(id: string): string {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return ACCENTS[Math.abs(hash) % ACCENTS.length] ?? ACCENTS[0]!
}

interface ColumnProps {
  columnId: ColumnId
  onOpenCard: (id: CardId) => void
  dragHandleProps?: SortableItem['handleProps']
}

export function Column({ columnId, onOpenCard, dragHandleProps }: ColumnProps) {
  const column = useBoardSelector((state) => selectColumn(state, columnId))
  const actions = useBoardActions()
  const headingId = useId()
  const listRef = useRef<HTMLOListElement | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const containerRef = useSortableContainer({
    id: columnId,
    type: DRAG_TYPE.card,
    axis: 'vertical',
  })
  const setListRef = useCallback(
    (element: HTMLOListElement | null) => {
      listRef.current = element
      return containerRef(element)
    },
    [containerRef],
  )

  if (!column) return null
  const count = column.cardIds.length

  function requestDelete() {
    // Deleting an empty column loses nothing, so only ask when cards would go with it.
    if (count === 0) actions.deleteColumn(columnId)
    else setConfirmingDelete(true)
  }

  return (
    <section
      className={styles.column}
      aria-labelledby={headingId}
      style={{ '--column-accent': accentFor(columnId) } as CSSProperties}
    >
      <header className={styles.header} {...dragHandleProps}>
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
          data-dnd-ignore=""
          onClick={requestDelete}
        />
      </header>

      <ol ref={setListRef} className={styles.cards} aria-labelledby={headingId}>
        {column.cardIds.map((cardId) => (
          <CardItem key={cardId} cardId={cardId} columnId={columnId} onOpen={onOpenCard} />
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
