import type { AppExport, Attempt } from '../domain/types'
import { ExportSchema, AttemptSchema } from '../domain/schemas'
import { immutable } from '../domain/invariants'
import { database } from './db'
import { emptyData, migrateData } from './migrations'
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
  patch: Pick<Attempt, 'diagnosticResponses' | 'reassessment'>,
): AppExport {
  const original = data.attempts.find((a) => a.id === id)
  if (!original) throw new Error('Saved attempt not found')
  if (original.reassessment)
    throw new Error('A revealed transfer answer is immutable; start a new attempt')
  if (
    original.diagnosticResponses.some(
      (r, i) => JSON.stringify(r) !== JSON.stringify(patch.diagnosticResponses[i]),
    )
  )
    throw new Error('Existing probe responses cannot be edited')
  const updated = AttemptSchema.parse({ ...original, ...patch })
  return { ...data, attempts: data.attempts.map((a) => (a.id === id ? updated : a)) }
}
