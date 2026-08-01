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
const PROJECT_DAY: number = 12
const PROJECT_TOTAL_DAYS: number = 14
const NEXT_PROJECT_DAY = PROJECT_DAY + 1
const NEXT_PROJECT_PHASE = 'Wear test and snag test'
const PROJECT_BUDGET_NOTE = 'GM-approved 14-day diversion track; expected total project spend roughly 28,000-45,000¥ before final acceptance.'
const PROJECT_CURRENT_SPEND = '20,950¥ logged before this work order; Day 11 rotated out untouched with no spend, no penalty, and no project-state change.'
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
  { day: 12, title: 'Mirror-side replication', status: 'active', choicePressure: 'exact duplicate vs corrected asymmetry', spendBand: '2,000-5,500¥', carryForward: 'active now; symmetry affects wear/snag final tests' },
  { day: 13, title: 'Wear test and snag test', status: 'waiting', choicePressure: 'comfortable daily carry vs aggressive deployment profile', spendBand: '1,000-3,000¥', carryForward: 'wear findings become final limitations' },
  { day: 14, title: 'Final acceptance and usage guide', status: 'final', choicePressure: 'tool-rig approval vs tool-plus-combat approval', spendBand: '2,500-6,000¥', carryForward: 'accepted result updates Curtis page with final gear and usage guide' },
]

