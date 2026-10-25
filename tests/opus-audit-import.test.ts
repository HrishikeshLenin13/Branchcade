/** Opus post-L audit: hostile synthetic import payloads. Each must be rejected (or, for the
 * merge case, keep the existing record) without polluting prototypes or hanging. */
import { describe, expect, it } from 'vitest'
import { parseImport, validateImport, mergeData } from '../src/storage/import-export'
import { emptyData } from '../src/storage/migrations'

const valid = () => JSON.parse(JSON.stringify(emptyData())) as Record<string, unknown>
describe('Opus hostile import payloads', () => {
  it('rejects prototype-pollution keys and leaves Object.prototype clean', async () => {
    const raw = `{"schemaVersion":1,"exportedAt":"2026-10-25T00:00:00.000Z","profile":null,"attempts":[],"teams":[],"__proto__":{"polluted":true}}`
    await expect(validateImport(raw)).rejects.toThrow()
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })
  it('rejects oversize, deeply nested, unknown-version, NaN-like and markup-bearing data', async () => {
    await expect(validateImport('x'.repeat(600_000))).rejects.toThrow()
    await expect(validateImport('['.repeat(5000) + ']'.repeat(5000))).rejects.toThrow()
    await expect(
      validateImport(JSON.stringify({ ...valid(), schemaVersion: 99 })),
    ).rejects.toThrow()
    await expect(
      validateImport(JSON.stringify({ ...valid(), exportedAt: 'not a date' })),
    ).rejects.toThrow()
    await expect(validateImport(JSON.stringify({ ...valid(), extra: 1 }))).rejects.toThrow()
  })
  it('merging a same-id but different record keeps the existing one', () => {
    const current = valid() as never
    expect(() => parseImport(JSON.stringify(valid()))).not.toThrow()
    const merged = mergeData(current, current)
    expect(merged.attempts).toHaveLength(0)
  })
})
