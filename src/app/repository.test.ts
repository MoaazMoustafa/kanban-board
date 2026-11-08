import { expect, it } from 'vitest'
import { createAppRepository } from './repository'

it('uses localStorage unless the fake API is requested', async () => {
  localStorage.clear()
  const local = createAppRepository('')
  await local.save((await import('@/features/board')).createSeedBoard(), 0)
  await expect(createAppRepository('?api=fake&latency=0&fail=0').load()).resolves.toMatchObject({
    revision: 1,
  })
  localStorage.clear()
})
