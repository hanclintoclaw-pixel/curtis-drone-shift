import { useEffect, useMemo, useState } from 'react'
import './App.css'

declare const __SOURCE_COMMIT__: string

type Lane = 'Maintenance' | 'Project' | 'Rigger School'
type OutcomeTone = 'pending' | 'success' | 'failure'

interface GarageChoice {
  id: string
  label: string
  detail: string
  skill: string
  dice: number
  targetNumber: number
  cost: number
  successText: string
  failureText: string
  successQuality: number
  failureQuality: number
}

interface GarageDay {
  day: number
  title: string
  lane: Lane
  asset: string
  morningTask: string
  riggerNote: string
  choices: GarageChoice[]
  projectNote: string
  milestone?: string
  sheetChange?: string
}

interface DailyResult {
  day: number
  choiceId: string
  dice: number[]
  successes: number
  tone: OutcomeTone
  nuyenDelta: number
  qualityDelta: number
  completedAt: string
}

const STORAGE_KEY = 'cindylou.curtisMorningGarage.v1'
const LEGACY_STORAGE_KEYS = ['cindylou.curtisDroneShift.v2']
const PROJECT_START = new Date('2026-08-08T00:00:00-04:00').getTime()
const DAY_MS = 24 * 60 * 60 * 1000
const LIVE_URL = 'https://hanclintoclaw-pixel.github.io/curtis-drone-shift/'
const PROJECT_GOAL = 'Recover two Advanced Drone Pilot Rating 2 units: one on Day 14 and one on Day 24.'

const laneDescriptions: Record<Lane, string> = {
  Maintenance: 'Small reliability work on Curtis assets; minor nuyen changes are allowed in the daily report.',
  Project: 'Active recovery track for Advanced Drone Pilot Rating 2 units; milestone sheet changes happen on Day 14 and Day 24.',
  'Rigger School': 'Short SR3 rigger-practice prompts tied to the day: sensors, signatures, control, repair, availability, or tactics.',
}

