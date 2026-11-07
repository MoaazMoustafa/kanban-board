import { useId } from 'react'
import { TextIcon } from '@/shared/ui/icons'
import { selectCard } from '../../model/selectors'
import type { CardId } from '../../model/types'
import { useBoardSelector } from '../../store/hooks'
import styles from './Card.module.css'

interface CardProps {
  cardId: CardId
  onOpen: (id: CardId) => void
}

export function Card({ cardId, onOpen }: CardProps) {
  const card = useBoardSelector((state) => selectCard(state, cardId))
  const hintId = useId()
  if (!card) return null

  const hasDescription = card.description.length > 0

  return (
    <button
      type="button"
      className={styles.card}
      // The name stays the title; extra facts go in the description, where they belong.
      aria-describedby={hasDescription ? hintId : undefined}
      onClick={() => onOpen(card.id)}
    >
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
