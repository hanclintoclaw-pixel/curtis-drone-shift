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
const PROJECT_DAY: number = 14
const PROJECT_TOTAL_DAYS: number = 14
const NEXT_PROJECT_DAY = PROJECT_DAY + 1
const NEXT_PROJECT_PHASE = 'Post-acceptance follow-up'
const PROJECT_BUDGET_NOTE = 'GM-approved 14-day diversion track; expected total project spend roughly 28,000-45,000¥ before final acceptance.'
const PROJECT_CURRENT_SPEND = '24,200¥ logged before this work order; Day 13 completed as solid repair with comfortable daily carry, documented anti-snag hardware, a failed snag lane, replacement guards, strict folded-carry limits, and a slower-deploy note.'
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
  { day: 13, title: 'Wear test and snag test', status: 'complete', choicePressure: 'comfortable daily carry vs aggressive deployment profile', spendBand: '1,000-3,000¥', carryForward: 'completed with comfortable daily carry, documented anti-snag hardware, a failed snag lane, replacement guards, strict folded-carry limits, and a slower-deploy note' },
  { day: 14, title: 'Final acceptance and usage guide', status: 'active', choicePressure: 'tool-rig approval vs tool-plus-combat approval', spendBand: '2,500-6,000¥', carryForward: 'active final gate; accepted result updates Curtis page with final gear and usage guide' },
]

