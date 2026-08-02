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
const PROJECT_DAY: number = 13
const PROJECT_TOTAL_DAYS: number = 14
const NEXT_PROJECT_DAY = PROJECT_DAY + 1
const NEXT_PROJECT_PHASE = 'Final acceptance and usage guide'
const PROJECT_BUDGET_NOTE = 'GM-approved 14-day diversion track; expected total project spend roughly 28,000-45,000¥ before final acceptance.'
const PROJECT_CURRENT_SPEND = '20,950¥ logged before this work order; Day 12 rotated out untouched with no spend, no penalty, and no project-state change.'
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
  { day: 8, title: 'Power and control trunk', status: 'complete', choicePressure: 'cheaper manual switches vs fused smart control trunk', spendBand: '2,000-5,500¥', carryForward: 'completed with manual switches, clean cutoffs, slower sequencing, and a Day 9 socket-interlock review hook' },
  { day: 9, title: 'Quick-change wrist sockets', status: 'complete', choicePressure: 'universal socket vs specialized tool pods', spendBand: '1,500-4,000¥', carryForward: 'completed with universal wrist sockets, manual socket labels, a stricter load-limit warning, and a conservative Day 10 lift-limit flag' },
  { day: 10, title: 'Single-arm lift and tool test', status: 'complete', choicePressure: 'conservative torque limit vs higher tool load', spendBand: '1,000-3,500¥', carryForward: 'completed with conservative torque, reused ballast, fresh bushings, a strict safe-load number, and a side-assembly balance note' },
  { day: 11, title: 'Three-arm side assembly', status: 'discarded', choicePressure: 'symmetric reliability vs one stronger utility arm', spendBand: '2,500-6,000¥', carryForward: 'rotated out untouched with no spend, no penalty, and no carry-forward bonus' },
  { day: 12, title: 'Mirror-side replication', status: 'discarded', choicePressure: 'exact duplicate vs corrected asymmetry', spendBand: '2,000-5,500¥', carryForward: 'rotated out untouched with no spend, no penalty, and no carry-forward bonus' },
  { day: 13, title: 'Wear test and snag test', status: 'active', choicePressure: 'comfortable daily carry vs aggressive deployment profile', spendBand: '1,000-3,000¥', carryForward: 'active now; wear findings become final limitations' },
  { day: 14, title: 'Final acceptance and usage guide', status: 'final', choicePressure: 'tool-rig approval vs tool-plus-combat approval', spendBand: '2,500-6,000¥', carryForward: 'accepted result updates Curtis page with final gear and usage guide' },
]