const days: GarageDay[] = [
  {
    day: 1,
    title: 'Inventory the Pilot Problem',
    lane: 'Project',
    asset: 'Recovered scorpion drone, Belmont, The Finisher, Buzz, Grandpa',
    morningTask: 'Make a clean inventory of which drones actually need smarter onboard behavior and which ones only need better operator habits.',
    riggerNote: 'SR3 drones are not player characters. Pilot/autonav helps them follow orders and handle routine behavior, but Curtis still wins fights by sensor use, positioning, command discipline, and remote-operation skill.',
    projectNote: 'Start the 24-day retrieval track by defining why two Rating 2 pilots matter before spending money chasing them.',
    choices: [
      {
        id: 'audit-current-fleet',
        label: 'Audit the current fleet first',
        detail: 'Check Belmont, The Finisher, Buzz, Waddles, Mr. Clean, and the recovered scorpion shell before calling contacts.',
        skill: 'Electronics',
        dice: 6,
        targetNumber: 4,
        cost: -50,
        successText: 'Curtis builds a clean priority list and avoids buying a pilot for the wrong chassis.',
        failureText: 'The fleet notes are messy; Curtis spends extra bench time and labels before the plan is usable.',
        successQuality: 2,
        failureQuality: 0,
      },
      {
        id: 'call-taco-early',
        label: 'Call Taco early',
        detail: 'Let Taco start listening for advanced pilot chatter while Curtis sorts the technical details afterward.',
        skill: 'Etiquette / parts scrounge',
        dice: 4,
        targetNumber: 4,
        cost: -150,
        successText: 'Taco starts the search with enough context to avoid obvious junk listings.',
        failureText: 'Taco gets the gist, but Curtis has to pay for a few false leads before the search narrows.',
        successQuality: 1,
        failureQuality: 0,
      },
    ],
  },
  {
    day: 2,
    title: 'Pilot Compatibility Checklist',
    lane: 'Rigger School',
    asset: 'Candidate pilot sockets and drone control interfaces',
    morningTask: 'Build a checklist for what has to match before a Pilot program is worth installing: chassis, control interface, sensor habits, and maintenance support.',
    riggerNote: 'A Pilot rating is only one layer. In SR3 play, Sensor rating, remote-control gear, Signature, and the rigger\'s own skills often matter more than raw onboard cleverness.',
    projectNote: 'This prevents the Day 14 pilot from becoming expensive shelfware.',
    choices: [
      {
        id: 'compatibility-first',
        label: 'Write a strict compatibility checklist',
        detail: 'Bias toward fewer candidates that Curtis can actually install and support.',
        skill: 'Electronics B/R',
        dice: 3,
        targetNumber: 4,
        cost: -75,
        successText: 'The checklist catches two likely incompatibilities before money changes hands.',
        failureText: 'The checklist is too vague; Curtis adds another round of notes after spotting a missed interface issue.',
        successQuality: 2,
        failureQuality: 0,
      },
      {
        id: 'wide-net',
        label: 'Cast a wider market net',
        detail: 'Track more candidates and accept that some will be wrong for Curtis\'s fleet.',
        skill: 'Computer',
        dice: 3,
        targetNumber: 5,
        cost: -125,
        successText: 'The wider search produces extra leads without burying Curtis in junk.',
        failureText: 'The market list gets noisy and needs pruning tomorrow.',
        successQuality: 1,
        failureQuality: 0,
      },
    ],
  },
  {
    day: 3,
    title: 'Clean Bench, Clean Bus',
    lane: 'Maintenance',
    asset: 'Grandpa workbench and drone service cradle',
    morningTask: 'Clean up the service lane Curtis will use for pilot handling: power, grounding, data isolation, and labels.',
    riggerNote: 'Before fancy rigging, boring safety matters: clean power and isolated data paths keep one bad device from becoming a whole-network problem.',
    projectNote: 'A cleaner bench lowers the risk of corrupting a rare pilot when it finally arrives.',
    choices: [
      {
        id: 'buy-clean-leads',
        label: 'Buy clean test leads',
        detail: 'Spend a little now on labeled leads, fuses, and a safer bench layout.',
        skill: 'Electronics B/R',
        dice: 3,
        targetNumber: 4,
        cost: -220,
        successText: 'Curtis builds a tidy pilot-safe service lane with clear isolation points.',
        failureText: 'A mislabeled lead wastes the morning; replacement labels and fuses fix it.',
        successQuality: 2,
        failureQuality: 0,
      },
      {
        id: 'salvage-leads',
        label: 'Reuse salvage leads',
        detail: 'Save cash by cleaning and relabeling old leads from Taco\'s bins.',
        skill: 'Electronics',
        dice: 6,
        targetNumber: 5,
        cost: -40,
        successText: 'The salvage leads test clean and save money without adding risk.',
        failureText: 'One intermittent lead fails under load; Curtis tags the set as bench-only.',
        successQuality: 1,
        failureQuality: -1,
      },
    ],
  },
  {
    day: 4,
    title: 'Availability Reality Check',
    lane: 'Rigger School',
    asset: 'Black-market pilot listings',
    morningTask: 'Translate the pilot hunt into an SR3-style availability problem: who can source it, how long it takes, and what the Street Index pain feels like.',
    riggerNote: 'Gear acquisition is gameplay. Availability, time, contacts, and Street Index are pressure valves that keep rare hardware from feeling like a catalog purchase.',
    projectNote: 'Sets the expected rhythm: leads, deposits, verification, pickup, then installation later.',
    choices: [
      {
        id: 'patient-search',
        label: 'Search patiently',
        detail: 'Favor a cleaner source and a slower lead time.',
        skill: 'Etiquette / parts scrounge',
        dice: 4,
        targetNumber: 4,
        cost: -100,
        successText: 'A patient search finds a credible broker path without a panic premium.',
        failureText: 'The first broker wants too much; Curtis notes the markup and keeps looking.',
        successQuality: 2,
        failureQuality: 0,
      },
      {
        id: 'rush-feelers',
        label: 'Pay for faster feelers',
        detail: 'Spend more to get two extra people checking their old rigger networks.',
        skill: 'Negotiation / parts scrounge',
        dice: 4,
        targetNumber: 5,
        cost: -300,
        successText: 'The faster feelers locate one promising Rating 2 pilot lead.',
        failureText: 'The rush money mostly buys rumors, but one rumor is worth keeping.',
        successQuality: 2,
        failureQuality: 0,
      },
    ],
  },
  {
    day: 5,
    title: 'Sensor Habits Drill',
    lane: 'Rigger School',
    asset: 'Buzz and The Finisher',
    morningTask: 'Practice a short sensor sweep drill: spot, classify, decide whether to close distance, and avoid overcommitting a drone.',
    riggerNote: 'A rigger often wins before initiative by knowing what the sensors can actually prove. Do not turn a vague contact into a confident target without enough successes.',
    projectNote: 'This becomes Curtis\'s baseline test for whether a smarter pilot is helping or just acting confident.',
    choices: [
      {
        id: 'conservative-classification',
        label: 'Conservative classification drill',
        detail: 'Mark uncertain contacts as uncertain and preserve drone safety.',
        skill: 'Rotor Aircraft/Remote Ops',
        dice: 5,
        targetNumber: 4,
        cost: -25,
        successText: 'Curtis writes a clean sweep procedure that avoids false certainty.',
        failureText: 'The drill exposes sloppy note timing; Curtis tightens the sensor callout format.',
        successQuality: 2,
        failureQuality: 0,
      },
      {
        id: 'aggressive-close',
        label: 'Aggressive close-look drill',
        detail: 'Practice getting a closer look faster while accepting higher exposure.',
        skill: 'Rotor Aircraft/Remote Ops',
        dice: 5,
        targetNumber: 5,
        cost: -60,
        successText: 'The close-look drill works and adds a useful fast-confirm option.',
        failureText: 'The drone gets too exposed in the drill; Curtis notes the risk in big letters.',
        successQuality: 2,
        failureQuality: -1,
      },
    ],
  },
  {
    day: 6,
    title: 'Broker Filter',
    lane: 'Project',
    asset: 'Pilot broker shortlist',
    morningTask: 'Sort the pilot leads into credible, suspicious, and obvious garbage.',
    riggerNote: 'For rare rigger hardware, provenance matters. A cheap pilot with unknown modifications can be worse than no pilot if it brings a backdoor, bad habits, or a burned serial trail.',
    projectNote: 'Narrows the Day 14 candidate pool.',
    choices: [
      {
        id: 'provenance-heavy',
        label: 'Demand provenance',
        detail: 'Ask annoying questions about origin, prior chassis, and why the pilot is loose.',
        skill: 'Etiquette / parts scrounge',
        dice: 4,
        targetNumber: 5,
        cost: -175,
        successText: 'One broker respects the caution and gives a cleaner story than expected.',
        failureText: 'The questions scare off a cheap seller, which is probably useful information.',
        successQuality: 2,
        failureQuality: 1,
      },
      {
        id: 'price-heavy',
        label: 'Pressure on price',
        detail: 'Lead with cash discipline and see who drops into Curtis\'s range.',
        skill: 'Negotiation / parts scrounge',
        dice: 4,
        targetNumber: 4,
        cost: -75,
        successText: 'Curtis gets a better sense of the real price floor.',
        failureText: 'The cheapest offers look dirty; Curtis marks them as parts-only rumors.',
        successQuality: 1,
        failureQuality: 0,
      },
    ],
  },
  {
    day: 7,
    title: 'Control Pool Discipline',
    lane: 'Rigger School',
    asset: 'Belmont and The Finisher combat habits',
    morningTask: 'Write a one-page reminder for when Curtis spends attention and dice on defense, attack, repositioning, or sensor confirmation.',
    riggerNote: 'The player-facing lesson: do not spend all the good rigger attention on the first flashy shot. Keep resources for staying alive and keeping drones useful after the first exchange.',
    projectNote: 'Smarter drone pilots should support Curtis, not tempt him into worse action economy.',
    choices: [
      {
        id: 'defense-first',
        label: 'Defense-first doctrine',
        detail: 'Bias drones toward cover, standoff, and survival when commands are unclear.',
        skill: 'Vehicle Tactics',
        dice: 4,
        targetNumber: 4,
        cost: 0,
        successText: 'Curtis writes a practical survival doctrine for autonomous moments.',
        failureText: 'The doctrine is too cautious; Curtis adds a trigger for when to press an advantage.',
        successQuality: 2,
        failureQuality: 0,
      },
      {
        id: 'pressure-first',
        label: 'Pressure-first doctrine',
        detail: 'Bias drones toward fast suppression when the enemy is exposed.',
        skill: 'Vehicle Tactics',
        dice: 4,
        targetNumber: 5,
        cost: -75,
        successText: 'Curtis drafts a useful aggressive option without abandoning survival.',
        failureText: 'The aggressive doctrine overcommits; Curtis flags it for manual-only use.',
        successQuality: 2,
        failureQuality: -1,
      },
    ],
  },
  {
    day: 8,
    title: 'First Pilot Deposit',
    lane: 'Project',
    asset: 'Candidate Advanced Drone Pilot Rating 2 #1',
    morningTask: 'Put down a small, refundable-enough deposit or walk away from a questionable first candidate.',
    riggerNote: 'Contacts are part of the cost. Paying a little to keep a clean lead warm can be better than saving every nuyen and losing the only credible source.',
    projectNote: 'Starts locking the first Day 14 pickup path.',
    choices: [
      {
        id: 'clean-deposit',
        label: 'Pay the clean deposit',
        detail: 'Reserve the better candidate and get a verification window.',
        skill: 'Negotiation / parts scrounge',
        dice: 4,
        targetNumber: 4,
        cost: -600,
        successText: 'The seller agrees to hold the pilot and provide a test window.',
        failureText: 'The deposit holds the slot, but Curtis gets a narrower inspection window.',
        successQuality: 2,
        failureQuality: 0,
      },
      {
        id: 'haggle-deposit',
        label: 'Haggle the deposit down',
        detail: 'Risk irritating the seller to preserve Curtis\'s cash.',
        skill: 'Negotiation / parts scrounge',
        dice: 4,
        targetNumber: 5,
        cost: -300,
        successText: 'Curtis trims the deposit without losing the lead.',
        failureText: 'The seller keeps the pilot available but adds a take-it-or-leave-it tone.',
        successQuality: 1,
        failureQuality: -1,
      },
    ],
  },
  {
    day: 9,
    title: 'Isolation Sandbox',
    lane: 'Maintenance',
    asset: 'Pilot test sandbox',
    morningTask: 'Build a sandbox where a used pilot can wake up without touching Curtis\'s real drone network.',
    riggerNote: 'A used autonomous system should never get first contact with the real control network. Air-gap first, trust later.',
    projectNote: 'Prepares the safe Day 14 acceptance test.',
    choices: [
      {
        id: 'proper-sandbox',
        label: 'Build a proper sandbox',
        detail: 'Use clean media, isolated power, and fake command fixtures.',
        skill: 'Electronics B/R',
        dice: 3,
        targetNumber: 4,
        cost: -450,
        successText: 'The sandbox can wake a pilot without exposing real assets.',
        failureText: 'The sandbox works after extra parts and a warning label.',
        successQuality: 2,
        failureQuality: 0,
      },
      {
        id: 'quick-sandbox',
        label: 'Build a quick sandbox',
        detail: 'Use available parts and accept stricter manual supervision.',
        skill: 'Electronics',
        dice: 6,
        targetNumber: 5,
        cost: -125,
        successText: 'The quick sandbox is ugly but isolated enough for a first boot.',
        failureText: 'The quick rig shows noise under load; Curtis marks it for low-trust tests only.',
        successQuality: 1,
        failureQuality: -1,
      },
    ],
  },
  {
    day: 10,
    title: 'Pilot Behavior Baseline',
    lane: 'Rigger School',
    asset: 'Dummy commands and obstacle cards',
    morningTask: 'Define what Rating 2 competence should look like before Curtis sees the actual pilot.',
    riggerNote: 'Decide pass/fail criteria before the shiny thing arrives. Otherwise every weird behavior starts looking acceptable because Curtis already wants the upgrade.',
    projectNote: 'Creates the Day 14 acceptance checklist.',
    choices: [
      {
        id: 'strict-baseline',
        label: 'Strict acceptance baseline',
        detail: 'Require stable command following, abort behavior, and no mystery callbacks.',
        skill: 'Computer',
        dice: 3,
        targetNumber: 4,
        cost: -50,
        successText: 'Curtis defines a sober pass/fail checklist for the first pilot.',
        failureText: 'The first checklist is too broad; Curtis tightens it around abort and callback behavior.',
        successQuality: 2,
        failureQuality: 0,
      },
      {
        id: 'field-baseline',
        label: 'Field-use baseline',
        detail: 'Focus on whether the pilot helps in messy real conditions.',
        skill: 'Vehicle Tactics',
        dice: 4,
        targetNumber: 5,
        cost: -75,
        successText: 'The baseline includes practical field behavior without skipping safety.',
        failureText: 'The field baseline is too vibes-based; Curtis adds hard abort checks.',
        successQuality: 2,
        failureQuality: 0,
      },
    ],
  },
  {
    day: 11,
    title: 'Chassis Candidate: Belmont or Utility',
    lane: 'Project',
    asset: 'First pilot installation plan',
    morningTask: 'Decide whether the first recovered pilot is tentatively aimed at Belmont, a utility drone, or held uninstalled.',
    riggerNote: 'Installation target matters. Combat drones benefit from better autonomy, but also create more risk if the pilot misunderstands a situation.',
    projectNote: 'This is a player choice; the final install still waits for GM acceptance.',
    choices: [
      {
        id: 'belmont-candidate',
        label: 'Tentatively aim at Belmont',
        detail: 'Plan for a tougher support/combat platform that can hold position better.',
        skill: 'Tracks/Remote Ops',
        dice: 5,
        targetNumber: 4,
        cost: -100,
        successText: 'Curtis writes Belmont-specific test cases without committing to installation yet.',
        failureText: 'Belmont\'s use case needs tighter friendly-fire and abort notes.',
        successQuality: 2,
        failureQuality: 0,
      },
      {
        id: 'hold-uninstalled',
        label: 'Hold it uninstalled at first',
        detail: 'Treat the first pilot as a boxed asset until more testing is done.',
        skill: 'Electronics',
        dice: 6,
        targetNumber: 4,
        cost: -50,
        successText: 'Curtis sets up a safe storage and test-only plan.',
        failureText: 'The storage plan needs better labeling before it is safe enough.',
        successQuality: 1,
        failureQuality: 0,
      },
    ],
  },
  {
    day: 12,
    title: 'Serials, Scars, and Backdoors',
    lane: 'Maintenance',
    asset: 'First pilot candidate paperwork',
    morningTask: 'Look for serial tampering, unexplained firmware scars, and signs the pilot was pulled from something dangerous.',
    riggerNote: 'Used rigger gear has history. The question is not just whether it works; it is whether it brings enemies, signatures, or hidden commands with it.',
    projectNote: 'Protects Curtis from inheriting somebody else\'s problem.',
    choices: [
      {
        id: 'deep-paperwork',
        label: 'Deep paperwork pass',
        detail: 'Spend time and a little money validating the candidate story.',
        skill: 'Computer',
        dice: 3,
        targetNumber: 5,
        cost: -180,
        successText: 'The paperwork has scars but no obvious trap; Curtis knows what to ask next.',
        failureText: 'A gap remains unexplained, so the Day 14 pickup needs a stricter test.',
        successQuality: 2,
        failureQuality: 0,
      },
      {
        id: 'hardware-scars',
        label: 'Hardware scars pass',
        detail: 'Focus on physical evidence and connector wear instead of seller stories.',
        skill: 'Electronics B/R',
        dice: 3,
        targetNumber: 4,
        cost: -120,
        successText: 'Connector wear matches the seller story closely enough.',
        failureText: 'One scar does not match; Curtis adds a no-network-first-boot warning.',
        successQuality: 1,
        failureQuality: 0,
      },
    ],
  },
  {
    day: 13,
    title: 'Pickup Plan for Pilot One',
    lane: 'Project',
    asset: 'First Rating 2 pilot pickup',
    morningTask: 'Plan the pickup: who goes, what vehicle, what cover story, and how Curtis verifies the unit before money fully changes hands.',
    riggerNote: 'Gear pickup is a run in miniature. The best rigger plan includes extraction, verification, and a reason not to bring every asset into the seller\'s kill box.',
    projectNote: 'Sets up tomorrow\'s first milestone.',
    choices: [
      {
        id: 'quiet-pickup',
        label: 'Quiet pickup plan',
        detail: 'Low profile, minimal drones visible, fast verification, clean exit.',
        skill: 'Vehicle Tactics',
        dice: 4,
        targetNumber: 4,
        cost: -100,
        successText: 'The pickup plan is boring, which is exactly the point.',
        failureText: 'The route has one awkward choke point; Curtis marks an alternate exit.',
        successQuality: 2,
        failureQuality: 0,
      },
      {
        id: 'overwatch-pickup',
        label: 'Overwatch pickup plan',
        detail: 'Bring extra sensor coverage and accept that it may look more suspicious.',
        skill: 'Rotor Aircraft/Remote Ops',
        dice: 5,
        targetNumber: 5,
        cost: -160,
        successText: 'The overwatch plan gives Curtis strong warning without spooking the seller.',
        failureText: 'The overwatch plan feels too loud; Curtis pares it back.',
        successQuality: 2,
        failureQuality: -1,
      },
    ],
  },
  {
    day: 14,
    title: 'Milestone: Retrieve Pilot One',
    lane: 'Project',
    asset: 'Advanced Drone Pilot Rating 2 #1',
    morningTask: 'Complete the first pickup and run the sandbox acceptance test.',
    riggerNote: 'Milestone day: retrieving the pilot is a sheet-facing outcome, but installing it into a specific drone remains a separate GM-approved step.',
    projectNote: 'Primary project outcome: first Advanced Drone Pilot Rating 2 is recovered today if the report is accepted.',
    milestone: 'Pilot 1 recovery milestone',
    sheetChange: 'On accepted report: add one Advanced Drone Pilot Rating 2 to Curtis\'s sheet as recovered gear. Do not install it in a drone unless the GM separately approves installation.',
    choices: [
      {
        id: 'full-acceptance',
        label: 'Full acceptance test',
        detail: 'Pay the remaining pickup costs and run the strict sandbox checklist.',
        skill: 'Electronics',
        dice: 6,
        targetNumber: 4,
        cost: -1200,
        successText: 'Pilot One passes the sandbox test and is ready to be logged as recovered gear.',
        failureText: 'Pilot One is recovered but quarantined pending cleanup; it still counts as gear only after GM accepts the report.',
        successQuality: 3,
        failureQuality: 1,
      },
      {
        id: 'field-acceptance',
        label: 'Field acceptance test',
        detail: 'Use a practical command drill to prove it can behave under pressure.',
        skill: 'Electronics / Vehicle Tactics',
        dice: 5,
        targetNumber: 5,
        cost: -950,
        successText: 'Pilot One handles the practical drill well enough to log as recovered gear.',
        failureText: 'Pilot One is recovered but its field behavior needs cleanup before installation.',
        successQuality: 3,
        failureQuality: 1,
      },
    ],
  },
  {
    day: 15,
    title: 'Reset After the First Win',
    lane: 'Maintenance',
    asset: 'Pilot One storage and second-pilot search board',
    morningTask: 'Secure Pilot One and reset the board for the second Rating 2 pilot.',
    riggerNote: 'A recovered component is not done until it is stored, labeled, and protected from accidental use. Good logistics prevent future table confusion.',
    projectNote: 'Starts the second leg without losing track of the first pilot.',
    choices: [
      {
        id: 'proper-storage',
        label: 'Proper storage box',
        detail: 'Buy a clean case, labels, and physical quarantine tags for Pilot One.',
        skill: 'Electronics B/R',
        dice: 3,
        targetNumber: 4,
        cost: -250,
        successText: 'Pilot One is stored cleanly and the second search starts with no confusion.',
        failureText: 'The case needs extra padding and labels before Curtis is satisfied.',
        successQuality: 2,
        failureQuality: 0,
      },
      {
        id: 'cheap-storage',
        label: 'Cheap storage box',
        detail: 'Use what Curtis has and keep the cash for the next lead.',
        skill: 'Electronics',
        dice: 6,
        targetNumber: 5,
        cost: -60,
        successText: 'The cheap storage is safe enough after careful labeling.',
        failureText: 'The cheap storage gets a warning tag: do not move without rechecking seals.',
        successQuality: 1,
        failureQuality: -1,
      },
    ],
  },
  {
    day: 16,
    title: 'Second Market, Different Risks',
    lane: 'Project',
    asset: 'Second pilot lead pool',
    morningTask: 'Open the second search without assuming the first broker path will repeat.',
    riggerNote: 'A repeated procurement pattern creates tells. Changing channels can be safer, but it costs more effort and may reduce trust.',
    projectNote: 'The second pilot is due on Day 24, so today sets the route.',
    choices: [
      {
        id: 'same-network',
        label: 'Use the same network',
        detail: 'Lean on the broker path that already produced one pilot.',
        skill: 'Etiquette / parts scrounge',
        dice: 4,
        targetNumber: 4,
        cost: -150,
        successText: 'The same network has one more plausible lead, but at a higher price.',
        failureText: 'The same network is tapped out; Curtis gets only a referral.',
        successQuality: 1,
        failureQuality: 0,
      },
      {
        id: 'new-network',
        label: 'Use a new network',
        detail: 'Ask a different channel and reduce pattern risk.',
        skill: 'Negotiation / parts scrounge',
        dice: 4,
        targetNumber: 5,
        cost: -250,
        successText: 'The new network produces a separate second-pilot lead.',
        failureText: 'The new network is colder but gives Curtis a useful rumor.',
        successQuality: 2,
        failureQuality: 0,
      },
    ],
  },
  {
    day: 17,
    title: 'ECM and Signal Caution',
    lane: 'Rigger School',
    asset: 'Remote-control and signal notes',
    morningTask: 'Review what happens when drones lose clean signals and why onboard Pilot behavior matters then.',
    riggerNote: 'Signal fights are not just jamming/no jamming. Flux, ECCM, terrain, and command clarity all decide whether a drone is a tool or a lost toy.',
    projectNote: 'Frames why the second pilot may be better used in a drone expected to operate at distance.',
    choices: [
      {
        id: 'signal-discipline',
        label: 'Signal discipline drill',
        detail: 'Write fallback commands for degraded signal conditions.',
        skill: 'Electronics',
        dice: 6,
        targetNumber: 4,
        cost: -50,
        successText: 'Curtis creates useful fallback commands for signal trouble.',
        failureText: 'The fallback commands are too vague; Curtis rewrites them around abort/hold/return.',
        successQuality: 2,
        failureQuality: 0,
      },
      {
        id: 'range-aggression',
        label: 'Longer-range doctrine',
        detail: 'Explore which drones might benefit most from more independence at range.',
        skill: 'Rotor Aircraft/Remote Ops',
        dice: 5,
        targetNumber: 5,
        cost: -75,
        successText: 'The doctrine points toward a sensible second-pilot use case.',
        failureText: 'The long-range doctrine is too optimistic; Curtis adds tighter signal limits.',
        successQuality: 2,
        failureQuality: -1,
      },
    ],
  },
  {
    day: 18,
    title: 'Second Pilot Red Flags',
    lane: 'Project',
    asset: 'Second pilot candidate',
    morningTask: 'Inspect the second candidate for worse provenance than the first.',
    riggerNote: 'The second copy is often where the trap is. Sellers learn what the buyer wants and may try to pass off riskier stock.',
    projectNote: 'Keeps the second milestone from becoming a blind repeat.',
    choices: [
      {
        id: 'paranoid-review',
        label: 'Paranoid review',
        detail: 'Assume the second candidate is dirtier until proved otherwise.',
        skill: 'Computer',
        dice: 3,
        targetNumber: 5,
        cost: -200,
        successText: 'Curtis catches one suspicious detail early enough to demand an explanation.',
        failureText: 'The review finds nothing decisive, so Curtis keeps the candidate under stricter quarantine.',
        successQuality: 2,
        failureQuality: 0,
      },
      {
        id: 'practical-review',
        label: 'Practical review',
        detail: 'Focus on whether the candidate can pass the same sandbox tests as Pilot One.',
        skill: 'Electronics B/R',
        dice: 3,
        targetNumber: 4,
        cost: -120,
        successText: 'The practical review builds a good test plan for the second pilot.',
        failureText: 'The test plan misses one provenance concern and gets an extra warning.',
        successQuality: 1,
        failureQuality: 0,
      },
    ],
  },
  {
    day: 19,
    title: 'Autonomy Is Not Loyalty',
    lane: 'Rigger School',
    asset: 'Drone command language',
    morningTask: 'Write command language that makes a drone\'s autonomous behavior predictable without pretending it understands Curtis like a person.',
    riggerNote: 'A better Pilot can execute better, not care more. Clear commands beat cute commands.',
    projectNote: 'Helps both recovered pilots become usable assets later.',
    choices: [
      {
        id: 'plain-commands',
        label: 'Plain command set',
        detail: 'Write simple command verbs and clear abort conditions.',
        skill: 'Computer',
        dice: 3,
        targetNumber: 4,
        cost: -40,
        successText: 'The plain command set is boring and reliable.',
        failureText: 'Curtis catches two ambiguous commands and rewrites them.',
        successQuality: 2,
        failureQuality: 0,
      },
      {
        id: 'context-commands',
        label: 'Context command set',
        detail: 'Try to preserve tactical nuance without creating ambiguity.',
        skill: 'Vehicle Tactics',
        dice: 4,
        targetNumber: 5,
        cost: -80,
        successText: 'The context commands add useful nuance while staying bounded.',
        failureText: 'The context commands get too clever and are marked manual-only.',
        successQuality: 2,
        failureQuality: -1,
      },
    ],
  },
  {
    day: 20,
    title: 'Second Pilot Deposit',
    lane: 'Project',
    asset: 'Advanced Drone Pilot Rating 2 #2 lead',
    morningTask: 'Put money or leverage behind the second candidate.',
    riggerNote: 'The second acquisition should feel easier because Curtis has learned, but not free. The campaign economy still matters.',
    projectNote: 'Locks in the Day 24 retrieval path.',
    choices: [
      {
        id: 'pay-second-deposit',
        label: 'Pay the second deposit',
        detail: 'Secure the cleaner second lead and a pickup window.',
        skill: 'Negotiation / parts scrounge',
        dice: 4,
        targetNumber: 4,
        cost: -700,
        successText: 'The second seller commits to a Day 24 pickup window.',
        failureText: 'The pickup is still on, but the seller insists on stricter timing.',
        successQuality: 2,
        failureQuality: 0,
      },
      {
        id: 'trade-favor',
        label: 'Trade a small favor',
        detail: 'Reduce cash pressure by offering minor shop help or future consideration.',
        skill: 'Etiquette / parts scrounge',
        dice: 4,
        targetNumber: 5,
        cost: -250,
        successText: 'Curtis trims cash cost without creating a dangerous obligation.',
        failureText: 'The favor stays small, but Curtis writes it down as a real hook.',
        successQuality: 1,
        failureQuality: 0,
      },
    ],
  },
  {
    day: 21,
    title: 'Maintenance Before Upgrade',
    lane: 'Maintenance',
    asset: 'Candidate installation chassis',
    morningTask: 'Pick one drone likely to benefit from a future pilot and fix one mundane maintenance issue first.',
    riggerNote: 'Do not install smarter software into a neglected machine and call that reliability. Mechanical readiness still matters.',
    projectNote: 'Prevents a future pilot from masking basic maintenance problems.',
    choices: [
      {
        id: 'belmont-maintenance',
        label: 'Belmont maintenance pass',
        detail: 'Check crawler drive, recoil stress, and command response.',
        skill: 'Car B/R',
        dice: 3,
        targetNumber: 4,
        cost: -180,
        successText: 'Belmont gets a cleaner maintenance note for any future pilot work.',
        failureText: 'Belmont needs an extra parts note before upgrade talk feels honest.',
        successQuality: 2,
        failureQuality: 0,
      },
      {
        id: 'finisher-maintenance',
        label: 'Finisher maintenance pass',
        detail: 'Check mounts, vibration, sensor noise, and flight response.',
        skill: 'Rotor Aircraft B/R',
        dice: 3,
        targetNumber: 4,
        cost: -180,
        successText: 'The Finisher gets a cleaner maintenance note for any future pilot work.',
        failureText: 'A vibration issue needs tracking before any smarter behavior is trusted.',
        successQuality: 2,
        failureQuality: 0,
      },
    ],
  },
  {
    day: 22,
    title: 'What Not to Automate',
    lane: 'Rigger School',
    asset: 'Curtis\'s tactical doctrine',
    morningTask: 'List which choices must stay with Curtis even if a drone has a better pilot.',
    riggerNote: 'Automation is for execution, not judgment. Target selection, escalation, and exposure decisions should stay with the player unless the table explicitly wants otherwise.',
    projectNote: 'Keeps the recovered pilots from taking play away from Curtis.',
    choices: [
      {
        id: 'manual-escalation',
        label: 'Manual escalation rules',
        detail: 'Write explicit limits around firing, chasing, and lethal escalation.',
        skill: 'Vehicle Tactics',
        dice: 4,
        targetNumber: 4,
        cost: 0,
        successText: 'Curtis writes clear boundaries that keep him in command.',
        failureText: 'The first pass has one fuzzy combat trigger; Curtis tightens it.',
        successQuality: 2,
        failureQuality: 0,
      },
      {
        id: 'autonomous-safety',
        label: 'Autonomous safety rules',
        detail: 'Focus on return, hold, evade, and protect-self behaviors.',
        skill: 'Computer',
        dice: 3,
        targetNumber: 4,
        cost: -50,
        successText: 'The safety rules are clear and useful for both pilots.',
        failureText: 'The safety rules need more concrete signal-loss examples.',
        successQuality: 2,
        failureQuality: 0,
      },
    ],
  },
  {
    day: 23,
    title: 'Pickup Plan for Pilot Two',
    lane: 'Project',
    asset: 'Second Rating 2 pilot pickup',
    morningTask: 'Plan the second pickup while accounting for pattern risk from the first one.',
    riggerNote: 'Repeating the same safe plan can become unsafe if someone has watched the pattern. Change enough to stay boring.',
    projectNote: 'Sets up the final Day 24 milestone.',
    choices: [
      {
        id: 'changed-route',
        label: 'Change the route',
        detail: 'Use a different vehicle rhythm and exit path than the first pickup.',
        skill: 'Car / Vehicle Tactics',
        dice: 4,
        targetNumber: 4,
        cost: -100,
        successText: 'The second route avoids repeating the first pickup pattern.',
        failureText: 'The alternate route has one bad turn; Curtis marks a fallback.',
        successQuality: 2,
        failureQuality: 0,
      },
      {
        id: 'changed-cover',
        label: 'Change the cover story',
        detail: 'Keep the same practical route but alter why Curtis is there.',
        skill: 'Etiquette / parts scrounge',
        dice: 4,
        targetNumber: 5,
        cost: -150,
        successText: 'The cover story is dull enough to work.',
        failureText: 'The cover story needs Taco\'s shop context to be believable.',
        successQuality: 2,
        failureQuality: 0,
      },
    ],
  },
  {
    day: 24,
    title: 'Milestone: Retrieve Pilot Two',
    lane: 'Project',
    asset: 'Advanced Drone Pilot Rating 2 #2',
    morningTask: 'Complete the second pickup and run the final sandbox acceptance test.',
    riggerNote: 'End-of-project sheet change is allowed here: the goal is two recovered Rating 2 pilots, not two surprise fully installed drone upgrades.',
    projectNote: 'Primary project outcome: second Advanced Drone Pilot Rating 2 is recovered today if the report is accepted.',
    milestone: 'Pilot 2 recovery milestone and project close',
    sheetChange: 'On accepted report: add a second Advanced Drone Pilot Rating 2 to Curtis\'s sheet as recovered gear and mark this 24-day project complete. Installation remains a separate GM-approved step.',
    choices: [
      {
        id: 'clean-closeout',
        label: 'Clean closeout test',
        detail: 'Run the same strict sandbox checklist and close the project conservatively.',
        skill: 'Electronics',
        dice: 6,
        targetNumber: 4,
        cost: -1200,
        successText: 'Pilot Two passes cleanly; Curtis has recovered both Rating 2 pilots.',
        failureText: 'Pilot Two is recovered but quarantined for cleanup; the project closes with a caution tag if the GM accepts it.',
        successQuality: 3,
        failureQuality: 1,
      },
      {
        id: 'field-closeout',
        label: 'Field closeout test',
        detail: 'Prove the second pilot with a practical command drill before logging it.',
        skill: 'Electronics / Vehicle Tactics',
        dice: 5,
        targetNumber: 5,
        cost: -950,
        successText: 'Pilot Two proves useful in the practical drill; the two-pilot recovery project closes.',
        failureText: 'Pilot Two is recovered but needs cautious handling before any install.',
        successQuality: 3,
        failureQuality: 1,
      },
    ],
  },
]

