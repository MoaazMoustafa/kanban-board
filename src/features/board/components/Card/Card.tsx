import { useId } from 'react'
import type { SortableItem } from '@/features/dnd'
import { TextIcon } from '@/shared/ui/icons'
import { labelName } from '../../model/labels'
import { selectCard } from '../../model/selectors'
import type { CardId } from '../../model/types'
import { useBoardSelector } from '../../store/hooks'
import { LabelChip } from '../Labels/LabelChip'
import styles from './Card.module.css'

interface CardProps {
  cardId: CardId
  onOpen: (id: CardId) => void
  dragHandleProps?: SortableItem['handleProps']
  /** ID of the drag instructions, announced along with the card. */
  dragDescribedBy?: string
}

export function Card({ cardId, onOpen, dragHandleProps, dragDescribedBy }: CardProps) {
  const card = useBoardSelector((state) => selectCard(state, cardId))
  const hintId = useId()
  const labelsId = useId()
  if (!card) return null

  const hasDescription = card.description.length > 0
  const hasLabels = card.labels.length > 0

  return (
    <button
      type="button"
      className={styles.card}
      // The name stays the title; extra facts go in the description, where they belong.
      aria-describedby={
        [hasDescription && hintId, hasLabels && labelsId, dragDescribedBy]
          .filter(Boolean)
          .join(' ') || undefined
      }
      onClick={() => onOpen(card.id)}
      {...dragHandleProps}
    >
      {hasLabels && (
        // Shown as chips; announced through the description so the card's name stays its title.
        <span className={styles.labels} aria-hidden="true">
          {card.labels.map((label) => (
            <LabelChip key={label} id={label} />
          ))}
        </span>
      )}
      {hasLabels && (
        <span id={labelsId} hidden>
          Labels: {card.labels.map(labelName).join(', ')}
        </span>
      )}
      <span className={styles.title}>{card.title}</span>
      {hasDescription && (
        <span className={styles.meta}>
          <TextIcon />
          <span id={hintId} hidden>
            Has description
          </span>
        </span>
      )}
    </button>
  )
}
