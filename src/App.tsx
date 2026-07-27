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

interface ProjectStep {
  day: number
  title: string
  status: 'complete' | 'active' | 'waiting' | 'final'
  choicePressure: string
  spendBand: string
  carryForward: string
}

const STORAGE_KEY = 'cindylou.curtisDroneShift.v1'
const CINDY_LOU_BOT_MENTION = '<@1474892346545012746>'
const PROJECT_NAME = 'Curtis Backpack Arms Build'
const PROJECT_DAY: number = 6
const PROJECT_TOTAL_DAYS: number = 14
const NEXT_PROJECT_DAY = PROJECT_DAY + 1
const NEXT_PROJECT_PHASE = 'Actuator test mule'
const PROJECT_BUDGET_NOTE = 'GM-approved 14-day diversion track; expected total project spend roughly 28,000-45,000¥ before final acceptance.'
const PROJECT_CURRENT_SPEND = '5,900¥ logged before this work order; Day 5 rotated out untouched with no spend, no penalty, and no carry-forward bonus.'
const PROJECT_PAGE_URL = 'https://hanclintoclaw-pixel.github.io/campaign-wiki/PCs/Curtis-Backpack-Arms-Build.html'

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

const projectSteps: ProjectStep[] = [
  { day: 1, title: 'Load-path sketch and material coupons', status: 'complete', choicePressure: 'salvage aluminum vs documented titanium samples', spendBand: '700-2,925¥', carryForward: 'completed with aircraft aluminum salvage and a usable first rail profile' },
  { day: 2, title: 'Backplate and hip-belt skeleton', status: 'complete', choicePressure: 'cheap welded spine vs modular machined frame', spendBand: '1,500-4,500¥', carryForward: 'completed with fixed welded aluminum spine and a later service-access warning' },
  { day: 3, title: 'Folded-profile dummy pack', status: 'waiting', choicePressure: 'compact hard limit vs easier service access', spendBand: '500-2,000¥', carryForward: 'rotated out untouched with no spend, no penalty, and no carry-forward bonus' },
  { day: 4, title: 'Arm segment pattern', status: 'complete', choicePressure: 'light drilled links vs reinforced links', spendBand: '1,800-4,000¥', carryForward: 'completed with light drilled links, conservative reach, and root-joint gusset notes' },
  { day: 5, title: 'Root joint cluster', status: 'waiting', choicePressure: 'salvage bearing stack vs precision root joints', spendBand: '2,000-5,500¥', carryForward: 'rotated out untouched with no spend, no penalty, and no carry-forward bonus' },
  { day: 6, title: 'Retraction rails and lock detents', status: 'active', choicePressure: 'simple spring locks vs positive mechanical latches', spendBand: '1,500-4,500¥', carryForward: 'active now; lock choice affects deployment safety, Day 7 actuator setup, and final acceptance notes' },
  { day: 7, title: 'Actuator test mule', status: 'waiting', choicePressure: 'electric micro-servos vs cable/hydraulic assist', spendBand: '2,500-6,000¥', carryForward: 'actuator choice defines power/control work' },
  { day: 8, title: 'Power and control trunk', status: 'waiting', choicePressure: 'cheaper manual switches vs fused smart control trunk', spendBand: '2,000-5,500¥', carryForward: 'control style affects safety cutoffs and failure behavior' },
  { day: 9, title: 'Quick-change wrist sockets', status: 'waiting', choicePressure: 'universal socket vs specialized tool pods', spendBand: '1,500-4,000¥', carryForward: 'socket standard defines end-effector limits' },
  { day: 10, title: 'Single-arm lift and tool test', status: 'waiting', choicePressure: 'conservative torque limit vs higher tool load', spendBand: '1,000-3,500¥', carryForward: 'safe load rating informs final guide' },
  { day: 11, title: 'Three-arm side assembly', status: 'waiting', choicePressure: 'symmetric reliability vs one stronger utility arm', spendBand: '2,500-6,000¥', carryForward: 'side balance affects mirror-side replication' },
  { day: 12, title: 'Mirror-side replication', status: 'waiting', choicePressure: 'exact duplicate vs corrected asymmetry', spendBand: '2,000-5,500¥', carryForward: 'symmetry affects wear/snag final tests' },
  { day: 13, title: 'Wear test and snag test', status: 'waiting', choicePressure: 'comfortable daily carry vs aggressive deployment profile', spendBand: '1,000-3,000¥', carryForward: 'wear findings become final limitations' },
  { day: 14, title: 'Final acceptance and usage guide', status: 'final', choicePressure: 'tool-rig approval vs tool-plus-combat approval', spendBand: '2,500-6,000¥', carryForward: 'accepted result updates Curtis page with final gear and usage guide' },
]

