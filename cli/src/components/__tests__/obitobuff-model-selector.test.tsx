import { afterEach, beforeAll, describe, expect, test } from 'bun:test'
import { createTestRenderer } from '@opentui/core/testing'
import { createRoot, flushSync } from '@opentui/react'
import React from 'react'

import { ObitobuffModelSelector } from '../obitobuff-model-selector'
import {
  FALLBACK_OBITOBUFF_MODEL_ID,
  OBITOBUFF_DEEPSEEK_V4_FLASH_MODEL_ID,
  OBITOBUFF_DEEPSEEK_V4_PRO_MODEL_ID,
  OBITOBUFF_FABLE_5_MODEL_ID,
  OBITOBUFF_GLM_V52_MODEL_ID,
  OBITOBUFF_MINIMAX_M3_MODEL_ID,
  OBITOBUFF_MODELS,
  getObitobuffModelSupersededBy,
  isObitobuffModelId,
} from '@codebuff/common/constants/obitobuff-models'

import { initializeThemeStore } from '../../hooks/use-theme'
import {
  getSelectedObitobuffModel,
  useObitobuffModelStore,
} from '../../state/obitobuff-model-store'
import { useObitobuffSessionStore } from '../../state/obitobuff-session-store'

let cleanupRenderer: (() => void) | undefined

beforeAll(() => {
  initializeThemeStore()
})

afterEach(() => {
  cleanupRenderer?.()
  cleanupRenderer = undefined
  useObitobuffSessionStore.getState().setSession(null)
  useObitobuffSessionStore.getState().setFailure(null)
  useObitobuffModelStore.getState().setSelectedModel(FALLBACK_OBITOBUFF_MODEL_ID)
})

const renderSelector = async (maxHeight = 40) => {
  const setup = await createTestRenderer({ width: 100, height: 40 })
  const root = createRoot(setup.renderer)
  cleanupRenderer = () => {
    flushSync(() => root.unmount())
    setup.renderer.destroy()
  }
  flushSync(() => root.render(<ObitobuffModelSelector maxHeight={maxHeight} />))
  await setup.renderOnce()
  return setup
}

const renderSelectorWithGlmRemaining = async (remaining?: number) => {
  useObitobuffSessionStore.getState().setSession({
    status: 'none',
    accessTier: 'full',
    referral: {
      code: 'test-referral',
      referrerName: null,
      qualifiedCount: 1,
      ...(remaining === undefined
        ? {}
        : { weeklySessionsRemaining: remaining }),
      resetAt: new Date(Date.now() + 60_000).toISOString(),
      githubLinked: true,
    },
  })
  useObitobuffModelStore.getState().setSelectedModel(OBITOBUFF_GLM_V52_MODEL_ID)

  const nextSetup = await renderSelector(30)
  await nextSetup.renderOnce()
  await Promise.resolve()
  await nextSetup.renderOnce()
}

describe('ObitobuffModelSelector referral selection', () => {
  test('keeps a fractional unlocked GLM session selected while its request is pending', async () => {
    await renderSelectorWithGlmRemaining(0.25)
    expect(getSelectedObitobuffModel()).toBe(OBITOBUFF_GLM_V52_MODEL_ID)
  })

  test('still repairs a locked GLM selection to a visible grid model', async () => {
    await renderSelectorWithGlmRemaining(0)
    expect(isObitobuffModelId(getSelectedObitobuffModel())).toBe(true)
  })

  test('treats an omitted GLM balance as locked', async () => {
    await renderSelectorWithGlmRemaining()
    expect(isObitobuffModelId(getSelectedObitobuffModel())).toBe(true)
  })
})

