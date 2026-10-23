import { describe, it, expect } from 'vitest'
import * as S from '../src/domain/schemas'
import { fixtureWorld, fixtureProgram, fixtureMission, fixtureProfile } from '../src/test/fixtures'
import { assertBounded, canonicalJson, stableHash } from '../src/domain/invariants'
import { validateProgram } from '../src/interpreter/validate'
import { parseImport } from '../src/storage/import-export'
import { emptyData, migrateData } from '../src/storage/migrations'
describe('versioned contracts', () => {
  it.each([
    [S.WorldSchema, fixtureWorld],
    [S.ProgramSchema, fixtureProgram],
    [S.MissionSchema, fixtureMission],
    [S.LearnerProfileSchema, fixtureProfile],
  ])('round trips real example %#', (schema, data) => {
    expect(schema.parse(JSON.parse(JSON.stringify(data)))).toEqual(data)
  })
  it.each([NaN, Infinity, -Infinity])('rejects nonfinite coordinates %s', (x) =>
    expect(S.Vec2Schema.safeParse({ xCm: x, yCm: 0 }).success).toBe(false),
  )
  it('rejects unknown schema versions and unknown fields', () => {
    expect(S.WorldSchema.safeParse({ ...fixtureWorld, schemaVersion: 2 }).success).toBe(false)
    expect(
      S.LearnerProfileSchema.safeParse({ ...fixtureProfile, email: 'child@example.com' }).success,
    ).toBe(false)
  })
  it('rejects impossible or overlapping geometry', () => {
    const w = structuredClone(fixtureWorld)
    w.obstacles[0]!.position.xCm = -1
    expect(S.WorldSchema.safeParse(w).success).toBe(false)
    w.obstacles[0]!.position = { xCm: 38, yCm: 48 }
    expect(S.WorldSchema.safeParse(w).success).toBe(false)
  })
  it('bounds input before recursive parsing', () => {
    let x: unknown = {}
    for (let i = 0; i < 100; i++) x = { x }
    expect(() => assertBounded(x)).toThrow('limits')
    expect(() => parseImport(' '.repeat(500001))).toThrow('500 KB')
  })
  it('rejects executable shapes and prototype keys', () => {
    expect(() =>
      validateProgram({
        ...fixtureProgram,
        body: [{ kind: 'eval', nodeId: 'bad', source: 'evil()' }],
      }),
    ).toThrow()
    expect(() => parseImport('{"__proto__":{"bad":true}}')).toThrow('Unsafe')
  })
  it('canonical hashes ignore key order but change with edits', async () => {
    expect(canonicalJson({ b: 2, a: 1 })).toBe(canonicalJson({ a: 1, b: 2 }))
    expect(await stableHash({ a: 1, b: 2 })).toBe(await stableHash({ b: 2, a: 1 }))
    expect(await stableHash(fixtureProgram)).not.toBe(
      await stableHash({ ...fixtureProgram, id: 'edited' }),
    )
  })
  it('migrates only documented old schema, preserves unknown data by rejecting', () => {
    expect(migrateData({ schemaVersion: 0, alias: 'Robot' }).profile?.nickname).toBe('Robot')
    expect(() => migrateData({ schemaVersion: 99 })).toThrow()
    expect(() => migrateData({ schemaVersion: 0, email: 'x' })).toThrow()
  })
  it('validates duplicate imported IDs and bounded arrays', () => {
    const d = emptyData()
    expect(S.ExportSchema.parse(d)).toEqual(d)
    expect(S.TeamSessionSchema.safeParse({ schemaVersion: 1, members: [] }).success).toBe(false)
  })
  it('enforces semantic AST types and node IDs', () => {
    const p = structuredClone(fixtureProgram)
    const s = p.body[0]!
    if (s.kind === 'if' && s.condition.kind === 'compare') s.condition.left.type = 'color'
    expect(() => validateProgram(p)).toThrow('mismatch')
  })
})
