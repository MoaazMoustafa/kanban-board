import { render, type RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { BoardProvider, type BoardState } from '@/features/board'
import { makeBoard } from './factories'

interface Options extends Omit<RenderOptions, 'wrapper'> {
  board?: BoardState
}

/** Renders inside the app's providers and returns a ready-to-use `user` for interactions. */
export function renderWithProviders(
  ui: ReactElement,
  { board = makeBoard(), ...options }: Options = {},
) {
  return {
    user: userEvent.setup(),
    ...render(ui, {
      wrapper: ({ children }) => <BoardProvider initialState={board}>{children}</BoardProvider>,
      ...options,
    }),
  }
}
