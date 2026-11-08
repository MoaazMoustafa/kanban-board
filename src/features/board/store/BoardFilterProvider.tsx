import { useState, type ReactNode } from 'react'
import { createFilterStore, FilterStoreContext } from './filterStore'

export function BoardFilterProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => createFilterStore())
  return <FilterStoreContext value={store}>{children}</FilterStoreContext>
}
