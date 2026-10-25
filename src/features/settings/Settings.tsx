import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSession } from '../../app/session'
import { downloadFile, exportJson } from '../../storage/import-export'
import { DEFAULT_SETTINGS } from '../../storage/migrations'
import type { AppSettings } from '../../domain/types'
import { Button } from '../../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogClose,
} from '../../components/ui/dialog'
import { LocalImport } from './LocalImport'
import '../progress/local-records.css'
export default function Settings() {
  const data = useSession((s) => s.data),
    replace = useSession((s) => s.replace),
    start = useSession((s) => s.start),
    ephemeral = useSession((s) => s.ephemeral),
    pendingWrites = useSession((s) => s.pendingWrites),
    retryStorage = useSession((s) => s.retryStorage),
    erase = useSession((s) => s.erase),
    clearLearner = useSession((s) => s.clearLearner),
    clearSavedLabs = useSession((s) => s.clearSavedLabs)
  const [notice, setNotice] = useState(''),
    [error, setError] = useState(''),
    [confirm, setConfirm] = useState<'learner' | 'labs' | 'all' | null>(null),
    [typed, setTyped] = useState(''),
    [busy, setBusy] = useState(false),
    [shortcuts, setShortcuts] = useState(false),
    [storage, setStorage] = useState<{ usage?: number; quota?: number } | null>(null)
  const navigate = useNavigate(),
    settings = data.profile?.settings ?? DEFAULT_SETTINGS
  useEffect(() => {
    void navigator.storage
      ?.estimate?.()
      .then(setStorage)
      .catch(() => setStorage(null))
  }, [])
  const update = async (patch: Partial<AppSettings>) => {
    setNotice('Saving preferences…')
    await start()
    const current = useSession.getState().data
    if (current.profile)
      await replace({
        ...current,
        profile: { ...current.profile, settings: { ...current.profile.settings, ...patch } },
      })
    setNotice(
      useSession.getState().ephemeral
        ? 'Preferences kept in memory; export before closing.'
        : 'Preferences saved on this device.',
    )
  }
  const clear = async () => {
    setBusy(true)
    setError('')
    try {
      if (confirm === 'all') {
        if (typed !== 'ERASE') return
        await erase()
        setConfirm(null)
        navigate('/start')
        return
      }
      if (confirm === 'learner' && data.profile) await clearLearner(data.profile.id)
      if (confirm === 'labs') await clearSavedLabs()
      setConfirm(null)
      setNotice('The selected local data was cleared.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Deletion failed')
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="page narrow local-records">
      <span className="section-index">Your lab, your data</span>
      <h1>Make yourself comfortable.</h1>
      <section className="paper settings-form">
        <h2>Accessibility & appearance</h2>
        <label>
          Theme
          <select
            aria-label="Theme"
            value={settings.theme}
            onChange={(e) => void update({ theme: e.target.value as AppSettings['theme'] })}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">Match device</option>
          </select>
        </label>
        <label>
          Text size
          <select
            aria-label="Text size"
            value={settings.textSize}
            onChange={(e) => void update({ textSize: e.target.value as AppSettings['textSize'] })}
          >
            <option value="standard">Standard</option>
            <option value="large">Large</option>
          </select>
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={settings.reducedMotion}
            onChange={(e) => void update({ reducedMotion: e.target.checked })}
          />
          Reduce motion
        </label>
        <p className="muted">
          When off, the device’s motion preference applies. Reducing motion changes presentation;
          the simulation still uses fixed 50 ms ticks.
        </p>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={settings.highContrast}
            onChange={(e) => void update({ highContrast: e.target.checked })}
          />
          High contrast
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={settings.sensorLabels !== false}
            onChange={(e) => void update({ sensorLabels: e.target.checked })}
          />
          Show labels on sensor graphics
        </label>
        <Button variant="outline" onClick={() => setShortcuts(true)}>
          Keyboard shortcuts
        </Button>
        <p className="muted">Sound: off. This build has no audio effects.</p>
      </section>
      <section className="paper">
        <h2>Take your work with you</h2>
        <p>
          Versioned JSON exports contain the build version, local aliases, preferences, saved
          programs/worlds, drafts, predictions, actual results and team sessions. Files stay under
          your control.
        </p>
        <Button
          variant="outline"
          onClick={() => {
            downloadFile('branchcade-data.json', exportJson(data))
            setNotice('Local data exported.')
          }}
        >
          Export local data
        </Button>
        <LocalImport />
      </section>
      <section className="paper settings-form">
        <h2>Clear selected data</h2>
        <p>
          Choose the scope carefully. Clearing data does not remove export files you downloaded.
        </p>
        <Button variant="outline" disabled={!data.profile} onClick={() => setConfirm('learner')}>
          Clear learner data
        </Button>
        <Button
          variant="outline"
          disabled={!data.savedLabs.length && !data.drafts.some((d) => d.missionId === 'lab')}
          onClick={() => setConfirm('labs')}
        >
          Clear saved labs
        </Button>
        <Button
          variant="destructive"
          onClick={() => {
            setTyped('')
            setConfirm('all')
          }}
        >
          Erase everything
        </Button>
      </section>
      <section className="paper" id="storage">
        <h2>Storage status</h2>
        <p role="status">
          {pendingWrites
            ? 'Saving changes locally…'
            : ephemeral
              ? 'Progress can’t be saved on this device. The current session remains in memory.'
              : 'Local storage is available. Changes are saved automatically.'}
        </p>
        <p>
          Autosave is always on. Reloading while a write is pending prompts you to keep the page
          open.
        </p>
        <p>
          Current export size:{' '}
          {(new TextEncoder().encode(exportJson(data)).byteLength / 1024).toFixed(1)} KB.
          {storage?.usage !== undefined
            ? ` Browser origin usage: ${(storage.usage / 1024).toFixed(1)} KB${storage.quota ? ` of approximately ${(storage.quota / 1024 / 1024).toFixed(0)} MB available quota` : ''}.`
            : ' Browser disk estimates are unavailable.'}
        </p>
        <p className="muted">
          Usage estimates cover this browser origin, not a guarantee of disk space or retention.
          School devices, private browsing and browser cleanup may remove local records.
        </p>
        <Button
          variant="outline"
          disabled={busy || pendingWrites > 0}
          onClick={() => {
            setBusy(true)
            void retryStorage()
              .then((ok) =>
                setNotice(
                  ok
                    ? 'Current work saved locally.'
                    : 'Storage is still unavailable. Export before closing.',
                ),
              )
              .finally(() => setBusy(false))
          }}
        >
          Retry storage
        </Button>
      </section>
      <section className="paper" id="privacy">
        <h2>Privacy, plainly</h2>
        <p>
          No registration, tracking, ads or remote classroom monitoring. Learner records stay in
          this browser: pseudonyms, world/program drafts, predictions, attempts, learning evidence,
          role contributions and preferences. The app does not request names, email addresses or
          other personal information.
        </p>
        <p>
          Exports contain learning records; keep them private. Clearing browser data may erase
          progress. The initial page load needs network unless the browser already has the required
          resources cached; this build does not promise offline installation.
        </p>
        <p>
          Branchcade 0.1.0 ·{' '}
          <Link className="text-link" to="/how-it-works">
            About the lab, algorithms and attribution
          </Link>
        </p>
      </section>
      <p role="status">{notice}</p>
      {error && !confirm && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <Dialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setConfirm(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirm === 'all'
                ? 'Erase everything in this browser?'
                : confirm === 'labs'
                  ? 'Clear all saved labs?'
                  : `Clear ${data.profile?.nickname}’s learner data?`}
            </DialogTitle>
            <DialogDescription>
              {confirm === 'all'
                ? 'This deletes every local learner, preference, attempt, team, assignment, saved lab and draft. Export a copy first if needed. There is no undo.'
                : confirm === 'labs'
                  ? `This deletes ${data.savedLabs.length} saved labs and all free-lab drafts in this browser. Mission progress, learners and teams remain.`
                  : 'This deletes only the selected learner’s solo attempts, evidence and mission drafts. The pseudonym and preferences stay. Other learners, team records and named saved labs remain.'}
            </DialogDescription>
          </DialogHeader>
          {confirm === 'all' && (
            <label>
              Type ERASE to confirm
              <input autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} />
            </label>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={busy}>
                Keep data
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={busy || (confirm === 'all' && typed !== 'ERASE')}
              onClick={() => void clear()}
            >
              {busy
                ? 'Clearing…'
                : confirm === 'all'
                  ? 'Permanently erase everything'
                  : 'Clear selected data'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={shortcuts} onOpenChange={setShortcuts}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Keyboard shortcuts</DialogTitle>
            <DialogDescription>
              Tab moves between controls. Enter or Space activates buttons. Arrow keys change select
              choices and sliders. Escape closes dialogs. Press ? outside an input to open global
              keyboard help. The Blockly workspace supplies its own keyboard navigation.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </main>
  )
}
