import { createContext, use, useDeferredValue, useMemo, useSyncExternalStore } from 'react'
import { useDragStore } from '@/features/dnd'
import { DRAG_TYPE } from '../model/drag'
import { cardMatches, isFilterActive, NO_FILTER, type CardFilter } from '../model/filter'
import type { CardId, Column } from '../model/types'
import { useBoardSelector } from './hooks'

const NO_CARDS: readonly CardId[] = []

export interface FilterStore {
  get(): CardFilter
  set(filter: CardFilter): void
  subscribe(listener: () => void): () => void
}

/** UI state outside the board reducer: filtering isn't saved and can't be undone. */
export function createFilterStore(initial: CardFilter = NO_FILTER): FilterStore {
  let filter = initial
  const listeners = new Set<() => void>()
  return {
    get: () => filter,
    set(next) {
      if (next === filter) return
      filter = next
      for (const listener of listeners) listener()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export const FilterStoreContext = createContext<FilterStore | null>(null)

export function useFilterStore(): FilterStore {
  const store = use(FilterStoreContext)
  if (!store) throw new Error('Must be used inside <BoardFilterProvider>')
  return store
}

export function useFilter(): CardFilter {
  const store = useFilterStore()
  return useSyncExternalStore(store.subscribe, store.get)
}

/**
 * The column's cards that match the filter. The filter is *deferred*: on a big board, typing
 * updates the input immediately and React re-filters in the background, so keys never lag.
 * The card being dragged always stays visible, even if it doesn't match.
 */
export function useVisibleCardIds(column: Column | undefined): readonly CardId[] {
  const filter = useDeferredValue(useFilter())
  const active = isFilterActive(filter)
  // Subscribe to the card table only while filtering; otherwise card edits needn't re-render columns.
  const cards = useBoardSelector((state) => (active ? state.cards : null))
  const drag = useDragStore()
  const draggedCardId = useSyncExternalStore(drag.subscribe, () => {
    const { active: item } = drag.getSnapshot()
    return item?.type === DRAG_TYPE.card ? item.id : null
  })

  const cardIds = column?.cardIds ?? NO_CARDS
  return useMemo(() => {
    if (!cards) return cardIds
    return cardIds.filter((id) => {
      const card = cards[id]
      return id === draggedCardId || (card !== undefined && cardMatches(card, filter))
    })
  }, [cards, cardIds, draggedCardId, filter])
}
