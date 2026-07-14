import { useEffect, useMemo, useState } from 'react'
import './App.css'

declare const __SOURCE_COMMIT__: string

type JobStageId = 'intake' | 'diagnose' | 'repair' | 'test' | 'closeout'
type RollTone = 'success' | 'failure' | 'neutral'

interface SkillProfile {
  electronics: number
  electronicsBR: number
  carBR: number
  rotorAircraftBR: number
  vectorThrustBR: number
  negotiation: number
}

interface JobAction {
  label: string
  detail: string
  skill: keyof SkillProfile
  targetNumber: number
  requiredSuccesses: number
  onSuccess: string
  onFailure: string
  nuyenSuccess: number
  nuyenFailure: number
  qualitySuccess: number
  qualityFailure: number
}

interface JobStage {
  id: JobStageId
  title: string
  station: string
  description: string
  actions: JobAction[]
}

interface JobProfile {
  id: string
  title: string
  asset: string
  customer: string
  risk: 'low' | 'medium' | 'shop mess'
  hook: string
  baseline: string
  stages: JobStage[]
}

interface LogEntry {
  id: string
  stage: string
  action: string
  skill: string
  targetNumber: number
  dice: number[]
  successes: number
  requiredSuccesses: number
  outcome: 'success' | 'failure'
  nuyenDelta: number
  qualityDelta: number
  note: string
}

interface ShiftState {
  version: 1
  jobId: string
  currentStageId: JobStageId
  completedStageIds: JobStageId[]
  nuyenDelta: number
  quality: number
  log: LogEntry[]
  reportCopied: boolean
}

interface RollFeedback {
  id: string
  tone: RollTone
  title: string
  detail: string
}

const STORAGE_KEY = 'cindylou.curtisDroneShift.v1'
const CINDY_LOU_BOT_MENTION = '<@1474892346545012746>'

const skillLabels: Record<keyof SkillProfile, string> = {
  electronics: 'Electronics',
  electronicsBR: 'Electronics B/R',
  carBR: 'Car B/R',
  rotorAircraftBR: 'Rotor Aircraft B/R',
  vectorThrustBR: 'Vector Thrust Aircraft B/R',
  negotiation: 'Negotiation / parts scrounge',
}

const seedSkills: SkillProfile = {
  electronics: 6,
  electronicsBR: 1,
  carBR: 3,
  rotorAircraftBR: 3,
  vectorThrustBR: 3,
  negotiation: 2,
}

