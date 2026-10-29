import type { CardId, ColumnId } from './types'

export const createCardId = (): CardId => crypto.randomUUID() as CardId
export const createColumnId = (): ColumnId => crypto.randomUUID() as ColumnId