const activeJob: JobProfile = {
  id: 'backpack-arms-wear-snag-test',
  title: 'Wear-and-Snag Test',
  asset: "Curtis's Backpack Arms rig: Day 13 wear test and snag test",
  customer: 'Curtis, continuing Day 13 of the 14-day Backpack Arms diversion track',
  risk: 'shop mess',
  hook: 'The Day 12 mirror-side replication ticket sat untouched, so it rotates out cleanly: no spend, no penalty, no hidden wobble. Curtis is down to the ugly practical question now: can this little spider-pack ride on his back, turn through a door, and deploy without hooking a chair like it owes the chair money?',
  baseline: "GM-approved 14-day diversion track. Current project spend is 20,950¥ before this work order, and Day 12 was discarded with no project-state change. The wear test starts from Day 10's strict single-arm safe-load card, universal socket warning, manual sequencing discipline, conservative lift envelope, safety-stop discipline, reused-ballast maintenance note, and the prior light-link fatigue warning. Today's choices decide whether the final guide favors comfortable daily carry or a faster, riskier deployment profile, and whether Curtis buys clean anti-snag hardware or saves nuyen with salvage loom that may need maintenance warnings. No permanent equipment, combat, or stat benefit applies until Day 14 final acceptance updates Curtis's page and usage guide.",
  stages: [
    {
      id: 'intake',
      title: 'Harness up the carry mockup',
      station: 'Backplate, shoulder straps, hip belt, dummy sockets, and safety stops',
      description: 'Load the rig with dummy tool weight, cinch the harness, confirm the manual cutoffs are reachable, and keep the Day 12 miss from pretending the mirror side was proven.',
      actions: [
        {
          label: 'Set the carry mockup and safety stops',
          detail: 'Fit the pack to Curtis-height stance, hang dummy tool weight, check cutoff reach, and mark every place the harness rubs before any deployment cycling starts.',
          skill: 'electronics',
          targetNumber: 3,
          requiredSuccesses: 1,
          onSuccess: 'The carry mockup hangs square enough to test without pulling Curtis sideways, and the safety stops stay reachable.',
          onFailure: 'The pack rides crooked under dummy weight, so Curtis buys extra strap hardware and resets the stop marks before walking it.',
          nuyenSuccess: -200,
          nuyenFailure: -650,
          qualitySuccess: 1,
          qualityFailure: 0,
        },
      ],
    },
    {
      id: 'diagnose',
      title: 'Choose the wear-test profile',
      station: 'Harness marks, deployment card, shoulder clearance, and hallway tape line',
      description: 'Pick whether Curtis biases the Day 13 test toward long comfortable carry or toward a faster deployment profile that might help Day 14 acceptance but makes the snag test meaner.',
      actions: [
        {
          label: 'Tune for comfortable daily carry',
          detail: 'Pad and trim the carry profile so Curtis can wear the rig longer without hot spots, accepting a slower deployment cadence in the final guide.',
          skill: 'carBR',
          targetNumber: 4,
          requiredSuccesses: 1,
          onSuccess: 'The harness sits lower and calmer, with fewer shoulder hot spots and a clear slower-deploy note.',
          onFailure: 'The first padding set bunches at the hip belt, so Curtis buys better strap foam and marks slower deployment as mandatory until Day 14 review.',
          nuyenSuccess: -600,
          nuyenFailure: -1500,
          qualitySuccess: 1,
          qualityFailure: 0,
          effectNote: 'Project choice: comfortable daily carry lowers the hallway snag-test TN by 1 and improves final wear-limit language, but the final usage guide must keep slower deployment sequencing unless Day 14 approves otherwise.',
        },
        {
          label: 'Tune for aggressive deployment profile',
          detail: 'Keep the pack tighter and springier so the arms clear faster, spending more on stiffeners and accepting a harsher snag test.',
          skill: 'rotorAircraftBR',
          targetNumber: 5,
          requiredSuccesses: 1,
          onSuccess: 'The tighter profile deploys with less wasted travel and gives Day 14 something useful to test for approval language.',
          onFailure: 'The aggressive profile bites at the shoulder strap, so Curtis buys extra stiffener stock and flags deployment as not combat-safe yet.',
          nuyenSuccess: -1200,
          nuyenFailure: -2500,
          qualitySuccess: 2,
          qualityFailure: 0,
          effectNote: 'Project choice: aggressive deployment profile costs more and makes the hallway snag test require one extra success, but a clean result gives Day 14 stronger deployment and possible combat-limit language.',
        },
      ],
    },
    {
      id: 'repair',
      title: 'Set the anti-snag hardware standard',
      station: 'Edge guards, cable sleeves, socket caps, receipt pile, and salvage loom',
      description: 'Choose whether Curtis buys documented anti-snag hardware for clean acceptance paperwork or saves nuyen with filed salvage loom that may chatter and need a maintenance warning.',
      actions: [
        {
          label: 'Buy lined sleeves and edge guards',
          detail: 'Pay for low-profile cable sleeves, lined edge guards, and socket caps with receipts so the hallway test is about the design instead of mystery burrs.',
          skill: 'negotiation',
          targetNumber: 4,
          requiredSuccesses: 1,
          onSuccess: 'Curtis gets the lined hardware at a painful but fair price and tags the receipts for Day 14 acceptance.',
          onFailure: 'The parts counter only has the better sleeve kit, so Curtis pays more but gets clean edge protection.',
          nuyenSuccess: -900,
          nuyenFailure: -1800,
          qualitySuccess: 1,
          qualityFailure: 0,
          effectNote: 'Project choice: documented sleeves and edge guards reduce the hallway snag-test TN by 1 and give Day 14 cleaner repair and maintenance paperwork.',
        },
        {
          label: 'File salvage loom and reuse socket caps',
          detail: 'Shape cheaper salvage loom by hand, reuse socket caps, and accept that any burr or crooked sleeve may become a final maintenance warning.',
          skill: 'electronicsBR',
          targetNumber: 5,
          requiredSuccesses: 1,
          onSuccess: 'The salvage loom files clean enough for testing, with witness paint marking the spots Curtis should inspect later.',
          onFailure: 'A reused cap grabs the test cloth, so Curtis buys witness paint, files the loom again, and flags extra maintenance checks.',
          nuyenSuccess: -250,
          nuyenFailure: -1100,
          qualitySuccess: 0,
          qualityFailure: 0,
          effectNote: 'Project choice: salvage loom lowers immediate spend but raises the hallway snag-test TN by 1 and adds a Day 14 maintenance-inspection warning unless the test result is excellent.',
        },
      ],
    },
    {
      id: 'test',
      title: 'Run the hallway snag test',
      station: 'Doorframe tape, shop chair, hanging rag strip, manual switch card, and dummy tools',
      description: 'Walk, turn, sit, stand, and deploy through a mean little shop obstacle lane. This is where the prior choices must prove whether they bought reliability or merely bought optimism.',
      actions: [
        {
          label: 'Walk the pack through the snag lane',
          detail: 'Cycle folded carry, chair turn, doorframe pass, rag-strip brush, and one slow manual deployment while staying inside the strict safe-load number.',
          skill: 'electronicsBR',
          targetNumber: 4,
          requiredSuccesses: 1,
          onSuccess: 'The pack clears the snag lane with only honest rub marks, and the manual sequence remains readable under dummy load.',
          onFailure: 'The pack catches the rag strip and scuffs a socket cap; Curtis buys replacement guards and marks Day 14 for strict folded-carry limitations.',
          nuyenSuccess: -350,
          nuyenFailure: -1400,
          qualitySuccess: 2,
          qualityFailure: 0,
        },
      ],
    },
    {
      id: 'closeout',
      title: 'Write the Day 13 wear card',
      station: 'Build notebook, final acceptance checklist, safety warnings, and usage-guide draft',
      description: 'Record the carry profile, anti-snag standard, test behavior, safety cutoff reach, maintenance warning, and exactly what Day 14 must decide before Curtis gets a real gear entry.',
      actions: [
        {
          label: 'Log the Backpack Arms Day 13 wear-and-snag sheet',
          detail: 'Write the wear note: comfort or aggressive profile, sleeve standard, snag result, folded-carry limit, safety cutoff note, and final Day 14 acceptance questions.',
          skill: 'electronics',
          targetNumber: 3,
          requiredSuccesses: 1,
          onSuccess: 'The Day 13 sheet gives Day 14 clean acceptance questions and a usable first draft of the carry and maintenance limitations.',
          onFailure: 'The sheet is complete but fussy; Curtis flags Day 14 to restate folded carry, cutoffs, and maintenance limits before any approval.',
          nuyenSuccess: -150,
          nuyenFailure: -600,
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

  const comfortableCarry = shift.log.some((entry) => entry.action === 'Tune for comfortable daily carry')
  const aggressiveDeployment = shift.log.some((entry) => entry.action === 'Tune for aggressive deployment profile')
  const documentedSleeves = shift.log.some((entry) => entry.action === 'Buy lined sleeves and edge guards')
  const salvageLoom = shift.log.some((entry) => entry.action === 'File salvage loom and reuse socket caps')

  if (stageId === 'test') {
    let targetNumber = runtime.targetNumber
    let requiredSuccesses = runtime.requiredSuccesses
    const modifierNotes: string[] = []

    if (comfortableCarry) {
      targetNumber -= 1
      modifierNotes.push('comfortable daily carry lowers this hallway snag-test TN by 1')
    }
    if (aggressiveDeployment) {
      requiredSuccesses += 1
      modifierNotes.push('aggressive deployment profile requires one extra success to prove faster clearance')
    }
    if (documentedSleeves) {
      targetNumber -= 1
      modifierNotes.push('documented sleeves and edge guards lower this hallway snag-test TN by 1')
    }
    if (salvageLoom) {
      targetNumber += 1
      modifierNotes.push('salvage loom raises this hallway snag-test TN by 1')
    }
    if (!comfortableCarry && !aggressiveDeployment) {
      targetNumber += 1
      modifierNotes.push('no wear-test profile has been logged yet, so use conservative unknown-fit TN +1')
    }

    return {
      ...runtime,
      targetNumber: Math.max(2, targetNumber),
      requiredSuccesses,
      modifierNote: modifierNotes.length ? `Project modifiers: ${modifierNotes.join('; ')}.` : undefined,
    }
  }

  if (stageId === 'closeout') {
    let targetNumber = runtime.targetNumber
    const modifierNotes: string[] = []

    if (comfortableCarry) {
      targetNumber -= 1
      modifierNotes.push('comfortable carry is easier to document for daily-use limits, reducing this closeout TN by 1')
    }
    if (aggressiveDeployment) {
      targetNumber += 1
      modifierNotes.push('aggressive deployment needs stricter Day 14 approval language, raising this closeout TN by 1')
    }
    if (documentedSleeves) {
      modifierNotes.push('documented sleeves and edge guards preserve cleaner repair and maintenance paperwork for Day 14')
    }
    if (salvageLoom) {
      targetNumber += 1
      modifierNotes.push('salvage loom requires a maintenance-inspection warning, raising this closeout TN by 1')
    }

    return {
      ...runtime,
      targetNumber: Math.max(2, targetNumber),
      modifierNote: modifierNotes.length ? `Project modifiers: ${modifierNotes.join('; ')}.` : undefined,
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
    `Cindy ingest/closeout note: Ingest as Curtis Backpack Arms Build day ${PROJECT_DAY}/${PROJECT_TOTAL_DAYS}; apply this nuyen delta as project spend; append today's result and new hooks to the project page; mark Job Completed; rotate Drone Shift to day ${NEXT_PROJECT_DAY}: ${NEXT_PROJECT_PHASE}; include Curtis's updated current nuyen total in the confirmation response to every completed daily post. Do not apply permanent drone, vehicle, equipment, combat, or stat changes until day ${PROJECT_TOTAL_DAYS} final GM acceptance.`,
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
