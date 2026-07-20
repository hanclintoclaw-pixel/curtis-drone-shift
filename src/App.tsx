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
  effectNote?: string
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
  effectNote?: string
  note: string
}

interface ActionRuntime {
  targetNumber: number
  requiredSuccesses: number
  nuyenSuccess: number
  nuyenFailure: number
  qualitySuccess: number
  qualityFailure: number
  modifierNote?: string
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

const activeJob: JobProfile = {
  id: 'tacos-cooler-fan-chirp',
  title: "Taco's Cooler Fan Chirp",
  asset: "Taco's walk-in cooler fan - countertop control lead, tired sleeve bearing, and a cowling that sings like a mad cricket",
  customer: 'Taco shop back room, after the walk-in cooler started squealing every time the compressor kicked on behind the salsa buckets',
  risk: 'low',
  hook: 'The cooler is still cold, but the fan gives a thin little chirp under load, the kind that makes Taco glare at the ceiling like it owes him rent.',
  baseline: 'The prior work order rotates out cleanly: completed reports stay logged, and any untouched copy is Discarded with no change, no nuyen movement, no drone state change, and no penalty. This shift stays near break-even unless Curtis chooses to submit the final report.',
  stages: [
    {
      id: 'intake',
      title: 'Kill power and clear the shelf',
      station: 'Cooler cutoff and towel stack',
      description: 'Lock out the cooler fan, move the sauce tubs, and make sure Curtis is dealing with a bearing chirp instead of wet wiring or a dying compressor.',
      actions: [
        {
          label: 'Safe the fan and inspect the control lead',
          detail: 'Cut power, tag the switch, and check for damp contacts before Taco turns a cooler problem into a shop-floor lightning lesson.',
          skill: 'electronics',
          targetNumber: 4,
          requiredSuccesses: 1,
          onSuccess: 'Curtis confirms the lead is dry, the fan is isolated, and the squeal is mechanical instead of spicy electrical nonsense.',
          onFailure: 'The fan is safe, but Curtis burns a shop towel and a replacement spade cover proving the wet spot is just condensation.',
          nuyenSuccess: 0,
          nuyenFailure: -10,
          qualitySuccess: 1,
          qualityFailure: 0,
        },
      ],
    },
    {
      id: 'diagnose',
      title: 'Trace the cooler chirp',
      station: 'Milk crate and stethoscope probe',
      description: 'Spin the fan by hand, listen near the motor shell, and separate a tired bearing from a bent cowling tab before Curtis starts buying parts.',
      actions: [
        {
          label: 'Pinpoint the bearing squeal',
          detail: 'Use the probe, a finger spin, and one deeply suspicious look at the cowling screw that keeps backing itself out.',
          skill: 'electronics',
          targetNumber: 5,
          requiredSuccesses: 2,
          onSuccess: 'Curtis catches the dry sleeve bearing early and finds the cowling tab before it starts shaving the fan blade.',
          onFailure: 'The chirp hides until Curtis cleans one innocent bracket and spends extra tape marking the real rub point.',
          nuyenSuccess: 10,
          nuyenFailure: -25,
          qualitySuccess: 2,
          qualityFailure: -1,
        },
      ],
    },
    {
      id: 'repair',
      title: 'Choose the bearing fix',
      station: 'Salvage drawer vs parts kit',
      description: 'Decide whether to fit a clean salvaged sleeve bushing or spend for a fresh bearing kit. The choice changes the cooler-load spin test later.',
      actions: [
        {
          label: 'Fit a salvaged sleeve bushing',
          detail: 'Clean up a donor bushing from the junk drawer, dress the shaft, and save parts money with a fix that needs a careful final spin.',
          skill: 'electronicsBR',
          targetNumber: 4,
          requiredSuccesses: 1,
          onSuccess: 'The salvaged bushing seats square and the fan stops doing its mad cricket impression on the bench.',
          onFailure: 'The bushing works, but Curtis trashes one donor sleeve and has to polish the shaft longer than anyone should have to.',
          nuyenSuccess: 60,
          nuyenFailure: -20,
          qualitySuccess: 1,
          qualityFailure: 0,
          effectNote: 'Follow-up: salvaged bushing saves parts money but adds cooler-load spin test TN +1 and the final report notes the thrift fit.',
        },
        {
          label: 'Install a fresh bearing kit',
          detail: 'Spend for the sealed kit, square the mount, and retire the old sleeve before it teaches the whole cooler to whistle.',
          skill: 'electronicsBR',
          targetNumber: 4,
          requiredSuccesses: 1,
          onSuccess: 'The fresh bearing seats clean and makes the fan sound boring in the best possible way.',
          onFailure: 'The kit works, but one cheap clip bends and Curtis has to open the second little bag of parts.',
          nuyenSuccess: -45,
          nuyenFailure: -85,
          qualitySuccess: 2,
          qualityFailure: 1,
          effectNote: 'Follow-up: fresh bearing kit stabilizes the fan; cooler-load spin test TN -1 and the final report notes the paid parts.',
        },
      ],
    },
    {
      id: 'test',
      title: 'Cooler-load spin test',
      station: 'Walk-in door propped with a mop bucket',
      description: 'Run the fan under compressor load, listen for chirp return, and make sure the airflow stays steady without turning the salsa shelf into a wind tunnel.',
      actions: [
        {
          label: 'Run the chilled airflow check',
          detail: 'Kick the compressor on, watch the fan draw, and listen for the tiny squeal that thinks it can hide under refrigeration noise.',
          skill: 'electronicsBR',
          targetNumber: 4,
          requiredSuccesses: 1,
          onSuccess: 'The fan holds a steady spin under load and the cooler quits auditioning for haunted kitchen duty.',
          onFailure: 'The check passes well enough, but Curtis spends extra bench time damping one last cowling tick.',
          nuyenSuccess: 0,
          nuyenFailure: -35,
          qualitySuccess: 2,
          qualityFailure: 0,
        },
      ],
    },
    {
      id: 'closeout',
      title: 'Receipt and shop-credit note',
      station: 'Grease pencil and register tape',
      description: 'Write the cooler note, tape the date inside the service panel, and make sure Taco knows this was maintenance, not magic.',
      actions: [
        {
          label: 'Log the fan fix and collect shop credit',
          detail: 'Mark the service panel, note the parts choice, and produce a report tidy enough for Cindy to ingest without guessing.',
          skill: 'electronics',
          targetNumber: 3,
          requiredSuccesses: 1,
          onSuccess: 'The report is clean, the panel gets a neat service mark, and Taco kicks in a small shop-credit thank-you for keeping the salsa cold.',
          onFailure: 'The report is usable, but flags a mild watch note if the cooler chirps again under dinner-rush load.',
          nuyenSuccess: 45,
          nuyenFailure: -10,
          qualitySuccess: 1,
          qualityFailure: 0,
        },
      ],
    },
  ],
}

const jobs = [activeJob]

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

function actionRuntime(action: JobAction, stageId: JobStageId, shift: ShiftState): ActionRuntime {
  const runtime: ActionRuntime = {
    targetNumber: action.targetNumber,
    requiredSuccesses: action.requiredSuccesses,
    nuyenSuccess: action.nuyenSuccess,
    nuyenFailure: action.nuyenFailure,
    qualitySuccess: action.qualitySuccess,
    qualityFailure: action.qualityFailure,
  }

  if (stageId !== 'test') return runtime

  const salvagedBushing = shift.log.some((entry) => entry.action === 'Fit a salvaged sleeve bushing')
  const freshBearing = shift.log.some((entry) => entry.action === 'Install a fresh bearing kit')
  if (salvagedBushing) {
    return {
      ...runtime,
      targetNumber: runtime.targetNumber + 1,
      modifierNote: 'Salvaged sleeve bushing is in effect: cooler-load spin test TN +1 for thrift-fit fussiness.',
    }
  }
  if (freshBearing) {
    return {
      ...runtime,
      targetNumber: Math.max(2, runtime.targetNumber - 1),
      modifierNote: 'Fresh bearing kit is in effect: cooler-load spin test TN -1 for a stable fan mount.',
    }
  }

  return runtime
}

function loadShift(): ShiftState {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return freshShift(activeJob)
  try {
    const parsed = JSON.parse(stored) as Partial<ShiftState>
    if (parsed.version === 1 && parsed.jobId === activeJob.id && parsed.currentStageId) {
      return {
        ...freshShift(activeJob),
        ...parsed,
        completedStageIds: parsed.completedStageIds ?? [],
        log: parsed.log ?? [],
        reportCopied: parsed.reportCopied ?? false,
      }
    }
  } catch {
    // Fall through to a clean shift.
  }
  return freshShift(activeJob)
}

function buildReport(job: JobProfile, shift: ShiftState) {
  const finalStatus = shift.currentStageId === 'closeout' && shift.completedStageIds.includes('closeout') ? 'Complete' : 'In progress'
  const rollLines = shift.log.length
    ? shift.log.map((entry, index) => `${index + 1}. ${entry.stage}: ${entry.successes}/${entry.requiredSuccesses} success(es) with ${entry.skill} vs TN ${entry.targetNumber}; ${entry.outcome}; ${nuyenText(entry.nuyenDelta)}; ${entry.note}`)
    : ['No rolls recorded yet.']
  const effectLines = shift.log
    .filter((entry) => entry.effectNote)
    .map((entry) => `- ${entry.action}: ${entry.effectNote}`)

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
    'Selected tradeoffs / follow-up effects:',
    ...(effectLines.length ? effectLines : ['- None selected yet.']),
    `Cindy ingest/closeout note: When this report is posted with ${CINDY_LOU_BOT_MENTION} pinged, Cindy should ingest it into campaign memory as a Curtis downtime/maintenance event, close/mark this active Drone Shift Work Order as Job Completed, and do not apply permanent drone stat changes unless the GM confirms them.`,
  ].join('\n')
}

