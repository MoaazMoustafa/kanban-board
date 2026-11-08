import { useId, useState, type FormEvent } from 'react'
import { Button } from '@/shared/ui/Button'
import { Dialog } from '@/shared/ui/Dialog'
import { TrashIcon } from '@/shared/ui/icons'
import { LABELS, type LabelId } from '../../model/labels'
import { findColumnIdOfCard, selectCard } from '../../model/selectors'
import type { Card, CardId } from '../../model/types'
import { useBoardActions, useBoardSelector } from '../../store/hooks'
import { LabelChip } from '../Labels/LabelChip'
import styles from './CardDetailsDialog.module.css'

interface CardDetailsDialogProps {
  cardId: CardId | null
  onClose: () => void
}

export function CardDetailsDialog({ cardId, onClose }: CardDetailsDialogProps) {
  const card = useBoardSelector((state) => (cardId ? selectCard(state, cardId) : undefined))
  const columnTitle = useBoardSelector((state) => {
    const columnId = cardId && findColumnIdOfCard(state, cardId)
    return columnId ? state.columns[columnId]?.title : undefined
  })

  return (
    <Dialog open={card !== undefined} onClose={onClose} title="Edit card">
      {/* Keyed by card, so the form's draft state resets whenever a different card opens. */}
      {card && <CardForm key={card.id} card={card} columnTitle={columnTitle} onDone={onClose} />}
    </Dialog>
  )
}

interface CardFormProps {
  card: Card
  columnTitle: string | undefined
  onDone: () => void
}

/** Edits a local draft; nothing reaches the board until Save. */
function CardForm({ card, columnTitle, onDone }: CardFormProps) {
  const actions = useBoardActions()
  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description)
  const [labels, setLabels] = useState<readonly LabelId[]>(card.labels)
  const titleId = useId()
  const descriptionId = useId()

  function save(event: FormEvent) {
    event.preventDefault()
    actions.updateCard(card.id, { title, description, labels: [...labels] })
    onDone()
  }

  return (
    <form className={styles.form} onSubmit={save}>
      {columnTitle && (
        <p className={styles.location}>
          In column <strong>{columnTitle}</strong>
        </p>
      )}

      <div className={styles.field}>
        <label htmlFor={titleId}>Title</label>
        <input
          id={titleId}
          className={styles.input}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
      </div>

      <div className={styles.field}>
        <label htmlFor={descriptionId}>Description</label>
        <textarea
          id={descriptionId}
          className={styles.input}
          rows={5}
          placeholder="Add more detail…"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>

      <fieldset className={styles.labelsField}>
        <legend>Labels</legend>
        <div className={styles.labelOptions}>
          {LABELS.map(({ id, name }) => (
            <label key={id} className={styles.labelOption}>
              <input
                type="checkbox"
                checked={labels.includes(id)}
                aria-label={name}
                onChange={(event) =>
                  setLabels((current) =>
                    event.target.checked ? [...current, id] : current.filter((l) => l !== id),
                  )
                }
              />
              <LabelChip id={id} />
            </label>
          ))}
        </div>
      </fieldset>

      <div className={styles.actions}>
        <Button
          variant="danger"
          onClick={() => {
            actions.deleteCard(card.id)
            onDone()
          }}
        >
          <TrashIcon />
          Delete card
        </Button>
        <span className={styles.spacer} />
        <Button onClick={onDone}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={!title.trim()}>
          Save
        </Button>
      </div>
    </form>
  )
}