const tutorialJob: JobProfile = {
  id: 'tutorial-3-belmont-track-tension-creep',
  title: 'Tutorial 3: Belmont\'s Track-Tension Creep',
  asset: 'Belmont - tracked drone / shop hauler',
  customer: 'Taco, because Belmont is leaving little rubber commas across the back hall like it is signing receipts',
  risk: 'low',
  hook: 'Belmont rolls fine until it turns left, then the right track gives a dry little chirp, drops a curl of black dust, and acts like the kitchen tile personally insulted it.',
  baseline: 'Tutorial 2 rotates out cleanly: completed reports stay logged, and any untouched copy is Discarded with no change, no nuyen movement, no drone state change, and no penalty. Tutorial 3 stays near break-even unless Curtis chooses to submit the final report.',
  stages: [
    {
      id: 'intake',
      title: 'Intake the tread complaint',
      station: 'Back hall tile',
      description: 'Safe Belmont, sweep the rubber dust, and confirm the chirp is track tension instead of a motor controller getting dramatic.',
      actions: [
        {
          label: 'Tag, lift, and roll by hand',
          detail: 'Power Belmont down, get the track clear of the tile, and feel for a tight spot before tools touch the idler.',
          skill: 'electronics',
          targetNumber: 4,
          requiredSuccesses: 1,
          onSuccess: 'The chirp is bounded to the right-side idler run before the track comes off.',
          onFailure: 'Belmont is safe, but Curtis has to replace one chewed rubber pad from the spare bin.',
          nuyenSuccess: 0,
          nuyenFailure: -10,
          qualitySuccess: 1,
          qualityFailure: 0,
        },
      ],
    },
    {
      id: 'diagnose',
      title: 'Diagnose the creeping tension',
      station: 'Milk-crate work stand',
      description: 'Check the idler cam, drive sprocket teeth, and the grit-packed adjuster screw that smells faintly like fryer oil.',
      actions: [
        {
          label: 'Gauge the idler and sprocket',
          detail: 'Measure track sag, inspect the adjuster threads, and mark whether the chirp is grit, stretch, or a bent bracket.',
          skill: 'electronics',
          targetNumber: 5,
          requiredSuccesses: 2,
          onSuccess: 'The culprit is a grit-packed adjuster screw and one cheap washer walking sideways under load.',
          onFailure: 'The adjuster fault is found late after wasting time chasing sprocket ghosts.',
          nuyenSuccess: 15,
          nuyenFailure: -20,
          qualitySuccess: 2,
          qualityFailure: -1,
        },
      ],
    },
    {
      id: 'repair',
      title: 'Scrounge the shim stack',
      station: 'Coffee can of almost-washers',
      description: 'Find a clean spacer and rubber pad without buying a full track kit for a problem the size of Taco\'s patience.',
      actions: [
        {
          label: 'Sort a clean shim and pad',
          detail: 'Match the washer thickness, trim a fresh pad, and throw away the pieces that look like they came off a lawn chair.',
          skill: 'electronicsBR',
          targetNumber: 4,
          requiredSuccesses: 1,
          onSuccess: 'The spare-bin parts are clean enough to save a small purchase.',
          onFailure: 'The bin is mostly lies today, so Curtis burns a few nuyen on fresh small hardware.',
          nuyenSuccess: 35,
          nuyenFailure: -25,
          qualitySuccess: 1,
          qualityFailure: 0,
        },
      ],
    },
    {
      id: 'test',
      title: 'Reset the track run',
      station: 'Greasy bench mat',
      description: 'Clean the adjuster, set the shim stack, tension the right track, and keep the left side honest so Belmont does not crab-walk into the salsa crates.',
      actions: [
        {
          label: 'Clean, shim, and tension',
          detail: 'Back the adjuster out, scrub the threads, set the shim, and tension the track until the sag looks boring.',
          skill: 'carBR',
          targetNumber: 4,
          requiredSuccesses: 1,
          onSuccess: 'Belmont sits square, rolls smooth, and no longer writes rubber punctuation on the tile.',
          onFailure: 'The track runs, but the adjuster fights back and eats extra shop consumables.',
          nuyenSuccess: -30,
          nuyenFailure: -55,
          qualitySuccess: 2,
          qualityFailure: 0,
        },
      ],
    },
    {
      id: 'closeout',
      title: 'Tile-loop test and closeout',
      station: 'Taco\'s back hall',
      description: 'Run Belmont through a slow figure-eight, check for fresh dust, and write the maintenance note before Taco makes it carry onions.',
      actions: [
        {
          label: 'Run the clean tile loop',
          detail: 'Test forward, turn left, turn right, and log whether the track stays quiet under shop-floor load.',
          skill: 'carBR',
          targetNumber: 3,
          requiredSuccesses: 1,
          onSuccess: 'The report is clean, Belmont earns a tiny shop-credit bump, and Cindy has a tidy maintenance event to ingest.',
          onFailure: 'The report is usable, but flags a mild follow-up squeak for GM review if anyone cares later.',
          nuyenSuccess: 40,
          nuyenFailure: -10,
          qualitySuccess: 1,
          qualityFailure: 0,
        },
      ],
    },
  ],
}

const jobs = [tutorialJob]

function freshShift(job: JobProfile): ShiftState {
  return {
    version: 1,
    jobId: job.id,
    currentStageId: job.stages[0].id,
    completedStageIds: [],
    nuyenDelta: 0,
    quality: 0,
    log: [],
    reportCopied: false,
  }
}

