import { create } from 'zustand'
import type { AppExport, LearnerProfile } from '../domain/types'
import { ExportSchema } from '../domain/schemas'
import { DEFAULT_SETTINGS, emptyData } from '../storage/migrations'
import { loadData, saveData, saveRebased, clearData } from '../storage/repositories'
import { opaqueId } from '../domain/invariants'
import { mergeData } from '../storage/import-export'
let writeQueue = Promise.resolve()
let initialization: Promise<void> | undefined
let readRecoveryPending = false
/** The envelope this tab last loaded or wrote. Saves rebase this tab's changes since then
 * onto whatever another tab stored meanwhile, instead of overwriting it (OPUS-001). */
let lastStored: AppExport | null = null
/** Same-origin tabs announce committed writes so their in-memory copies stay current. */
const channel =
  typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('branchcade-local')
const announce = () => channel?.postMessage({ type: 'saved' })
export function localProfiles(data: AppExport): LearnerProfile[] {
  return [...(data.profile ? [data.profile] : []), ...data.profiles]
}
function newProfile(nickname?: string): LearnerProfile {
  const id = opaqueId()
  return {
    schemaVersion: 1,
    id,
    nickname:
      nickname
        ?.trim()
        .split('')
        .filter((c) => c.charCodeAt(0) >= 32 && c !== '<' && c !== '>')
        .join('')
        .slice(0, 32) || `Robot ${id.slice(0, 4).toUpperCase()}`,
    settings: { ...DEFAULT_SETTINGS },
    completedMissions: [],
    responses: [],
    evidence: [],
    conceptProgress: [],
  }
}
type Session = {
  data: AppExport
  ready: boolean
  notice: string
  ephemeral: boolean
  pendingWrites: number
  initialize: () => Promise<void>
  replace: (data: AppExport) => Promise<void>
  applyImport: (data: AppExport) => Promise<void>
  start: () => Promise<LearnerProfile>
  createLearner: (nickname?: string) => Promise<LearnerProfile>
  selectLearner: (id: string) => Promise<void>
  clearLearner: (id: string) => Promise<void>
  clearSavedLabs: () => Promise<void>
  retryStorage: () => Promise<boolean>
  continueWithoutSaving: () => void
  erase: () => Promise<void>
}
export const useSession = create<Session>((set, get) => ({
  data: emptyData(),
  ready: false,
  notice: '',
  ephemeral: false,
  pendingWrites: 0,
  initialize: () => {
    if (get().ready) return Promise.resolve()
    return (initialization ??= (async () => {
      try {
        const loaded = await loadData()
        lastStored = loaded
        set({ data: loaded, ready: true })
        readRecoveryPending = false
      } catch {
        readRecoveryPending = true
        set({
          ready: true,
          ephemeral: true,
          notice:
            'Progress can’t be saved on this device. Storage is unavailable or unreadable. Export your current session before closing.',
        })
      } finally {
        initialization = undefined
      }
    })())
  },
  replace: async (data) => {
    const parsed = ExportSchema.parse(data)
    set({ data: parsed })
    if (get().ephemeral) return
    set((s) => ({ pendingWrites: s.pendingWrites + 1 }))
    const operation = writeQueue
      .then(async () => {
        if (get().ephemeral) return
        const { stored, foreign } = await saveRebased(lastStored, parsed)
        lastStored = stored
        // Adopt records another tab saved, unless this tab has already moved on (the next
        // queued write rebases those too).
        if (foreign && get().data === parsed && !sameRecords(stored, parsed)) set({ data: stored })
        announce()
      })
      .catch(() =>
        set({
          ephemeral: true,
          notice: 'Saving failed. Your current work stays in memory; export it before closing.',
        }),
      )
    writeQueue = operation
    try {
      await operation
    } finally {
      set((s) => ({ pendingWrites: Math.max(0, s.pendingWrites - 1) }))
    }
  },
  applyImport: async (data) => {
    const parsed = ExportSchema.parse(data)
    await writeQueue
    // Commit to IndexedDB before exposing a replacement. A failed import leaves current data untouched.
    set((s) => ({ pendingWrites: s.pendingWrites + 1 }))
    try {
      const { stored } = await saveRebased(lastStored, parsed)
      lastStored = stored
      readRecoveryPending = false
      set({ data: stored, ephemeral: false, notice: 'Validated local data imported and saved.' })
      announce()
    } catch {
      throw new Error(
        'Import was not saved. Your previous local data is unchanged; export it and retry storage.',
      )
    } finally {
      set((s) => ({ pendingWrites: Math.max(0, s.pendingWrites - 1) }))
    }
  },
  start: async () => {
    const existing = get().data.profile
    if (existing) return existing
    const profile = newProfile()
    await get().replace({ ...get().data, profile })
    return profile
  },
  createLearner: async (nickname) => {
    const current = get().data
    if (localProfiles(current).length >= 20)
      throw new Error(
        'This browser supports up to 20 local learners. Select an existing alias, or export a backup before erasing all local data in Settings.',
      )
    const profile = newProfile(nickname)
    await get().replace({ ...current, profile, profiles: localProfiles(current) })
    return profile
  },
  selectLearner: async (id) => {
    const current = get().data,
      all = localProfiles(current),
      profile = all.find((p) => p.id === id)
    if (!profile) throw new Error('Local learner not found')
    await get().replace({ ...current, profile, profiles: all.filter((p) => p.id !== id) })
  },
  clearLearner: async (id) => {
    const current = get().data
    const clear = (p: LearnerProfile) => ({
      ...p,
      completedMissions: [],
      responses: [],
      evidence: [],
      conceptProgress: [],
    })
    await get().applyImport({
      ...current,
      profile: current.profile?.id === id ? clear(current.profile) : current.profile,
      profiles: current.profiles.map((p) => (p.id === id ? clear(p) : p)),
      attempts: current.attempts.filter((a) => a.learnerId !== id),
      drafts: current.drafts.filter((d) => d.learnerId !== id),
    })
  },
  clearSavedLabs: async () => {
    const current = get().data
    await get().applyImport({
      ...current,
      savedLabs: [],
      drafts: current.drafts.filter((d) => d.missionId !== 'lab'),
    })
  },
  retryStorage: async () => {
    await writeQueue
    set((s) => ({ pendingWrites: s.pendingWrites + 1 }))
    try {
      let current = get().data
      // An unreadable saved envelope is never overwritten by Retry. Recover and merge it first.
      if (readRecoveryPending) current = mergeData(current, await loadData())
      await saveData(current)
      lastStored = await loadData()
      current = lastStored
      readRecoveryPending = false
      announce()
      set({
        data: current,
        ephemeral: false,
        notice: 'Storage is available. Your current work is saved locally.',
      })
      return true
    } catch {
      set({
        ephemeral: true,
        notice:
          'Storage is still unavailable. Your current work remains in memory; export before closing.',
      })
      return false
    } finally {
      set((s) => ({ pendingWrites: Math.max(0, s.pendingWrites - 1) }))
    }
  },
  continueWithoutSaving: () => set({ notice: '' }),
  erase: async () => {
    await writeQueue
    try {
      await clearData()
      readRecoveryPending = false
      const empty = emptyData()
      lastStored = empty
      set({ data: empty, ephemeral: false, notice: 'All local learner data deleted.' })
      announce()
    } catch {
      set({ notice: 'Deletion did not complete. Close other Branchcade tabs and retry.' })
      throw new Error('Local deletion failed')
    }
  },
}))
/** Same records, ignoring the write stamp. */
function sameRecords(a: AppExport, b: AppExport) {
  return JSON.stringify({ ...a, exportedAt: '' }) === JSON.stringify({ ...b, exportedAt: '' })
}
channel?.addEventListener('message', () => {
  const state = useSession.getState()
  // A tab with its own writes in flight picks the other tab's records up when it saves.
  if (!state.ready || state.ephemeral || state.pendingWrites || readRecoveryPending) return
  void loadData()
    .then((loaded) => {
      if (useSession.getState().pendingWrites) return
      lastStored = loaded
      if (!sameRecords(loaded, useSession.getState().data)) useSession.setState({ data: loaded })
    })
    .catch(() => undefined)
})
