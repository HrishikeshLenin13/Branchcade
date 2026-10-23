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
        <p>This screen could not open. Your saved local work is separate from it.</p>
        <div className="button-row">
          <Button onClick={() => this.setState({ failed: false })}>Try again</Button>
          <Button asChild variant="outline">
            <a href="/missions">Go to missions</a>
          </Button>
          <Button variant="ghost" onClick={() => location.reload()}>
            Reload Branchcade
          </Button>
        </div>
      </main>
    ) : (
      this.props.children
    )
  }
}
