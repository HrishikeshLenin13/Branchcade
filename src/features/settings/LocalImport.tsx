import { useState } from 'react'
import type { AppExport } from '../../domain/types'
import { useSession, localProfiles } from '../../app/session'
import { validateImport, mergeData, exportJson } from '../../storage/import-export'
import { Button } from '../../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '../../components/ui/dialog'
export function LocalImport({ label = 'Import local data' }: { label?: string }) {
  const data = useSession((s) => s.data),
    applyImport = useSession((s) => s.applyImport)
  const [pending, setPending] = useState<AppExport | null>(null),
    [mode, setMode] = useState<'merge' | 'replace'>('merge'),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false)
  const collisions = pending
    ? pending.attempts.filter((a) => data.attempts.some((x) => x.id === a.id)).length +
      pending.teams.filter((t) => data.teams.some((x) => x.id === t.id)).length +
      pending.savedLabs.filter((t) => data.savedLabs.some((x) => x.id === t.id)).length
    : 0
  return (
    <div className="local-import">
      <label className="file-button">
        {label}
        <input
          type="file"
          accept="application/json,.json"
          aria-label={label}
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.currentTarget.value = ''
            if (!file) return
            setError('')
            setNotice('Checking the complete record…')
            setBusy(true)
            void (async () => {
              try {
                if (file.size > 500_000) throw new Error('Import exceeds 500 KB limit')
                if (
                  file.type &&
                  !['application/json', 'text/json', 'text/plain'].includes(file.type) &&
                  !file.name.toLowerCase().endsWith('.json')
                )
                  throw new Error('Choose a JSON export file')
                setPending(await validateImport(await file.text()))
                setMode('merge')
                setNotice('')
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Invalid import')
                setNotice('')
              } finally {
                setBusy(false)
              }
            })()
          }}
        />
      </label>
      {busy && <p role="status">Validating and replaying record…</p>}
      {notice && <p role="status">{notice}</p>}
      {error && !pending && (
        <p className="error" role="alert">
          {error} Choose another file or cancel; current records remain saved.
        </p>
      )}
      <Dialog
        open={Boolean(pending)}
        onOpenChange={(open) => {
          if (!open && !busy) setPending(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review validated import</DialogTitle>
            <DialogDescription>
              {pending
                ? `${localProfiles(pending).length} local learners, ${pending.attempts.length} verified attempts, ${pending.teams.length} teams, ${pending.savedLabs.length} saved labs and ${pending.drafts.length} drafts.`
                : ''}{' '}
              Nothing changes until you confirm.
            </DialogDescription>
          </DialogHeader>
          <label>
            Import strategy
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as 'merge' | 'replace')}
              disabled={busy}
            >
              <option value="merge">Merge — keep existing records on ID collision</option>
              <option value="replace">Replace — remove the current dataset</option>
            </select>
          </label>
          <p>
            {mode === 'merge'
              ? `${collisions} attempt, team or lab IDs already exist. Their current versions will remain unchanged. New IDs will be added; the current learner remains selected.`
              : `This replaces ${localProfiles(data).length} learners, ${data.attempts.length} attempts, ${data.teams.length} teams and ${data.savedLabs.length} saved labs. Export the current dataset first if you need a copy.`}
          </p>
          <p className="muted">
            Validation includes strict schema versions, bounded programs, prediction checksums and
            replayed execution. A failed save leaves the current dataset untouched.
          </p>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={busy}>
                Keep current data
              </Button>
            </DialogClose>
            <Button
              disabled={busy}
              onClick={() => {
                if (!pending) return
                setBusy(true)
                setError('')
                void (async () => {
                  try {
                    const reviewedBase = useSession.getState().data
                    const target = mode === 'merge' ? mergeData(reviewedBase, pending) : pending
                    const verified = await validateImport(exportJson(target))
                    await applyImport(verified, reviewedBase)
                    setPending(null)
                    setNotice(`${mode === 'merge' ? 'Merged' : 'Replaced'} validated local data.`)
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Import failed')
                  } finally {
                    setBusy(false)
                  }
                })()
              }}
            >
              {busy
                ? 'Saving validated data…'
                : mode === 'merge'
                  ? 'Merge validated import'
                  : 'Replace with validated import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
