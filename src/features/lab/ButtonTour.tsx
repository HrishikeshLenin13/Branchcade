import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import { Button } from '../../components/ui/button'

export interface TourStep {
  /** CSS selector of the thing being explained; omit for a welcome card. */
  target?: string
  title: string
  body: string
}

/** What every workbench control does, in words a younger learner can follow. Steps whose
 * target is not on the page (for example the prediction panel in Free Lab) are skipped. */
export const WORKBENCH_TOUR: TourStep[] = [
  {
    title: 'Welcome to the workbench!',
    body: 'This quick tour shows what each button does. Press Next to start, or Skip tutorial if you already know.',
  },
  {
    target: '.world-panel',
    title: 'The robot’s world',
    body: 'This is where your robot drives. Watch it move here after you press Run.',
  },
  {
    target: '.program-panel',
    title: 'Your code',
    body: 'These blocks are the robot’s instructions. Drag blocks to change what it does.',
  },
  {
    target: '.prediction-panel',
    title: 'Make a prediction',
    body: 'Guess what the robot will do first, then press “Lock prediction & run” to check your guess.',
  },
  {
    target: '[data-tour="run"]',
    title: 'Run',
    body: 'Starts the robot. While it is moving this button becomes Pause.',
  },
  {
    target: '[data-tour="stop"]',
    title: 'Stop',
    body: 'Freezes the robot where it is. It works while the robot is moving.',
  },
  {
    target: '[data-tour="stop-edit"]',
    title: 'Stop & Edit',
    body: 'Ends the run and unlocks your code so you can change it and try again.',
  },
  {
    target: '[data-tour="rewind"]',
    title: 'Rewind',
    body: 'Goes back one step so you can see what just happened. It unlocks after a run.',
  },
  {
    target: '[data-tour="step-code"]',
    title: 'Step code',
    body: 'Moves forward one block at a time, so you can follow your code slowly.',
  },
  {
    target: '[data-tour="step-tick"]',
    title: 'Step tick',
    body: 'Moves the robot forward the tiniest bit: one tick is 50 milliseconds.',
  },
  {
    target: '[data-tour="replay"]',
    title: 'Replay',
    body: 'Plays your last run again from the start. It does not count as a new try.',
  },
  {
    target: '[data-tour="speed"]',
    title: 'Speed',
    body: 'Makes the robot slower or faster. Pick 0.25× (slow) to watch every move.',
  },
  {
    target: '[data-tour="save"]',
    title: 'Save',
    body: 'Saves your code and world on this computer so you can come back later.',
  },
  {
    target: '[data-tour="reset-code"]',
    title: 'Reset code',
    body: 'Puts the starting blocks back. Your earlier tries stay saved.',
  },
  {
    target: '[data-tour="reset-sim"]',
    title: 'Reset simulation',
    body: 'Moves the robot back to where it started.',
  },
  {
    target: '[data-tour="briefing"]',
    title: 'Briefing',
    body: 'Shows what to do here again: the mission goal, or how the Free Lab works.',
  },
  {
    target: '[data-tour="help"]',
    title: 'Help',
    body: 'Gives you a hint, one small step at a time.',
  },
  {
    target: '[data-tour="code"]',
    title: 'Hide code / Show code',
    body: 'Hides or shows the code area to give the robot more room.',
  },
  {
    target: '[data-tour="trace"]',
    title: 'Hide trace / Show trace',
    body: 'Hides or shows the trace: the list of everything the robot did, in order.',
  },
  {
    target: '[data-tour="layout"]',
    title: 'Reset layout',
    body: 'Puts every panel back to its normal size.',
  },
  {
    target: '[data-tour="shortcuts"]',
    title: 'Keyboard shortcuts',
    body: 'Lists the keys you can press instead of clicking.',
  },
  {
    target: '[data-tour="tour"]',
    title: 'You’re ready!',
    body: 'Press Button tour any time to see this again. Have fun exploring!',
  },
]

type Box = { top: number; left: number; width: number; height: number }

export function ButtonTour({
  steps = WORKBENCH_TOUR,
  onClose,
}: {
  steps?: TourStep[]
  onClose: () => void
}) {
  // Only explain what is actually on this page. The tour can mount in the same render as the
  // workbench, so look for the controls once they are drawn.
  const [available, setAvailable] = useState(() => steps.filter((s) => !s.target))
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      setAvailable(steps.filter((s) => !s.target || document.querySelector(s.target))),
    )
    return () => cancelAnimationFrame(frame)
  }, [steps])
  const [index, setIndex] = useState(0)
  const [targetBox, setBox] = useState<Box | null>(null)
  const next = useRef<HTMLButtonElement>(null)
  const step = available[index]!
  const last = index === available.length - 1

  useLayoutEffect(() => {
    const el = step.target ? document.querySelector(step.target) : null
    if (!el) return
    const reduce =
      document.documentElement.dataset.motion === 'reduced' ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView?.({
      block: 'center',
      inline: 'nearest',
      behavior: reduce ? 'auto' : 'smooth',
    })
    // Follow the element while the page scrolls or resizes.
    let frame = 0
    const measure = () => {
      const r = el.getBoundingClientRect()
      setBox((old) =>
        old &&
        old.top === r.top &&
        old.left === r.left &&
        old.width === r.width &&
        old.height === r.height
          ? old
          : { top: r.top, left: r.left, width: r.width, height: r.height },
      )
      frame = requestAnimationFrame(measure)
    }
    measure()
    return () => cancelAnimationFrame(frame)
  }, [step])

  useEffect(() => {
    next.current?.focus({ preventScroll: true })
  }, [index])

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onClose])

  // The welcome card has no target, so a box left from another step is ignored.
  const box = step.target ? targetBox : null
  // Keep the card away from the highlighted control.
  const cardAtTop = box ? box.top + box.height / 2 > window.innerHeight / 2 : false
  return (
    <>
      {box ? (
        <div
          className="tour-spotlight"
          aria-hidden
          style={{
            top: box.top - 6,
            left: box.left - 6,
            width: box.width + 12,
            height: box.height + 12,
          }}
        />
      ) : (
        <div className="tour-dim" aria-hidden />
      )}
      <div
        className={`tour-card ${cardAtTop ? 'tour-card-top' : ''}`}
        role="dialog"
        aria-modal="false"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        data-testid="button-tour"
      >
        <p className="tour-count">
          Step {index + 1} of {available.length}
        </p>
        <h2 id="tour-title">{step.title}</h2>
        <p id="tour-body">{step.body}</p>
        <div className="tour-actions">
          <Button variant="ghost" onClick={onClose}>
            <X aria-hidden size={16} />
            Skip tutorial
          </Button>
          <span className="tour-nav">
            <Button
              variant="outline"
              disabled={index === 0}
              title={index === 0 ? 'This is the first step' : undefined}
              onClick={() => setIndex(index - 1)}
            >
              <ArrowLeft aria-hidden size={16} />
              Back
            </Button>
            <Button ref={next} onClick={() => (last ? onClose() : setIndex(index + 1))}>
              {last ? 'Finish' : 'Next'}
              {!last && <ArrowRight aria-hidden size={16} />}
            </Button>
          </span>
        </div>
      </div>
    </>
  )
}
