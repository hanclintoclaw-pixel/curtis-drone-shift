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

const tutorialJob: JobProfile = {
  id: 'tutorial-5-waddles-fuzzy-sensor-sneezes',
  title: 'Tutorial 5: Waddles\' Fuzzy Sensor Sneezes',
  asset: 'Waddles - fur-skinned companion drone with one offended proximity sensor',
  customer: 'Taco, after Waddles backed into a chair twice and then stared at it like the chair started the fight',
  risk: 'low',
  hook: 'Waddles is mobile and mostly adorable, but the left-side rangefinder keeps twitching under the synthetic fur with a tiny electric sneeze every time it sees chrome, chair legs, or Taco\'s keys.',
  baseline: 'Tutorial 4 rotates out cleanly: completed reports stay logged, and any untouched copy is Discarded with no change, no nuyen movement, no drone state change, and no penalty. Tutorial 5 stays near break-even unless Curtis chooses to submit the final report.',
  stages: [
    {
      id: 'intake',
      title: 'Intake the sensor sneeze',
      station: 'Taco\'s booth bench',
      description: 'Power-safe Waddles, brush the fur away from the sensor pod, and confirm this is a rangefinder problem instead of a drive hiccup.',
      actions: [
        {
          label: 'Safe the pod and wiggle-test',
          detail: 'Kill motion assist, comb back the synthetic fur, and wiggle the left sensor pod without letting Waddles bite the screwdriver.',
          skill: 'electronics',
          targetNumber: 4,
          requiredSuccesses: 1,
          onSuccess: 'Curtis isolates the twitch to the left rangefinder pod before opening anything expensive.',
          onFailure: 'Waddles is safe, but Curtis spends a little tape and patience re-seating a fur seam he tugged too hard.',
          nuyenSuccess: 0,
          nuyenFailure: -20,
          qualitySuccess: 1,
          qualityFailure: 0,
        },
      ],
    },
    {
      id: 'diagnose',
      title: 'Find the fuzzy blind spot',
      station: 'Napkin-draped counter mat',
      description: 'Check the lens, gasket, and connector for fur lint, hot-sauce vapor, or a loose contact hiding under the mascot skin.',
      actions: [
        {
          label: 'Run a close sensor diagnosis',
          detail: 'Use a flashlight, sensor readout, and one extremely judgmental cotton swab to find the dirty edge of the problem.',
          skill: 'electronics',
          targetNumber: 5,
          requiredSuccesses: 2,
          onSuccess: 'Curtis catches a lint-packed micro-gasket shadowing the rangefinder lens at just the wrong angle.',
          onFailure: 'The fault shows up late after Curtis cleans two innocent contacts and burns through extra swabs.',
          nuyenSuccess: 10,
          nuyenFailure: -25,
          qualitySuccess: 2,
          qualityFailure: -1,
        },
      ],
    },
    {
      id: 'repair',
      title: 'Choose the seal fix',
      station: 'Lens wipes vs parts drawer',
      description: 'Decide whether to reuse the cleaned gasket or spend for a fresh micro-gasket. The choice changes the sensor sweep later.',
      actions: [
        {
          label: 'Reuse the cleaned gasket',
          detail: 'Lift the gasket, clean the lint shadow, and put the old seal back in with a tiny dab of removable tack.',
          skill: 'electronicsBR',
          targetNumber: 4,
          requiredSuccesses: 1,
          onSuccess: 'The old gasket cleans up well enough to reuse, saving parts money and leaving only a small lint-risk note.',
          onFailure: 'The gasket works, but Curtis uses extra wipes and tack getting it to sit flat again.',
          nuyenSuccess: 40,
          nuyenFailure: -15,
          qualitySuccess: 1,
          qualityFailure: 0,
          effectNote: 'Follow-up: reused gasket leaves lint-shadow risk; Sensor Sweep TN +1 and the final report notes the thrifty reuse.',
        },
        {
          label: 'Install a fresh micro-gasket',
          detail: 'Pull a fresh gasket from the little parts drawer and clean the lens seat before closing the fur seam.',
          skill: 'electronicsBR',
          targetNumber: 4,
          requiredSuccesses: 1,
          onSuccess: 'The fresh gasket seats cleanly and the lens well looks too professional for Taco\'s counter.',
          onFailure: 'The gasket seats, but Curtis sacrifices one tiny spare while learning which side is secretly up.',
          nuyenSuccess: -45,
          nuyenFailure: -80,
          qualitySuccess: 2,
          qualityFailure: 1,
          effectNote: 'Follow-up: fresh gasket gives a clean seal; Sensor Sweep TN -1 and the final report notes the paid parts.',
        },
      ],
    },
    {
      id: 'test',
      title: 'Sensor sweep test',
      station: 'Chair-leg obstacle lane',
      description: 'Run Waddles past chrome, chair legs, and Taco\'s keys to see whether the earlier gasket choice leaves the rangefinder fussy.',
      actions: [
        {
          label: 'Sweep the left-side rangefinder',
          detail: 'Walk Waddles through a slow fan sweep and watch for the little electric sneeze on shiny targets.',
          skill: 'electronics',
          targetNumber: 4,
          requiredSuccesses: 1,
          onSuccess: 'The rangefinder stops sneezing and Waddles avoids every chair leg with smug little dignity.',
          onFailure: 'The sweep passes well enough, but Curtis spends extra cleaner chasing one last chrome-triggered twitch.',
          nuyenSuccess: 0,
          nuyenFailure: -30,
          qualitySuccess: 2,
          qualityFailure: 0,
        },
      ],
    },
    {
      id: 'closeout',
      title: 'Mascot closeout',
      station: 'Dining room chair maze',
      description: 'Send Waddles through the chair maze, check that the fur seam stays neat, and write the note before Taco puts a tiny bandanna on the patient.',
      actions: [
        {
          label: 'Run the no-sneeze chair loop',
          detail: 'Let Waddles waddle two tight turns, avoid one chrome stool, and finish with the sensor log clean enough for Cindy.',
          skill: 'electronics',
          targetNumber: 3,
          requiredSuccesses: 1,
          onSuccess: 'The report is clean, Taco throws in a small shop-credit thank-you, and Cindy has a tidy maintenance event to ingest.',
          onFailure: 'The report is usable, but flags a mild follow-up sensor twitch for GM review if anyone cares later.',
          nuyenSuccess: 45,
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

  const reusedGasket = shift.log.some((entry) => entry.action === 'Reuse the cleaned gasket')
  const freshGasket = shift.log.some((entry) => entry.action === 'Install a fresh micro-gasket')
  if (reusedGasket) {
    return {
      ...runtime,
      targetNumber: runtime.targetNumber + 1,
      modifierNote: 'Reused gasket is in effect: sensor sweep TN +1 for lint-shadow risk.',
    }
  }
  if (freshGasket) {
    return {
      ...runtime,
      targetNumber: Math.max(2, runtime.targetNumber - 1),
      modifierNote: 'Fresh micro-gasket is in effect: sensor sweep TN -1 for a clean seal.',
    }
  }

  return runtime
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
  const selectedRuntime = actionRuntime(selectedAction, currentStage.id, shift)
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