function App() {
  const [shift, setShift] = useState<ShiftState>(() => loadShift())
  const [skills, setSkills] = useState<SkillProfile>(seedSkills)
  const [selectedActionIndex, setSelectedActionIndex] = useState(0)
  const [feedback, setFeedback] = useState<RollFeedback | undefined>()

  const job = jobs.find((candidate) => candidate.id === shift.jobId) ?? activeJob
  const currentStage = job.stages.find((stage) => stage.id === shift.currentStageId) ?? job.stages[0]
  const selectedAction = currentStage.actions[selectedActionIndex] ?? currentStage.actions[0]
  const selectedRuntime = actionRuntime(selectedAction, currentStage.id, shift)
  const isComplete = shift.completedStageIds.includes('closeout')
  const ticketLabel = 'Active shift'
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
    const runtime = actionRuntime(action, currentStage.id, shift)
    const dicePool = skills[action.skill]
    const dice = rollDice(dicePool, runtime.targetNumber)
    const successes = successesFor(dice, runtime.targetNumber)
    const passed = successes >= runtime.requiredSuccesses
    const nuyenDelta = passed ? runtime.nuyenSuccess : runtime.nuyenFailure
    const qualityDelta = passed ? runtime.qualitySuccess : runtime.qualityFailure
    const next = nextStageId(job, currentStage.id)
    const note = [passed ? action.onSuccess : action.onFailure, runtime.modifierNote].filter(Boolean).join(' ')
    const entry: LogEntry = {
      id: `log-${Date.now()}`,
      stage: currentStage.title,
      action: action.label,
      skill: skillLabels[action.skill],
      targetNumber: runtime.targetNumber,
      dice,
      successes,
      requiredSuccesses: runtime.requiredSuccesses,
      outcome: passed ? 'success' : 'failure',
      nuyenDelta,
      qualityDelta,
      effectNote: action.effectNote,
      note,
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
      detail: `${successes}/${runtime.requiredSuccesses} success(es). ${entry.note}`,
    })
  }

  function resetShift() {
    setShift(freshShift(activeJob))
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
          <strong>{ticketLabel}</strong>
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
        <button onClick={resetShift}>Reset shift</button>
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
          <p>{isComplete ? 'The maintenance ticket is ready to export for Cindy/GM review.' : currentStage.description}</p>
          {feedback && <div key={feedback.id} className={`feedback ${feedback.tone}`}><strong>{feedback.title}</strong><span>{feedback.detail}</span></div>}

          {!isComplete && <>
            <div className="action-list">
              {currentStage.actions.map((action, index) => {
                const runtime = actionRuntime(action, currentStage.id, shift)
                return <button key={action.label} className={selectedActionIndex === index ? 'selected' : ''} onClick={() => setSelectedActionIndex(index)}>
                  <strong>{action.label}</strong>
                  <span>{action.detail}</span>
                  {action.effectNote && <span>{action.effectNote}</span>}
                  <small>{skillLabels[action.skill]} {skills[action.skill]} vs TN {runtime.targetNumber}; need {runtime.requiredSuccesses}+ success(es)</small>
                </button>
              })}
            </div>
            <div className="roll-preview">
              <h3>{selectedAction.label}</h3>
              <p>Roll {skills[selectedAction.skill]} dice vs TN {selectedRuntime.targetNumber}. This step changes the running total immediately after the roll.{selectedRuntime.modifierNote ? ` ${selectedRuntime.modifierNote}` : ''}</p>
              <div className="swing-grid">
                <article className={`money-swing ${nuyenTone(selectedRuntime.nuyenSuccess)}`}><span>Success swing</span><strong>{nuyenText(selectedRuntime.nuyenSuccess)}</strong></article>
                <article className={`money-swing ${nuyenTone(selectedRuntime.nuyenFailure)}`}><span>Failure swing</span><strong>{nuyenText(selectedRuntime.nuyenFailure)}</strong></article>
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
