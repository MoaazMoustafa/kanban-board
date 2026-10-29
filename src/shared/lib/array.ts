export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Returns a new array with `item` inserted at `index` (clamped to the valid range). */
export function insertAt<T>(items: readonly T[], index: number, item: T): T[] {
  const at = clamp(index, 0, items.length)
  return [...items.slice(0, at), item, ...items.slice(at)]
}

/** Returns a new array without the element at `index`. Out-of-range indexes return a copy. */
export function removeAt<T>(items: readonly T[], index: number): T[] {
  return items.filter((_, i) => i !== index)
}

/**
 * Returns a new array with the element at `from` moved so that it ends up at `to`.
 * `to` is the final index after the move and is clamped to the valid range.
 */
export function arrayMove<T>(items: readonly T[], from: number, to: number): T[] {
  if (from < 0 || from >= items.length) return [...items]
  const item = items[from] as T
  return insertAt(removeAt(items, from), clamp(to, 0, items.length - 1), item)
}
