#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const STATE_PATH = resolve('src/projectState.ts')
const MAX_DAY = 24

function usage() {
  console.error('Usage: node scripts/advance-active-day.mjs (--next | --day N) [--dry-run]')
  process.exit(1)
}

const dryRun = process.argv.includes('--dry-run')

const source = readFileSync(STATE_PATH, 'utf8')
const match = source.match(/export const ACTIVE_PROJECT_DAY = (\d+)/)
if (!match) {
  throw new Error(`Could not find ACTIVE_PROJECT_DAY in ${STATE_PATH}`)
}

const currentDay = Number(match[1])
let nextDay = currentDay

const dayArgIndex = process.argv.indexOf('--day')
if (process.argv.includes('--next')) {
  nextDay = Math.min(MAX_DAY, currentDay + 1)
} else if (dayArgIndex !== -1 && process.argv[dayArgIndex + 1]) {
  nextDay = Number(process.argv[dayArgIndex + 1])
} else {
  usage()
}

if (!Number.isInteger(nextDay) || nextDay < 1 || nextDay > MAX_DAY) {
  throw new Error(`Active day must be an integer from 1 to ${MAX_DAY}; got ${String(nextDay)}`)
}

const updated = source.replace(/export const ACTIVE_PROJECT_DAY = \d+/, `export const ACTIVE_PROJECT_DAY = ${nextDay}`)
if (!dryRun) {
  writeFileSync(STATE_PATH, updated)
}
console.log(`Curtis Morning Garage active day: ${currentDay} -> ${nextDay}${dryRun ? ' (dry run)' : ''}`)
