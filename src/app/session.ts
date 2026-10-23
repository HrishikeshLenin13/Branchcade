import { create } from 'zustand'
import type { AppExport, LearnerProfile } from '../domain/types'
import { DEFAULT_SETTINGS, emptyData } from '../storage/migrations'
import { loadData, saveData, clearData } from '../storage/repositories'
import { opaqueId } from '../domain/invariants'
let writeQueue = Promise.resolve()
let initialization: Promise<void> | undefined
type Session = {
  data: AppExport
  ready: boolean
  notice: string
  ephemeral: boolean
  pendingWrites: number
  initialize: () => Promise<void>
  replace: (data: AppExport) => Promise<void>
  start: () => Promise<LearnerProfile>
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
        set({ data: await loadData(), ready: true })
      } catch {
        set({
          ready: true,
          ephemeral: true,
          notice:
            'Local storage is unavailable or unreadable. This session still works in memory. Export before closing to keep your work.',
        })
      } finally {
        initialization = undefined
      }
    })())
  },
  replace: async (data) => {
    set({ data })
    if (get().ephemeral) return
    set((s) => ({ pendingWrites: s.pendingWrites + 1 }))
    const operation = writeQueue
      .then(() => (get().ephemeral ? undefined : saveData(data)))
      .catch(() => {
        set({
          ephemeral: true,
          notice: 'Saving failed. Your current work stays in memory; export it before closing.',
        })
      })
    writeQueue = operation
    try {
      await operation
    } finally {
      set((s) => ({ pendingWrites: Math.max(0, s.pendingWrites - 1) }))
    }
  },
  start: async () => {
    const existing = get().data.profile
    if (existing) return existing
    const profile: LearnerProfile = {
      schemaVersion: 1,
      id: opaqueId(),
      nickname: `Robot ${opaqueId().slice(0, 4).toUpperCase()}`,
      settings: { ...DEFAULT_SETTINGS },
      completedMissions: [],
      responses: [],
      evidence: [],
      conceptProgress: [],
    }
    await get().replace({ ...get().data, profile })
    return profile
  },
  erase: async () => {
    await writeQueue
    try {
      await clearData()
      set({ data: emptyData(), notice: 'All local learner data deleted.' })
    } catch {
      set({ notice: 'Deletion did not complete. Close other Branchcade tabs and retry.' })
      throw new Error('Local deletion failed')
    }
  },
}))
