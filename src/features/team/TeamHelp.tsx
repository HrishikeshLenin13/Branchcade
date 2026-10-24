import { useState } from 'react'
import type { TeamSession } from '../../domain/types'
import { curriculumFor } from '../../missions/curriculum'
import { REFERENCE_PROGRAMS } from '../../missions/catalog'
import { pseudocode } from '../../interpreter/pseudocode'
import type { TeamHelpKind } from '../../collaboration/learning'
import { Button } from '../../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog'
export function TeamHelp({
  team,
  busy,
  onRecord,
}: {
  team: TeamSession
  busy: boolean
  onRecord: (kind: TeamHelpKind) => Promise<boolean>
}) {
  const lesson = curriculumFor(team.currentMission),
    history = team.assistance.filter((h) => h.round === team.rotationIndex)
  const seenLevel = history.some((h) => h.kind === 'hint-3')
    ? 2
    : history.some((h) => h.kind === 'hint-2')
      ? 1
      : 0
  const [open, setOpen] = useState(false),
    [level, setLevel] = useState(seenLevel),
    [confirm, setConfirm] = useState(false)
  const solutionShown = history.some((h) => h.kind === 'show-solution')
  if (!lesson) return null
  return (
    <>
      <Button
        variant="outline"
        disabled={busy}
        onClick={() => {
          void onRecord(`hint-${level + 1}` as TeamHelpKind).then((saved) => {
            if (saved) setOpen(true)
          })
        }}
      >
        Team hints
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value)
          if (!value) setConfirm(false)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Shared mission hints</DialogTitle>
            <DialogDescription>
              Help is recorded for this team round. It never edits your code, changes a locked
              prediction or grants individual mastery.
            </DialogDescription>
          </DialogHeader>
          <p className="section-index">Hint {level + 1} of 3</p>
          <p data-testid="team-hint-text">{lesson.hints[level]}</p>
          {level === 2 && (
            <>
              <p>A related program to compare. Your team’s program remains unchanged.</p>
              <pre className="record-code">{pseudocode(lesson.hintExample)}</pre>
            </>
          )}
          <div className="button-row">
            <Button
              variant="outline"
              disabled={busy || level >= 2}
              onClick={() => {
                void onRecord(`hint-${level + 2}` as TeamHelpKind).then((saved) => {
                  if (saved) setLevel((n) => Math.min(2, n + 1))
                })
              }}
            >
              Show next team hint
            </Button>
            {level === 2 && !solutionShown && (
              <Button variant="outline" disabled={busy} onClick={() => setConfirm(true)}>
                Show team solution…
              </Button>
            )}
          </div>
          {confirm && !solutionShown && (
            <section role="alertdialog" aria-label="Show the team solution?">
              <p>
                The solution will be recorded as shared assistance for this round. Existing private
                answers remain locked. This is practice, and never individual mastery evidence.
              </p>
              <div className="button-row">
                <Button
                  disabled={busy}
                  onClick={() => {
                    void onRecord('show-solution').then((saved) => {
                      if (saved) setConfirm(false)
                    })
                  }}
                >
                  Yes, show the team solution
                </Button>
                <Button variant="outline" onClick={() => setConfirm(false)}>
                  Keep investigating
                </Button>
              </div>
            </section>
          )}
          {solutionShown && (
            <section data-testid="team-solution">
              <h3>One working solution</h3>
              <pre className="record-code">
                {pseudocode(REFERENCE_PROGRAMS[team.currentMission]!)}
              </pre>
              <p>
                Read-only example. Rebuild and test any changes in the shared code editor before the
                next private prediction.
              </p>
            </section>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
