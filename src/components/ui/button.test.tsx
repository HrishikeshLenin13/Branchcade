import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import { Button } from './button'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from './dialog'
afterEach(cleanup)
it('foundation button operates via keyboard, disabled state prevents action', async () => {
  const click = vi.fn(),
    user = userEvent.setup()
  render(
    <>
      <Button onClick={click}>Run</Button>
      <Button disabled title="At the last event" onClick={click}>
        Step forward
      </Button>
    </>,
  )
  await user.tab()
  await user.keyboard('{Enter}')
  expect(click).toHaveBeenCalledTimes(1)
  await user.click(screen.getByRole('button', { name: 'Step forward' }))
  expect(click).toHaveBeenCalledTimes(1)
})
it('Radix dialog exposes a name, traps focus and Escape restores the trigger', async () => {
  const user = userEvent.setup()
  render(
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open review</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Review local data</DialogTitle>
        <DialogDescription>Only this browser’s results.</DialogDescription>
      </DialogContent>
    </Dialog>,
  )
  await user.click(screen.getByRole('button', { name: 'Open review' }))
  expect(screen.getByRole('dialog', { name: 'Review local data' })).toBeVisible()
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Open review' })).toHaveFocus()
})