function getActiveDayNumber(now = Date.now()) {
  if (now < PROJECT_START) return 1
  return Math.min(days.length, Math.max(1, Math.floor((now - PROJECT_START) / DAY_MS) + 1))
}

function rollDice(count: number) {
  return Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1)
}

function countSuccesses(dice: number[], targetNumber: number) {
  return dice.filter((die) => die >= targetNumber).length
}

function formatNuyen(value: number) {
  if (value === 0) return '0¥'
  return `${value > 0 ? '+' : ''}${value.toLocaleString()}¥`
}

function loadResults() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, DailyResult>
  } catch {
    return {}
  }
}

function buildReport(day: GarageDay, result: DailyResult | undefined) {
  if (!result) {
    return `Curtis Morning Garage preview: Day ${day.day}/24 - ${day.title}\nLink: ${LIVE_URL}\nStatus: no player choice submitted yet.`
  }

  const choice = day.choices.find((candidate) => candidate.id === result.choiceId)
  const outcomeText = result.tone === 'success' ? choice?.successText : choice?.failureText
  const lines = [
    `CURTIS MORNING GARAGE REPORT`,
    `Project track: Advanced Drone Pilot retrieval day ${day.day}/24`,
    `Work Order: ${day.title}`,
    `Lane: ${day.lane}`,
    `Asset: ${day.asset}`,
    `Player choice: ${choice?.label ?? 'Unknown choice'}`,
    `Roll: ${result.dice.join(', ')} vs TN ${choice?.targetNumber ?? '?'} = ${result.successes} successes`,
    `Outcome: ${result.tone === 'success' ? 'Success' : 'Complication'}`,
    `Result: ${outcomeText ?? 'No outcome text available.'}`,
    `Nuyen delta: ${formatNuyen(result.nuyenDelta)} (minor sheet-facing nuyen changes are GM-permitted for this tool)`,
    `Quality delta: ${result.qualityDelta >= 0 ? '+' : ''}${result.qualityDelta}`,
    `Rigger note: ${day.riggerNote}`,
    `Cindy ingest/closeout note: Apply the nuyen delta to Curtis if accepted; record the explicit player choice; append the result to Curtis's Morning Garage continuity; missed prior Morning Garage days are no-change/no-penalty.`,
  ]

  if (day.sheetChange) {
    lines.push(`Milestone sheet change: ${day.sheetChange}`)
  } else {
    lines.push('Sheet change: no permanent gear, drone, vehicle, combat, or stat change today beyond the minor nuyen delta unless the GM separately approves it.')
  }

  lines.push(`Live tool: ${LIVE_URL}`)
  return lines.join('\n')
}

