import { useState } from 'react'
import { Button } from '../../components/ui/button'
/** Mounted per huddle identity/round, so reload restores a committed value while
 * editing never falls back to that value or leaks a previous round's draft. */
export function TeamHypothesis({
  saved,
  busy,
  onChoose,
  onRun,
}: {
  saved: string
  busy: boolean
  onChoose: (draft: string) => void
  onRun: () => void
}) {
  const [draft, setDraft] = useState(saved)
  const uncommitted = draft.trim() !== saved
  return (
    <>
      <label>
        Team hypothesis
        <textarea maxLength={500} value={draft} onChange={(e) => setDraft(e.target.value)} />
      </label>
      <Button variant="outline" disabled={busy || !draft.trim()} onClick={() => onChoose(draft)}>
        Discuss & choose
      </Button>
      <Button disabled={busy || !saved.trim() || uncommitted} onClick={onRun}>
        Run the shared program
      </Button>
      {uncommitted && (
        <p className="muted">
          Choose your edited hypothesis before running. Previous committed evidence remains saved.
        </p>
      )}
    </>
  )
}
