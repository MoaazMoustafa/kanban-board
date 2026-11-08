import { LABEL_IDS } from './labels'
import type { BoardState, Card, CardId, Column, ColumnId } from './types'

const WORDS = (
  'design build review ship test refactor fix document plan measure profile cache render ' +
  'layout column card drag drop sync store schema migrate login search filter export import ' +
  'theme focus keyboard screen reader animation toast dialog undo redo offline retry'
).split(' ')

/** Small seeded PRNG (mulberry32): the same seed always yields the same board. */
function random(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * A large, deterministic board for benchmarks. Titles vary in length (so cards vary in
 * height, like real ones), and a third of the cards have descriptions.
 *
 * Built directly rather than by replaying actions: each reducer step copies the card table,
 * which makes replaying 5,000 additions O(n²) (seconds). The test checks the result is valid.
 */
export function generateBoard({
  columns,
  cardsPerColumn,
  seed = 1,
}: {
  columns: number
  cardsPerColumn: number
  seed?: number
}): BoardState {
  const next = random(seed)
  const pick = () => WORDS[Math.floor(next() * WORDS.length)] ?? 'task'
  const title = () => {
    const words = Array.from({ length: 2 + Math.floor(next() * 8) }, pick).join(' ')
    return words.charAt(0).toUpperCase() + words.slice(1)
  }

  const cards: Record<CardId, Card> = {}
  const columnTable: Record<ColumnId, Column> = {}
  const columnOrder: ColumnId[] = []

  for (let c = 0; c < columns; c++) {
    const columnId = `col-${c}` as ColumnId
    const cardIds: CardId[] = []
    for (let i = 0; i < cardsPerColumn; i++) {
      const id = `card-${c}-${i}` as CardId
      const labels = LABEL_IDS.filter(() => next() < 0.15)
      cards[id] = {
        id,
        title: title(),
        description: next() < 0.33 ? title() : '',
        labels,
        createdAt: 0,
      }
      cardIds.push(id)
    }
    columnTable[columnId] = { id: columnId, title: `Column ${c + 1}`, cardIds }
    columnOrder.push(columnId)
  }

  return { cards, columns: columnTable, columnOrder }
}
