import { useDeferredValue, useEffect, useEffectEvent, useId, useMemo, useRef } from 'react'
import { isEditableTarget } from '@/shared/lib/shortcuts'
import { Button } from '@/shared/ui/Button'
import { CloseIcon } from '@/shared/ui/icons'
import { VisuallyHidden } from '@/shared/ui/VisuallyHidden'
import { cardMatches, isFilterActive, NO_FILTER } from '../../model/filter'
import { LABELS, type LabelId } from '../../model/labels'
import { useFilter, useFilterStore } from '../../store/filterStore'
import { useBoardSelector } from '../../store/hooks'
import { LabelChip } from '../Labels/LabelChip'
import styles from './FilterBar.module.css'

/** Search by text and labels. Press "/" anywhere to jump to the search field. */
export function FilterBar() {
  const filters = useFilterStore()
  const filter = useFilter()
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const active = isFilterActive(filter)

  // Counting matches walks every card, so it follows the deferred filter like the columns do.
  const deferred = useDeferredValue(filter)
  const cards = useBoardSelector((state) => state.cards)
  const { matching, total } = useMemo(() => {
    const all = Object.values(cards)
    return { matching: all.filter((card) => cardMatches(card, deferred)).length, total: all.length }
  }, [cards, deferred])

  const toggleLabel = (id: LabelId) => {
    const labels = filter.labels.includes(id)
      ? filter.labels.filter((label) => label !== id)
      : [...filter.labels, id]
    filters.set({ ...filter, labels })
  }

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return
    if (isEditableTarget(event.target)) return
    if (event.target instanceof Element && event.target.closest('dialog')) return
    event.preventDefault()
    inputRef.current?.focus()
  })
  useEffect(() => {
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <search className={styles.bar}>
      <label htmlFor={inputId} className={styles.searchLabel}>
        <VisuallyHidden>Filter cards</VisuallyHidden>
        <input
          ref={inputRef}
          id={inputId}
          type="search"
          className={styles.input}
          placeholder="Filter cards…"
          aria-keyshortcuts="/"
          value={filter.query}
          onChange={(event) => filters.set({ ...filter, query: event.target.value })}
          onKeyDown={(event) => {
            // Escape clears the text first, then leaves the field.
            if (event.key !== 'Escape') return
            if (filter.query) filters.set({ ...filter, query: '' })
            else event.currentTarget.blur()
          }}
        />
      </label>

      <fieldset className={styles.labels}>
        <legend>
          <VisuallyHidden>Filter by label</VisuallyHidden>
        </legend>
        {LABELS.map(({ id }) => (
          <button
            key={id}
            type="button"
            className={styles.labelToggle}
            aria-pressed={filter.labels.includes(id)}
            onClick={() => toggleLabel(id)}
          >
            <LabelChip id={id} />
          </button>
        ))}
      </fieldset>

      {active && (
        <>
          <span className={styles.count} aria-hidden="true">
            {matching} of {total}
          </span>
          <Button className={styles.clear} onClick={() => filters.set(NO_FILTER)}>
            <CloseIcon />
            Clear filters
          </Button>
        </>
      )}
      <VisuallyHidden aria-live="polite" aria-atomic="true">
        {active ? `${matching} of ${total} cards shown.` : ''}
      </VisuallyHidden>
    </search>
  )
}
