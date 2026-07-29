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
  status: 'complete' | 'active' | 'discarded' | 'waiting' | 'final'
  choicePressure: string
  spendBand: string
  carryForward: string
}

const STORAGE_KEY = 'cindylou.curtisDroneShift.v1'
const CINDY_LOU_BOT_MENTION = '<@1474892346545012746>'
const PROJECT_NAME = 'Curtis Backpack Arms Build'
const PROJECT_DAY: number = 8
const PROJECT_TOTAL_DAYS: number = 14
const NEXT_PROJECT_DAY = PROJECT_DAY + 1
const NEXT_PROJECT_PHASE = 'Quick-change wrist sockets'
const PROJECT_BUDGET_NOTE = 'GM-approved 14-day diversion track; expected total project spend roughly 28,000-45,000¥ before final acceptance.'
const PROJECT_CURRENT_SPEND = '12,950¥ logged before this work order; prior build context is preserved on the wiki.'
const PROJECT_PAGE_URL = 'https://hanclintoclaw-pixel.github.io/campaign-wiki/PCs/Curtis-Backpack-Arms-Build.html'
const REPORT_CONTEXT_NOTE = 'Prior build details stay on the wiki; this report lists only today\'s work, spend delta, and new follow-up hooks.'

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
  { day: 3, title: 'Folded-profile dummy pack', status: 'discarded', choicePressure: 'compact hard limit vs easier service access', spendBand: '500-2,000¥', carryForward: 'rotated out untouched with no spend, no penalty, and no carry-forward bonus' },
  { day: 4, title: 'Arm segment pattern', status: 'complete', choicePressure: 'light drilled links vs reinforced links', spendBand: '1,800-4,000¥', carryForward: 'completed with light drilled links, conservative reach, and root-joint gusset notes' },
  { day: 5, title: 'Root joint cluster', status: 'discarded', choicePressure: 'salvage bearing stack vs precision root joints', spendBand: '2,000-5,500¥', carryForward: 'rotated out untouched with no spend, no penalty, and no carry-forward bonus' },
  { day: 6, title: 'Retraction rails and lock detents', status: 'complete', choicePressure: 'simple spring locks vs positive mechanical latches', spendBand: '1,500-4,500¥', carryForward: 'completed with simple spring detents, conservative rail stroke, and a manual lock-check warning' },
  { day: 7, title: 'Actuator test mule', status: 'complete', choicePressure: 'electric micro-servos vs cable/hydraulic assist', spendBand: '2,500-6,000¥', carryForward: 'completed with electric micro-servos, documented short-stroke behavior, and a light-link fatigue inspection warning' },
  { day: 8, title: 'Power and control trunk', status: 'active', choicePressure: 'cheaper manual switches vs fused smart control trunk', spendBand: '2,000-5,500¥', carryForward: 'active now; control style affects safety cutoffs, socket interlocks, and failure behavior' },
  { day: 9, title: 'Quick-change wrist sockets', status: 'waiting', choicePressure: 'universal socket vs specialized tool pods', spendBand: '1,500-4,000¥', carryForward: 'socket standard defines end-effector limits' },
  { day: 10, title: 'Single-arm lift and tool test', status: 'waiting', choicePressure: 'conservative torque limit vs higher tool load', spendBand: '1,000-3,500¥', carryForward: 'safe load rating informs final guide' },
  { day: 11, title: 'Three-arm side assembly', status: 'waiting', choicePressure: 'symmetric reliability vs one stronger utility arm', spendBand: '2,500-6,000¥', carryForward: 'side balance affects mirror-side replication' },
  { day: 12, title: 'Mirror-side replication', status: 'waiting', choicePressure: 'exact duplicate vs corrected asymmetry', spendBand: '2,000-5,500¥', carryForward: 'symmetry affects wear/snag final tests' },
  { day: 13, title: 'Wear test and snag test', status: 'waiting', choicePressure: 'comfortable daily carry vs aggressive deployment profile', spendBand: '1,000-3,000¥', carryForward: 'wear findings become final limitations' },
  { day: 14, title: 'Final acceptance and usage guide', status: 'final', choicePressure: 'tool-rig approval vs tool-plus-combat approval', spendBand: '2,500-6,000¥', carryForward: 'accepted result updates Curtis page with final gear and usage guide' },
]

