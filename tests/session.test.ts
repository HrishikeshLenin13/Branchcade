import { it, expect } from 'vitest'
import { useSession } from '../src/app/session'
import { loadData } from '../src/storage/repositories'
import { emptyData } from '../src/storage/migrations'
import { fixtureProfile } from '../src/test/fixtures'
it('acknowledges durable saves only after the complete ordered IndexedDB queue', async () => {
  await useSession.getState().erase()
  const a = { ...emptyData(), profile: fixtureProfile },
    b = { ...emptyData(), profile: { ...fixtureProfile, nickname: 'Second robot' } }
  const first = useSession.getState().replace(a),
    second = useSession.getState().replace(b)
  expect(useSession.getState().pendingWrites).toBe(2)
  await Promise.all([first, second])
  expect(useSession.getState().pendingWrites).toBe(0)
  expect((await loadData()).profile?.nickname).toBe('Second robot')
  await useSession.getState().erase()
})