function rollOpenD6(targetNumber: number) {
  let total = 0
  let roll = 0
  do {
    roll = Math.floor(Math.random() * 6) + 1
    total += roll
  } while (roll === 6 && targetNumber > 6)
  return total
}

function rollDice(count: number, targetNumber: number) {
  return Array.from({ length: Math.max(1, count) }, () => rollOpenD6(targetNumber))
}

function successesFor(dice: number[], targetNumber: number) {
  return dice.filter((die) => die >= targetNumber).length
}

function nextStageId(job: JobProfile, stageId: JobStageId) {
  const index = job.stages.findIndex((stage) => stage.id === stageId)
  return job.stages[index + 1]?.id
}

function nuyenText(value: number) {
  if (value > 0) return `+¥${value}`
  if (value < 0) return `-¥${Math.abs(value)}`
  return '¥0'
}

function nuyenTone(value: number) {
  if (value > 0) return 'positive'
  if (value < 0) return 'negative'
  return 'neutral'
}

function nuyenLabel(value: number) {
  if (value > 0) return 'projected payoff'
  if (value < 0) return 'projected cost'
  return 'break-even so far'
}

function qualityLabel(quality: number) {
  if (quality >= 6) return 'Clean shop win'
  if (quality >= 3) return 'Solid repair'
  if (quality >= 0) return 'Break-even maintenance'
  return 'Needs GM review'
}

function loadShift(): ShiftState {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return freshShift(tutorialJob)
  try {
    const parsed = JSON.parse(stored) as Partial<ShiftState>
    if (parsed.version === 1 && parsed.jobId === tutorialJob.id && parsed.currentStageId) {
      return {
        ...freshShift(tutorialJob),
        ...parsed,
        completedStageIds: parsed.completedStageIds ?? [],
        log: parsed.log ?? [],
        reportCopied: parsed.reportCopied ?? false,
      }
    }
  } catch {
    // Fall through to a clean tutorial shift.
  }
  return freshShift(tutorialJob)
}

function buildReport(job: JobProfile, shift: ShiftState) {
  const finalStatus = shift.currentStageId === 'closeout' && shift.completedStageIds.includes('closeout') ? 'Complete' : 'In progress'
  const rollLines = shift.log.length
    ? shift.log.map((entry, index) => `${index + 1}. ${entry.stage}: ${entry.successes}/${entry.requiredSuccesses} success(es) with ${entry.skill} vs TN ${entry.targetNumber}; ${entry.outcome}; ${nuyenText(entry.nuyenDelta)}; ${entry.note}`)
    : ['No rolls recorded yet.']

  return [
    `${CINDY_LOU_BOT_MENTION} CURTIS DRONE SHIFT REPORT`,
    `Job: ${job.title}`,
    `Asset: ${job.asset}`,
    `Customer/context: ${job.customer}`,
    `Status: ${finalStatus}`,
    `Nuyen delta: ${nuyenText(shift.nuyenDelta)}`,
    `Maintenance quality: ${qualityLabel(shift.quality)} (${shift.quality})`,
    'Notable work log:',
    ...rollLines,
    `Cindy ingest/closeout note: When this report is posted with ${CINDY_LOU_BOT_MENTION} pinged, ingest it into campaign memory as a Curtis downtime/maintenance event, mark this Drone Shift Work Order as Job Completed, and do not apply permanent drone stat changes unless the GM confirms them.`,
  ].join('\n')
}

