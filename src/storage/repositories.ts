import { LIMITS } from '../domain/constants'
import type { AppExport, Attempt } from '../domain/types'
import { ExportSchema, AttemptSchema } from '../domain/schemas'
import { immutable } from '../domain/invariants'
import { database } from './db'
import { emptyData, migrateData } from './migrations'
import { reconcileConceptProgress } from './progress-records'
import { rebaseEnvelope } from './rebase'
export async function loadData(): Promise<AppExport> {
  const db = await database()
  const tx = db.transaction('app', 'readonly')
  const data: unknown = await tx.store.get('state')
  const barrier: unknown = await tx.store.get('reset-barrier')
  await tx.done
  return data === undefined
    ? { ...emptyData(), ...(typeof barrier === 'string' ? { exportedAt: barrier } : {}) }
    : migrateData(data, LIMITS.storedNodes)
}
export async function saveData(data: AppExport): Promise<void> {
  const parsed = migrateData({ ...data, exportedAt: new Date().toISOString() }, LIMITS.storedNodes)
  const db = await database()
  await db.put('app', parsed, 'state')
}
/** Read, rebase and write in one readwrite transaction, so another tab's records saved
 * since `base` survive (see rebase.ts). Returns the envelope actually stored. */
export async function saveRebased(
  base: AppExport | null,
  ours: AppExport,
): Promise<{ stored: AppExport; foreign: boolean }> {
  const db = await database()
  const tx = db.transaction('app', 'readwrite')
  const done = tx.done
  // Attach a rejection handler immediately, including failures during get/validation.
  void done.catch(() => undefined)
  try {
    const raw: unknown = await tx.store.get('state')
    const barrier: unknown = await tx.store.get('reset-barrier')
    if (base && typeof barrier === 'string' && Date.parse(base.exportedAt) < Date.parse(barrier))
      throw new Error(
        'Local data was reset or replaced in another tab. Export this session, then reload before saving.',
      )
    const theirs = raw === undefined ? null : migrateData(raw, LIMITS.storedNodes)
    const merged = rebaseEnvelope(base, ours, theirs)
    const parsed = migrateData(
      {
        ...merged,
        exportedAt: nextStamp(
          ours.exportedAt,
          theirs?.exportedAt,
          typeof barrier === 'string' ? barrier : undefined,
        ),
      },
      LIMITS.storedNodes,
    )
    await tx.store.put(parsed, 'state')
    await done
    return { stored: parsed, foreign: !!base && theirs?.exportedAt !== base.exportedAt }
  } catch (error) {
    try {
      tx.abort()
    } catch {
      /* Already aborted or completed; done reports the outcome. */
    }
    await done.catch(() => undefined)
    throw error
  }
}
/** Atomic explicit replacement. A concurrent change invalidates the reviewed snapshot. */
export async function saveReplacement(base: AppExport, ours: AppExport): Promise<AppExport> {
  const db = await database()
  const tx = db.transaction('app', 'readwrite')
  const done = tx.done
  void done.catch(() => undefined)
  try {
    const raw: unknown = await tx.store.get('state')
    const theirs = raw === undefined ? emptyData() : migrateData(raw, LIMITS.storedNodes)
    const records = (data: AppExport) =>
      JSON.stringify({ ...data, exportedAt: '', sourceAppVersion: undefined })
    if (records(base) !== records(theirs))
      throw new Error(
        'Local records changed in another tab. Reload and review the import or deletion again.',
      )
    const barrier: unknown = await tx.store.get('reset-barrier')
    const parsed = migrateData(
      {
        ...ours,
        exportedAt: nextStamp(theirs.exportedAt, typeof barrier === 'string' ? barrier : undefined),
      },
      LIMITS.storedNodes,
    )
    await tx.store.put(parsed, 'state')
    await tx.store.put(parsed.exportedAt, 'reset-barrier')
    await done
    return parsed
  } catch (error) {
    try {
      tx.abort()
    } catch {
      /* Transaction already finished. */
    }
    await done.catch(() => undefined)
    throw error
  }
}
/** Strictly newer than every observed revision, even with a clock moving backwards. */
function nextStamp(...previous: (string | undefined)[]) {
  return new Date(
    Math.max(
      Date.now(),
      ...previous.map((p) => {
        const n = p ? Date.parse(p) : NaN
        return Number.isFinite(n) ? n + 1 : 0
      }),
    ),
  ).toISOString()
}
/** Records append; a completed attempt cannot be rewritten to fabricate a successful result. */
export function appendAttempt(data: AppExport, attempt: Attempt): AppExport {
  if (data.attempts.some((a) => a.id === attempt.id))
    throw new Error('An attempt with this ID already exists')
  return ExportSchema.parse({
    ...data,
    attempts: [...data.attempts, immutable(AttemptSchema.parse(attempt))],
  })
}
export async function clearData(): Promise<void> {
  const db = await database()
  const tx = db.transaction('app', 'readwrite')
  const done = tx.done
  void done.catch(() => undefined)
  try {
    const raw: unknown = await tx.store.get('state')
    const previous: unknown = await tx.store.get('reset-barrier')
    const stamp = nextStamp(
      raw && typeof raw === 'object' && 'exportedAt' in raw && typeof raw.exportedAt === 'string'
        ? raw.exportedAt
        : undefined,
      typeof previous === 'string' ? previous : undefined,
    )
    await tx.store.delete('state')
    // Non-identifying revision only. No deleted learner data is retained.
    await tx.store.put(stamp, 'reset-barrier')
    await done
  } catch (error) {
    try {
      tx.abort()
    } catch {
      /* Transaction already finished. */
    }
    await done.catch(() => undefined)
    throw error
  }
}
/** Append-only learning annotations; execution facts, prediction and goal proof stay unchanged. */
export function annotateAttempt(
  data: AppExport,
  id: string,
  patch: Pick<Attempt, 'diagnosticResponses' | 'reassessment'> &
    Partial<
      Pick<Attempt, 'transferRetries' | 'hintIds' | 'experimentUsed' | 'experimentResponses'>
    >,
): AppExport {
  const original = data.attempts.find((a) => a.id === id)
  if (!original) throw new Error('Saved attempt not found')
  if (
    original.reassessment &&
    JSON.stringify(original.reassessment) !== JSON.stringify(patch.reassessment)
  )
    throw new Error('A revealed transfer answer is immutable; append a new transfer retry')
  if (
    patch.transferRetries !== undefined &&
    original.transferRetries?.some(
      (r, i) => JSON.stringify(r) !== JSON.stringify(patch.transferRetries?.[i]),
    )
  )
    throw new Error('Existing transfer retry answers cannot be edited')
  if (
    original.diagnosticResponses.some(
      (r, i) => JSON.stringify(r) !== JSON.stringify(patch.diagnosticResponses[i]),
    )
  )
    throw new Error('Existing probe responses cannot be edited')
  if (patch.hintIds && original.hintIds?.some((id, i) => patch.hintIds![i] !== id))
    throw new Error('Previously requested hints cannot be removed or rewritten')
  if (patch.hintIds && new Set(patch.hintIds).size !== patch.hintIds.length)
    throw new Error('Hint IDs must be unique')
  if (
    patch.experimentResponses !== undefined &&
    original.experimentResponses?.some(
      (r, i) => JSON.stringify(r) !== JSON.stringify(patch.experimentResponses?.[i]),
    )
  )
    throw new Error('Existing experiment answers cannot be edited')
  if (original.experimentUsed && patch.experimentUsed === false)
    throw new Error('Revealed experiment assistance cannot be removed')
  const updated = AttemptSchema.parse({ ...original, ...patch })
  const next = { ...data, attempts: data.attempts.map((a) => (a.id === id ? updated : a)) }
  return patch.hintIds || patch.experimentUsed ? reconcileConceptProgress(next) : next
}
