import { createContext, use } from 'react'

export interface ToastOptions {
  message: string
  tone?: 'info' | 'error'
  action?: { label: string; onClick: () => void }
}

export const ToastContext = createContext<((toast: ToastOptions) => void) | null>(null)

/** Shows a short, non-blocking message. Stable across renders. */
export function useToast(): (toast: ToastOptions) => void {
  const show = use(ToastContext)
  if (!show) throw new Error('useToast must be used inside <ToastProvider>')
  return show
}
