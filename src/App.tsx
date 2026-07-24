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
  status: 'active' | 'waiting' | 'final'
  choicePressure: string
  spendBand: string
  carryForward: string
}

const STORAGE_KEY = 'cindylou.curtisDroneShift.v1'
const CINDY_LOU_BOT_MENTION = '<@1474892346545012746>'
const PROJECT_NAME = 'Curtis Backpack Arms Build'
const PROJECT_DAY = 1
const PROJECT_TOTAL_DAYS = 14
const NEXT_PROJECT_DAY = PROJECT_DAY + 1
const NEXT_PROJECT_PHASE = 'Backplate and hip-belt skeleton'
const PROJECT_BUDGET_NOTE = 'GM-approved 14-day diversion track; expected total project spend roughly 28,000-45,000¥ before final acceptance.'
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
  { day: 1, title: 'Load-path sketch and material coupons', status: 'active', choicePressure: 'salvage aluminum vs documented titanium samples', spendBand: '700-2,925¥', carryForward: 'material choice modifies Day 2/4 rail and frame tests' },
  { day: 2, title: 'Backplate and hip-belt skeleton', status: 'waiting', choicePressure: 'cheap welded spine vs modular machined frame', spendBand: '1,500-4,500¥', carryForward: 'frame approach modifies folded-pack fit and load transfer' },
  { day: 3, title: 'Folded-profile dummy pack', status: 'waiting', choicePressure: 'compact hard limit vs easier service access', spendBand: '500-2,000¥', carryForward: 'folded profile affects snag tests and repair access' },
  { day: 4, title: 'Arm segment pattern', status: 'waiting', choicePressure: 'light drilled links vs reinforced links', spendBand: '1,800-4,000¥', carryForward: 'link style affects reach/load and fatigue checks' },
  { day: 5, title: 'Root joint cluster', status: 'waiting', choicePressure: 'salvage bearing stack vs precision root joints', spendBand: '2,000-5,500¥', carryForward: 'root joint quality affects all later arm alignment' },
  { day: 6, title: 'Retraction rails and lock detents', status: 'waiting', choicePressure: 'simple spring locks vs positive mechanical latches', spendBand: '1,500-4,500¥', carryForward: 'lock choice affects deployment safety and combat approval' },
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
  id: 'backpack-arms-load-path-coupons',
  title: 'Backpack Arms Load-Path Coupons',
  asset: "Curtis's GM-approved six-arm retractable backpack rig: compact backplate, shoulder/hip harness, six folded arm channels, first lightweight metal coupons, and project budget ledger",
  customer: 'Curtis, starting Day 1 of the 14-day Backpack Arms diversion track from the attached six-arm concept sketch',
  risk: 'shop mess',
  hook: 'Curtis is not building combat spider arms in one afternoon. Day 1 is the expensive, sensible part: prove the load path, buy or salvage metal worth trusting, and make sure the future rig folds into something closer to a backpack than a kitchen chandelier.',
  baseline: 'GM-approved 14-day diversion track. Missed prior work orders still discard cleanly with no change, no nuyen movement, no drone state change, and no penalty. This phase creates design notes, material coupons, and the first project-spend entry; no permanent equipment, combat, or stat benefit applies until Day 14 final acceptance updates Curtis\'s page and usage guide.',
  stages: [
    {
      id: 'intake',
      title: 'Define the carry envelope',
      station: 'Cardboard pattern table',
      description: 'Map the folded backpack outline, harness contact points, and safe clearance around Curtis before any serious metal gets cut.',
      actions: [
        {
          label: 'Trace the folded six-arm silhouette',
          detail: 'Use the concept sketch, cardboard ribs, and Curtis-scale measurements to mark where six folded arms can sit without smacking doors, seats, or his own head.',
          skill: 'carBR',
          targetNumber: 4,
          requiredSuccesses: 1,
          onSuccess: 'Curtis gets a believable folded envelope: three arm channels per side, a central spine plate, and hip-belt clearance that does not fight Grandpa\'s seat.',
          onFailure: 'The first pattern is too wide, so Curtis trims the outer channels and buys extra shop board before the pack stops looking like a coat rack with ambitions.',
          nuyenSuccess: -50,
          nuyenFailure: -125,
          qualitySuccess: 1,
          qualityFailure: 0,
        },
      ],
    },
    {
      id: 'diagnose',
      title: 'Find the load path',
      station: 'Grease-pencil torque board',
      description: 'Estimate where tool loads and recoil-like snags will try to twist the rig, then route that force into the waist belt instead of Curtis\'s spine.',
      actions: [
        {
          label: 'Run the shoulder-to-hip load sketch',
          detail: 'Mark root-joint torque, arm reach, backplate leverage, and the hip-belt transfer line before choosing the first metal coupons.',
          skill: 'electronicsBR',
          targetNumber: 5,
          requiredSuccesses: 1,
          onSuccess: 'Curtis spots the ugly truth early: the root joints need a rigid spine and hip belt, not just heroic shoulder straps and optimism.',
          onFailure: 'The math catches up late, after Curtis redraws one pretty-but-useless shoulder-only mount and mutters at the torque board.',
          nuyenSuccess: -100,
          nuyenFailure: -250,
          qualitySuccess: 2,
          qualityFailure: 0,
        },
      ],
    },
    {
      id: 'repair',
      title: 'Choose first metal coupons',
      station: 'Salvage bin vs parts terminal',
      description: 'Pick the first lightweight metal path. Salvage keeps the bill smaller but risks fussy testing; documented alloy hurts now but can save pain later.',
      actions: [
        {
          label: 'Use aircraft aluminum salvage coupons',
          detail: 'Buy and cut tested aircraft aluminum scrap and drone-arm offcuts, then label the grain direction and bend-risk spots.',
          skill: 'negotiation',
          targetNumber: 4,
          requiredSuccesses: 1,
          onSuccess: 'The salvage lot coughs up enough clean aluminum coupon stock to test a lightweight rail without buying the most painful shiny stuff yet.',
          onFailure: 'The salvage stock is usable, but Curtis has to overbuy bushings and cut around two mystery holes that were definitely not structural blessings.',
          nuyenSuccess: -450,
          nuyenFailure: -900,
          qualitySuccess: 1,
          qualityFailure: 0,
          effectNote: 'Project choice: aircraft aluminum salvage keeps Day 1 cheaper but adds rail coupon bend-test TN +1 and may push later rework if quality stays low.',
        },
        {
          label: 'Order titanium alloy tube samples',
          detail: 'Buy a documented tube-and-flat-bar sample set suitable for wearable backplate rails and future arm-segment tests.',
          skill: 'negotiation',
          targetNumber: 5,
          requiredSuccesses: 1,
          onSuccess: 'Curtis finds a titanium sample lot that is not cheap, but it is straight, documented, and light enough to take seriously.',
          onFailure: 'The samples arrive with one odd length and ugly shipping fees, but the alloy paperwork is real and the test pieces are worth cutting.',
          nuyenSuccess: -1600,
          nuyenFailure: -2200,
          qualitySuccess: 2,
          qualityFailure: 1,
          effectNote: 'Project choice: titanium alloy samples cost more now but lower rail coupon bend-test TN -1 and set up cleaner lightweight-frame options later.',
        },
      ],
    },
    {
      id: 'test',
      title: 'Bend-test one load rail',
      station: 'Bench vise with towel padding',
      description: 'Clamp one shoulder-to-hip rail coupon and test whether the chosen metal path bends predictably instead of cracking or springing sideways.',
      actions: [
        {
          label: 'Flex the first shoulder-to-hip coupon',
          detail: 'Load the test rail under controlled force, check twist, and decide whether this material can become the backplate spine skeleton.',
          skill: 'carBR',
          targetNumber: 5,
          requiredSuccesses: 1,
          onSuccess: 'The coupon flexes predictably and gives Curtis a first usable rail profile for the backpack spine.',
          onFailure: 'The coupon survives, but Curtis has to soften one bend radius and mark a no-drill zone before trusting the profile.',
          nuyenSuccess: -75,
          nuyenFailure: -250,
          qualitySuccess: 2,
          qualityFailure: 0,
        },
      ],
    },
    {
      id: 'closeout',
      title: 'Write the phase-one spec',
      station: 'Coffee-stained build notebook',
      description: 'Record the folded envelope, selected material path, load rail result, spend total, and next build phase so the 14-day Drone Shift chain can keep moving.',
      actions: [
        {
          label: 'Log the Backpack Arms Day 1 sheet',
          detail: 'Write the first build note: folded size, six-arm channel assumptions, material choice, test result, spend total, and Day 2 backplate-skeleton trigger.',
          skill: 'electronics',
          targetNumber: 3,
          requiredSuccesses: 1,
          onSuccess: 'The project sheet is clean enough that future work orders can build from it instead of rediscovering the same sharp-edged mistakes.',
          onFailure: 'The sheet is usable, but Curtis flags one measurement for recheck before the backplate skeleton gets cut.',
          nuyenSuccess: -25,
          nuyenFailure: -100,
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

  const aluminumCoupons = shift.log.some((entry) => entry.action === 'Use aircraft aluminum salvage coupons')
  const titaniumSamples = shift.log.some((entry) => entry.action === 'Order titanium alloy tube samples')
  if (aluminumCoupons) {
    return {
      ...runtime,
      targetNumber: runtime.targetNumber + 1,
      modifierNote: 'Aircraft aluminum salvage is in effect: rail coupon bend-test TN +1 for thrift-stock uncertainty.',
    }
  }
  if (titaniumSamples) {
    return {
      ...runtime,
      targetNumber: Math.max(2, runtime.targetNumber - 1),
      modifierNote: 'Titanium alloy samples are in effect: rail coupon bend-test TN -1 for documented lightweight stock.',
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
    `Project track: ${PROJECT_NAME} day ${PROJECT_DAY}/${PROJECT_TOTAL_DAYS}`,
    `Project page: ${PROJECT_PAGE_URL}`,
    `Project budget note: ${PROJECT_BUDGET_NOTE}`,
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
    `Final-track trigger: On day ${PROJECT_TOTAL_DAYS} completion, update Curtis's page with the finalized Backpack Arms gear entry and add a usage guide covering deployment, folded carry, tool sockets, combat limits, maintenance, and any GM-approved SR3 rules effects.`,
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
        <span>Project spend</span>
        <strong>{nuyenText(shift.nuyenDelta)}</strong>
        <p>{nuyenLabel(shift.nuyenDelta)} · {qualityLabel(shift.quality)} · quality {shift.quality}</p>
      </article>
    </section>

    <section className="project-panel">
      <div>
        <span className="kicker">GM-approved diversion track</span>
        <h2>{PROJECT_NAME}</h2>
        <p>{PROJECT_BUDGET_NOTE} Day {PROJECT_DAY} is active now; day {PROJECT_TOTAL_DAYS} finalizes only after GM acceptance and Curtis-page gear/usage-guide updates.</p>
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
