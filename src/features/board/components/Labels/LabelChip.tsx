import type { CSSProperties } from 'react'
import { cx } from '@/shared/lib/cx'
import { labelName, type LabelId } from '../../model/labels'
import styles from './LabelChip.module.css'

/** A label as a small pill: a colour swatch plus its name, so colour is never the only cue. */
export function LabelChip({ id, className }: { id: LabelId; className?: string }) {
  return (
    <span
      className={cx(styles.chip, className)}
      style={{ '--label-color': `var(--label-${id})` } as CSSProperties}
    >
      <span className={styles.swatch} aria-hidden="true" />
      {labelName(id)}
    </span>
  )
}
