import { beforeEach, expect, it } from 'vitest'
import { attemptCollection } from './ij-record-fixture'
import { emptyData } from '../src/storage/migrations'
import { rebaseEnvelope } from '../src/storage/rebase'
import { clearData, loadData, saveRebased } from '../src/storage/repositories'
import { useSession } from '../src/app/session'

beforeEach(async () => {
  await useSession.getState().erase()
})

it('ASTRA-001 keeps disjoint concurrent annotations, not just the longer array', async () => {
  const base = await attemptCollection(1)
  const a = base.attempts[0]!
  const ours = { ...base, attempts: [{ ...a, hintIds: ['hint-one'] }] }
  const theirs = {
    ...base,
    exportedAt: '2030-01-01T00:00:00.000Z',
    attempts: [{ ...a, experimentUsed: true }],
  }
  const actual = rebaseEnvelope(base, ours, theirs).attempts[0]!
  expect(actual.hintIds).toEqual(['hint-one'])
  expect(actual.experimentUsed).toBe(true)
})

it('ASTRA-001 rejects conflicting immutable execution evidence instead of choosing one', async () => {
  const base = await attemptCollection(1)
  const a = base.attempts[0]!
  const ours = { ...base, attempts: [{ ...a, traceHash: '0'.repeat(64) }] }
  const theirs = {
    ...base,
    exportedAt: '2030-01-01T00:00:00.000Z',
    attempts: [{ ...a, hintIds: ['hint-one'] }],
  }
  expect(() => rebaseEnvelope(base, ours, theirs)).toThrow(/conflict|immutable/i)
})

it('ASTRA-002 preserves foreign records through two queued saves from one stale tab', async () => {
  const base = await attemptCollection(1)
  await useSession.getState().replace(base)
  const local = useSession.getState().data
  const foreign = {
    ...local.attempts[0]!,
    id: 'foreign',
    prediction: { ...local.attempts[0]!.prediction, id: 'foreign-prediction' },
  }
  await saveRebased(await loadData(), {
    ...(await loadData()),
    attempts: [...local.attempts, foreign],
  })
  const first = useSession
    .getState()
    .replace({ ...local, profile: { ...local.profile!, nickname: 'First' } })
  const second = useSession
    .getState()
    .replace({ ...useSession.getState().data, profile: { ...local.profile!, nickname: 'Second' } })
  await Promise.all([first, second])
  expect((await loadData()).attempts.map((a) => a.id)).toContain('foreign')
  expect((await loadData()).profile?.nickname).toBe('Second')
})

it('ASTRA-003 stale additions after erasure never create orphan learner records', async () => {
  const base = (await saveRebased(null, await attemptCollection(1))).stored
  await clearData()
  const more = await attemptCollection(2)
  // Either a clear conflict or a fully coherent deletion-winning save is acceptable.
  try {
    await saveRebased(base, { ...base, attempts: more.attempts })
  } catch {
    /* explicit conflict */
  }
  const stored = await loadData()
  expect(stored.attempts).toEqual([])
  expect(stored.profile).toBeNull()
})

it('ASTRA-004 never replaces an existing envelope when a new writer has no base', async () => {
  const a = await attemptCollection(1)
  await saveRebased(null, a)
  await saveRebased(null, { ...emptyData(), profile: { ...a.profile!, id: 'new-profile' } })
  expect((await loadData()).attempts).toHaveLength(1)
})

it('ASTRA-004 write stamps exceed the current stored revision even from a stale base', async () => {
  const base = (await saveRebased(null, await attemptCollection(1))).stored
  const future = { ...base, exportedAt: '2090-01-01T00:00:00.000Z' }
  const a = await saveRebased(base, future)
  const b = await saveRebased(base, { ...base, profile: { ...base.profile!, nickname: 'stale' } })
  expect(Date.parse(b.stored.exportedAt)).toBeGreaterThan(Date.parse(a.stored.exportedAt))
})

it('simultaneous distinct attempts survive serialized IndexedDB transactions', async () => {
  const data = await attemptCollection(2)
  const base = (await saveRebased(null, { ...data, attempts: [] })).stored
  await Promise.all(data.attempts.map((a) => saveRebased(base, { ...base, attempts: [a] })))
  expect((await loadData()).attempts.map((a) => a.id).sort()).toEqual(
    data.attempts.map((a) => a.id).sort(),
  )
})

it('incompatible concurrent probe answers fail atomically, preserving the first committed evidence', async () => {
  const base = (await saveRebased(null, await attemptCollection(1))).stored
  const response = {
    probeId: 'g.which-branch.40',
    choiceId: 'else',
    recordedAt: new Date().toISOString(),
  }
  const annotated = (choiceId: string) => ({
    ...base,
    attempts: [{ ...base.attempts[0]!, diagnosticResponses: [{ ...response, choiceId }] }],
  })
  const first = (await saveRebased(base, annotated('else'))).stored
  await expect(saveRebased(base, annotated('then'))).rejects.toThrow(/conflict/)
  expect(await loadData()).toEqual(first)
})

it('replace-import rejects a stale review instead of erasing concurrent records', async () => {
  const { saveReplacement } = await import('../src/storage/repositories')
  const base = (await saveRebased(null, await attemptCollection(1))).stored
  const latest = (
    await saveRebased(base, { ...base, profile: { ...base.profile!, nickname: 'new-name' } })
  ).stored
  await expect(saveReplacement(base, emptyData())).rejects.toThrow(/changed in another tab/)
  expect(await loadData()).toEqual(latest)
})

it('replace-import commits an exact replacement and rejects stale autosave afterward', async () => {
  const { saveReplacement } = await import('../src/storage/repositories')
  const base = (await saveRebased(null, await attemptCollection(1))).stored
  const replacement = await saveReplacement(base, emptyData())
  await expect(saveRebased(base, base)).rejects.toThrow(/reset or replaced/)
  expect(await loadData()).toEqual(replacement)
})

it('storage retry rebases rather than erasing another tab’s new record', async () => {
  const base = await attemptCollection(1)
  await useSession.getState().replace(base)
  const local = useSession.getState().data
  useSession.setState({ ephemeral: true })
  const added = { ...base.attempts[0]!, id: 'retry-foreign' }
  await saveRebased(await loadData(), { ...local, attempts: [...local.attempts, added] })
  expect(await useSession.getState().retryStorage()).toBe(true)
  expect((await loadData()).attempts.map((a) => a.id)).toContain('retry-foreign')
})

it('storage retry never resurrects the pre-erasure session', async () => {
  await useSession.getState().replace(await attemptCollection(1))
  useSession.setState({ ephemeral: true })
  await clearData()
  expect(await useSession.getState().retryStorage()).toBe(false)
  expect(useSession.getState().notice).toMatch(/reset or replaced/)
  expect((await loadData()).attempts).toEqual([])
})

it('stale asynchronous snapshots cannot remove already recorded assistance in an otherwise uncontested save', async () => {
  const data = await attemptCollection(1)
  const a = data.attempts[0]!
  const base = { ...data, attempts: [{ ...a, hintIds: ['hint-one'], experimentUsed: true }] }
  expect(() => rebaseEnvelope(base, data, base)).toThrow(/append-only/)
})
