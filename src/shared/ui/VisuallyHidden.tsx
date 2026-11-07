import type { ComponentPropsWithRef, CSSProperties } from 'react'

const style: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
}

/** Content for screen readers only. Accepts span props, e.g. an `id` or `aria-live`. */
export function VisuallyHidden(props: ComponentPropsWithRef<'span'>) {
  return <span style={style} {...props} />
}
