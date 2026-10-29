/** Returns a shallow copy of `record` without the given keys. */
export function omitKeys<K extends PropertyKey, V>(
  record: Readonly<Record<K, V>>,
  keys: Iterable<K>,
): Record<K, V> {
  const copy = { ...record }
  for (const key of keys) delete copy[key]
  return copy
}
