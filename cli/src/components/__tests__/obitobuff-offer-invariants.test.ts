// The CLI can offer two kinds of obitobuff row: the picker grid, and the referral banner's earned
// GLM 5.2 action. Both end up as a POST the server gates, and as a free-mode root agent that has
// to allow the model — so a row this surface can show must survive all of it. Desktop shipped the
// mirror-image of this bug (an offered GLM row its own route answered 400 for), which is what
// these lock down here.

import { describe, expect, test } from 'bun:test'

import { getObitobuffRootAgentIdForModel } from '@codebuff/common/constants/free-agents'
import {
  OBITOBUFF_GLM_V52_MODEL_ID,
  resolveObitobuffModelForAccessTier,
} from '@codebuff/common/constants/obitobuff-models'
import { obitobuffOfferViolations } from '@codebuff/common/testing/obitobuff-offer-invariants'

import { obitobuffCliOfferedModelIds } from '../obitobuff-model-selector'

describe('obitobuff rows the CLI offers', () => {
  for (const accessTier of ['full', 'limited'] as const) {
    test(`are all usable on the ${accessTier} tier`, () => {
      expect(
        obitobuffOfferViolations({
          surface: `cli picker + referral banner (${accessTier})`,
          accessTier,
          offered: obitobuffCliOfferedModelIds(accessTier),
          // the CLI's own resolver, which every session start runs the selection through: a model
          // it coerces away is one the user picked and never got
          accepts: (model) =>
            resolveObitobuffModelForAccessTier(model, accessTier) === model,
          rootAgentIdFor: getObitobuffRootAgentIdForModel,
          catalog: 'supported',
        }),
      ).toEqual([])
    })
  }

  test('the earned reward is offered on BOTH tiers, and the grid never shows it', () => {
    // Limited access included: a bounty grant is redeemable there, so the row has to be
    // reachable there. The banner still only renders it against a live balance.
    expect(obitobuffCliOfferedModelIds('full')).toContain(OBITOBUFF_GLM_V52_MODEL_ID)
    expect(obitobuffCliOfferedModelIds('limited')).toContain(
      OBITOBUFF_GLM_V52_MODEL_ID,
    )
  })

  // 'base2-free' is the fallback root, and its allowlist has never included the referral reward.
  // A GLM row that fell through to it would 403 with free_mode_invalid_agent_model on the first
  // turn instead of failing at selection, so the mapping is what keeps the reward runnable.
  test('the reward maps to its own root agent rather than the fallback', () => {
    expect(getObitobuffRootAgentIdForModel(OBITOBUFF_GLM_V52_MODEL_ID)).toBe(
      'base2-free-glm',
    )
  })
})
