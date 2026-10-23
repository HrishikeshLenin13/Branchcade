import { LIMITS } from './constants'
/** Inspect shape iteratively before recursive validation: never let untrusted depth reach Zod. */
export function assertBounded(data: unknown, maxNodes = 20_000): void {
  const pending: { value: unknown; depth: number }[] = [{ value: data, depth: 0 }]
  let count = 0
  while (pending.length) {
    const { value, depth } = pending.pop()!
    if (++count > maxNodes || depth > LIMITS.depth)
      throw new Error('Input exceeds safe structure limits')
    if (typeof value === 'number' && !Number.isFinite(value))
      throw new Error('Numbers must be finite')
    if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        if (['__proto__', 'constructor', 'prototype'].includes(key))
          throw new Error('Unsafe data key')
        pending.push({ value: child, depth: depth + 1 })
      }
    }
  }
}
export function canonicalJson(data: unknown): string {
  // Bounded trusted execution traces can contain up to 5,000 events. Import boundaries
  // still use the stricter 20,000-node preflight before schema validation.
  assertBounded(data, 1_000_000)
  const normalize = (x: unknown): unknown =>
    Array.isArray(x)
      ? x.map(normalize)
      : x && typeof x === 'object'
        ? Object.fromEntries(
            Object.entries(x)
              .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
              .map(([k, v]) => [k, normalize(v)]),
          )
        : x
  return JSON.stringify(normalize(data))
}
export async function stableHash(data: unknown): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(canonicalJson(data)),
  )
  return Array.from(new Uint8Array(digest), (n) => n.toString(16).padStart(2, '0')).join('')
}
export function opaqueId(): string {
  return crypto.randomUUID()
}
export function immutable<T>(data: T): Readonly<T> {
  const copy = structuredClone(data)
  const freeze = (x: unknown) => {
    if (x && typeof x === 'object') {
      Object.values(x).forEach(freeze)
      Object.freeze(x)
    }
  }
  freeze(copy)
  return copy
}