function App() {
  const activeDayNumber = getActiveDayNumber()
  const activeDay = days[activeDayNumber - 1]
  const [results, setResults] = useState<Record<string, DailyResult>>({})
  const [selectedChoiceId, setSelectedChoiceId] = useState(activeDay.choices[0].id)

  useEffect(() => {
    for (const key of LEGACY_STORAGE_KEYS) {
      window.localStorage.removeItem(key)
    }
    setResults(loadResults())
  }, [])

  useEffect(() => {
    setSelectedChoiceId(activeDay.choices[0].id)
  }, [activeDay])

  const activeResult = results[String(activeDay.day)]
  const selectedChoice = activeDay.choices.find((choice) => choice.id === selectedChoiceId) ?? activeDay.choices[0]
  const totalNuyen = Object.values(results).reduce((sum, result) => sum + result.nuyenDelta, 0)
  const totalQuality = Object.values(results).reduce((sum, result) => sum + result.qualityDelta, 0)
  const completedDays = Object.keys(results).length
  const reportText = useMemo(() => buildReport(activeDay, activeResult), [activeDay, activeResult])

  function saveResult(result: DailyResult) {
    const next = { ...results, [String(result.day)]: result }
    setResults(next)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  function runMorningWork() {
    const dice = rollDice(selectedChoice.dice)
    const successes = countSuccesses(dice, selectedChoice.targetNumber)
    const tone: OutcomeTone = successes > 0 ? 'success' : 'failure'
    saveResult({
      day: activeDay.day,
      choiceId: selectedChoice.id,
      dice,
      successes,
      tone,
      nuyenDelta: selectedChoice.cost,
      qualityDelta: tone === 'success' ? selectedChoice.successQuality : selectedChoice.failureQuality,
      completedAt: new Date().toISOString(),
    })
  }

  async function copyReport() {
    await navigator.clipboard.writeText(reportText)
  }

  return (
    <main className="garage-shell">
      <section className="hero-panel">
        <div>
          <p className="kicker">Curtis&apos;s Morning Garage</p>
          <h1>{activeDay.title}</h1>
          <p className="subtitle">
            Day {activeDay.day}/24: {PROJECT_GOAL} Today&apos;s work stays small, explicit, and
            GM-readable.
          </p>
        </div>

        <div className="hero-stats">
          <article className="shift-card">
            <span>Active lane</span>
            <strong>{activeDay.lane}</strong>
            <small>{laneDescriptions[activeDay.lane]}</small>
          </article>
          <article className={`money-card ${totalNuyen > 0 ? 'positive' : totalNuyen < 0 ? 'negative' : ''}`}>
            <span>Tracked project delta</span>
            <strong>{formatNuyen(totalNuyen)}</strong>
            <small>{completedDays} day(s) logged locally; quality {totalQuality >= 0 ? '+' : ''}{totalQuality}</small>
          </article>
        </div>
      </section>

      <section className="job-banner" aria-label="Current work-order status">
        <article>
          <span>Current active daily update</span>
          <strong>Day {activeDay.day}/24 - {activeDay.title}</strong>
          <p>{activeDay.morningTask}</p>
        </article>
        <article>
          <span>Project outcome</span>
          <strong>{activeDay.milestone ?? 'Progress toward pilot retrieval'}</strong>
          <p>{activeDay.projectNote}</p>
        </article>
        <article className="ledger-card">
          <span>Sheet-change rule</span>
          <strong>{activeDay.sheetChange ? 'Milestone' : 'Minor only'}</strong>
          <p>{activeDay.sheetChange ?? 'Apply only accepted minor nuyen changes and explicit player choices today.'}</p>
        </article>
      </section>

      <section className="project-panel">
        <p className="kicker">24-day project map</p>
        <h2>Advanced Drone Pilot Retrieval</h2>
        <p>{PROJECT_GOAL} Day 14 and Day 24 are the only built-in gear milestones; installation into a specific drone remains separate GM approval.</p>
        <div className="project-steps">
          {days.map((day) => (
            <article
              className={day.day === activeDay.day ? 'active' : day.day < activeDay.day ? 'complete' : day.milestone ? 'final' : 'waiting'}
              key={day.day}
            >
              <span>Day {day.day}</span>
              <strong>{day.title}</strong>
              <small>{day.lane}</small>
              {day.milestone ? <em>{day.milestone}</em> : null}
              <p>{day.asset}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="layout-grid">
        <aside className="side-panel">
          <p className="panel-heading">Player choices</p>
          {activeDay.choices.map((choice) => (
            <button
              className={choice.id === selectedChoiceId ? 'selected' : ''}
              key={choice.id}
              onClick={() => setSelectedChoiceId(choice.id)}
              type="button"
            >
              <strong>{choice.label}</strong>
              <span>{choice.detail}</span>
              <small>{choice.skill} {choice.dice} dice vs TN {choice.targetNumber}; {formatNuyen(choice.cost)}</small>
            </button>
          ))}
          <button className="big-button" onClick={runMorningWork} type="button">
            Roll today&apos;s work
          </button>
        </aside>

        <section className="work-panel">
          <div className="stage-card">
            <p className="kicker">Morning task</p>
            <h2>{activeDay.asset}</h2>
            <p>{activeDay.morningTask}</p>
            <div className="roll-preview">
              <h3>Rigger note</h3>
              <p>{activeDay.riggerNote}</p>
            </div>
            {activeResult ? (
              <div className={`feedback ${activeResult.tone}`}>
                <strong>{activeResult.tone === 'success' ? 'Success' : 'Complication'}</strong>
                <span>Dice: {activeResult.dice.join(', ')} - {activeResult.successes} successes</span>
                <span>Nuyen: {formatNuyen(activeResult.nuyenDelta)}; quality {activeResult.qualityDelta >= 0 ? '+' : ''}{activeResult.qualityDelta}</span>
              </div>
            ) : (
              <div className="feedback neutral">
                <strong>No result yet</strong>
                <span>Pick one approach, roll it, then copy the report for the GM/Cindy ingest loop.</span>
              </div>
            )}
            <div className="report-box">
              <h3>Copy/paste report</h3>
              <textarea readOnly value={reportText} />
              <button onClick={copyReport} type="button">Copy report</button>
            </div>
          </div>
        </section>

        <aside className="log-panel">
          <p className="panel-heading">Local garage log</p>
          {Object.values(results).length === 0 ? (
            <article>
              <strong>No days logged yet</strong>
              <p>Missed days are no-change/no-penalty. The app is a play surface, not homework.</p>
            </article>
          ) : (
            Object.values(results)
              .sort((a, b) => b.day - a.day)
              .map((result) => {
                const day = days[result.day - 1]
                return (
                  <article className={result.tone} key={result.day}>
                    <span>Day {result.day}/24</span>
                    <strong>{day.title}</strong>
                    <p>{formatNuyen(result.nuyenDelta)}; quality {result.qualityDelta >= 0 ? '+' : ''}{result.qualityDelta}</p>
                    <small>{result.dice.join(', ')} - {result.successes} successes</small>
                  </article>
                )
              })
          )}
        </aside>
      </section>

      <footer className="footer-note">
        Build {__SOURCE_COMMIT__} - Curtis&apos;s Morning Garage, 24-day Advanced Drone Pilot retrieval track.
      </footer>
    </main>
  )
}

export default App
