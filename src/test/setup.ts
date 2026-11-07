import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// jsdom doesn't implement <dialog> modality. This minimal stand-in only toggles `open`;
// real focus trapping and Escape handling are covered by the Playwright tests.
function showModal(this: HTMLDialogElement) {
  this.setAttribute('open', '')
}

function close(this: HTMLDialogElement) {
  if (!this.hasAttribute('open')) return
  this.removeAttribute('open')
  this.dispatchEvent(new Event('close'))
}

if (typeof HTMLDialogElement.prototype.showModal !== 'function') {
  HTMLDialogElement.prototype.showModal = showModal
  HTMLDialogElement.prototype.close = close
}

// jsdom does no layout, so scrolling is a no-op there.
Element.prototype.scrollTo ??= function scrollTo() {}

afterEach(() => {
  cleanup()
})