const activeJob: JobProfile = {
  id: 'backpack-arms-final-acceptance',
  title: 'Final Acceptance and Usage Guide',
  asset: "Curtis's Backpack Arms rig: Day 14 final acceptance and usage guide",
  customer: 'Curtis, closing Day 14 of the 14-day Backpack Arms diversion track',
  risk: 'shop mess',
  hook: 'The pack finally has to stop being a shop project and become either usable gear or a very expensive warning label. Day 13 proved the comfortable carry profile and reachable safety stops, bought documented anti-snag hardware, and still caught the rag strip hard enough to scuff a socket cap. Today decides what Curtis can actually claim on his sheet.',
  baseline: "GM-approved 14-day diversion track. Current project spend is 24,200¥ before this work order. Day 13 completed as a solid repair with the carry mockup hanging square, safety stops reachable, fewer shoulder hot spots, documented lined sleeves and edge guards, replacement guards after a failed hallway snag test, a clean wear card, and a slower-deploy note. Final acceptance must preserve conservative torque and lift limits, universal-socket warnings, manual sequencing discipline, manual lock checks, strict folded-carry limitations, reused-ballast recheck notes, and strict load-limit language unless the GM explicitly expands them. No permanent equipment, combat, or stat benefit applies until this final report is accepted and Curtis's page gets the finalized gear entry and usage guide.",
  stages: [
    {
      id: 'intake',
      title: 'Audit the final build packet',
      station: 'Build notebook, Day 10 safe-load card, Day 13 wear card, receipts, and cutoff labels',
      description: 'Confirm the packet is complete before Curtis asks the GM to bless anything as real gear.',
      actions: [
        {
          label: 'Cross-check the acceptance packet',
          detail: 'Match the safe-load card, socket labels, manual sequence, slower-deploy note, strict folded-carry limit, documented guard receipts, and safety cutoff map against the physical rig.',
          skill: 'electronics',
          targetNumber: 3,
          requiredSuccesses: 1,
          onSuccess: 'The paperwork matches the rig closely enough for a clean acceptance pass, with every major warning traceable to a test note.',
          onFailure: 'Two notes disagree on the socket sequence, so Curtis buys labels and shop time to rewrite the acceptance packet before review.',
          nuyenSuccess: -250,
          nuyenFailure: -900,
          qualitySuccess: 1,
          qualityFailure: 0,
        },
      ],
    },
    {
      id: 'diagnose',
      title: 'Choose the approval scope',
      station: 'GM acceptance checklist, dummy tools, folded pack, and combat-risk notes',
      description: 'Decide whether Curtis asks for a conservative tool-rig approval or pushes for limited tool-plus-combat language.',
      actions: [
        {
          label: 'Ask for conservative tool-rig approval',
          detail: 'Frame the rig as wearable utility gear first: strict folded carry, slow deployment, light tool work, strict sockets, and no extra attacks.',
          skill: 'carBR',
          targetNumber: 4,
          requiredSuccesses: 1,
          onSuccess: 'The conservative packet is boring in the useful way: believable, documented, and easy to approve for light tool work.',
          onFailure: 'Curtis has to buy extra restraint hardware and rewrite the limits tighter before the conservative approval looks safe.',
          nuyenSuccess: -900,
          nuyenFailure: -2200,
          qualitySuccess: 2,
          qualityFailure: 0,
          effectNote: 'Final approval choice: conservative tool-rig approval keeps Day 14 easier and safer, but the usage guide must explicitly deny extra natural limbs, extra attacks, and combat reach unless the GM later expands it.',
        },
        {
          label: 'Push for tool-plus-combat approval language',
          detail: 'Try to document limited bracing, guard, or intimidation use without pretending the pack is cyberware or a free extra-action machine.',
          skill: 'rotorAircraftBR',
          targetNumber: 6,
          requiredSuccesses: 2,
          onSuccess: 'Curtis documents a narrow combat-support case without breaking the safe-load card, giving the GM specific limits to accept or trim.',
          onFailure: 'The combat language gets too spicy for the hardware, so Curtis buys guard stock and marks combat use as GM-call only.',
          nuyenSuccess: -2200,
          nuyenFailure: -4200,
          qualitySuccess: 3,
          qualityFailure: 0,
          effectNote: 'Final approval choice: tool-plus-combat language is expensive and harder to pass; failure should keep combat use as GM-call only with no automatic extra actions or reach benefit.',
        },
      ],
    },
    {
      id: 'repair',
      title: 'Lock the final safety package',
      station: 'Edge guards, socket caps, lock detents, cutoff tabs, warning tags, and repair kit',
      description: 'Spend the last parts money on whatever makes the final guide honest instead of optimistic.',
      actions: [
        {
          label: 'Buy documented safety spares',
          detail: 'Add clean socket caps, cutoff tags, spare bushings, detent springs, and receipt-backed edge guards for the final maintenance section.',
          skill: 'negotiation',
          targetNumber: 4,
          requiredSuccesses: 1,
          onSuccess: 'Curtis gets the final safety spares without being robbed blind, and the maintenance kit looks like something a GM can point at.',
          onFailure: 'The last-minute parts run hurts, but Curtis gets clean spares and documented replacements instead of gambling on salvage.',
          nuyenSuccess: -1100,
          nuyenFailure: -2400,
          qualitySuccess: 1,
          qualityFailure: 0,
          effectNote: 'Final safety package: documented spares support cleaner maintenance intervals and make it easier to repair one arm or socket without sidelining the whole pack.',
        },
        {
          label: 'Keep the final kit lean',
          detail: 'Use existing spares, handwritten tags, the Day 13 comfort notes, and the replacement-guard warning to close cheaply while accepting stricter maintenance language.',
          skill: 'electronicsBR',
          targetNumber: 5,
          requiredSuccesses: 1,
          onSuccess: 'The lean kit is readable and safe enough, but it clearly depends on inspection discipline after rough use.',
          onFailure: 'A reused tag and a tired bushing fail the closeout check, forcing Curtis to buy replacements and write a harsher maintenance warning.',
          nuyenSuccess: -350,
          nuyenFailure: -1600,
          qualitySuccess: 0,
          qualityFailure: 0,
          effectNote: 'Final safety package: lean closeout saves money but preserves strict maintenance inspections after rough use and any socket-cap replacement.',
        },
      ],
    },
    {
      id: 'test',
      title: 'Run the final acceptance cycle',
      station: 'Folded carry lane, manual switch card, dummy end effectors, and safe-load witness mark',
      description: 'Perform the final folded-carry, deployment, cutoff, tool-load, and stow cycle without exceeding the conservative safe-load card.',
      actions: [
        {
          label: 'Cycle folded carry, deployment, tool use, and stow',
          detail: 'Walk the pack through the strict folded-carry lane, deploy slowly, touch each manual control, lift dummy tools inside the safe-load number, hit the cutoffs, and stow clean.',
          skill: 'electronicsBR',
          targetNumber: 4,
          requiredSuccesses: 2,
          onSuccess: 'The final cycle stays inside the safe-load number, the cutoffs stay reachable, and the pack stows without pretending it is fast.',
          onFailure: 'The cycle passes only after a snag and a socket reset, so Curtis buys replacement guards and writes stricter folded-carry limits.',
          nuyenSuccess: -600,
          nuyenFailure: -2300,
          qualitySuccess: 2,
          qualityFailure: 0,
        },
      ],
    },
    {
      id: 'closeout',
      title: 'Write the finalized usage guide',
      station: 'Curtis sheet note, project page, usage guide, limitations, and GM approval line',
      description: 'Close the project with the final total spend, allowed uses, limitations, repair notes, and explicit GM-approved SR3 effects.',
      actions: [
        {
          label: 'Write the Backpack Arms final acceptance report',
          detail: 'Record folded carry, deployment timing, socket limits, tool uses, combat limits, safety cutoffs, maintenance intervals, repair thresholds, and what the GM approved.',
          skill: 'electronics',
          targetNumber: 3,
          requiredSuccesses: 1,
          onSuccess: 'The final report is clear enough to update Curtis with a player-facing gear entry and no hidden benefits.',
          onFailure: 'Curtis writes the guide, but it needs tighter wording before anyone treats the rig as more than provisional gear.',
          nuyenSuccess: -300,
          nuyenFailure: -900,
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

  const closeoutInstruction = PROJECT_DAY === PROJECT_TOTAL_DAYS
    ? "update Curtis's page with the finalized Backpack Arms gear entry and usage guide before treating the rig as complete"
    : `rotate Drone Shift to day ${NEXT_PROJECT_DAY}: ${NEXT_PROJECT_PHASE}`

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
    `Cindy ingest/closeout note: Ingest as Curtis Backpack Arms Build day ${PROJECT_DAY}/${PROJECT_TOTAL_DAYS}; apply this nuyen delta as project spend; append today's result and new hooks to the project page; mark Job Completed; ${closeoutInstruction}; include Curtis's updated current nuyen total in the confirmation response to every completed daily post. Do not apply permanent drone, vehicle, equipment, combat, or stat changes until day ${PROJECT_TOTAL_DAYS} final GM acceptance.`,
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
          <strong>Post report to close the build</strong>
          <p>Cindy should append the final result to the project log, apply the spend delta, preserve the final carry-forward limits, and update Curtis's page with the accepted gear entry and usage guide before treating the rig as complete.</p>
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
