import { useCallback, useState } from 'react'
import { selectColumnOrder } from '../../model/selectors'
import type { CardId } from '../../model/types'
import { useBoardSelector } from '../../store/hooks'
import { AddColumnForm } from '../AddColumnForm/AddColumnForm'
import { CardDetailsDialog } from '../CardDetailsDialog/CardDetailsDialog'
import { Column } from '../Column/Column'
import styles from './Board.module.css'

export function Board() {
  const columnOrder = useBoardSelector(selectColumnOrder)
  // Which card's details are open is UI state, not board data, so it stays out of the reducer.
  const [openCardId, setOpenCardId] = useState<CardId | null>(null)
  const closeCard = useCallback(() => setOpenCardId(null), [])

  return (
    <div className={styles.board}>
      <ol className={styles.columns} aria-label="Columns">
        {columnOrder.map((columnId) => (
          <li key={columnId} className={styles.columnSlot}>
            <Column columnId={columnId} onOpenCard={setOpenCardId} />
          </li>
        ))}
        <li className={styles.columnSlot}>
          <AddColumnForm />
        </li>
      </ol>
      <CardDetailsDialog cardId={openCardId} onClose={closeCard} />
    </div>
  )
}
