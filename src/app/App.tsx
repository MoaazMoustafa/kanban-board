import { BoardRoot, type BoardRepository } from '@/features/board'
import { ToastProvider } from '@/shared/ui/Toast'
import { createAppRepository } from './repository'

const defaultRepository = createAppRepository(window.location.search)

export function App({ repository = defaultRepository }: { repository?: BoardRepository }) {
  return (
    <ToastProvider>
      <BoardRoot repository={repository} />
    </ToastProvider>
  )
}
