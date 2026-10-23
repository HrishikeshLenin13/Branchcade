import { create } from 'zustand'
import type { AppExport, LearnerProfile } from '../domain/types'
import { DEFAULT_SETTINGS, emptyData } from '../storage/migrations'
import { loadData, saveData, clearData } from '../storage/repositories'
import { opaqueId } from '../domain/invariants'
let writeQueue = Promise.resolve()
type Session = {
  data: AppExport
  ready: boolean
  notice: string
  ephemeral: boolean
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
  initialize: async () => {
    try {
      set({ data: await loadData(), ready: true })
    } catch {
      set({
        ready: true,
        ephemeral: true,
        notice:
          'Local storage is unavailable or unreadable. This session still works in memory. Export before closing to keep your work.',
      })
    }
  },
  replace: async (data) => {
    set({ data })
    if (get().ephemeral) return
    writeQueue = writeQueue
      .then(() => saveData(data))
      .catch(() => {
        set({
          ephemeral: true,
          notice: 'Saving failed. Your current work stays in memory; export it before closing.',
        })
      })
    await writeQueue
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
