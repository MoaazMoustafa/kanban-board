import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import {
  createLocalStorageRepository,
  emptyBoard,
  NetworkError,
  RejectedError,
  type BoardRepository,
  type BoardSnapshot,
} from '@/features/board'
import { makeBoard } from '@/test/factories'
import { App } from './App'

const KEY = 'app-test:board'
afterEach(() => localStorage.clear())

/**
 * In React's test (act) environment, a resolved `use()` promise only re-renders inside act(),
 * which RTL's findBy* polling doesn't provide. Rendering inside an async act lets loading finish.
 */
/**
 * Runs `trigger` (which starts or finishes a load) inside act and waits for the board to show.
 * Two React behaviours make this necessary in tests:
 * - in the act environment, a `use()` promise must resolve inside act() to re-render;
 * - once a Suspense fallback is shown, React waits up to ~300ms before revealing the content.
 */
const settleLoading = (trigger: () => void) =>
  act(async () => {
    trigger()
    await new Promise((resolve) => setTimeout(resolve, 400))
  })

async function renderApp(repository: BoardRepository) {
  let result!: ReturnType<typeof render>
  await act(async () => {
    result = render(<App repository={repository} />)
  })
  return result
}

const cardsIn = (name: string) =>
  within(within(screen.getByRole('region', { name })).getByRole('list'))
    .queryAllByRole('listitem')
    .map((li) => li.textContent)

/** A repository with a stored board whose save behaviour each test scripts. */
function repositoryWith(
  snapshot: BoardSnapshot | null,
  save: BoardRepository['save'] = async (_, base) => base + 1,
): BoardRepository {
  return { load: async () => snapshot, save, subscribe: () => () => {} }
}

async function addCard(user: ReturnType<typeof userEvent.setup>, column: string, title: string) {
  await user.click(screen.getByRole('button', { name: `Add a card to ${column}` }))
  await user.type(
    screen.getByRole('textbox', { name: `New card title in ${column}` }),
    `${title}{Enter}`,
  )
  await user.keyboard('{Escape}')
}

describe('loading', () => {
  it('shows a skeleton while loading, then the board', async () => {
    let finishLoading!: (snapshot: BoardSnapshot | null) => void
    const repository: BoardRepository = {
      ...repositoryWith(null),
      load: () => new Promise((resolve) => (finishLoading = resolve)),
    }
    await renderApp(repository)
    expect(screen.getByRole('status')).toHaveTextContent('Loading board…')

    await settleLoading(() => finishLoading(null))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'To do' })).toBeInTheDocument()
    expect(screen.getByText('Saved')).toBeInTheDocument()
  })

  it('offers a retry when loading fails', async () => {
    let attempts = 0
    const repository: BoardRepository = {
      ...repositoryWith(null),
      load: async () => {
        attempts += 1
        if (attempts === 1) throw new NetworkError('offline')
        return { board: makeBoard({ Inbox: [] }), revision: 1 }
      },
    }
    await renderApp(repository)

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load your board")
    await settleLoading(() => fireEvent.click(screen.getByRole('button', { name: 'Try again' })))
    expect(screen.getByRole('region', { name: 'Inbox' })).toBeInTheDocument()
  })

  it('shows an empty state for a board without columns', async () => {
    await renderApp(repositoryWith({ board: emptyBoard, revision: 1 }))
    expect(await screen.findByText(/no columns yet/)).toBeInTheDocument()
  })

  it('recovers from unreadable stored data, keeping a backup', async () => {
    localStorage.setItem(KEY, '{broken')
    await renderApp(createLocalStorageRepository(KEY))

    expect(
      await screen.findByText(/couldn't be read, so a fresh one was started/),
    ).toBeInTheDocument()
    const backupKey = Object.keys(localStorage).find((key) => key.includes('unreadable'))
    expect(backupKey && localStorage.getItem(backupKey)).toBe('{broken')
  })
})

describe('saving', () => {
  it('persists changes across reloads', async () => {
    const user = userEvent.setup()
    const { unmount } = await renderApp(createLocalStorageRepository(KEY))
    await screen.findByRole('region', { name: 'Review' })
    await addCard(user, 'Review', 'Remember me')
    await waitFor(() => expect(localStorage.getItem(KEY)).toContain('Remember me'))
    unmount()

    await renderApp(createLocalStorageRepository(KEY))
    await screen.findByRole('region', { name: 'Review' })
    expect(cardsIn('Review')).toContain('Remember me')
  })

  it('rolls back and explains when the server rejects a change', async () => {
    const user = userEvent.setup()
    const repository = repositoryWith({ board: makeBoard({ Inbox: ['a'] }), revision: 1 }, () =>
      Promise.reject(new RejectedError('no')),
    )
    await renderApp(repository)
    await screen.findByRole('region', { name: 'Inbox' })

    await addCard(user, 'Inbox', 'Doomed')
    expect(cardsIn('Inbox')).toEqual(['Card a', 'Doomed'])

    expect(await screen.findByText(/Couldn't save your recent changes/)).toBeInTheDocument()
    expect(cardsIn('Inbox')).toEqual(['Card a'])
    // History was reset with the rollback, so undo can't bring the rejected change back.
    expect(screen.getByRole('button', { name: 'Undo' })).toHaveAttribute('aria-disabled', 'true')
  })

  it('keeps changes after a network error and retries on request', async () => {
    const user = userEvent.setup()
    let fail = true
    const repository = repositoryWith(
      { board: makeBoard({ Inbox: [] }), revision: 1 },
      async (_, base) => {
        if (fail) throw new NetworkError('offline')
        return base + 1
      },
    )
    await renderApp(repository)
    await screen.findByRole('region', { name: 'Inbox' })
    await addCard(user, 'Inbox', 'Kept')

    expect(await screen.findByText(/Not saved/)).toBeInTheDocument()
    expect(screen.getByText(/Your changes are kept/)).toBeInTheDocument()
    expect(cardsIn('Inbox')).toEqual(['Kept'])

    fail = false
    // The header's status has its own "Retry now" (the toast has another).
    const status = screen.getByText(/Not saved/).parentElement!
    await user.click(within(status).getByRole('button', { name: 'Retry now' }))
    expect(await screen.findByText('Saved')).toBeInTheDocument()
  })

  it('shows boards saved in another tab', async () => {
    const repository = createLocalStorageRepository(KEY)
    await renderApp(repository)
    await screen.findByRole('region', { name: 'To do' })

    // What the other tab's save writes: the stored format, at a newer revision.
    const board = makeBoard({ 'From the other tab': [] })
    const newValue = JSON.stringify({ version: 2, revision: 5, board })
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue }))
    })
    expect(screen.getByRole('region', { name: 'From the other tab' })).toBeInTheDocument()
  })
})
