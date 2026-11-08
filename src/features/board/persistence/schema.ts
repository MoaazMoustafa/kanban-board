import { z } from 'zod'
import { LABEL_IDS } from '../model/labels'
import type { BoardState } from '../model/types'
import type { BoardSnapshot } from './repository'

export const CURRENT_VERSION = 3

const cardSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  labels: z.array(z.enum(LABEL_IDS)),
  createdAt: z.number(),
})

const columnSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  cardIds: z.array(z.string()),
})

/**
 * Shape checks alone would accept a board whose columns point at missing cards, which would
 * crash rendering later. So we also check that the normalized pieces agree with each other.
 */
const boardSchema = z
  .object({
    cards: z.record(z.string(), cardSchema),
    columns: z.record(z.string(), columnSchema),
    columnOrder: z.array(z.string()),
  })
  .superRefine((board, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: 'custom', message })

    for (const [key, card] of Object.entries(board.cards)) {
      if (card.id !== key) issue(`card ${key} has id ${card.id}`)
    }
    for (const [key, column] of Object.entries(board.columns)) {
      if (column.id !== key) issue(`column ${key} has id ${column.id}`)
    }

    const ordered = new Set(board.columnOrder)
    const columnIds = Object.keys(board.columns)
    if (ordered.size !== board.columnOrder.length) issue('columnOrder has duplicates')
    if (ordered.size !== columnIds.length || columnIds.some((id) => !ordered.has(id))) {
      issue('columnOrder does not match columns')
    }

    const placed = new Set<string>()
    for (const column of Object.values(board.columns)) {
      for (const cardId of column.cardIds) {
        if (!board.cards[cardId]) issue(`column ${column.id} references missing card ${cardId}`)
        if (placed.has(cardId)) issue(`card ${cardId} is in more than one place`)
        placed.add(cardId)
      }
    }
    if (placed.size !== Object.keys(board.cards).length) issue('some cards are in no column')
  })

export const storedBoardSchema = z.object({
  version: z.literal(CURRENT_VERSION),
  revision: z.number().int().nonnegative(),
  board: boardSchema,
})

export type StoredBoard = z.infer<typeof storedBoardSchema>

/**
 * zod gives back plain strings; our types use branded IDs. This is the one place the brand is
 * applied, right after validation proved every ID is consistent. The double cast is deliberate:
 * TypeScript can't know that validation established the brand.
 */
export function toSnapshot(stored: StoredBoard): BoardSnapshot {
  return { revision: stored.revision, board: stored.board as unknown as BoardState }
}

export function toStored(board: BoardState, revision: number) {
  return { version: CURRENT_VERSION, revision, board }
}
