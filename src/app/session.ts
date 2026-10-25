import { create } from 'zustand'
import type { AppExport, LearnerProfile } from '../domain/types'
import { ExportSchema } from '../domain/schemas'
import { DEFAULT_SETTINGS, emptyData } from '../storage/migrations'
import { loadData, saveReplacement, saveRebased, clearData } from '../storage/repositories'
import { opaqueId } from '../domain/invariants'
import { mergeData } from '../storage/import-export'
let writeQueue = Promise.resolve()
function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(operation)
  writeQueue = result.then(
    () => undefined,
    () => undefined,
  )
  return result
}
let initialization: Promise<void> | undefined
let readRecoveryPending = false
/** The envelope this tab last loaded or wrote. Saves rebase this tab's changes since then
 * onto whatever another tab stored meanwhile, instead of overwriting it (OPUS-001). */
let lastStored: AppExport | null = null
/** Same-origin tabs announce committed writes so their in-memory copies stay current. */
const channel =
  typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('branchcade-local')
const announce = (reset = false) => channel?.postMessage({ type: reset ? 'reset' : 'saved' })
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
  applyImport: (data: AppExport, reviewedBase?: AppExport) => Promise<void>
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
    const base = get().data
    const parsed = ExportSchema.parse({ ...data, exportedAt: base.exportedAt })
    set({ data: parsed })
    if (get().ephemeral) return
    set((s) => ({ pendingWrites: s.pendingWrites + 1 }))
    const operation = enqueue(async () => {
      if (get().ephemeral) return
      const { stored } = await saveRebased(base, parsed)
      lastStored = stored
      // Adopt records another tab saved, unless this tab has already moved on (the next
      // queued write rebases those too).
      if (get().data === parsed) set({ data: stored })
      announce()
    }).catch((error: unknown) =>
      set({
        ephemeral: true,
        notice: `Saving failed. Your current work stays in memory; export it before closing. ${error instanceof Error ? error.message : ''}`,
      }),
    )
    try {
      await operation
    } finally {
      set((s) => ({ pendingWrites: Math.max(0, s.pendingWrites - 1) }))
    }
  },
  applyImport: async (data, reviewedBase) => {
    const base = reviewedBase ?? get().data,
      parsed = ExportSchema.parse(data)
    set((s) => ({ pendingWrites: s.pendingWrites + 1 }))
    try {
      await enqueue(async () => {
        const stored = await saveReplacement(base, parsed)
        lastStored = stored
        readRecoveryPending = false
        set({ data: stored, ephemeral: false, notice: 'Validated local data imported and saved.' })
        announce(true)
      })
    } catch (error) {
      throw new Error(
        `Import was not saved. Your previous local data is unchanged; export it and retry storage. ${error instanceof Error ? error.message : ''}`,
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
    set((s) => ({ pendingWrites: s.pendingWrites + 1 }))
    try {
      return await enqueue(async () => {
        let current = get().data
        let base = lastStored
        if (readRecoveryPending) {
          base = await loadData()
          current = mergeData(base, current)
        }
        const { stored } = await saveRebased(base, current)
        lastStored = stored
        readRecoveryPending = false
        announce()
        set({
          data: stored,
          ephemeral: false,
          notice: 'Storage is available. Your current work is saved locally.',
        })
        return true
      })
    } catch (error) {
      set({
        ephemeral: true,
        notice: `Storage is still unavailable. Your current work remains in memory; export before closing. ${error instanceof Error ? error.message : ''}`,
      })
      return false
    } finally {
      set((s) => ({ pendingWrites: Math.max(0, s.pendingWrites - 1) }))
    }
  },
  continueWithoutSaving: () => set({ notice: '' }),
  erase: async () => {
    set((s) => ({ pendingWrites: s.pendingWrites + 1 }))
    try {
      await enqueue(async () => {
        await clearData()
        readRecoveryPending = false
        const empty = await loadData()
        lastStored = empty
        set({ data: empty, ephemeral: false, notice: 'All local learner data deleted.' })
        announce(true)
      })
    } catch {
      set({ notice: 'Deletion did not complete. Close other Branchcade tabs and retry.' })
      throw new Error('Local deletion failed')
    } finally {
      set((s) => ({ pendingWrites: Math.max(0, s.pendingWrites - 1) }))
    }
  },
}))
/** Same records, ignoring the write stamp. */
function sameRecords(a: AppExport, b: AppExport) {
  return JSON.stringify({ ...a, exportedAt: '' }) === JSON.stringify({ ...b, exportedAt: '' })
}
channel?.addEventListener('message', (event: MessageEvent<unknown>) => {
  const state = useSession.getState()
  if (
    event.data &&
    typeof event.data === 'object' &&
    'type' in event.data &&
    event.data.type === 'reset'
  ) {
    if (state.ready)
      useSession.setState({
        ephemeral: true,
        notice:
          'Local data was reset or replaced in another tab. Export any unsaved work, then reload before continuing.',
      })
    return
  }
  // A tab with its own writes in flight picks the other tab's records up when it saves.
  if (!state.ready || state.ephemeral || state.pendingWrites || readRecoveryPending) return
  const observed = state.data
  void loadData()
    .then((loaded) => {
      if (useSession.getState().pendingWrites || useSession.getState().data !== observed) return
      lastStored = loaded
      if (!sameRecords(loaded, useSession.getState().data)) useSession.setState({ data: loaded })
    })
    .catch(() => undefined)
})
