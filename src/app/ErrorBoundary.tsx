import { Component, type ReactNode } from 'react'
import { Button } from '../components/ui/button'
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? (
      <main className="page">
        <h1>The lab needs a restart</h1>
        <p>Your saved local work is separate from this screen. Reload to recover.</p>
        <Button onClick={() => location.reload()}>Reload Branchcade</Button>
      </main>
    ) : (
      this.props.children
    )
  }
}
