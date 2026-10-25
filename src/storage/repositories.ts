import type { AppExport, Attempt } from '../domain/types'
import { ExportSchema, AttemptSchema } from '../domain/schemas'
import { immutable } from '../domain/invariants'
import { database } from './db'
import { emptyData, migrateData } from './migrations'
import { reconcileConceptProgress } from './progress-records'
import { rebaseEnvelope } from './rebase'
export async function loadData(): Promise<AppExport> {
  const db = await database()
  const data: unknown = await db.get('app', 'state')
  return data === undefined ? emptyData() : migrateData(data)
}
export async function saveData(data: AppExport): Promise<void> {
  const parsed = ExportSchema.parse({ ...data, exportedAt: new Date().toISOString() })
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
  const raw: unknown = await tx.store.get('state')
  const theirs = raw === undefined ? null : migrateData(raw)
  const merged = rebaseEnvelope(base, ours, theirs)
  const parsed = ExportSchema.parse({ ...merged, exportedAt: nextStamp(merged.exportedAt) })
  await tx.store.put(parsed, 'state')
  await tx.done
  return { stored: parsed, foreign: !!base && theirs?.exportedAt !== base.exportedAt }
}
/** Strictly increasing so two writes in the same millisecond still differ. */
function nextStamp(previous: string) {
  const now = Date.now(),
    last = Date.parse(previous)
  return new Date(Number.isFinite(last) && last >= now ? last + 1 : now).toISOString()
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
  await db.delete('app', 'state')
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