describe('ObitobuffModelSelector tier layout', () => {
  test('keeps the referral copy and dashboard actions on one condensed row', async () => {
    useObitobuffSessionStore.getState().setSession({
      status: 'none',
      accessTier: 'full',
      referral: {
        code: 'test-referral',
        referrerName: null,
        qualifiedCount: 0,
        weeklySessionsRemaining: 0,
        resetAt: new Date(Date.now() + 60_000).toISOString(),
        githubLinked: true,
      },
    })
    useObitobuffModelStore
      .getState()
      .setSelectedModel(OBITOBUFF_MINIMAX_M3_MODEL_ID)

    const frame = (await renderSelector()).captureCharFrame()
    const actionRow =
      frame.split('\n').find((line) => line.includes('Copy invite link')) ?? ''

    expect(actionRow).toContain('Open GLM 5.2 dashboard')
    expect(frame).not.toContain('Or earn')
    expect(frame).not.toContain('for small tasks')
  })

  test('orders Luna above MiniMax while keeping the saved premium model focused', async () => {
    useObitobuffSessionStore.getState().setSession({
      status: 'none',
      accessTier: 'full',
    })
    useObitobuffModelStore
      .getState()
      .setSelectedModel(OBITOBUFF_DEEPSEEK_V4_PRO_MODEL_ID)

    const setup = await renderSelector()
    const frame = setup.captureCharFrame()
    const premiumHeaderIndex = frame.indexOf('PREMIUM')
    const selectedModelIndex = frame.indexOf('DeepSeek V4 Pro')
    const lunaModelIndex = frame.indexOf('GPT-5.6 Luna')
    const minimaxModelIndex = frame.indexOf('MiniMax M3')
    const unlimitedHeaderIndex = frame.indexOf('UNLIMITED')

    expect(premiumHeaderIndex).toBeGreaterThanOrEqual(0)
    expect(selectedModelIndex).toBeGreaterThan(premiumHeaderIndex)
    expect(lunaModelIndex).toBeGreaterThan(selectedModelIndex)
    expect(minimaxModelIndex).toBeGreaterThan(lunaModelIndex)
    expect(unlimitedHeaderIndex).toBeGreaterThan(minimaxModelIndex)
    expect(frame).toContain('› DeepSeek V4 Pro')
    expect(frame).not.toContain('› MiniMax M3')
  })

  test('shows the switch-to-Flash nudge only on the row the user is on', async () => {
    useObitobuffSessionStore.getState().setSession({
      status: 'none',
      accessTier: 'full',
    })
    // Assert against the real copy rather than a hardcoded fragment, so
    // rewording the notice doesn't fail this test for the wrong reason. It must
    // still render on ONE line — the width math reserves exactly its length.
    const notice = getObitobuffModelSupersededBy(
      OBITOBUFF_DEEPSEEK_V4_PRO_MODEL_ID,
      OBITOBUFF_MODELS.map((m) => m.id),
    )!.notice
    const occurrences = (frame: string) => frame.split(notice).length - 1

    // On a superseded model: the nudge appears, once, on that model's card.
    useObitobuffModelStore
      .getState()
      .setSelectedModel(OBITOBUFF_DEEPSEEK_V4_PRO_MODEL_ID)
    const onSuperseded = (await renderSelector()).captureCharFrame()
    expect(occurrences(onSuperseded)).toBe(1)
    // It names the dated build, which is what the row it steers to is labelled.
    expect(notice).toContain('DeepSeek V4 Flash 07/31')
    // The new build is badged so a returning user notices it changed.
    expect(onSuperseded).toContain('NEW')

    // Both Pro and M3 are superseded and both are on screen here, but only the
    // selected one nags — otherwise the list would repeat the same notice on
    // every row it applies to.
    useObitobuffModelStore
      .getState()
      .setSelectedModel(OBITOBUFF_MINIMAX_M3_MODEL_ID)
    const onOtherSuperseded = (await renderSelector()).captureCharFrame()
    expect(onOtherSuperseded).toContain('DeepSeek V4 Pro')
    expect(occurrences(onOtherSuperseded)).toBe(1)

    // On the replacement itself: no nudge at all. (Picking the recommended
    // model also collapses the picker to its hero card.)
    useObitobuffModelStore
      .getState()
      .setSelectedModel(OBITOBUFF_DEEPSEEK_V4_FLASH_MODEL_ID)
    const onCurrent = (await renderSelector()).captureCharFrame()
    expect(occurrences(onCurrent)).toBe(0)
  })

  test('places the exhausted-quota recommendation beneath UNLIMITED', async () => {
    const resetAt = new Date(Date.now() + 60_000).toISOString()
    useObitobuffSessionStore.getState().setSession({
      status: 'none',
      accessTier: 'full',
      rateLimitsByModel: {
        [OBITOBUFF_DEEPSEEK_V4_PRO_MODEL_ID]: {
          model: OBITOBUFF_DEEPSEEK_V4_PRO_MODEL_ID,
          limit: 6,
          period: 'pacific_day',
          resetTimeZone: 'America/Los_Angeles',
          resetAt,
          windowHours: 24,
          recentCount: 6,
        },
      },
    })
    useObitobuffModelStore
      .getState()
      .setSelectedModel(OBITOBUFF_MINIMAX_M3_MODEL_ID)

    const setup = await renderSelector()
    const frame = setup.captureCharFrame()
    const premiumHeaderIndex = frame.indexOf('PREMIUM')
    const unlimitedHeaderIndex = frame.indexOf('UNLIMITED')
    const recommendedLabelIndex = frame.indexOf('RECOMMENDED')
    const recommendedModelIndex = frame.indexOf(
      'DeepSeek V4 Flash',
      recommendedLabelIndex,
    )

    expect(unlimitedHeaderIndex).toBeGreaterThan(premiumHeaderIndex)
    expect(recommendedLabelIndex).toBeGreaterThan(unlimitedHeaderIndex)
    expect(recommendedModelIndex).toBeGreaterThan(recommendedLabelIndex)
  })

  test('repairs an invalid selection to the unlimited recommendation when premium is exhausted', async () => {
    const resetAt = new Date(Date.now() + 60_000).toISOString()
    useObitobuffSessionStore.getState().setSession({
      status: 'none',
      accessTier: 'full',
      rateLimitsByModel: {
        [OBITOBUFF_DEEPSEEK_V4_PRO_MODEL_ID]: {
          model: OBITOBUFF_DEEPSEEK_V4_PRO_MODEL_ID,
          limit: 6,
          period: 'pacific_day',
          resetTimeZone: 'America/Los_Angeles',
          resetAt,
          windowHours: 24,
          recentCount: 6,
        },
      },
    })
    useObitobuffModelStore.getState().setSelectedModel(OBITOBUFF_GLM_V52_MODEL_ID)

    const setup = await renderSelector()
    await Promise.resolve()
    await setup.renderOnce()
    await setup.renderOnce()

    expect(getSelectedObitobuffModel()).toBe(OBITOBUFF_DEEPSEEK_V4_FLASH_MODEL_ID)
    expect(setup.captureCharFrame()).toContain('› DeepSeek V4 Flash')
  })

  test('shows every limited-tier model when the access tier arrives after mount', async () => {
    useObitobuffSessionStore.getState().setSession({
      status: 'none',
      accessTier: 'full',
    })
    useObitobuffModelStore
      .getState()
      .setSelectedModel(OBITOBUFF_DEEPSEEK_V4_PRO_MODEL_ID)
    const setup = await renderSelector()

    flushSync(() => {
      useObitobuffSessionStore.getState().setSession({
        status: 'none',
        accessTier: 'limited',
      })
    })
    await Promise.resolve()
    await setup.renderOnce()
    await setup.renderOnce()

    const frame = setup.captureCharFrame()
    expect(frame).toContain('DeepSeek V4 Flash')
    expect(frame).toContain('MiMo 2.5')
    expect(frame).not.toContain('PREMIUM')
    expect(frame).not.toContain('UNLIMITED')
  })

  test('badges only natively multimodal rows with Images', async () => {
    useObitobuffSessionStore.getState().setSession({
      status: 'none',
      accessTier: 'full',
    })
    // Expanded (a saved non-recommended pick) so every row is on screen.
    useObitobuffModelStore
      .getState()
      .setSelectedModel(OBITOBUFF_MINIMAX_M3_MODEL_ID)

    const rowOf = (frame: string, name: string) =>
      frame.split('\n').find((line) => line.includes(name)) ?? ''
    const frame = (await renderSelector()).captureCharFrame()

    // Natively multimodal: the badge is a real capability claim.
    expect(rowOf(frame, 'MiniMax M3')).toContain('Images')
    expect(rowOf(frame, 'GPT-5.6 Luna')).toContain('Images')
    expect(rowOf(frame, 'MiMo 2.5')).toContain('Images')
    // Text-only. They still accept a pasted image (read server-side as a
    // description), but badging them made the label mean nothing — and the
    // badge is what widened the hero card.
    expect(rowOf(frame, 'DeepSeek V4 Flash')).not.toContain('Images')
    expect(rowOf(frame, 'DeepSeek V4 Pro')).not.toContain('Images')
  })

  test('says the reasoning effort on rows whose catalog entry carries one', async () => {
    useObitobuffSessionStore.getState().setSession({
      status: 'none',
      accessTier: 'full',
    })
    useObitobuffModelStore
      .getState()
      .setSelectedModel(OBITOBUFF_MINIMAX_M3_MODEL_ID)

    // Anchored on taglines: model names also appear in superseded-notice lines
    const rowOf = (frame: string, tagline: string) =>
      frame.split('\n').find((line) => line.includes(tagline)) ?? ''
    const frame = (await renderSelector()).captureCharFrame()

    expect(rowOf(frame, 'Smartest & Fastest')).toContain('Reasoning: high')
    expect(rowOf(frame, 'Deep reasoning')).toContain('Reasoning: high')
    expect(rowOf(frame, 'Thinks hard & Fast')).toContain('Reasoning: high')
    expect(rowOf(frame, 'MiniMax M3')).not.toContain('Reasoning')
  })

  test('sizes the hero card to its content, with no Press-Enter gutter', async () => {
    useObitobuffSessionStore.getState().setSession({
      status: 'none',
      accessTier: 'full',
    })
    useObitobuffModelStore
      .getState()
      .setSelectedModel(OBITOBUFF_DEEPSEEK_V4_FLASH_MODEL_ID)

    const frame = (await renderSelector()).captureCharFrame()
    // trimEnd drops the terminal's blank columns to the right of the card, so
    // what's left ends at the card's own right border.
    const heroRow = (
      frame.split('\n').find((line) => line.includes('› DeepSeek V4 Flash')) ??
      ''
    ).trimEnd()

    expect(frame).not.toContain('Press Enter')
    // The reserved cue gutter used to sit between the last badge and the right
    // border, padding the card out by ~17 columns of empty space. What remains
    // is ordinary slack from the widest row in the set.
    const gapToBorder =
      heroRow.length - 1 - (heroRow.indexOf('NEW') + 'NEW'.length)
    expect(heroRow.endsWith('│')).toBe(true)
    expect(gapToBorder).toBeLessThan(10)
  })
})

