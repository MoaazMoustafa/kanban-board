/** The fixed label palette. Colours come from CSS tokens (--label-<id>) so themes can adjust them. */
export const LABELS = [
  { id: 'bug', name: 'Bug' },
  { id: 'feature', name: 'Feature' },
  { id: 'design', name: 'Design' },
  { id: 'research', name: 'Research' },
  { id: 'urgent', name: 'Urgent' },
  { id: 'chore', name: 'Chore' },
] as const

export type LabelId = (typeof LABELS)[number]['id']

export const LABEL_IDS = LABELS.map((label) => label.id) as [LabelId, ...LabelId[]]

export const labelName = (id: LabelId) => LABELS.find((label) => label.id === id)?.name ?? id

/** Deduplicated and in palette order, so equal sets always compare equal. */
export function normalizeLabels(labels: readonly LabelId[]): LabelId[] {
  const set = new Set(labels)
  return LABEL_IDS.filter((id) => set.has(id))
}