const activeJob: JobProfile = {
  id: 'backpack-arms-mirror-side-replication',
  title: 'Mirror-Side Replication',
  asset: "Curtis's Backpack Arms rig: Day 12 mirror-side replication",
  customer: 'Curtis, continuing Day 12 of the 14-day Backpack Arms diversion track',
  risk: 'shop mess',
  hook: 'The Day 11 side-assembly ticket sat untouched, so it rotates out cleanly: no spend, no penalty, no hidden wobble. Curtis is back at the bench with the Day 10 strict safe-load card and has to build the mirror-side pattern without pretending a missing left side ever got tested.',
  baseline: "GM-approved 14-day diversion track. Current project spend is 20,950¥ before this work order, and Day 11 was discarded with no project-state change. Day 10 still supplies the square first-arm fixture, conservative torque ceiling, reused-ballast maintenance note, fresh bushing replacement, strict single-arm safe-load number, socket warning, manual sequencing discipline, and side-assembly balance cue. Today's work decides whether the mirror side duplicates the proven cautious geometry or pays more to correct asymmetry before the Day 13 wear/snag test. No permanent equipment, combat, or stat benefit applies until Day 14 final acceptance updates Curtis's page and usage guide.",
  stages: [
    {
      id: 'intake',
      title: 'Recover the mirror-side reference',
      station: 'Day 10 safe-load card, untouched Day 11 tray, mirror jig, and socket labels',
      description: 'Clear the stale Day 11 tray, preserve the strict safe-load card, and square a mirror-side reference from the last proven measurements instead of inventing a completed side that never happened.',
      actions: [
        {
          label: 'Square the mirror jig from the last proven arm',
          detail: 'Use the Day 10 reference arm, socket labels, safety-stop marks, and rail envelope to set a mirror-side baseline while discarding the untouched Day 11 work order cleanly.',
          skill: 'electronics',
          targetNumber: 3,
          requiredSuccesses: 1,
          onSuccess: 'The mirror jig keys cleanly from the Day 10 reference, with visible labels and no false Day 11 carry-forward baked into the pattern.',
          onFailure: 'The mirror jig is a half-degree sour, so Curtis buys a better straightedge set and resets the marks before cutting duplicate lanes.',
          nuyenSuccess: -350,
          nuyenFailure: -900,
          qualitySuccess: 1,
          qualityFailure: 0,
        },
      ],
    },
    {
      id: 'diagnose',
      title: 'Choose the mirror geometry strategy',
      station: 'Mirror layout, belt-clearance marks, service-access warning, and final wear-test notes',
      description: 'Decide whether Curtis duplicates the cautious proven geometry exactly, or spends extra time and parts correcting asymmetry before the rig reaches a real wear/snag test.',
      actions: [
        {
          label: 'Duplicate the cautious geometry exactly',
          detail: 'Mirror the Day 10 reference dimensions and manual labels without redesigning the belt clearance, keeping today cheaper but carrying stricter fit notes into Day 13.',
          skill: 'electronicsBR',
          targetNumber: 4,
          requiredSuccesses: 1,
          onSuccess: 'The mirror dimensions copy cleanly and keep the strict safe-load envelope easy to explain.',
          onFailure: 'The copied geometry binds near the hip belt, so Curtis buys spacer stock and marks Day 13 for an extra snag check.',
          nuyenSuccess: -900,
          nuyenFailure: -1900,
          qualitySuccess: 1,
          qualityFailure: 0,
          effectNote: 'Project choice: exact mirror geometry keeps spend down and lowers today\'s documentation burden, but Day 13 must keep a stricter belt-snag and service-access warning unless the wear test proves otherwise.',
        },
        {
          label: 'Correct the mirror-side asymmetry now',
          detail: 'Buy documented bracket stock and offset the mirror side around the hip-belt and socket-label conflicts before any wear test exposes them.',
          skill: 'electronics',
          targetNumber: 5,
          requiredSuccesses: 1,
          onSuccess: 'The corrected mirror offset clears the belt and keeps socket labels readable, though it needs stricter documentation than a direct copy.',
          onFailure: 'The first correction stacks ugly, so Curtis buys a matched bracket pair and writes the offset as conservative until Day 13 proves it.',
          nuyenSuccess: -1900,
          nuyenFailure: -3300,
          qualitySuccess: 2,
          qualityFailure: 0,
          effectNote: 'Project choice: corrected mirror-side asymmetry costs more and raises today\'s documentation TN, but a clean result reduces Day 13 belt-snag risk and improves final acceptance language.',
        },
      ],
    },
    {
      id: 'repair',
      title: 'Source the mirror-side wear stack',
      station: 'Bushings, servo horn pair, rail spacers, and documented receipts',
      description: 'Pick the parts standard for the mirror side: documented matched hardware that hurts today, or cheaper salvage that keeps nuyen in pocket but makes the replication test fussier.',
      actions: [
        {
          label: 'Buy documented matched hardware',
          detail: 'Pay for matched bushings, servo horns, and rail spacers with receipts so the mirror side has less mystery wear going into the snag test.',
          skill: 'negotiation',
          targetNumber: 4,
          requiredSuccesses: 1,
          onSuccess: 'Curtis gets the matched hardware at shop-counter pricing and tags each piece for later maintenance.',
          onFailure: 'The counter clerk smells desperation; Curtis still gets the matched set, but pays extra for the right servo horns.',
          nuyenSuccess: -1300,
          nuyenFailure: -2300,
          qualitySuccess: 1,
          qualityFailure: 0,
          effectNote: 'Project choice: documented matched hardware costs more now, lowers the mirror replication test TN by 1, and gives Day 14 cleaner maintenance/acceptance paperwork.',
        },
        {
          label: 'Scrounge a matched-enough wear stack',
          detail: 'Pull bushings and spacers from the salvage bins, match them by hand, and accept more rework risk if the mirror side chatters under load.',
          skill: 'electronicsBR',
          targetNumber: 5,
          requiredSuccesses: 1,
          onSuccess: 'The salvage wear stack matches well enough after hand-sorting, with a painted witness line for the next test.',
          onFailure: 'Two bushings chatter under hand load, so Curtis loses time and buys fresh witness tape plus a partial replacement set.',
          nuyenSuccess: -450,
          nuyenFailure: -1600,
          qualitySuccess: 0,
          qualityFailure: 0,
          effectNote: 'Project choice: scrounged wear stack lowers immediate spend but raises the mirror replication test TN by 1 and leaves a Day 13 maintenance-chatter warning.',
        },
      ],
    },
    {
      id: 'test',
      title: 'Cycle the mirrored lanes',
      station: 'Mirror rails, dummy sockets, manual switch sequence, and hip-belt clearance gauge',
      description: 'Move the mirrored lanes through the strict safe-load envelope, watch for belt snags, confirm the manual sequence still reads left/right cleanly, and stop before anything counts as gear benefit.',
      actions: [
        {
          label: 'Run the mirror replication cycle under strict safe-load',
          detail: 'Cycle the mirrored dummy sockets through the manual sequence, hold belt clearance, and verify the mirrored labels still point Curtis toward the right cutoff.',
          skill: 'electronicsBR',
          targetNumber: 4,
          requiredSuccesses: 1,
          onSuccess: 'The mirror side cycles inside the strict safe-load number, clears the belt gauge, and leaves the cutoff labels readable.',
          onFailure: 'The mirror side moves, but one lane chatters at the hip-belt edge; Curtis buys extra shims and flags Day 13 for conservative snag testing.',
          nuyenSuccess: -550,
          nuyenFailure: -1700,
          qualitySuccess: 2,
          qualityFailure: 0,
        },
      ],
    },
    {
      id: 'closeout',
      title: 'Write the Day 12 mirror card',
      station: 'Build notebook, Day 13 wear-test card, warning labels, and maintenance notes',
      description: 'Record mirror strategy, parts standard, replication behavior, belt-clearance warnings, socket-label discipline, and the exact Day 13 wear/snag test hook.',
      actions: [
        {
          label: 'Log the Backpack Arms Day 12 mirror-side sheet',
          detail: 'Write the mirror note: exact-copy or corrected-offset choice, documented or scrounged wear stack, cycle result, belt-snag warning, and Day 13 wear-test cue.',
          skill: 'electronics',
          targetNumber: 3,
          requiredSuccesses: 1,
          onSuccess: 'The Day 12 sheet gives Day 13 a clean wear/snag test plan, belt-clearance warning, socket-label note, and strict safe-load reminder.',
          onFailure: 'The sheet is readable but grumpy; Curtis marks Day 13 to recheck belt clearance, label direction, and chatter before any comfort claim.',
          nuyenSuccess: -200,
          nuyenFailure: -700,
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

  const exactMirror = shift.log.some((entry) => entry.action === 'Duplicate the cautious geometry exactly')
  const correctedMirror = shift.log.some((entry) => entry.action === 'Correct the mirror-side asymmetry now')
  const documentedHardware = shift.log.some((entry) => entry.action === 'Buy documented matched hardware')
  const scroungedHardware = shift.log.some((entry) => entry.action === 'Scrounge a matched-enough wear stack')

  if (stageId === 'test') {
    let targetNumber = runtime.targetNumber
    let requiredSuccesses = runtime.requiredSuccesses
    const modifierNotes: string[] = []

    if (exactMirror) {
      targetNumber -= 1
      modifierNotes.push('exact mirror geometry reduces this replication-cycle TN by 1')
    }
    if (correctedMirror) {
      requiredSuccesses += 1
      modifierNotes.push('corrected mirror-side asymmetry needs one extra success to prove the offset before Day 13')
    }
    if (documentedHardware) {
      targetNumber -= 1
      modifierNotes.push('documented matched hardware reduces this replication-cycle TN by 1')
    }
    if (scroungedHardware) {
      targetNumber += 1
      modifierNotes.push('scrounged wear stack raises this replication-cycle TN by 1')
    }
    if (!exactMirror && !correctedMirror) {
      targetNumber += 1
      modifierNotes.push('no mirror geometry strategy has been logged yet, so use conservative unknown-fit TN +1')
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

    if (exactMirror) {
      targetNumber -= 1
      modifierNotes.push('exact mirror geometry is easier to document, reducing this closeout TN by 1')
    }
    if (correctedMirror) {
      targetNumber += 1
      modifierNotes.push('corrected mirror-side asymmetry needs stricter Day 13 and final-acceptance language, raising this closeout TN by 1')
    }
    if (documentedHardware) {
      modifierNotes.push('documented matched hardware preserves cleaner maintenance paperwork for Day 14')
    }
    if (scroungedHardware) {
      targetNumber += 1
      modifierNotes.push('scrounged wear stack requires a maintenance-chatter warning, raising this closeout TN by 1')
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