describe('ObitobuffModelSelector limited-model offer', () => {
  const offerSession = (
    offer: Partial<{
      remaining: number
      total: number
      userRemaining: number
      userResetAt: string
    }> = {},
  ) => ({
    status: 'none' as const,
    accessTier: 'full' as const,
    limitedModelOffers: [
      {
        model: OBITOBUFF_FABLE_5_MODEL_ID,
        remaining: 38,
        total: 50,
        userRemaining: 1,
        userResetAt: new Date(Date.now() + 5 * 60 * 60_000).toISOString(),
        ...offer,
      },
    ],
  })

  test('renders nothing when the server sends no offer', async () => {
    // The regression that matters most: a user who is not in the wave must see
    // the picker exactly as it was before the offer existed.
    useObitobuffSessionStore.getState().setSession({
      status: 'none',
      accessTier: 'full',
    })
    const frame = (await renderSelector()).captureCharFrame()
    expect(frame).not.toContain('LIMITED TRIAL')
    expect(frame).not.toContain('Fable')
  })

  test('renders the offered model with its scarcity and data-use label', async () => {
    useObitobuffSessionStore.getState().setSession(offerSession())
    const frame = (await renderSelector()).captureCharFrame()
    expect(frame).toContain('LIMITED TRIAL')
    expect(frame).toContain('38 of 50 sessions left')
    expect(frame).toContain('Claude Fable 5')
    // The disclosure that makes collecting the traces legitimate travels on the
    // row itself, not in a footnote somewhere else.
    expect(frame).toContain('May use data for AI training')
  })

  test('stays visible while collapsed, unlike the ordinary tiers', async () => {
    // The picker opens collapsed for a user already on the recommended model.
    // A wave nobody sees is a wave nobody joins.
    useObitobuffModelStore
      .getState()
      .setSelectedModel(OBITOBUFF_DEEPSEEK_V4_FLASH_MODEL_ID)
    useObitobuffSessionStore.getState().setSession(offerSession())
    const frame = (await renderSelector()).captureCharFrame()
    expect(frame).toContain('See all')
    expect(frame).toContain('Claude Fable 5')
    expect(frame).not.toContain('PREMIUM')
  })

  test('explains a spent personal allowance instead of hiding the row', async () => {
    useObitobuffSessionStore
      .getState()
      .setSession(offerSession({ userRemaining: 0 }))
    const frame = (await renderSelector()).captureCharFrame()
    expect(frame).toContain('Claude Fable 5')
    expect(frame).toContain("you've used yours")
    expect(frame).toContain('resets in')
  })

  test('drops an offer this build has no catalog entry for', async () => {
    // A server rolling out a model older clients don't know must be a no-op,
    // not a row with a blank name and no data-use warning.
    useObitobuffSessionStore.getState().setSession({
      status: 'none',
      accessTier: 'full',
      limitedModelOffers: [
        {
          model: 'someone/unreleased-model-9',
          remaining: 5,
          total: 50,
          userRemaining: 1,
          userResetAt: new Date(Date.now() + 60_000).toISOString(),
        },
      ],
    })
    const frame = (await renderSelector()).captureCharFrame()
    expect(frame).not.toContain('LIMITED TRIAL')
    expect(frame).not.toContain('unreleased-model-9')
  })

  test('keeps an offered selection instead of repairing it away', async () => {
    // The offer model is not in OBITOBUFF_MODELS, so the picker's
    // invalid-selection repair would otherwise bounce the user off the row they
    // just picked.
    useObitobuffSessionStore.getState().setSession(offerSession())
    useObitobuffModelStore.getState().setSelectedModel(OBITOBUFF_FABLE_5_MODEL_ID)
    await renderSelector()
    expect(getSelectedObitobuffModel()).toBe(OBITOBUFF_FABLE_5_MODEL_ID)
  })

  test('repairs the selection once the wave ends', async () => {
    useObitobuffSessionStore.getState().setSession({
      status: 'none',
      accessTier: 'full',
    })
    useObitobuffModelStore.getState().setSelectedModel(OBITOBUFF_FABLE_5_MODEL_ID)
    await renderSelector()
    expect(isObitobuffModelId(getSelectedObitobuffModel())).toBe(true)
  })
})
