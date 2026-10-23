import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Link, NavLink, useLocation } from 'react-router-dom'
import { GitBranch, Menu, Settings2, X } from 'lucide-react'
import { useSession } from './session'
import { ErrorBoundary } from './ErrorBoundary'
import Home from '../features/home/Home'
import Onboarding from '../features/onboarding/Onboarding'
import Missions from '../features/missions/Missions'
import { Button } from '../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
} from '../components/ui/dialog'
import { downloadFile, exportJson } from '../storage/import-export'
import { draftRoute, resumableDraft } from '../features/missions/library-model'
const Lab = lazy(() => import('../features/lab/LabLesson'))
const Progress = lazy(() => import('../features/progress/Progress'))
const Team = lazy(() => import('../features/team/Team'))
const Instructor = lazy(() => import('../features/instructor/Instructor'))
const Settings = lazy(() => import('../features/settings/Settings'))
const About = lazy(() => import('../features/about/About'))
const links = [
  ['/missions', 'Missions'],
  ['/lab', 'Lab'],
  ['/team', 'Team mode'],
  ['/progress', 'Progress'],
  ['/instructor', 'Instructor'],
] as const
function Shell() {
  const ready = useSession((s) => s.ready),
    data = useSession((s) => s.data),
    notice = useSession((s) => s.notice),
    pendingWrites = useSession((s) => s.pendingWrites),
    ephemeral = useSession((s) => s.ephemeral),
    initialize = useSession((s) => s.initialize),
    retryStorage = useSession((s) => s.retryStorage),
    continueWithoutSaving = useSession((s) => s.continueWithoutSaving),
    [retrying, setRetrying] = useState(false),
    [credits, setCredits] = useState(false),
    [menu, setMenu] = useState(false),
    [shortcuts, setShortcuts] = useState(false),
    location = useLocation()
  const settings = data.profile?.settings
  const resume = resumableDraft(data)
  useEffect(() => {
    void initialize()
  }, [initialize])
  useEffect(() => {
    if (!pendingWrites) return
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [pendingWrites])
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      document.documentElement.dataset.theme =
        settings?.theme === 'dark' || (settings?.theme === 'system' && mq.matches)
          ? 'dark'
          : 'light'
      document.documentElement.dataset.motion = settings?.reducedMotion ? 'reduced' : 'system'
      document.documentElement.dataset.contrast = settings?.highContrast ? 'high' : 'normal'
      document.documentElement.dataset.text = settings?.textSize ?? 'standard'
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [settings])
  useEffect(() => {
    document.title = `Branchcade · ${location.pathname === '/' ? 'Make the logic click' : location.pathname.split('/')[1]}`
  }, [location.pathname])
  useEffect(() => {
    if (!location.hash) {
      window.scrollTo(0, 0)
      return
    }
    let targetId: string
    try {
      targetId = decodeURIComponent(location.hash.slice(1))
    } catch {
      return
    }
    const scroll = () => {
      const target = document.getElementById(targetId)
      if (!target) return false
      target.scrollIntoView({ block: 'start' })
      return true
    }
    if (scroll()) return
    const observer = new MutationObserver(() => {
      if (scroll()) observer.disconnect()
    })
    observer.observe(document.getElementById('main-content') ?? document.body, {
      childList: true,
      subtree: true,
    })
    return () => observer.disconnect()
  }, [location.pathname, location.hash])
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (
        e.key === '?' &&
        !target.closest('input,textarea,select,[contenteditable],.blockly-container')
      ) {
        e.preventDefault()
        setShortcuts((v) => !v)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="site-header">
        <Link className="brand" to="/" aria-label="Branchcade home">
          <span className="brand-mark">
            <GitBranch size={21} />
          </span>
          branchcade<span className="brand-dot">.</span>
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="header-actions">
          {resume && (
            <Link className="header-resume" to={draftRoute(resume.missionId)}>
              Resume
            </Link>
          )}
          <span className="save-indicator" role="status" aria-label="Local save status">
            {pendingWrites
              ? 'Saving changes locally…'
              : ephemeral
                ? 'In-memory session'
                : 'Saved locally.'}
          </span>
          <NavLink className="how-link" to="/how-it-works">
            How it works
          </NavLink>
          <NavLink className="icon-link" to="/settings" aria-label="Settings">
            <Settings2 size={20} />
          </NavLink>
          <Button
            className="menu-button"
            variant="outline"
            aria-expanded={menu}
            aria-label={menu ? 'Close navigation' : 'Open navigation'}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X size={18} /> : <Menu size={18} />}
          </Button>
        </div>
      </header>
      <Dialog open={menu} onOpenChange={setMenu}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Explore the lab</DialogTitle>
            <DialogDescription>Choose a place to investigate.</DialogDescription>
          </DialogHeader>
          <nav className="mobile-nav" aria-label="Compact navigation">
            {resume && (
              <Link to={draftRoute(resume.missionId)} onClick={() => setMenu(false)}>
                Resume saved activity
              </Link>
            )}
            {links.map(([to, label]) => (
              <Link key={to} to={to} onClick={() => setMenu(false)}>
                {label}
              </Link>
            ))}
            <Link to="/how-it-works" onClick={() => setMenu(false)}>
              How it works
            </Link>
            <Link to="/settings" onClick={() => setMenu(false)}>
              Settings
            </Link>
          </nav>
        </DialogContent>
      </Dialog>
      {notice && (
        <div className="storage-notice" role={ephemeral ? 'alert' : 'status'}>
          <div>
            {ephemeral && <strong>Progress can’t be saved on this device. </strong>}
            {notice}
          </div>
          {ephemeral && (
            <div className="button-row">
              <Button
                variant="outline"
                disabled={retrying}
                onClick={() => {
                  setRetrying(true)
                  void retryStorage().finally(() => setRetrying(false))
                }}
              >
                {retrying ? 'Retrying…' : 'Retry'}
              </Button>
              <Button
                variant="outline"
                onClick={() => downloadFile('branchcade-current-session.json', exportJson(data))}
              >
                Export current session
              </Button>
              <Button variant="ghost" onClick={continueWithoutSaving}>
                Continue without saving
              </Button>
            </div>
          )}
        </div>
      )}
      <div id="main-content" tabIndex={-1}>
        {!ready ? (
          <main className="page">
            <p role="status">Opening your local lab…</p>
          </main>
        ) : (
          <Suspense
            fallback={
              <main className="page">
                <p role="status">Opening the workbench…</p>
              </main>
            }
          >
            <ErrorBoundary key={location.pathname}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/start" element={<Onboarding />} />
                <Route path="/missions" element={<Missions />} />
                <Route path="/missions/:slug" element={<Lab key="mission" />} />
                <Route path="/lab" element={<Lab key="free-lab" free />} />
                <Route path="/team" element={<Team />} />
                <Route path="/progress" element={<Progress />} />
                <Route path="/instructor" element={<Instructor />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/how-it-works" element={<About />} />
                <Route
                  path="*"
                  element={
                    <main className="page narrow">
                      <span className="section-index">Wrong turn, easy recovery</span>
                      <h1>This path isn’t in the lab.</h1>
                      <p>We couldn’t find that page. Your saved work is still here.</p>
                      <div className="button-row">
                        <Button asChild>
                          <Link to="/">Back to the lab entrance</Link>
                        </Button>
                        <Button asChild variant="outline">
                          <Link to="/missions">Browse missions</Link>
                        </Button>
                      </div>
                    </main>
                  }
                />
              </Routes>
            </ErrorBoundary>
          </Suspense>
        )}
      </div>
      <footer className="site-footer">
        <div className="footer-brand">
          branchcade. <span className="muted">Make the logic click.</span>
          <p className="muted">
            A virtual robotics learning tool. Not affiliated with LEGO or FIRST.
          </p>
        </div>
        <div className="footer-links">
          <Link to="/how-it-works">About</Link>
          <Link to="/settings#privacy">Privacy</Link>
          <button onClick={() => setCredits(true)}>Credits</button>
          <a
            href="https://github.com/HrishikeshLenin13/Branchcade"
            target="_blank"
            rel="noreferrer"
          >
            Source / GitHub
          </a>
          <button className="text-link shortcut-button" onClick={() => setShortcuts(true)}>
            Keyboard help
          </button>
          <span className="mono">v0.1.0</span>
        </div>
      </footer>
      <Dialog open={credits} onOpenChange={setCredits}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Made for curious roboticists</DialogTitle>
            <DialogDescription>
              Branchcade uses original SVG robot and world artwork, Geist for interface text, IBM
              Plex Mono for code and measurements, and open-source software including React, Blockly
              and Radix UI. Source and license notices are available in the project repository.
              Development is AI-assisted; no classroom effectiveness study is claimed.
            </DialogDescription>
          </DialogHeader>
          <a
            className="text-link"
            href="https://github.com/HrishikeshLenin13/Branchcade/blob/main/docs/LICENSE_NOTICES.md"
            target="_blank"
            rel="noreferrer"
          >
            View license notices
          </a>
        </DialogContent>
      </Dialog>
      <Dialog open={shortcuts} onOpenChange={setShortcuts}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Keyboard help</DialogTitle>
            <DialogDescription>
              Tab moves between controls. Enter or Space activates buttons. Arrow keys change radio
              choices and sliders. Escape closes dialogs. Press ? outside an input to open this
              guide. Blockly uses its own workspace navigation.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  )
}
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </ErrorBoundary>
  )
}
