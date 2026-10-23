import { useState } from 'react'

export function useEditHistory<T>(initial: T) {
  const [history, setHistory] = useState({ past: [] as T[], present: initial, future: [] as T[] })
  return {
    value: history.present,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    set: (next: T) =>
      setHistory((current) =>
        JSON.stringify(next) === JSON.stringify(current.present)
          ? current
          : { past: [...current.past, current.present].slice(-60), present: next, future: [] },
      ),
    undo: () =>
      setHistory((current) =>
        current.past.length
          ? {
              past: current.past.slice(0, -1),
              present: current.past.at(-1)!,
              future: [current.present, ...current.future],
            }
          : current,
      ),
    redo: () =>
      setHistory((current) =>
        current.future.length
          ? {
              past: [...current.past, current.present],
              present: current.future[0]!,
              future: current.future.slice(1),
            }
          : current,
      ),
  }
}