function App() {
  const [shift, setShift] = useState<ShiftState>(() => loadShift())
  const [skills, setSkills] = useState<SkillProfile>(seedSkills)
  const [selectedActionIndex, setSelectedActionIndex] = useState(0)
  const [feedback, setFeedback] = useState<RollFeedback | undefined>()

  const job = jobs.find((candidate) => candidate.id === shift.jobId) ?? tutorialJob
  const currentStage = job.stages.find((stage) => stage.id === shift.currentStageId) ?? job.stages[0]
  const selectedAction = currentStage.actions[selectedActionIndex] ?? currentStage.actions[0]
  const isComplete = shift.completedStageIds.includes('closeout')
  const tutorialLabel = job.title.split(':')[0]
  const report = useMemo(() => buildReport(job, shift), [job, shift])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(shift))
  }, [shift])

  useEffect(() => {
    setSelectedActionIndex(0)
  }, [shift.currentStageId])

  function setSkill(skill: keyof SkillProfile, value: number) {
    setSkills((current) => ({ ...current, [skill]: Number.isFinite(value) ? value : 0 }))
  }

  function resolveAction(action: JobAction) {
    if (isComplete) return
    const dicePool = skills[action.skill]
    const dice = rollDice(dicePool, action.targetNumber)
    const successes = successesFor(dice, action.targetNumber)
    const passed = successes >= action.requiredSuccesses
    const nuyenDelta = passed ? action.nuyenSuccess : action.nuyenFailure
    const qualityDelta = passed ? action.qualitySuccess : action.qualityFailure
    const next = nextStageId(job, currentStage.id)
    const entry: LogEntry = {
      id: `log-${Date.now()}`,
      stage: currentStage.title,
      action: action.label,
      skill: skillLabels[action.skill],
      targetNumber: action.targetNumber,
      dice,
      successes,
      requiredSuccesses: action.requiredSuccesses,
      outcome: passed ? 'success' : 'failure',
      nuyenDelta,
      qualityDelta,
      note: passed ? action.onSuccess : action.onFailure,
    }

    setShift((current) => ({
      ...current,
      currentStageId: next ?? current.currentStageId,
      completedStageIds: [...new Set([...current.completedStageIds, currentStage.id])],
      nuyenDelta: current.nuyenDelta + nuyenDelta,
      quality: current.quality + qualityDelta,
      log: [...current.log, entry],
      reportCopied: false,
    }))
    setFeedback({
      id: entry.id,
      tone: passed ? 'success' : 'failure',
      title: passed ? 'Clean work' : 'Complication',
      detail: `${successes}/${action.requiredSuccesses} success(es). ${entry.note}`,
    })
  }

  function resetShift() {
    setShift(freshShift(tutorialJob))
    setFeedback(undefined)
  }

  function copyReport() {
    void navigator.clipboard.writeText(report)
    setShift((current) => ({ ...current, reportCopied: true }))
  }

  return <main className="garage-shell">
    <header className="hero-panel">
      <div>
        <p className="kicker">Curtis garage downtime // visual mockup</p>
        <h1>Drone Shift</h1>
        <p className="subtitle">A guided repair-and-maintenance work-order tool for drones, vehicles, Taco shop problems, and Curtis-grade DIY decisions.</p>
      </div>
      <div className="hero-stats">
        <div className="shift-card">
          <span>Today's ticket</span>
          <strong>{tutorialLabel}</strong>
          <small>Daily prototype rotation. Missed prior tickets discard cleanly.</small>
        </div>
        <div className={`money-card ${nuyenTone(shift.nuyenDelta)}`}>
          <span>Running total</span>
          <strong>{nuyenText(shift.nuyenDelta)}</strong>
          <small>{nuyenLabel(shift.nuyenDelta)} · {qualityLabel(shift.quality)}</small>
        </div>
      </div>
    </header>

    <section className="job-banner">
      <article>
        <span>Work order</span>
        <strong>{job.title}</strong>
        <p>{job.hook}</p>
      </article>
      <article>
        <span>Asset</span>
        <strong>{job.asset}</strong>
        <p>{job.baseline}</p>
      </article>
      <article className={`ledger-card ${nuyenTone(shift.nuyenDelta)}`}>
        <span>Shop ledger</span>
        <strong>{nuyenText(shift.nuyenDelta)}</strong>
        <p>{nuyenLabel(shift.nuyenDelta)} · {qualityLabel(shift.quality)} · quality {shift.quality}</p>
      </article>
    </section>

    <section className="layout-grid">
      <aside className="side-panel">
        <div className="panel-heading">Curtis dummy skills</div>
        {(Object.keys(skills) as Array<keyof SkillProfile>).map((skill) => <label key={skill}>
          <span>{skillLabels[skill]}</span>
          <input type="number" min="0" value={skills[skill]} onChange={(event) => setSkill(skill, Number(event.target.value))} />
        </label>)}
        <button onClick={resetShift}>Reset {tutorialLabel}</button>
      </aside>

      <section className="work-panel">
        <div className="stage-track">
          {job.stages.map((stage) => {
            const state = stage.id === currentStage.id && !isComplete ? 'current' : shift.completedStageIds.includes(stage.id) ? 'done' : 'waiting'
            return <article key={stage.id} className={state}>
              <span>{stage.station}</span>
              <strong>{stage.title}</strong>
            </article>
          })}
        </div>

        <article className="stage-card">
          <p className="kicker">Current station</p>
          <h2>{isComplete ? 'Ticket closed' : currentStage.title}</h2>
          <p>{isComplete ? 'The tutorial maintenance ticket is ready to export for Cindy/GM review.' : currentStage.description}</p>
          {feedback && <div key={feedback.id} className={`feedback ${feedback.tone}`}><strong>{feedback.title}</strong><span>{feedback.detail}</span></div>}

          {!isComplete && <>
            <div className="action-list">
              {currentStage.actions.map((action, index) => <button key={action.label} className={selectedActionIndex === index ? 'selected' : ''} onClick={() => setSelectedActionIndex(index)}>
                <strong>{action.label}</strong>
                <span>{action.detail}</span>
                <small>{skillLabels[action.skill]} {skills[action.skill]} vs TN {action.targetNumber}; need {action.requiredSuccesses}+ success(es)</small>
              </button>)}
            </div>
            <div className="roll-preview">
              <h3>{selectedAction.label}</h3>
              <p>Roll {skills[selectedAction.skill]} dice vs TN {selectedAction.targetNumber}. This step changes the running total immediately after the roll.</p>
              <div className="swing-grid">
                <article className={`money-swing ${nuyenTone(selectedAction.nuyenSuccess)}`}><span>Success swing</span><strong>{nuyenText(selectedAction.nuyenSuccess)}</strong></article>
                <article className={`money-swing ${nuyenTone(selectedAction.nuyenFailure)}`}><span>Failure swing</span><strong>{nuyenText(selectedAction.nuyenFailure)}</strong></article>
              </div>
              <button className="big-button" onClick={() => resolveAction(selectedAction)}>Roll this work step</button>
            </div>
          </>}

          {isComplete && <div className="report-box">
            <label htmlFor="shift-report"><span>Discord-ready Cindy ingest report</span></label>
            <textarea id="shift-report" readOnly value={report} rows={Math.min(18, Math.max(10, report.split('\n').length))} />
            <button className="big-button" onClick={copyReport}>{shift.reportCopied ? 'Copied report' : 'Copy report'}</button>
          </div>}
        </article>
      </section>

      <aside className="log-panel">
        <div className="panel-heading">Work log</div>
        {shift.log.length === 0 && <p className="empty">No wrench marks yet.</p>}
        {shift.log.map((entry) => <article key={entry.id} className={entry.outcome}>
          <strong>{entry.stage}</strong>
          <span>{entry.action}</span>
          <p>{entry.successes}/{entry.requiredSuccesses} success(es) with {entry.skill}; dice [{entry.dice.join(', ')}]</p>
          <small>{nuyenText(entry.nuyenDelta)} - {entry.note}</small>
        </article>)}
      </aside>
    </section>

    <footer className="footer-note">Build {__SOURCE_COMMIT__} - daily prototype. Missed work orders discard with no penalty; no automatic canonical drone or vehicle changes.</footer>
  </main>
}

export default App
