import { useState } from 'react'
import { useSession } from '../../app/session'
import { downloadFile, exportJson, validateImport } from '../../storage/import-export'
import { DEFAULT_SETTINGS } from '../../storage/migrations'
import type { AppExport, AppSettings } from '../../domain/types'
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
export default function Settings() {
  const data = useSession((s) => s.data),
    replace = useSession((s) => s.replace),
    start = useSession((s) => s.start),
    [notice, setNotice] = useState(''),
    [error, setError] = useState(''),
    [pending, setPending] = useState<AppExport | null>(null)
  const settings = data.profile?.settings ?? DEFAULT_SETTINGS
  const update = async (patch: Partial<AppSettings>) => {
    await start()
    const current = useSession.getState().data
    if (current.profile)
      await replace({
        ...current,
        profile: { ...current.profile, settings: { ...current.profile.settings, ...patch } },
      })
    setNotice('Preferences saved on this device.')
  }
  return (
    <main className="page narrow">
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
        <label className="checkbox">
          <input
            type="checkbox"
            checked={settings.highContrast}
            onChange={(e) => void update({ highContrast: e.target.checked })}
          />
          High contrast
        </label>
        <p className="muted">
          The lab has no autoplay audio. Device reduced-motion preferences are always respected.
        </p>
      </section>
      <section className="paper">
        <h2>Take your work with you</h2>
        <p>
          Exports contain local aliases, programs, predictions and actual results. Keep the file
          private. Imports are checked before replacing this device’s dataset.
        </p>
        <div className="button-row">
          <Button
            variant="outline"
            onClick={() => {
              downloadFile('branchcade-data.json', exportJson(data))
              setNotice('Local data exported.')
            }}
          >
            Export local data
          </Button>
          <label className="file-button">
            Import local data
            <input
              type="file"
              accept="application/json,.json"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                setError('')
                void (async () => {
                  try {
                    if (file.size > 500_000) throw new Error('Import exceeds 500 KB limit')
                    setPending(await validateImport(await file.text()))
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Invalid import')
                  }
                })()
                e.currentTarget.value = ''
              }}
            />
          </label>
        </div>
        <p>
          To delete all learner data, use the explicit confirmation in the Local instructor view.
        </p>
      </section>
      <p role="status">{notice}</p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <Dialog
        open={Boolean(pending)}
        onOpenChange={(open) => {
          if (!open) setPending(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace local data with this import?</DialogTitle>
            <DialogDescription>
              {pending?.attempts.length ?? 0} validated attempts and {pending?.teams.length ?? 0}{' '}
              teams will replace this browser’s dataset. Export your current data first if you need
              it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Keep current data</Button>
            </DialogClose>
            <Button
              onClick={() => {
                if (pending)
                  void replace(pending).then(() => {
                    setPending(null)
                    setNotice('Validated data imported.')
                  })
              }}
            >
              Replace with validated import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