const activeJob: JobProfile = {
  id: 'backpack-arms-power-control-trunk',
  title: 'Power and Control Trunk',
  asset: "Curtis's Backpack Arms rig: Day 8 power and control trunk",
  customer: 'Curtis, continuing Day 8 of the 14-day Backpack Arms diversion track',
  risk: 'shop mess',
  hook: 'The short-stroke actuator mule moves cleanly on electric micro-servos. Day 8 turns that bench behavior into a safe power/control trunk, choosing cheap manual switches or a pricier fused smart trunk before any sockets or end effectors get power.',
  baseline: "GM-approved 14-day diversion track. Day 7 selected electric micro-servos, which simplifies this power/control work and improves final safety documentation. Simple spring detents still require a manual lock-check warning, the walked bracket tab keeps a light-link fatigue inspection hook, and no permanent equipment, combat, or stat benefit applies until Day 14 final acceptance updates Curtis's page and usage guide.",
  stages: [
    {
      id: 'intake',
      title: 'Trace the micro-servo power lanes',
      station: 'Backplate jig, short-stroke mule, and receipt folder',
      description: 'Map where power, control, and cutoff wiring can run without covering the simple-detent lock checks or the light-link fatigue inspection point.',
      actions: [
        {
          label: 'Map trunk clearance around the actuator mule',
          detail: 'Lay tape paths for power, signal, fuse access, manual lock-check clearance, and the Day 7 walked-bracket inspection mark.',
          skill: 'electronics',
          targetNumber: 3,
          requiredSuccesses: 1,
          onSuccess: 'Curtis gets clean trunk lanes that keep fuse access, lock checks, and the flagged light link visible.',
          onFailure: 'One trunk lane crowds the manual lock-check path, so Curtis burns extra template stock and redraws it before wiring.',
          nuyenSuccess: -250,
          nuyenFailure: -550,
          qualitySuccess: 1,
          qualityFailure: 0,
        },
      ],
    },
    {
      id: 'diagnose',
      title: 'Choose the control style',
      station: 'Switch bin, fuse block, controller shelf, and parts receipts',
      description: 'Pick cheaper manual switches or a fused smart control trunk before Curtis commits the harness and cutoff layout.',
      actions: [
        {
          label: 'Build cheaper manual switches',
          detail: 'Use labeled manual toggles and simple fuse protection. It saves money, but final operation needs slower sequencing and stricter user discipline.',
          skill: 'electronicsBR',
          targetNumber: 4,
          requiredSuccesses: 1,
          onSuccess: 'The switch bank lands cleanly with obvious labels and enough fuse access for bench service.',
          onFailure: 'Two switch leads cross ugly, so Curtis replaces a small terminal strip and documents the manual sequence harder.',
          nuyenSuccess: -900,
          nuyenFailure: -1500,
          qualitySuccess: 1,
          qualityFailure: 0,
          effectNote: 'Project choice: manual switches reduce immediate project spend but require slower deployment sequencing, physical interlock discipline, and a stricter final usage warning.',
        },
        {
          label: 'Install a fused smart control trunk',
          detail: 'Pay for a compact controller, fuse block, and cutoff logic that can supervise the electric micro-servos and simplify later socket interlocks.',
          skill: 'electronics',
          targetNumber: 5,
          requiredSuccesses: 1,
          onSuccess: 'The controller, fuse block, and cutoff leads seat cleanly with usable labels and predictable servo behavior.',
          onFailure: 'One controller daughterboard is bad out of the package, so Curtis buys a replacement and keeps the safer smart-trunk route.',
          nuyenSuccess: -2800,
          nuyenFailure: -3700,
          qualitySuccess: 2,
          qualityFailure: 1,
          effectNote: 'Project choice: fused smart control trunk costs more now but improves safety cutoffs, simplifies Day 9 socket interlocks, and strengthens final acceptance documentation.',
        },
      ],
    },
    {
      id: 'repair',
      title: 'Lace the harness and cutoff block',
      station: 'Harness board, fuse block, shrink wrap, and continuity meter',
      description: 'Build the actual power/control trunk with service loops, strain relief, visible fuse access, and no pressure on the flagged light link.',
      actions: [
        {
          label: 'Wire the power/control harness',
          detail: 'Lace power and control leads around the known micro-servo throw, leave fuse/cutoff access, and keep the manual lock-check card reachable.',
          skill: 'electronicsBR',
          targetNumber: 4,
          requiredSuccesses: 1,
          onSuccess: 'The harness dresses cleanly, clears the moving rail envelope, and leaves the lock-check and light-link inspection points visible.',
          onFailure: 'One service loop pulls tight at full short-stroke travel, so Curtis rebuilds that run and marks it for Day 9 socket clearance.',
          nuyenSuccess: -650,
          nuyenFailure: -1150,
          qualitySuccess: 1,
          qualityFailure: 0,
        },
      ],
    },
    {
      id: 'test',
      title: 'Bench the safety cutoffs',
      station: 'Continuity meter, cutoff switch, and short-stroke cycle jig',
      description: 'Prove the trunk shuts the electric micro-servos down cleanly and does not mask the simple-detent manual lock check.',
      actions: [
        {
          label: 'Run the cutoff and misfire test',
          detail: 'Cycle power, emergency cutoff, detent lock checks, and one simulated stuck command before Day 9 adds wrist sockets.',
          skill: 'electronics',
          targetNumber: 4,
          requiredSuccesses: 1,
          onSuccess: 'The trunk cuts power cleanly, does not bounce the detents, and leaves a clear failure behavior for the final guide.',
          onFailure: 'The cutoff works late on one cycle, so Curtis adds a conservative delay note and buys extra protection hardware.',
          nuyenSuccess: -350,
          nuyenFailure: -900,
          qualitySuccess: 2,
          qualityFailure: 0,
        },
      ],
    },
    {
      id: 'closeout',
      title: 'Write the Day 8 trunk sheet',
      station: 'Build notebook and Day 9 socket sketch',
      description: 'Record control style, cutoff behavior, harness warnings, spend total, and the Day 9 socket-interlock handoff.',
      actions: [
        {
          label: 'Log the Backpack Arms Day 8 sheet',
          detail: 'Write the power/control note: selected control style, cutoff behavior, harness routing, lock-check access, fatigue warning, and Day 9 socket interlock needs.',
          skill: 'electronics',
          targetNumber: 3,
          requiredSuccesses: 1,
          onSuccess: 'The Day 8 sheet gives Day 9 a clear socket-interlock plan and preserves the safety cutoffs for final acceptance.',
          onFailure: 'The sheet is usable, but Curtis flags one harness run and one socket-interlock assumption for review before Day 9.',
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

  const manualSwitches = shift.log.some((entry) => entry.action === 'Build cheaper manual switches')
  const fusedSmartTrunk = shift.log.some((entry) => entry.action === 'Install a fused smart control trunk')

  if (stageId === 'test') {
    if (fusedSmartTrunk) {
      return {
        ...runtime,
        targetNumber: Math.max(2, runtime.targetNumber - 1),
        modifierNote: 'Fused smart control trunk is in effect: supervised cutoff logic reduces this safety test TN by 1.',
      }
    }
    if (manualSwitches) {
      return {
        ...runtime,
        targetNumber: runtime.targetNumber + 1,
        modifierNote: 'Manual switches are in effect: physical sequencing and user-discipline risk raise this safety test TN by 1.',
      }
    }
    return {
      ...runtime,
      targetNumber: runtime.targetNumber + 1,
      modifierNote: 'No control style has been logged yet; use the conservative unknown-control TN +1 until Curtis picks a trunk path.',
    }
  }

  if (stageId === 'closeout') {
    if (fusedSmartTrunk) {
      return {
        ...runtime,
        targetNumber: Math.max(2, runtime.targetNumber - 1),
        modifierNote: 'Fused smart control trunk is in effect: labeled cutoff logic simplifies Day 9 socket-interlock documentation, reducing this closeout TN by 1.',
      }
    }
    if (manualSwitches) {
      return {
        ...runtime,
        targetNumber: runtime.targetNumber + 1,
        modifierNote: 'Manual switches are in effect: slower sequencing and interlock warnings need cleaner documentation, raising this closeout TN by 1.',
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
    `Budget note: ${PROJECT_BUDGET_NOTE} Current logged project spend before this work order: ${PROJECT_CURRENT_SPEND}`,
    `Context note: ${REPORT_CONTEXT_NOTE}`,
    `Status: ${finalStatus}`,
    `Nuyen delta: ${nuyenText(shift.nuyenDelta)}`,
    `Maintenance quality: ${qualityLabel(shift.quality)} (${shift.quality})`,
    'Notable work log:',
    ...rollLines,
    'New tradeoffs / follow-up effects:',
    ...(effectLines.length ? effectLines : ['- None selected yet.']),
    `Cindy ingest/closeout note: Ingest as Curtis Backpack Arms Build day ${PROJECT_DAY}/${PROJECT_TOTAL_DAYS}; apply this nuyen delta as project spend; append today's result and new hooks to the project page; rotate Drone Shift to day ${NEXT_PROJECT_DAY}: ${NEXT_PROJECT_PHASE}; include Curtis's updated running nuyen total. Do not apply permanent drone, vehicle, equipment, combat, or stat changes until day ${PROJECT_TOTAL_DAYS} final GM acceptance.`,
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
