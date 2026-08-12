import { describe, expect, test } from 'bun:test'

import {
  formatObitobuffSessionCountdown,
  formatObitobuffSessionRemaining,
} from '../obitobuff-session-display'

describe('obitobuff session display formatting', () => {
  test('formats urgent countdowns', () => {
    expect(formatObitobuffSessionCountdown(61_000)).toBe('1:01')
    expect(formatObitobuffSessionRemaining(61_000)).toBe('1:01 left')
  })

  test('formats minute and hour remaining labels', () => {
    expect(formatObitobuffSessionRemaining(5 * 60_000)).toBe('5m left')
    expect(formatObitobuffSessionRemaining(60 * 60_000)).toBe('1h left')
    expect(formatObitobuffSessionRemaining(90 * 60_000)).toBe('1h 30m left')
  })

  test('formats expired sessions as expiring', () => {
    expect(formatObitobuffSessionRemaining(0)).toBe('expiring…')
  })
})
