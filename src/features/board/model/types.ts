import type { LabelId } from './labels'

/**
 * Branded IDs: at runtime they are plain strings, but the type system refuses to mix them up,
 * so passing a ColumnId where a CardId is expected is a compile error.
 */
export type CardId = string & { readonly __brand: 'CardId' }
export type ColumnId = string & { readonly __brand: 'ColumnId' }

export interface Card {
  readonly id: CardId
  readonly title: string
  readonly description: string
  readonly labels: readonly LabelId[]
  readonly createdAt: number
}

/**
 * A column owns the order of its cards. Cards deliberately do not store their columnId:
 * `cardIds` is the single source of truth for membership and order, so the two can never disagree.
 */
export interface Column {
  readonly id: ColumnId
  readonly title: string
  readonly cardIds: readonly CardId[]
}

/** Normalized board state: entities in lookup tables, order kept in ID arrays. */
export interface BoardState {
  readonly cards: Readonly<Record<CardId, Card>>
  readonly columns: Readonly<Record<ColumnId, Column>>
  readonly columnOrder: readonly ColumnId[]
}
