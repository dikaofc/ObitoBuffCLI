import {
  OBITOBUFF_GLM_V52_REFERRAL_ENABLED,
  OBITOBUFF_PREMIUM_SESSION_RESET_TIMEZONE,
  OBITOBUFF_STREAK_GLM_BONUS_ENABLED,
  OBITOBUFF_STREAK_GLM_BONUS_MAX_MULTIPLIER,
  OBITOBUFF_STREAK_BONUS_SESSION_UNITS,
  OBITOBUFF_STREAK_REWARD_INTERVAL_DAYS,
  OBITOBUFF_STREAK_REWARDS_ENABLED,
} from '../constants/obitobuff-models'

import type {
  ObitobuffAccessTier,
  ObitobuffStreakRewardPool,
} from '../constants/obitobuff-models'

export const OBITOBUFF_STREAK_TIME_ZONE = OBITOBUFF_PREMIUM_SESSION_RESET_TIMEZONE

const DAY_MS = 24 * 60 * 60 * 1000

function dateKeyFromParts(parts: Intl.DateTimeFormatPart[]): string {
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value

  const year = get('year')
  const month = get('month')
  const day = get('day')

  if (!year || !month || !day) {
    throw new Error('Failed to format Obitobuff usage date')
  }

  return `${year}-${month}-${day}`
}

export function getObitobuffUsageDateKey(
  now: Date = new Date(),
  timeZone = OBITOBUFF_STREAK_TIME_ZONE,
): string {
  return dateKeyFromParts(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now),
  )
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date key: ${dateKey}`)
  }

  return new Date(date.getTime() + days * DAY_MS).toISOString().slice(0, 10)
}

export function calculateObitobuffStreak(params: {
  usageDates: readonly string[]
  todayDateKey: string
}): {
  streak: number
  todayUsed: boolean
  lastUsageDate: string | null
} {
  const { usageDates, todayDateKey } = params
  const usageDateSet = new Set(
    usageDates.filter((date) => date <= todayDateKey),
  )
  const lastUsageDate = usageDates.reduce<string | null>((latest, date) => {
    if (date > todayDateKey) return latest
    return latest === null || date > latest ? date : latest
  }, null)
  const todayUsed = usageDateSet.has(todayDateKey)

  let anchorDateKey = todayDateKey
  if (!todayUsed) {
    const yesterdayDateKey = addDaysToDateKey(todayDateKey, -1)
    if (!usageDateSet.has(yesterdayDateKey)) {
      return { streak: 0, todayUsed, lastUsageDate }
    }
    anchorDateKey = yesterdayDateKey
  }

  let streak = 0
  for (
    let cursor = anchorDateKey;
    usageDateSet.has(cursor);
    cursor = addDaysToDateKey(cursor, -1)
  ) {
    streak++
  }

  return { streak, todayUsed, lastUsageDate }
}

/**
 * Whether the full-access GLM 5.2 streak bonus is currently active. Requires all
 * three switches: streak rewards on, the GLM streak sub-switch on, AND the GLM
 * program itself live — GLM is only launchable from the referral banner, which
 * is hidden when the referral program is wound down, so a GLM bonus granted
 * while it's off would be unusable. Keeping the grant and the advertised perk
 * gated on the same predicate avoids that mismatch.
 */
export function isObitobuffStreakGlmBonusActive(): boolean {
  return (
    OBITOBUFF_STREAK_REWARDS_ENABLED &&
    OBITOBUFF_STREAK_GLM_BONUS_ENABLED &&
    OBITOBUFF_GLM_V52_REFERRAL_ENABLED
  )
}

/** GLM sessions per pool window earned by a streak of `streak` days, ignoring
 * the feature gates: one per completed 7-day interval, capped at
 * `OBITOBUFF_STREAK_GLM_BONUS_MAX_MULTIPLIER` (a 28-day streak earns the max).
 * The GLM pool resets daily since 2026-07-29 (weekly before), so these units
 * refill at that cadence. The name keeps its historical "Weekly". */
export function getObitobuffStreakGlmWeeklyUnits(streak: number): number {
  const tiers = Math.min(
    Math.floor(streak / OBITOBUFF_STREAK_REWARD_INTERVAL_DAYS),
    OBITOBUFF_STREAK_GLM_BONUS_MAX_MULTIPLIER,
  )
  return tiers * OBITOBUFF_STREAK_BONUS_SESSION_UNITS
}

/** Resolve the live GLM bonus directly from usage dates. The GLM pool gets +1
 * per completed 7 days of the current streak (7 → 1, 14 → 2, capped at 4 for
 * 28+) and refills at the pool reset (daily Pacific since 2026-07-29); once
 * the streak breaks it gets 0. */
export function getObitobuffStreakGlmBonusUnits(params: {
  usageDates: readonly string[]
  todayDateKey: string
}): number {
  if (!isObitobuffStreakGlmBonusActive()) return 0
  const { streak } = calculateObitobuffStreak(params)
  return getObitobuffStreakGlmWeeklyUnits(streak)
}

/**
 * The daily streak-reward pool to persist after today's first usage, or `null`
 * when nothing should be awarded. Full-access users receive a premium bonus;
 * limited-access users receive a limited-pool bonus. GLM is intentionally not
 * returned: its weekly +1 is derived live from usage dates, so it refills with
 * the weekly quota and shuts off with the streak instead of becoming a one-time
 * ledger grant.
 */
export function getObitobuffDailyStreakRewardPool(params: {
  streak: number
  todayUsed: boolean
  accessTier: ObitobuffAccessTier
}): Exclude<ObitobuffStreakRewardPool, 'glm'> | null {
  if (!OBITOBUFF_STREAK_REWARDS_ENABLED) return null
  if (!params.todayUsed) return null
  if (params.streak < OBITOBUFF_STREAK_REWARD_INTERVAL_DAYS) return null
  return params.accessTier === 'limited' ? 'limited' : 'premium'
}
