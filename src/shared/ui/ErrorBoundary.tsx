import { Component, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  renderFallback: (props: { error: unknown; reset: () => void }) => ReactNode
  children: ReactNode
}

interface ErrorBoundaryState {
  error: unknown
  hasError: boolean
}

/** Catches errors thrown while rendering children (including rejected `use()` promises). */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null, hasError: false }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error, hasError: true }
  }

  reset = () => this.setState({ error: null, hasError: false })

  override render() {
    if (this.state.hasError)
      return this.props.renderFallback({ error: this.state.error, reset: this.reset })
    return this.props.children
  }
}
