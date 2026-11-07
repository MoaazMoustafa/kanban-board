import type { ComponentPropsWithRef, ReactNode } from 'react'
import { cx } from '@/shared/lib/cx'
import styles from './Button.module.css'

export type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'dangerSolid'

interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: ButtonVariant
}

/** Defaults to type="button" so it never submits a surrounding form by accident. */
export function Button({ variant = 'ghost', type = 'button', className, ...props }: ButtonProps) {
  return <button type={type} className={cx(styles.button, styles[variant], className)} {...props} />
}

interface IconButtonProps extends Omit<ButtonProps, 'aria-label' | 'children'> {
  /** Required: an icon-only button has no other accessible name. */
  label: string
  icon: ReactNode
}

export function IconButton({ label, icon, className, ...props }: IconButtonProps) {
  return (
    <Button aria-label={label} title={label} className={cx(styles.icon, className)} {...props}>
      {icon}
    </Button>
  )
}