const activeJob: JobProfile = {
  id: 'backpack-arms-retraction-rails-lock-detents',
  title: 'Rail Lock Detents',
  asset: "Curtis's Backpack Arms rig: fixed welded aluminum spine, Day 4 light drilled link patterns, conservative reach envelope, hip-belt transfer brackets, no-drill mystery-hole zones, and no Day 5 root-joint bonus or penalty because the prior work order rotated out untouched",
  customer: 'Curtis, continuing Day 6 of the 14-day Backpack Arms diversion track',
  risk: 'shop mess',
  hook: 'The arm links have to fold into a backpack profile without rattling loose, but the rig still needs to deploy without Curtis fighting a drawer slide full of grit. Day 6 picks how expensive the lock hardware gets and whether the rails favor safe short travel or maximum tool clearance.',
  baseline: "GM-approved 14-day diversion track. Day 5 root-joint work rotated out untouched with no spend, no penalty, and no carry-forward bonus. This phase builds retraction rails and lock detents only; no permanent equipment, combat, or stat benefit applies until Day 14 final acceptance updates Curtis's page and usage guide.",
  stages: [
    {
      id: 'intake',
      title: 'Re-square the folded rail envelope',
      station: 'Backplate jig and cardboard backpack shell',
      description: 'Check the folded backpack profile against Day 4 link patterns so the rails have a believable home before anyone starts drilling lock pockets.',
      actions: [
        {
          label: 'Map the rail travel lanes',
          detail: 'Mark three sliding lanes per side around the hip-belt brackets, no-drill zones, and conservative reach envelope.',
          skill: 'electronics',
          targetNumber: 3,
          requiredSuccesses: 1,
          onSuccess: 'Curtis gets clean rail-lane marks and keeps the folded profile from crowding the belt hardware.',
          onFailure: 'One lower lane kisses the belt bracket, so Curtis burns template stock and re-marks the rail stop before cutting metal.',
          nuyenSuccess: -200,
          nuyenFailure: -450,
          qualitySuccess: 1,
          qualityFailure: 0,
        },
      ],
    },
    {
      id: 'diagnose',
      title: 'Choose the lock hardware',
      station: 'Latch bins, spring drawer, and receipt folder',
      description: 'Pick cheaper simple spring detents or expensive positive mechanical latches before the rail slots are cut.',
      actions: [
        {
          label: 'Fit simple spring detents',
          detail: 'Use shop-stock spring pins and salvage detent plates. It is cheaper, but the final safety test gets fussier and the usage guide needs a manual lock-check warning.',
          skill: 'carBR',
          targetNumber: 5,
          requiredSuccesses: 1,
          onSuccess: 'The simple detents seat evenly enough after polishing the burrs off two salvage plates.',
          onFailure: 'Two spring pins are mushy, so Curtis overbuys replacements and keeps the cheap route with a louder inspection warning.',
          nuyenSuccess: -900,
          nuyenFailure: -1400,
          qualitySuccess: 1,
          qualityFailure: 0,
          effectNote: 'Project choice: simple spring detents reduce immediate project spend but raise the deployment safety test TN by 1 and require a manual lock-check warning in the final usage guide.',
        },
        {
          label: 'Buy positive mechanical latches',
          detail: 'Pay for documented low-profile latches with positive engagement, cleaner receipts, and less argument when the rig reaches final acceptance.',
          skill: 'negotiation',
          targetNumber: 5,
          requiredSuccesses: 1,
          onSuccess: 'The latch sets arrive with matched shoulders and usable spec sheets for final acceptance documentation.',
          onFailure: 'The first supplier short-ships two latch shoulders, so Curtis pays rush replacement money but still gets documented hardware.',
          nuyenSuccess: -2400,
          nuyenFailure: -3300,
          qualitySuccess: 2,
          qualityFailure: 1,
          effectNote: 'Project choice: positive mechanical latches cost more now but reduce the deployment safety test TN by 1 and improve final acceptance documentation.',
        },
      ],
    },
    {
      id: 'repair',
      title: 'Cut the paired retraction rails',
      station: 'Drill press, file set, and rail jig',
      description: 'Cut left/right retraction rails and latch pockets so the arms can fold down into a compact pack outline without eating the hip-belt load path.',
      actions: [
        {
          label: 'Slot and dress the rail pairs',
          detail: 'Use the folded rail envelope to cut six rail slots, dress the edges, and leave clearance for the selected lock hardware.',
          skill: 'rotorAircraftBR',
          targetNumber: 6,
          requiredSuccesses: 1,
          onSuccess: 'The rail pairs slide without obvious rack, and the latch pockets have enough meat left for later actuator mounting.',
          onFailure: 'One rail slot chatters under the drill press, so Curtis recuts a plate and adds a visible witness mark for future setup.',
          nuyenSuccess: -650,
          nuyenFailure: -1150,
          qualitySuccess: 1,
          qualityFailure: 0,
        },
      ],
    },
    {
      id: 'test',
      title: 'Set the deployment stroke',
      station: 'Bench sweep jig and lock-click test',
      description: 'Decide whether the rails stop short for safer deployment or chase the full useful travel Curtis wants for tool clearance.',
      actions: [
        {
          label: 'Keep a conservative rail stroke',
          detail: 'Limit travel to a safer short stroke that is easier to lock and easier for Day 7 actuators to move cleanly.',
          skill: 'carBR',
          targetNumber: 5,
          requiredSuccesses: 1,
          onSuccess: 'The conservative stroke clicks in without bounce and keeps the future actuator load predictable.',
          onFailure: 'The short stroke still kisses one link shoulder, so Curtis adds a shim note before Day 7 actuator work.',
          nuyenSuccess: -250,
          nuyenFailure: -550,
          qualitySuccess: 2,
          qualityFailure: 0,
          effectNote: 'Project choice: conservative rail stroke simplifies Day 7 actuator setup and keeps the final usage guide stricter.',
        },
        {
          label: 'Chase full deployment travel',
          detail: 'Open the rails for better tool clearance now, accepting a harder safety test and more actuator load next phase.',
          skill: 'vectorThrustBR',
          targetNumber: 6,
          requiredSuccesses: 1,
          onSuccess: 'The longer stroke clears the bench sweep and gives the tool sockets more future working room.',
          onFailure: 'The long stroke snaps one detent too hard, so Curtis adds a root-stop warning before trusting the actuator mule.',
          nuyenSuccess: -500,
          nuyenFailure: -950,
          qualitySuccess: 1,
          qualityFailure: -1,
          effectNote: 'Project choice: full deployment travel may improve final tool clearance, but Day 7 actuator setup must account for extra stroke and root-stop stress.',
        },
      ],
    },
    {
      id: 'closeout',
      title: 'Write the rail lock sheet',
      station: 'Build notebook and receipt folder',
      description: 'Record lock hardware, rail travel, deployment stroke, spend total, and the Day 7 actuator setup warning.',
      actions: [
        {
          label: 'Log the Backpack Arms Day 6 sheet',
          detail: 'Write the rail-lock note: lock hardware choice, stroke choice, test behavior, receipt quality, spend total, and actuator warnings for Day 7.',
          skill: 'electronics',
          targetNumber: 3,
          requiredSuccesses: 1,
          onSuccess: 'The Day 6 sheet is clear enough for Day 7 to mount an actuator mule around known rail stops instead of guesses.',
          onFailure: 'The sheet is readable, but Curtis flags one latch pocket and one rail-stop measurement for recheck before Day 7 powers anything.',
          nuyenSuccess: -100,
          nuyenFailure: -250,
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

  const simpleDetents = shift.log.some((entry) => entry.action === 'Fit simple spring detents')
  const positiveLatches = shift.log.some((entry) => entry.action === 'Buy positive mechanical latches')
  const fullTravel = shift.log.some((entry) => entry.action === 'Chase full deployment travel')
  const conservativeStroke = shift.log.some((entry) => entry.action === 'Keep a conservative rail stroke')

  if (stageId === 'test') {
    if (positiveLatches) {
      return {
        ...runtime,
        targetNumber: Math.max(2, runtime.targetNumber - 1),
        modifierNote: 'Positive mechanical latches are in effect: documented positive engagement reduces this deployment safety test TN by 1.',
      }
    }
    if (simpleDetents) {
      return {
        ...runtime,
        targetNumber: runtime.targetNumber + 1,
        modifierNote: 'Simple spring detents are in effect: cheaper lock hardware raises this deployment safety test TN by 1.',
      }
    }
    return {
      ...runtime,
      targetNumber: runtime.targetNumber + 1,
      modifierNote: 'No lock hardware choice has been logged yet; use the conservative unknown-lock TN +1 until Curtis picks a latch path.',
    }
  }

  if (stageId === 'closeout') {
    if (fullTravel) {
      return {
        ...runtime,
        targetNumber: runtime.targetNumber + 1,
        modifierNote: 'Full deployment travel is in effect: the actuator and root-stop warnings need cleaner documentation, raising this closeout TN by 1.',
      }
    }
    if (conservativeStroke) {
      return {
        ...runtime,
        targetNumber: Math.max(2, runtime.targetNumber - 1),
        modifierNote: 'Conservative rail stroke is in effect: the actuator setup note is simpler to document, reducing this closeout TN by 1.',
      }
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

  const reportLines = [
    `${CINDY_LOU_BOT_MENTION} CURTIS DRONE SHIFT REPORT`,
    `Job: ${job.title}`,
    `Project track: ${PROJECT_NAME} day ${PROJECT_DAY}/${PROJECT_TOTAL_DAYS}`,
    `Project page: ${PROJECT_PAGE_URL}`,
    `Project budget note: ${PROJECT_BUDGET_NOTE} Current logged project spend before this work order: ${PROJECT_CURRENT_SPEND}`,
    `Asset: ${job.asset}`,
    `Customer/context: ${job.customer}`,
    `Status: ${finalStatus}`,
    `Nuyen delta: ${nuyenText(shift.nuyenDelta)}`,
    `Maintenance quality: ${qualityLabel(shift.quality)} (${shift.quality})`,
    'Notable work log:',
    ...rollLines,
    'Selected tradeoffs / follow-up effects:',
    ...(effectLines.length ? effectLines : ['- None selected yet.']),
    `Cindy ingest/closeout note: When this report is posted with ${CINDY_LOU_BOT_MENTION} pinged, Cindy should ingest it into campaign memory as Curtis Backpack Arms Build day ${PROJECT_DAY}/${PROJECT_TOTAL_DAYS}, apply the nuyen delta as project spend, append the result to the project page progress log, close/mark this active Drone Shift Work Order as Job Completed, set the next daily update to day ${NEXT_PROJECT_DAY}: ${NEXT_PROJECT_PHASE}, and include Curtis's updated running nuyen total in the closeout confirmation. Do not apply permanent drone, vehicle, equipment, combat, or stat changes until day ${PROJECT_TOTAL_DAYS} final GM acceptance.`,
  ]

  if (PROJECT_DAY === PROJECT_TOTAL_DAYS) {
    reportLines.push(`Final-track trigger: Before treating the rig as complete, update Curtis's page with the finalized Backpack Arms gear entry and a usage guide covering folded carry, deployment, tool sockets, combat limits, safety cutoffs, repair/maintenance, and GM-approved SR3 rules effects.`)
  }

  return reportLines.join('\n')
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
        <span>Project spend</span>
        <strong>{nuyenText(shift.nuyenDelta)}</strong>
        <p>{nuyenLabel(shift.nuyenDelta)} · {qualityLabel(shift.quality)} · quality {shift.quality}</p>
      </article>
    </section>

    <section className="project-panel">
      <div>
        <span className="kicker">GM-approved diversion track</span>
        <h2>{PROJECT_NAME}</h2>
        <p>{PROJECT_BUDGET_NOTE} Current logged project spend before this work order: {PROJECT_CURRENT_SPEND} Day {PROJECT_DAY} is active now; day {PROJECT_TOTAL_DAYS} finalizes only after GM acceptance and Curtis-page gear/usage-guide updates.</p>
      </div>
      <div className="project-trigger-grid">
        <article>
          <span>Daily closeout trigger</span>
          <strong>Post report to advance the build</strong>
          <p>Cindy should append the day result to the project log, apply the spend delta, preserve the carry-forward hook, and rotate the next update to Day {NEXT_PROJECT_DAY}: {NEXT_PROJECT_PHASE}.</p>
        </article>
        <article>
          <span>Final trigger</span>
          <strong>Day {PROJECT_TOTAL_DAYS} writes Curtis's gear entry</strong>
          <p>Final acceptance must update Curtis's page with the finished Backpack Arms rig, total spend, usage guide, limitations, allowed end effectors, and GM-approved SR3 effects.</p>
        </article>
      </div>
      <div className="project-steps">
        {projectSteps.map((step) => <article key={step.day} className={step.status}>
          <span>Day {step.day}</span>
          <strong>{step.title}</strong>
          <small>{step.choicePressure}</small>
          <em>{step.spendBand}</em>
          <p>{step.carryForward}</p>
        </article>)}
      </div>
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

    <footer className="footer-note">Build {__SOURCE_COMMIT__} - 14-day Backpack Arms diversion track. Missed work orders discard with no penalty; no permanent gear, combat, or stat effects until GM final acceptance.</footer>
  </main>
}

export default App
