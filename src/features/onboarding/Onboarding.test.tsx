import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import Onboarding, { friendlyAlias, validNickname } from './Onboarding'
import { useSession } from '../../app/session'
import { emptyData } from '../../storage/migrations'

beforeEach(() =>
  useSession.setState({
    data: emptyData(),
    ready: true,
    ephemeral: true,
    pendingWrites: 0,
    notice: '',
  }),
)
afterEach(cleanup)
function open() {
  render(
    <MemoryRouter initialEntries={['/start']}>
      <Routes>
        <Route path="/start" element={<Onboarding />} />
        <Route path="/lab" element={<h1>Free lab destination</h1>} />
        <Route path="/team" element={<h1>Local team destination</h1>} />
        <Route path="/missions/m01" element={<h1>Mission destination</h1>} />
      </Routes>
    </MemoryRouter>,
  )
}
it('retains a nickname across Back and routes the chosen activity with a saved local alias', async () => {
  const user = userEvent.setup()
  open()
  await user.click(screen.getByRole('button', { name: /^Next/ }))
  const nickname = screen.getByRole('textbox', { name: 'Your local nickname' })
  await user.clear(nickname)
  await user.type(nickname, 'Clever Otter 42')
  await user.click(screen.getByRole('button', { name: /Back/ }))
  await user.click(screen.getByRole('button', { name: /^Next/ }))
  expect(screen.getByRole('textbox')).toHaveValue('Clever Otter 42')
  await user.click(screen.getByRole('button', { name: /^Next/ }))
  await user.click(screen.getByRole('radio', { name: 'Explore free lab' }))
  await user.click(screen.getByRole('button', { name: /Create my local alias/ }))
  expect(await screen.findByRole('heading', { name: 'Free lab destination' })).toBeVisible()
  expect(useSession.getState().data.profile?.nickname).toBe('Clever Otter 42')
})
it('validates a pseudonym before advancing and generates safe names', async () => {
  const user = userEvent.setup()
  open()
  await user.click(screen.getByRole('button', { name: /^Next/ }))
  const nickname = screen.getByRole('textbox')
  await user.clear(nickname)
  await user.type(nickname, '<name>')
  expect(screen.getByRole('button', { name: /^Next/ })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Shuffle name' }))
  expect(screen.getByRole('button', { name: /^Next/ })).toBeEnabled()
  expect(validNickname(friendlyAlias())).toBe(true)
  expect(validNickname('a'.repeat(21))).toBe(false)
})
it('team selection defaults to a real local team destination; skipping creates no identifying data', async () => {
  const user = userEvent.setup()
  open()
  await user.click(screen.getByRole('radio', { name: /Learning with a team/ }))
  await user.click(screen.getByRole('button', { name: 'Skip intro' }))
  expect(await screen.findByRole('heading', { name: 'Local team destination' })).toBeVisible()
  expect(validNickname(useSession.getState().data.profile!.nickname)).toBe(true)
})
