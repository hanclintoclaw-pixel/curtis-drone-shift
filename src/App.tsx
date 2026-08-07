import { useEffect } from 'react'
import './App.css'

declare const __SOURCE_COMMIT__: string

const LEGACY_STORAGE_KEYS = ['cindylou.curtisDroneShift.v2']

const nextUsePrinciples = [
  'Use this space only for the next active daily maintenance, salvage, training, or rebuild prompt.',
  'Keep completed projects on Curtis\'s sheet and campaign wiki instead of preserving old work-order text here.',
  'Treat every future work order as provisional until the GM accepts its report and any sheet-facing effects.',
]

function App() {
  useEffect(() => {
    for (const key of LEGACY_STORAGE_KEYS) {
      window.localStorage.removeItem(key)
    }
  }, [])

  return (
    <main className="garage-shell">
      <section className="hero-panel">
        <div>
          <p className="kicker">Curtis Drone Shift</p>
          <h1>Work-order slate clear</h1>
          <p className="subtitle">
            No active daily work order is queued. Completed project history belongs on Curtis&apos;s
            character sheet and the campaign wiki, not in today&apos;s garage prompt.
          </p>
        </div>

        <div className="hero-stats">
          <article className="shift-card">
            <span>Status</span>
            <strong>Idle</strong>
            <small>Ready for the next GM-approved bluebook track</small>
          </article>
          <article className="money-card">
            <span>Today&apos;s delta</span>
            <strong>0¥</strong>
            <small>No spend, payout, penalty, or sheet change</small>
          </article>
        </div>
      </section>

      <section className="job-banner" aria-label="Current work-order status">
        <article>
          <span>Current active daily update</span>
          <strong>None</strong>
          <p>
            The tool is intentionally empty until a new maintenance, salvage, repair, or rigger
            training prompt is chosen.
          </p>
        </article>
        <article>
          <span>Next queued daily update</span>
          <strong>None</strong>
          <p>
            Add the next track only after the table agrees what Curtis is bluebooking between
            sessions.
          </p>
        </article>
        <article className="ledger-card">
          <span>Report state</span>
          <strong>Clean</strong>
          <p>No copied closeout note is pending.</p>
        </article>
      </section>

      <section className="layout-grid">
        <aside className="side-panel">
          <p className="panel-heading">Operating rule</p>
          <p className="empty">
            This app should be a daily play surface, not an archive. If a project is finished, move
            it to the wiki/sheet and clear the prompt.
          </p>
        </aside>

        <section className="work-panel">
          <div className="stage-card">
            <p className="kicker">No active Work Order</p>
            <h2>Waiting on the next bluebook track</h2>
            <p>
              The slate is ready for a future small morning task: a bite-size garage job, drone
              check, parts search, tactical lesson, or rebuild step that can produce a concise
              report for the GM.
            </p>
            <div className="report-box">
              <h3>Next-version guardrails</h3>
              <ul>
                {nextUsePrinciples.map((principle) => (
                  <li key={principle}>{principle}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <aside className="log-panel">
          <p className="panel-heading">Ledger</p>
          <article>
            <strong>No shift log</strong>
            <p>
              Prior local app state is cleared on load so stale completed-project data cannot keep
              resurfacing for Curtis&apos;s player.
            </p>
          </article>
        </aside>
      </section>

      <footer className="footer-note">
        Build {__SOURCE_COMMIT__} - clear slate for the next Curtis rigger bluebook workflow.
      </footer>
    </main>
  )
}

export default App
