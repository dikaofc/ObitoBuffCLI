import { describe, expect, test } from 'bun:test'

import {
  obitobuffModelNavigationDirectionForKey,
  nextObitobuffModelId,
} from '../obitobuff-model-navigation'

describe('nextObitobuffModelId', () => {
  test('moves to the next model when moving forward', () => {
    const modelIds = ['glm', 'minimax']

    expect(
      nextObitobuffModelId({
        modelIds,
        focusedId: 'minimax',
        direction: 'forward',
      }),
    ).toBe('glm')
  })

  test('moves to the previous model when moving backward', () => {
    const modelIds = ['glm', 'minimax']

    expect(
      nextObitobuffModelId({
        modelIds,
        focusedId: 'minimax',
        direction: 'backward',
      }),
    ).toBe('glm')
  })

  test('wraps through every model regardless of selectability', () => {
    const modelIds = ['glm', 'minimax', 'other']

    expect(
      nextObitobuffModelId({
        modelIds,
        focusedId: 'minimax',
        direction: 'forward',
      }),
    ).toBe('other')
  })

  test('returns null when no model exists', () => {
    expect(
      nextObitobuffModelId({
        modelIds: [],
        focusedId: 'glm',
        direction: 'forward',
      }),
    ).toBeNull()
  })
})

describe('obitobuffModelNavigationDirectionForKey', () => {
  test('maps arrow keys to model navigation directions', () => {
    expect(obitobuffModelNavigationDirectionForKey({ name: 'down' })).toBe(
      'forward',
    )
    expect(obitobuffModelNavigationDirectionForKey({ name: 'right' })).toBe(
      'forward',
    )
    expect(obitobuffModelNavigationDirectionForKey({ name: 'up' })).toBe(
      'backward',
    )
    expect(obitobuffModelNavigationDirectionForKey({ name: 'left' })).toBe(
      'backward',
    )
  })

  test('maps tab and shift-tab to model navigation directions', () => {
    expect(obitobuffModelNavigationDirectionForKey({ name: 'tab' })).toBe(
      'forward',
    )
    expect(
      obitobuffModelNavigationDirectionForKey({ name: 'tab', shift: true }),
    ).toBe('backward')
  })

  test('maps terminal tab sequences to model navigation directions', () => {
    expect(obitobuffModelNavigationDirectionForKey({ sequence: '\t' })).toBe(
      'forward',
    )
    expect(
      obitobuffModelNavigationDirectionForKey({ sequence: '\x1b[9u' }),
    ).toBe('forward')
    expect(
      obitobuffModelNavigationDirectionForKey({ sequence: '\x1b[Z' }),
    ).toBe('backward')
    expect(
      obitobuffModelNavigationDirectionForKey({ sequence: '\x1b[9;2u' }),
    ).toBe('backward')
    expect(
      obitobuffModelNavigationDirectionForKey({ sequence: '\x1b[27;2;9~' }),
    ).toBe('backward')
  })

  test('ignores non-navigation keys', () => {
    expect(obitobuffModelNavigationDirectionForKey({ name: 'enter' })).toBeNull()
  })
})
