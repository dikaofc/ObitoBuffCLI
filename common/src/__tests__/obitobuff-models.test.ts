import { describe, expect, test } from 'bun:test'

import {
  canObitobuffModelSpawnGeminiThinker,
  DEFAULT_OBITOBUFF_MODEL_ID,
  DEFAULT_OBITOBUFF_WEB_MODEL_ID,
  FALLBACK_OBITOBUFF_MODEL_ID,
  OBITOBUFF_WEB_DEEMPHASIZED_MODEL_IDS,
  OBITOBUFF_DEEPSEEK_V4_FLASH_MODEL_ID,
  OBITOBUFF_DEEPSEEK_V4_PRO_MODEL_ID,
  OBITOBUFF_DESKTOP_SESSION_LIMITS,
  OBITOBUFF_FABLE_5_MODEL_ID,
  OBITOBUFF_ENABLE_MIMO_MODELS_IN_UI,
  OBITOBUFF_GLM_V52_MODEL_ID,
  OBITOBUFF_GPT_5_6_LUNA_MAX_PRICE,
  OBITOBUFF_GPT_5_6_LUNA_MODEL_ID,
  OBITOBUFF_GPT_5_6_LUNA_PROVIDER_ROUTE,
  OBITOBUFF_GPT_5_6_LUNA_REASONING_EFFORT,
  OBITOBUFF_KIMI_K3_ECO_MODEL_ID,
  OBITOBUFF_MUSE_SPARK_12_CONTRIBUTOR_MODEL_ID,
  OBITOBUFF_MUSE_SPARK_REASONING_EFFORT,
  getObitobuffModelReasoningEffort,
  MUSE_SPARK_12_CONTRIBUTOR_UPSTREAM_MODEL_ID,
  MUSE_SPARK_FALLBACK_AFTER_MS,
  MUSE_SPARK_FALLBACK_MODEL_ID,
  MUSE_SPARK_FALLBACK_NOTICE,
  isMuseSparkModelId,
  LIMITED_OBITOBUFF_MODEL_ID,
  LIMITED_OBITOBUFF_MODEL_IDS,
  OBITOBUFF_MIMO_V25_MODEL_ID,
  OBITOBUFF_MODELS,
  OBITOBUFF_WEB_GOD_ONLY_MODELS,
  OBITOBUFF_WEB_ALL_MODELS,
  OBITOBUFF_WEB_MODELS,
  OBITOBUFF_WEB_RETIRED_PICKER_MODEL_IDS,
  OBITOBUFF_WEB_STANDARD_MODEL_IDS,
  SUPPORTED_OBITOBUFF_MODELS,
  getObitobuffDeploymentAvailabilityLabel,
  getObitobuffDesktopSessionBucket,
  getObitobuffModel,
  getObitobuffModelImageSupport,
  getObitobuffWebModel,
  getObitobuffModelsForAccessTier,
  getRecommendedObitobuffModelId,
  getRecommendedObitobuffWebModelId,
  isObitobuffWebDeemphasizedModelId,
  isObitobuffDeploymentHours,
  isObitobuffGlmV52ModelId,
  isObitobuffGpt56LunaModelId,
  isObitobuffLimitedOfferModelId,
  isObitobuffSessionModelAllowedForAccessTier,
  isObitobuffSessionModelAvailable,
  isObitobuffTracedModelId,
  isObitobuffWebGeoExemptModelId,
  isObitobuffWebSelectableModelId,
  isObitobuffModelId,
  isObitobuffMultimodalModelId,
  isObitobuffModelAllowedForAccessTier,
  isObitobuffPremiumModelId,
  isObitobuffWebGodOnlyModelId,
  isObitobuffWebRememberableModelId,
  isObitobuffWebModelAllowedForLimitedTier,
  isObitobuffWebModelId,
  isObitobuffWebMultimodalModelId,
  isObitobuffWebPremiumModelId,
  resolveRememberedObitobuffWebModel,
  isSupportedObitobuffModelId,
  isObitobuffSessionModelId,
  resolveObitobuffWebModel,
  resolveObitobuffWebModelForLimitedTier,
  resolveObitobuffModelForAccessTier,
  resolveObitobuffSessionModelForAccessTier,
  getObitobuffModelSupersededBy,
  migrateSupersededObitobuffModelPreference,
} from '../constants/obitobuff-models'
import type { ObitobuffModelOption } from '../constants/obitobuff-models'
import { minimaxModels } from '../constants/model-config'

const OBITOBUFF_KIMI_MODEL_ID = 'moonshotai/kimi-k2.7-code'
// Both removed 2026-08-04. Held as literals, not imported constants, so these
// guards keep asserting on the WIRE ids even if a constant of the same name is
// ever reintroduced.
const OBITOBUFF_MIMO_V25_PRO_MODEL_ID = 'mimo/mimo-v2.5-pro'
const OBITOBUFF_CROF_GLM_V52_MODEL_ID = 'crof/glm-5.2'

const MINIMAX_M3_MODEL_ID = minimaxModels.minimaxM3

describe('obitobuff model availability', () => {
  test('defaults and falls back to DeepSeek V4 Flash for new clients', () => {
    // Since the V4-Flash-0731 GA build (2026-07-31) the default and the
    // always-available fallback are the same model. They stay separate
    // constants because they answer different questions.
    expect(DEFAULT_OBITOBUFF_MODEL_ID).toBe(OBITOBUFF_DEEPSEEK_V4_FLASH_MODEL_ID)
    expect(FALLBACK_OBITOBUFF_MODEL_ID).toBe(OBITOBUFF_DEEPSEEK_V4_FLASH_MODEL_ID)
  })

  test('desktop concurrency splits full access into 1 premium and 3 unlimited sessions', () => {
    expect(
      getObitobuffDesktopSessionBucket(
        OBITOBUFF_DEEPSEEK_V4_PRO_MODEL_ID,
        'full',
      ),
    ).toBe('premium')
    expect(
      getObitobuffDesktopSessionBucket(
        OBITOBUFF_DEEPSEEK_V4_FLASH_MODEL_ID,
        'full',
      ),
    ).toBe('unlimited')
    expect(OBITOBUFF_DESKTOP_SESSION_LIMITS).toEqual({
      premium: 1,
      unlimited: 3,
    })
    expect(
      getObitobuffDesktopSessionBucket(
        OBITOBUFF_DEEPSEEK_V4_FLASH_MODEL_ID,
        'limited',
      ),
    ).toBe('premium')
  })

  test('DeepSeek Pro carries the AI-training warning before selection', () => {
    const deepseek = OBITOBUFF_MODELS.find(
      (m) => m.id === OBITOBUFF_DEEPSEEK_V4_PRO_MODEL_ID,
    )
    expect((deepseek as { warning?: string } | undefined)?.warning).toBe(
      'May use data for AI training',
    )
  })

  test('DeepSeek Flash carries the AI-training warning before selection', () => {
    const deepseek = OBITOBUFF_MODELS.find(
      (m) => m.id === OBITOBUFF_DEEPSEEK_V4_FLASH_MODEL_ID,
    )
    expect((deepseek as { warning?: string } | undefined)?.warning).toBe(
      'May use data for AI training',
    )
  })

  test('only the DeepSeek family is trace-stored in free mode; M3 has no warning', () => {
    const m3 = OBITOBUFF_MODELS.find((m) => m.id === MINIMAX_M3_MODEL_ID)
    expect((m3 as { warning?: string } | undefined)?.warning).toBeUndefined()
    // The DeepSeek family discloses AI training and IS stored.
    expect(isObitobuffTracedModelId(OBITOBUFF_DEEPSEEK_V4_PRO_MODEL_ID)).toBe(
      true,
    )
    expect(isObitobuffTracedModelId(OBITOBUFF_DEEPSEEK_V4_FLASH_MODEL_ID)).toBe(
      true,
    )
    // Everything else (incl. M3 on Fireworks) is NOT stored.
    expect(isObitobuffTracedModelId(MINIMAX_M3_MODEL_ID)).toBe(false)
    expect(isObitobuffTracedModelId(OBITOBUFF_KIMI_MODEL_ID)).toBe(false)
    expect(isObitobuffTracedModelId(OBITOBUFF_MIMO_V25_MODEL_ID)).toBe(false)
    expect(isObitobuffTracedModelId(null)).toBe(false)
  })

  test('trace storage follows machine-readable data-use metadata', () => {
    const models: readonly ObitobuffModelOption[] = SUPPORTED_OBITOBUFF_MODELS
    for (const model of models) {
      expect(isObitobuffTracedModelId(model.id)).toBe(
        model.dataUse === 'training',
      )
      expect(model.warning !== undefined).toBe(model.dataUse === 'training')
    }
  })

  test('DeepSeek V4 Flash is selectable and non-premium', () => {
    expect(OBITOBUFF_MODELS.map((model) => model.id)).toContain(
      OBITOBUFF_DEEPSEEK_V4_FLASH_MODEL_ID,
    )
    expect(isObitobuffModelId(OBITOBUFF_DEEPSEEK_V4_FLASH_MODEL_ID)).toBe(true)
    expect(isObitobuffPremiumModelId(OBITOBUFF_DEEPSEEK_V4_FLASH_MODEL_ID)).toBe(
      false,
    )
  })

  test('MiMo 2.5 remains supported and follows the UI rollout flag', () => {
    expect(SUPPORTED_OBITOBUFF_MODELS.map((model) => model.id)).toContain(
      OBITOBUFF_MIMO_V25_MODEL_ID,
    )

    if (OBITOBUFF_ENABLE_MIMO_MODELS_IN_UI) {
      expect(OBITOBUFF_MODELS.map((model) => model.id)).toContain(
        OBITOBUFF_MIMO_V25_MODEL_ID,
      )
    } else {
      expect(OBITOBUFF_MODELS.map((model) => model.id)).not.toContain(
        OBITOBUFF_MIMO_V25_MODEL_ID,
      )
    }

    expect(isObitobuffPremiumModelId(OBITOBUFF_MIMO_V25_MODEL_ID)).toBe(false)
    expect(getObitobuffModelImageSupport(OBITOBUFF_MIMO_V25_MODEL_ID)).toBe(true)
  })

  test('MiMo 2.5 Pro is fully removed from Obitobuff', () => {
    // Retired from the client pickers 2026-07-31, server half removed
    // 2026-08-04 once the tail had decayed from ~170 to ~33 daily users. Same
    // two-stage shape Kimi K2.7 Code went through. Paid/BYOK MiMo Pro is
    // unaffected; it never resolves through these helpers.
    expect(SUPPORTED_OBITOBUFF_MODELS.map((model) => model.id)).not.toContain(
      OBITOBUFF_MIMO_V25_PRO_MODEL_ID,
    )
    expect(OBITOBUFF_MODELS.map((model) => model.id)).not.toContain(
      OBITOBUFF_MIMO_V25_PRO_MODEL_ID,
    )
    expect(OBITOBUFF_WEB_MODELS.map((model) => model.id)).not.toContain(
      OBITOBUFF_MIMO_V25_PRO_MODEL_ID,
    )
    expect(isObitobuffModelId(OBITOBUFF_MIMO_V25_PRO_MODEL_ID)).toBe(false)
    expect(isSupportedObitobuffModelId(OBITOBUFF_MIMO_V25_PRO_MODEL_ID)).toBe(
      false,
    )
    expect(isObitobuffSessionModelId(OBITOBUFF_MIMO_V25_PRO_MODEL_ID)).toBe(false)
    expect(isObitobuffPremiumModelId(OBITOBUFF_MIMO_V25_PRO_MODEL_ID)).toBe(false)
    // The non-Pro model must not be caught by the removal: the ids share a
    // prefix, and obitobuffModelIdMatches only tolerates dated suffixes.
    expect(isObitobuffSessionModelId(OBITOBUFF_MIMO_V25_MODEL_ID)).toBe(true)
  })

  test('reports image support only for known Obitobuff models', () => {
    expect(
      getObitobuffModelImageSupport(OBITOBUFF_DEEPSEEK_V4_PRO_MODEL_ID),
    ).toBe(false)
    expect(getObitobuffModelImageSupport(MINIMAX_M3_MODEL_ID)).toBe(true)
    expect(
      getObitobuffModelImageSupport('vendor/new-vision-model'),
    ).toBeUndefined()

    for (const model of SUPPORTED_OBITOBUFF_MODELS) {
      expect(isObitobuffMultimodalModelId(model.id)).toBe(model.multimodal)
    }
    for (const model of OBITOBUFF_WEB_ALL_MODELS) {
      expect(isObitobuffWebMultimodalModelId(model.id)).toBe(model.multimodal)
    }
  })

  test('Kimi K2.7 Code is fully removed from Obitobuff', () => {
    // Removed 2026-07-31 (client pickers went first, on 2026-07-30). The server
    // half is gone too, so a stale client selection is no longer admitted —
    // that tail was still spending ~$2.3k/day. Paid/BYOK Kimi is unaffected;
    // it never resolves through these helpers.
    expect(SUPPORTED_OBITOBUFF_MODELS.map((model) => model.id)).not.toContain(
      OBITOBUFF_KIMI_MODEL_ID,
    )
    expect(OBITOBUFF_MODELS.map((model) => model.id)).not.toContain(
      OBITOBUFF_KIMI_MODEL_ID,
    )
    expect(
      getObitobuffModelsForAccessTier('full').map((m) => m.id),
    ).not.toContain(OBITOBUFF_KIMI_MODEL_ID)
    expect(isObitobuffModelId(OBITOBUFF_KIMI_MODEL_ID)).toBe(false)
    expect(isSupportedObitobuffModelId(OBITOBUFF_KIMI_MODEL_ID)).toBe(false)
    expect(getObitobuffWebModel(OBITOBUFF_KIMI_MODEL_ID).id).toBe(
      FALLBACK_OBITOBUFF_MODEL_ID,
    )
    expect(isObitobuffPremiumModelId(OBITOBUFF_KIMI_MODEL_ID)).toBe(false)
    expect(
      isObitobuffModelAllowedForAccessTier(OBITOBUFF_KIMI_MODEL_ID, 'full'),
    ).toBe(false)
    expect(
      resolveObitobuffModelForAccessTier(OBITOBUFF_KIMI_MODEL_ID, 'full'),
    ).toBe(FALLBACK_OBITOBUFF_MODEL_ID)
    // Session admission no longer accepts it either, so live stale sessions
    // resolve to the fallback instead of continuing on Kimi.
    expect(
      isObitobuffSessionModelAllowedForAccessTier(
        OBITOBUFF_KIMI_MODEL_ID,
        'full',
      ),
    ).toBe(false)
    expect(
      resolveObitobuffSessionModelForAccessTier(OBITOBUFF_KIMI_MODEL_ID, 'full', {
        includeGodOnly: false,
      }),
    ).toBe(FALLBACK_OBITOBUFF_MODEL_ID)
    // Retired K2.6 is no longer a obitobuff model; stale saved selections must
    // fall back rather than be admitted.
    expect(isSupportedObitobuffModelId('moonshotai/kimi-k2.6')).toBe(false)
    expect(
      isObitobuffModelAllowedForAccessTier('moonshotai/kimi-k2.6', 'full'),
    ).toBe(false)
    expect(
      resolveObitobuffModelForAccessTier('moonshotai/kimi-k2.6', 'full'),
    ).not.toBe('moonshotai/kimi-k2.6')
  })

  test('both HY3 routes are fully removed from Obitobuff', () => {
    // HY3 was withdrawn from the Web picker during the initial rollout and left
    // in OBITOBUFF_WEB_RETIRED_PICKER_MODEL_IDS, which is a client-side filter
    // and therefore not a gate at all — the same mistake that let the CrofAI
    // GLM route be farmed. Removed outright 2026-08-04, along with the
    // god-only paid OpenRouter route.
    //
    // As of 2026-08-07 the wire-id CONSTANTS are gone too: hy3-fallback.ts and
    // the Atlas Cloud adapter that was its paid lane have been deleted, so
    // nothing routes `tencent/hy3` on any path, paid or free. The slugs are
    // spelled out literally here precisely because no constant remains to
    // import — that is the point of the test.
    for (const hy3Id of ['tencent/hy3:free', 'tencent/hy3']) {
      expect(OBITOBUFF_MODELS.map((model) => model.id)).not.toContain(hy3Id)
      expect(SUPPORTED_OBITOBUFF_MODELS.map((model) => model.id)).not.toContain(
        hy3Id,
      )
      expect(OBITOBUFF_WEB_MODELS.map((model) => model.id)).not.toContain(hy3Id)
      expect(
        OBITOBUFF_WEB_GOD_ONLY_MODELS.map((model) => model.id),
      ).not.toContain(hy3Id)
      expect(OBITOBUFF_WEB_ALL_MODELS.map((model) => model.id)).not.toContain(
        hy3Id,
      )

      expect(isObitobuffModelId(hy3Id)).toBe(false)
      expect(isSupportedObitobuffModelId(hy3Id)).toBe(false)
      expect(isObitobuffWebModelId(hy3Id, { includeGodOnly: true })).toBe(false)
      expect(isObitobuffWebGodOnlyModelId(hy3Id)).toBe(false)
      expect(isObitobuffSessionModelId(hy3Id)).toBe(false)
      // No pool may meter it, in either direction: premium would hand it out
      // free, and standard would leave it unlimited.
      expect(isObitobuffWebPremiumModelId(hy3Id)).toBe(false)
      expect(isObitobuffPremiumModelId(hy3Id)).toBe(false)
      expect(OBITOBUFF_WEB_STANDARD_MODEL_IDS).not.toContain(hy3Id)
      // A stale saved selection downgrades rather than resolving to itself.
      expect(resolveObitobuffWebModel(hy3Id, { includeGodOnly: true })).toBe(
        FALLBACK_OBITOBUFF_MODEL_ID,
      )
      expect(getObitobuffWebModel(hy3Id).id).toBe(FALLBACK_OBITOBUFF_MODEL_ID)
    }
  })

  test('the picker-retirement list is empty, and that is deliberate', () => {
    // Both former occupants (HY3, CrofAI GLM 5.2) were farmed or left publicly
    // advertised precisely because a picker-only retirement is a UI change, not
    // a gate. If this fails, something was parked here instead of removed —
    // check that the id being reachable by a direct API caller is actually
    // harmless before accepting it.
    expect(OBITOBUFF_WEB_RETIRED_PICKER_MODEL_IDS).toEqual([])
    for (const model of OBITOBUFF_WEB_ALL_MODELS) {
      expect(isObitobuffWebSelectableModelId(model.id)).toBe(true)
    }
  })

  test('GLM 5.2 is referral-only and reachable by exactly one model id', () => {
    // The earned route stays selectable — removing the other GLM route must
    // never take this one down with it.
    expect(isObitobuffWebSelectableModelId(OBITOBUFF_GLM_V52_MODEL_ID)).toBe(true)
    // Every other web model is unaffected.
    expect(
      isObitobuffWebSelectableModelId(OBITOBUFF_DEEPSEEK_V4_PRO_MODEL_ID),
    ).toBe(true)
  })

  test('CLI access-tier resolver preserves GLM at every tier', () => {
    expect(
      resolveObitobuffModelForAccessTier(OBITOBUFF_GLM_V52_MODEL_ID, 'full'),
    ).toBe(OBITOBUFF_GLM_V52_MODEL_ID)
    // Since bounties (2026-08-03), GLM survives the limited-tier coercion: a
    // bounty-earned session is redeemable in every region. The entitlement
    // gate moved DOWN into the GLM quota pool, which at limited tier counts
    // ONLY grants minted redeemable_at_limited_tier — referral GLM still buys
    // a limited-tier user nothing. Coercing here instead would rewrite a
    // deliberate pick to DeepSeek and strand the session they earned.
    expect(
      resolveObitobuffModelForAccessTier(OBITOBUFF_GLM_V52_MODEL_ID, 'limited'),
    ).toBe(OBITOBUFF_GLM_V52_MODEL_ID)
    // Everything else still collapses to the limited model.
    expect(
      resolveObitobuffModelForAccessTier(OBITOBUFF_KIMI_MODEL_ID, 'limited'),
    ).toBe(LIMITED_OBITOBUFF_MODEL_ID)
  })

  test('the CrofAI GLM 5.2 wire id is fully removed', () => {
    // Retired from the pickers 2026-07-30 and deleted 2026-08-04. The picker
    // retirement was client-side only, so hand-written API callers kept
    // admitting sessions on this id and drawing GLM 5.2 from the free daily
    // PREMIUM pool instead of the earned GLM pool — 12-49 distinct accounts a
    // day, five days after it was supposedly unreachable. No shipped client
    // ever bundled it, so deleting it breaks nothing.
    //
    // The invariant this guards: GLM 5.2 must have exactly ONE wire id. The
    // quota pool is chosen by model id, so a second id is a second entitlement.
    expect(OBITOBUFF_WEB_MODELS.map((model) => model.id)).not.toContain(
      OBITOBUFF_CROF_GLM_V52_MODEL_ID,
    )
    expect(OBITOBUFF_WEB_ALL_MODELS.map((model) => model.id)).not.toContain(
      OBITOBUFF_CROF_GLM_V52_MODEL_ID,
    )
    expect(isObitobuffWebModelId(OBITOBUFF_CROF_GLM_V52_MODEL_ID)).toBe(false)
    expect(isObitobuffSessionModelId(OBITOBUFF_CROF_GLM_V52_MODEL_ID)).toBe(false)
    // Critically: it must not be metered by the free daily premium pool, which
    // is the door this whole removal closes.
    expect(isObitobuffWebPremiumModelId(OBITOBUFF_CROF_GLM_V52_MODEL_ID)).toBe(
      false,
    )
    expect(OBITOBUFF_WEB_STANDARD_MODEL_IDS).not.toContain(
      OBITOBUFF_CROF_GLM_V52_MODEL_ID,
    )
    // A stale saved selection downgrades to the always-available fallback.
    expect(resolveObitobuffWebModel(OBITOBUFF_CROF_GLM_V52_MODEL_ID)).toBe(
      FALLBACK_OBITOBUFF_MODEL_ID,
    )
    // The earned route is untouched.
    expect(isObitobuffGlmV52ModelId(OBITOBUFF_GLM_V52_MODEL_ID)).toBe(true)
    expect(isObitobuffSessionModelId(OBITOBUFF_GLM_V52_MODEL_ID)).toBe(true)
  })

  test('GLM 5.2 is never remembered as the default model', () => {
    // GLM runs out long before the rest of the picker, so remembering it would
    // strand a new thread / app / page load on a model that fails admission.
    expect(isObitobuffWebRememberableModelId(OBITOBUFF_GLM_V52_MODEL_ID)).toBe(
      false,
    )
    expect(resolveRememberedObitobuffWebModel(OBITOBUFF_GLM_V52_MODEL_ID)).toBe(
      DEFAULT_OBITOBUFF_WEB_MODEL_ID,
    )
    // Retired picker models self-heal to the always-available fallback, while
    // god-only models remain rememberable when the caller opts in.
    expect(
      resolveRememberedObitobuffWebModel(OBITOBUFF_DEEPSEEK_V4_PRO_MODEL_ID),
    ).toBe(OBITOBUFF_DEEPSEEK_V4_PRO_MODEL_ID)
    expect(resolveRememberedObitobuffWebModel(OBITOBUFF_KIMI_MODEL_ID)).toBe(
      FALLBACK_OBITOBUFF_MODEL_ID,
    )
    expect(
      resolveRememberedObitobuffWebModel(OBITOBUFF_KIMI_K3_ECO_MODEL_ID, {
        includeGodOnly: true,
      }),
    ).toBe(OBITOBUFF_KIMI_K3_ECO_MODEL_ID)
    // A retired/unknown saved id keeps the pre-existing resolution: the
    // always-available fallback, not the premium default.
    expect(resolveRememberedObitobuffWebModel('some/retired-model')).toBe(
      FALLBACK_OBITOBUFF_MODEL_ID,
    )
  })

  test('every Web picker model falls into exactly one quota group', () => {
    // The Web/Cloud picker groups rows by these two predicates (referral GLM,
    // premium) and treats the remainder as Standard. Each group is metered by a
    // different pool, so a model matching both — or a premium model matching
    // neither and silently landing in the free Standard group — is a quota bug,
    // not a cosmetic one.
    for (const model of OBITOBUFF_WEB_MODELS) {
      const groups = [
        isObitobuffGlmV52ModelId(model.id),
        isObitobuffWebPremiumModelId(model.id),
      ].filter(Boolean)
      expect({ id: model.id, groups: groups.length }).toEqual({
        id: model.id,
        // Zero groups means the Standard pool, which is only correct for a
        // model that is not marked premium.
        groups: model.premium ? 1 : 0,
      })
    }
  })

  test('the removed CrofAI GLM 5.2 id is admitted at no access tier', () => {
    for (const tier of ['limited', 'full'] as const) {
      expect(
        isObitobuffSessionModelAllowedForAccessTier(
          OBITOBUFF_CROF_GLM_V52_MODEL_ID,
          tier,
        ),
      ).toBe(false)
    }
    expect(
      isObitobuffWebModelAllowedForLimitedTier(OBITOBUFF_CROF_GLM_V52_MODEL_ID),
    ).toBe(false)
    expect(isObitobuffWebGeoExemptModelId(OBITOBUFF_CROF_GLM_V52_MODEL_ID)).toBe(
      false,
    )
    expect(
      resolveObitobuffWebModelForLimitedTier(OBITOBUFF_CROF_GLM_V52_MODEL_ID),
    ).toBe(LIMITED_OBITOBUFF_MODEL_ID)
  })

  test('bounty GLM 5.2 survives the Web limited-tier coercion', () => {
    // Regression: this coercion ran BEFORE the quota pool got a say, so a
    // limited-region user who had earned a bounty session had their pick
    // rewritten to the flash model and could never spend the reward. The
    // entitlement gate is the GLM pool (bounty grants only) — not this
    // allowlist, which is purely about what the picker may display.
    expect(
      isObitobuffWebModelAllowedForLimitedTier(OBITOBUFF_GLM_V52_MODEL_ID),
    ).toBe(true)
    expect(
      resolveObitobuffWebModelForLimitedTier(OBITOBUFF_GLM_V52_MODEL_ID),
    ).toBe(OBITOBUFF_GLM_V52_MODEL_ID)

    // The CrofAI GLM route is a paid premium model, NOT the earned one, and
    // must stay coerced away — the two ids are easy to confuse.
    expect(
      isObitobuffWebModelAllowedForLimitedTier(OBITOBUFF_CROF_GLM_V52_MODEL_ID),
    ).toBe(false)
  })

  test('Kimi K3 is a god-only Obitobuff Web/Cloud test model', () => {
    // The wire id must keep the `crof/` prefix and the `-eco` build suffix:
    // isCrofModel keys off the exact id, and CrofAI also serves a full
    // `kimi-k3` at twice the price. See kimi-k3-god-only.test.ts.
    expect(OBITOBUFF_KIMI_K3_ECO_MODEL_ID).toBe('crof/kimi-k3-eco')

    expect(OBITOBUFF_WEB_GOD_ONLY_MODELS.map((model) => model.id)).toContain(
      OBITOBUFF_KIMI_K3_ECO_MODEL_ID,
    )
    expect(OBITOBUFF_WEB_MODELS.map((model) => model.id)).not.toContain(
      OBITOBUFF_KIMI_K3_ECO_MODEL_ID,
    )
    expect(SUPPORTED_OBITOBUFF_MODELS.map((model) => model.id)).not.toContain(
      OBITOBUFF_KIMI_K3_ECO_MODEL_ID,
    )

    expect(isObitobuffWebModelId(OBITOBUFF_KIMI_K3_ECO_MODEL_ID)).toBe(false)
    expect(
      isObitobuffWebModelId(OBITOBUFF_KIMI_K3_ECO_MODEL_ID, {
        includeGodOnly: true,
      }),
    ).toBe(true)
    expect(isObitobuffWebGodOnlyModelId(OBITOBUFF_KIMI_K3_ECO_MODEL_ID)).toBe(
      true,
    )
    expect(isObitobuffWebPremiumModelId(OBITOBUFF_KIMI_K3_ECO_MODEL_ID)).toBe(
      true,
    )
    // Never reachable from the CLI/Desktop picker or a limited-tier browser.
    expect(isObitobuffPremiumModelId(OBITOBUFF_KIMI_K3_ECO_MODEL_ID)).toBe(false)
    expect(isObitobuffModelId(OBITOBUFF_KIMI_K3_ECO_MODEL_ID)).toBe(false)
    expect(
      isObitobuffWebModelAllowedForLimitedTier(OBITOBUFF_KIMI_K3_ECO_MODEL_ID),
    ).toBe(false)

    expect(resolveObitobuffWebModel(OBITOBUFF_KIMI_K3_ECO_MODEL_ID)).toBe(
      FALLBACK_OBITOBUFF_MODEL_ID,
    )
    expect(
      resolveObitobuffWebModel(OBITOBUFF_KIMI_K3_ECO_MODEL_ID, {
        includeGodOnly: true,
      }),
    ).toBe(OBITOBUFF_KIMI_K3_ECO_MODEL_ID)

    const model = getObitobuffWebModel(OBITOBUFF_KIMI_K3_ECO_MODEL_ID)
    // 'Kimi K3', not 'Kimi K3 Eco' — deliberate, see kimi-k3-god-only.test.ts.
    expect(model.displayName).toBe('Kimi K3')
    expect(model.tagline).toBe('Via CrofAI')
    expect(model.experimental).toBe(true)
    expect(model.multimodal).toBe(false)
    expect(getObitobuffModelImageSupport(OBITOBUFF_KIMI_K3_ECO_MODEL_ID)).toBe(
      false,
    )
  })

  test('Ling 3.0 Flash and Greg 2 are fully removed from Obitobuff', () => {
    // All three were god-only test rows, removed 2026-08-07. Spelled literally
    // because no constant remains to import.
    for (const removedId of [
      'inclusionai/ling-3.0-flash:free',
      'crof/greg-2-ultra',
      'crof/greg-2-super',
    ]) {
      expect(OBITOBUFF_WEB_ALL_MODELS.map((model) => model.id)).not.toContain(
        removedId,
      )
      expect(
        OBITOBUFF_WEB_GOD_ONLY_MODELS.map((model) => model.id),
      ).not.toContain(removedId)
      expect(isObitobuffWebModelId(removedId, { includeGodOnly: true })).toBe(
        false,
      )
      expect(isObitobuffWebGodOnlyModelId(removedId)).toBe(false)
      expect(isObitobuffSessionModelId(removedId)).toBe(false)
      // No pool may still meter them, in either direction.
      expect(isObitobuffWebPremiumModelId(removedId)).toBe(false)
      expect(OBITOBUFF_WEB_STANDARD_MODEL_IDS).not.toContain(removedId)
      expect(resolveObitobuffWebModel(removedId, { includeGodOnly: true })).toBe(
        FALLBACK_OBITOBUFF_MODEL_ID,
      )
    }
  })

  test('KAT Coder Pro V2 is fully retired from Obitobuff Web and Cloud', () => {
    const retiredKatModelId = 'kwaipilot/kat-coder-pro-v2'
    expect(OBITOBUFF_WEB_MODELS.map((model) => model.id)).not.toContain(
      retiredKatModelId,
    )
    expect(SUPPORTED_OBITOBUFF_MODELS.map((model) => model.id)).not.toContain(
      retiredKatModelId,
    )
    expect(isObitobuffWebModelId(retiredKatModelId)).toBe(false)
    expect(isObitobuffWebPremiumModelId(retiredKatModelId)).toBe(false)
    expect(resolveObitobuffWebModel(retiredKatModelId)).toBe(
      FALLBACK_OBITOBUFF_MODEL_ID,
    )
  })

  test('MiniMax M2.7 support is fully removed', () => {
    const legacyMinimaxM27 = 'minimax/minimax-m2.7'
    expect(SUPPORTED_OBITOBUFF_MODELS.map((model) => model.id)).not.toContain(
      legacyMinimaxM27,
    )
    expect(isObitobuffModelId(legacyMinimaxM27)).toBe(false)
    expect(isSupportedObitobuffModelId(legacyMinimaxM27)).toBe(false)
    expect(isObitobuffModelAllowedForAccessTier(legacyMinimaxM27, 'full')).toBe(
      false,
    )
    // Old clients with a saved M2.7 selection resolve to the fallback model.
    expect(resolveObitobuffModelForAccessTier(legacyMinimaxM27, 'full')).toBe(
      FALLBACK_OBITOBUFF_MODEL_ID,
    )
  })

  test('MiniMax M3 is a selectable premium model on the standard daily pool', () => {
    expect(SUPPORTED_OBITOBUFF_MODELS.map((model) => model.id)).toContain(
      MINIMAX_M3_MODEL_ID,
    )
    expect(OBITOBUFF_MODELS.map((model) => model.id)).toContain(
      MINIMAX_M3_MODEL_ID,
    )
    expect(getObitobuffModelsForAccessTier('full').map((m) => m.id)).toContain(
      MINIMAX_M3_MODEL_ID,
    )
    expect(isObitobuffModelId(MINIMAX_M3_MODEL_ID)).toBe(true)
    expect(isSupportedObitobuffModelId(MINIMAX_M3_MODEL_ID)).toBe(true)
    expect(isObitobuffPremiumModelId(MINIMAX_M3_MODEL_ID)).toBe(true)
    expect(isObitobuffWebPremiumModelId(MINIMAX_M3_MODEL_ID)).toBe(true)
    expect(
      isObitobuffModelAllowedForAccessTier(MINIMAX_M3_MODEL_ID, 'full'),
    ).toBe(true)
    // DeepSeek V4 Flash is the recommended default (2026-07-31), so it leads the
    // picker list, with V4 Pro behind it and the more strongly recommended Luna
    // ahead of M3.
    expect(OBITOBUFF_MODELS[0]!.id).toBe(OBITOBUFF_DEEPSEEK_V4_FLASH_MODEL_ID)
    expect(OBITOBUFF_MODELS[1]!.id).toBe(OBITOBUFF_DEEPSEEK_V4_PRO_MODEL_ID)
    expect(OBITOBUFF_MODELS[2]!.id).toBe(OBITOBUFF_GPT_5_6_LUNA_MODEL_ID)
    expect(OBITOBUFF_MODELS[3]!.id).toBe(MINIMAX_M3_MODEL_ID)
  })

  test('GPT-5.6 Luna is a premium model on every full-access surface', () => {
    // The wire id must stay OpenRouter's own slug: getChatCompletionsProvider
    // has no Luna branch, so it only reaches OpenRouter by falling through to
    // the default route with the slug intact.
    expect(OBITOBUFF_GPT_5_6_LUNA_MODEL_ID).toBe('openai/gpt-5.6-luna')

    // CLI/Desktop picker, Web/Cloud picker, and the session/chat layers.
    expect(OBITOBUFF_MODELS.map((model) => model.id)).toContain(
      OBITOBUFF_GPT_5_6_LUNA_MODEL_ID,
    )
    expect(SUPPORTED_OBITOBUFF_MODELS.map((model) => model.id)).toContain(
      OBITOBUFF_GPT_5_6_LUNA_MODEL_ID,
    )
    expect(OBITOBUFF_WEB_MODELS.map((model) => model.id)).toContain(
      OBITOBUFF_GPT_5_6_LUNA_MODEL_ID,
    )
    expect(getObitobuffModelsForAccessTier('full').map((m) => m.id)).toContain(
      OBITOBUFF_GPT_5_6_LUNA_MODEL_ID,
    )
    // Everyone on the tier can pick it — it is not god-only and not retired.
    expect(isObitobuffWebGodOnlyModelId(OBITOBUFF_GPT_5_6_LUNA_MODEL_ID)).toBe(
      false,
    )
    expect(isObitobuffWebSelectableModelId(OBITOBUFF_GPT_5_6_LUNA_MODEL_ID)).toBe(
      true,
    )

    // Metered by the SHARED daily premium pool on every surface, not a pool of
    // its own and never the free standard browser pool.
    expect(isObitobuffPremiumModelId(OBITOBUFF_GPT_5_6_LUNA_MODEL_ID)).toBe(true)
    expect(isObitobuffWebPremiumModelId(OBITOBUFF_GPT_5_6_LUNA_MODEL_ID)).toBe(
      true,
    )
    expect(OBITOBUFF_WEB_STANDARD_MODEL_IDS).not.toContain(
      OBITOBUFF_GPT_5_6_LUNA_MODEL_ID,
    )
    expect(isObitobuffGlmV52ModelId(OBITOBUFF_GPT_5_6_LUNA_MODEL_ID)).toBe(false)
    // Dated snapshots can't dodge the premium quota or the pinned routing.
    expect(
      isObitobuffPremiumModelId(`${OBITOBUFF_GPT_5_6_LUNA_MODEL_ID}-20260709`),
    ).toBe(true)
    expect(
      isObitobuffGpt56LunaModelId(`${OBITOBUFF_GPT_5_6_LUNA_MODEL_ID}-20260709`),
    ).toBe(true)
    expect(isObitobuffGpt56LunaModelId(OBITOBUFF_MIMO_V25_MODEL_ID)).toBe(false)

    const model = getObitobuffWebModel(OBITOBUFF_GPT_5_6_LUNA_MODEL_ID)
    expect(model.displayName).toBe('GPT-5.6 Luna')
    // OpenAI's API does not train on request data, so no warning and no
    // trace storage — and it accepts images.
    expect(model.dataUse).toBe('service')
    expect(model.warning).toBeUndefined()
    expect(isObitobuffTracedModelId(OBITOBUFF_GPT_5_6_LUNA_MODEL_ID)).toBe(false)
    expect(getObitobuffModelImageSupport(OBITOBUFF_GPT_5_6_LUNA_MODEL_ID)).toBe(
      true,
    )
    // Cheap per token, so it is not one of the muted "costly premium" rows.
    expect(
      isObitobuffWebDeemphasizedModelId(OBITOBUFF_GPT_5_6_LUNA_MODEL_ID),
    ).toBe(false)

    // Limited regions stay geo-gated to the two limited-tier models.
    expect(
      isObitobuffWebModelAllowedForLimitedTier(OBITOBUFF_GPT_5_6_LUNA_MODEL_ID),
    ).toBe(false)
    expect(
      isObitobuffModelAllowedForAccessTier(
        OBITOBUFF_GPT_5_6_LUNA_MODEL_ID,
        'limited',
      ),
    ).toBe(false)
  })

  test('GPT-5.6 Luna carries its pinned OpenAI route, price ceiling, and effort', () => {
    // These three constants are the contract web/src/llm-api/openrouter.ts
    // enforces on every Luna request.
    expect(OBITOBUFF_GPT_5_6_LUNA_PROVIDER_ROUTE).toBe('openai')
    expect(OBITOBUFF_GPT_5_6_LUNA_REASONING_EFFORT).toBe('high')

    // The ceiling is a cost fence, and both bounds are load-bearing. OpenRouter
    // compares strictly, so a ceiling AT OpenAI's $0.10/$0.60 list price 404s
    // every request ("No endpoints found that satisfy the max price") — that
    // shipped on 2026-07-30 and took Luna down until it was raised. It must
    // also stay well under the $1.00/$6.00 Azure/Bedrock charge, which is the
    // 10x route the fence exists to block.
    const { prompt, completion } = OBITOBUFF_GPT_5_6_LUNA_MAX_PRICE
    expect(prompt).toBeGreaterThan(0.1)
    expect(completion).toBeGreaterThan(0.6)
    expect(prompt).toBeLessThan(1.0)
    expect(completion).toBeLessThan(6.0)
  })

  test('limited access exposes DeepSeek V4 Flash and non-Pro MiMo 2.5', () => {
    expect(LIMITED_OBITOBUFF_MODEL_ID).toBe(OBITOBUFF_DEEPSEEK_V4_FLASH_MODEL_ID)
    expect(LIMITED_OBITOBUFF_MODEL_IDS).toEqual([
      OBITOBUFF_DEEPSEEK_V4_FLASH_MODEL_ID,
      OBITOBUFF_MIMO_V25_MODEL_ID,
    ])
    expect(getObitobuffModelsForAccessTier('limited').map((m) => m.id)).toEqual([
      OBITOBUFF_DEEPSEEK_V4_FLASH_MODEL_ID,
      OBITOBUFF_MIMO_V25_MODEL_ID,
    ])
    expect(
      isObitobuffModelAllowedForAccessTier(
        OBITOBUFF_DEEPSEEK_V4_FLASH_MODEL_ID,
        'limited',
      ),
    ).toBe(true)
    expect(
      isObitobuffModelAllowedForAccessTier(MINIMAX_M3_MODEL_ID, 'limited'),
    ).toBe(false)
    expect(
      isObitobuffModelAllowedForAccessTier(
        OBITOBUFF_MIMO_V25_MODEL_ID,
        'limited',
      ),
    ).toBe(true)
    expect(
      isObitobuffModelAllowedForAccessTier(
        OBITOBUFF_MIMO_V25_PRO_MODEL_ID,
        'limited',
      ),
    ).toBe(false)
    expect(
      resolveObitobuffModelForAccessTier(OBITOBUFF_MIMO_V25_MODEL_ID, 'limited'),
    ).toBe(OBITOBUFF_MIMO_V25_MODEL_ID)
    expect(
      resolveObitobuffModelForAccessTier(MINIMAX_M3_MODEL_ID, 'limited'),
    ).toBe(OBITOBUFF_DEEPSEEK_V4_FLASH_MODEL_ID)
  })

  test('recommends a joinable, in-tier model for the picker hero', () => {
    // Full access → DeepSeek V4 Flash (the recommended default since the
    // 0731 GA build). It is outside the premium pool, so unlike the old V4 Pro
    // default the hero no longer has to flip when that pool runs dry.
    expect(getRecommendedObitobuffModelId('full')).toBe(
      OBITOBUFF_DEEPSEEK_V4_FLASH_MODEL_ID,
    )
    expect(getRecommendedObitobuffModelId(undefined)).toBe(
      OBITOBUFF_DEEPSEEK_V4_FLASH_MODEL_ID,
    )
    expect(
      getRecommendedObitobuffModelId('full', { premiumExhausted: true }),
    ).toBe(OBITOBUFF_DEEPSEEK_V4_FLASH_MODEL_ID)
    expect(
      isObitobuffPremiumModelId(
        getRecommendedObitobuffModelId('full', { premiumExhausted: true }),
      ),
    ).toBe(false)
    // Limited access → DeepSeek V4 Flash, which is in the limited model set.
    expect(getRecommendedObitobuffModelId('limited')).toBe(
      OBITOBUFF_DEEPSEEK_V4_FLASH_MODEL_ID,
    )
    expect(
      getObitobuffModelsForAccessTier('limited').some(
        (m) => m.id === getRecommendedObitobuffModelId('limited'),
      ),
    ).toBe(true)
  })

  test('web/cloud recommend GPT-5.6 Luna, while CLI/Desktop stay on Flash', () => {
    // Since 2026-08-04 the browser surfaces steer to Luna: one long agentic
    // build is where model quality shows, and Luna does not carry the
    // AI-training notice. The CLI, with short and far more numerous turns,
    // stays on Flash — which is exactly why these are two constants.
    expect(DEFAULT_OBITOBUFF_WEB_MODEL_ID).toBe(OBITOBUFF_GPT_5_6_LUNA_MODEL_ID)
    expect(DEFAULT_OBITOBUFF_MODEL_ID).toBe(OBITOBUFF_DEEPSEEK_V4_FLASH_MODEL_ID)
    expect(getRecommendedObitobuffWebModelId('full')).toBe(
      OBITOBUFF_GPT_5_6_LUNA_MODEL_ID,
    )
    expect(getRecommendedObitobuffWebModelId(undefined)).toBe(
      OBITOBUFF_GPT_5_6_LUNA_MODEL_ID,
    )
    // Luna is premium, so the pool CAN run dry — the recommended pick has to
    // stay joinable, and limited tier can't name it at all.
    expect(getRecommendedObitobuffWebModelId('limited')).toBe(
      OBITOBUFF_DEEPSEEK_V4_FLASH_MODEL_ID,
    )
    expect(
      getRecommendedObitobuffWebModelId('full', { premiumExhausted: true }),
    ).toBe(OBITOBUFF_DEEPSEEK_V4_FLASH_MODEL_ID)
    expect(
      isObitobuffPremiumModelId(
        getRecommendedObitobuffWebModelId('full', { premiumExhausted: true }),
      ),
    ).toBe(false)
    // The web default must be a real, selectable web model.
    expect(isObitobuffWebModelId(DEFAULT_OBITOBUFF_WEB_MODEL_ID)).toBe(true)
    // …and one the limited tier is coerced OFF of, since it is premium.
    expect(
      isObitobuffWebModelAllowedForLimitedTier(DEFAULT_OBITOBUFF_WEB_MODEL_ID),
    ).toBe(false)
  })

  test('de-emphasizes the remaining costly premium model, and never the default', () => {
    expect(isObitobuffWebDeemphasizedModelId(MINIMAX_M3_MODEL_ID)).toBe(true)
    expect(
      isObitobuffWebDeemphasizedModelId(`${OBITOBUFF_KIMI_MODEL_ID}-20260301`),
    ).toBe(false)
    expect(
      isObitobuffWebDeemphasizedModelId(DEFAULT_OBITOBUFF_WEB_MODEL_ID),
    ).toBe(false)
    expect(
      isObitobuffWebDeemphasizedModelId(OBITOBUFF_DEEPSEEK_V4_FLASH_MODEL_ID),
    ).toBe(false)
    expect(isObitobuffWebDeemphasizedModelId(null)).toBe(false)
    // De-emphasis is presentation only: both models stay fully selectable.
    for (const id of OBITOBUFF_WEB_DEEMPHASIZED_MODEL_IDS) {
      expect(isObitobuffWebModelId(id)).toBe(true)
      expect(isObitobuffModelAllowedForAccessTier(id, 'full')).toBe(true)
    }
  })

  test('points users off DeepSeek V4 Pro to V4 Flash', () => {
    // V4-Flash-0731 overtook V4 Pro on 2026-07-31, so Pro carries a notice and
    // a switch target rather than being removed — it is still selectable.
    const all = OBITOBUFF_MODELS.map((model) => model.id)
    const superseded = getObitobuffModelSupersededBy(
      OBITOBUFF_DEEPSEEK_V4_PRO_MODEL_ID,
      all,
    )
    expect(superseded?.modelId).toBe(OBITOBUFF_DEEPSEEK_V4_FLASH_MODEL_ID)
    expect(superseded!.notice.length).toBeGreaterThan(0)
    expect(superseded!.actionLabel.length).toBeGreaterThan(0)
    // Pro remains a real, selectable model — this is a nudge, not a retirement.
    expect(all).toContain(OBITOBUFF_DEEPSEEK_V4_PRO_MODEL_ID)
    // The recommended default is never itself marked superseded.
    expect(
      getObitobuffModelSupersededBy(DEFAULT_OBITOBUFF_MODEL_ID, all),
    ).toBeUndefined()
  })

  test('marks the new Flash build as NEW and dates its name', () => {
    // The wire id is undated and auto-updates, so the display has to carry the
    // signal that this is a different model than the one users already judged.
    const flash = OBITOBUFF_MODELS.find(
      (model) => model.id === OBITOBUFF_DEEPSEEK_V4_FLASH_MODEL_ID,
    )!
    expect(flash.isNew).toBe(true)
    expect(flash.displayName).toContain('07/31')
    // Nothing else claims to be new, or the badge stops meaning anything.
    const catalog: readonly ObitobuffModelOption[] = OBITOBUFF_MODELS
    expect(catalog.filter((model) => model.isNew)).toHaveLength(1)
  })

  test('steers saved picks off every superseded model', () => {
    const all = OBITOBUFF_MODELS.map((model) => model.id)
    // Every model Flash overtook migrates to it...
    for (const superseded of [
      OBITOBUFF_DEEPSEEK_V4_PRO_MODEL_ID,
      MINIMAX_M3_MODEL_ID,
      OBITOBUFF_MIMO_V25_MODEL_ID,
    ]) {
      expect(migrateSupersededObitobuffModelPreference(superseded, all)).toBe(
        OBITOBUFF_DEEPSEEK_V4_FLASH_MODEL_ID,
      )
    }
    // ...and a current pick is left alone (null = keep it).
    expect(
      migrateSupersededObitobuffModelPreference(
        OBITOBUFF_DEEPSEEK_V4_FLASH_MODEL_ID,
        all,
      ),
    ).toBeNull()
    expect(migrateSupersededObitobuffModelPreference(undefined, all)).toBeNull()
    // Never migrates onto a model this surface cannot select.
    expect(
      migrateSupersededObitobuffModelPreference(
        OBITOBUFF_DEEPSEEK_V4_PRO_MODEL_ID,
        [OBITOBUFF_DEEPSEEK_V4_PRO_MODEL_ID],
      ),
    ).toBeNull()
  })

  test('never de-emphasizes a model we still recommend', () => {
    // Muting + sorting-last is how the Premium group steers to the
    // replacement, so anything muted must be superseded. NOT the converse:
    // MiMo 2.5 is superseded on quality but costs the same as Flash, and
    // de-emphasis is defined as a cost signal — muting it would make the list
    // say something untrue about its price.
    const all = OBITOBUFF_MODELS.map((model) => model.id)
    for (const model of OBITOBUFF_MODELS) {
      if (isObitobuffWebDeemphasizedModelId(model.id)) {
        expect(getObitobuffModelSupersededBy(model.id, all)).toBeDefined()
      }
    }
    // The recommended default is never muted or superseded.
    expect(isObitobuffWebDeemphasizedModelId(DEFAULT_OBITOBUFF_MODEL_ID)).toBe(
      false,
    )
    expect(
      getObitobuffModelSupersededBy(DEFAULT_OBITOBUFF_MODEL_ID, all),
    ).toBeUndefined()
  })

  test('never offers a switch to a model the surface cannot select', () => {
    // A picker that lacks the replacement must show no switch at all, rather
    // than a button that resolves to nothing.
    expect(
      getObitobuffModelSupersededBy(OBITOBUFF_DEEPSEEK_V4_PRO_MODEL_ID, [
        OBITOBUFF_DEEPSEEK_V4_PRO_MODEL_ID,
      ]),
    ).toBeUndefined()
    expect(getObitobuffModelSupersededBy(undefined, [])).toBeUndefined()
    expect(getObitobuffModelSupersededBy('vendor/unknown', [])).toBeUndefined()
  })

  test('full-access obitobuff models can spawn the gemini-thinker subagent', () => {
    // Full-access models (non-limited, non-fastest) get the thinker. Kimi is
    // gone from Obitobuff entirely, so it no longer qualifies.
    expect(canObitobuffModelSpawnGeminiThinker(OBITOBUFF_KIMI_MODEL_ID)).toBe(
      false,
    )
    expect(
      canObitobuffModelSpawnGeminiThinker(OBITOBUFF_DEEPSEEK_V4_PRO_MODEL_ID),
    ).toBe(true)
    // MiMo 2.5 Pro is gone from Obitobuff, so it no longer qualifies either.
    expect(
      canObitobuffModelSpawnGeminiThinker(OBITOBUFF_MIMO_V25_PRO_MODEL_ID),
    ).toBe(false)
    expect(canObitobuffModelSpawnGeminiThinker(MINIMAX_M3_MODEL_ID)).toBe(true)
    expect(
      canObitobuffModelSpawnGeminiThinker(OBITOBUFF_GPT_5_6_LUNA_MODEL_ID),
    ).toBe(true)

    // Limited-tier models (DeepSeek V4 Flash, MiMo 2.5) skip it.
    expect(
      canObitobuffModelSpawnGeminiThinker(OBITOBUFF_DEEPSEEK_V4_FLASH_MODEL_ID),
    ).toBe(false)
    expect(canObitobuffModelSpawnGeminiThinker(OBITOBUFF_MIMO_V25_MODEL_ID)).toBe(
      false,
    )
  })

  test('does not support GLM 5.1 for obitobuff sessions', () => {
    const glm = 'z-ai/glm-5.1'
    expect(OBITOBUFF_MODELS.map((model) => model.id)).not.toContain(glm)
    expect(SUPPORTED_OBITOBUFF_MODELS.map((model) => model.id)).not.toContain(
      glm,
    )
    expect(isObitobuffModelId(glm)).toBe(false)
    expect(isSupportedObitobuffModelId(glm)).toBe(false)
  })

  test('surfaces referral-gated GLM 5.2 only in the Web and Cloud picker', () => {
    expect(OBITOBUFF_WEB_MODELS.map((model) => model.id)).toContain(
      OBITOBUFF_GLM_V52_MODEL_ID,
    )
    expect(SUPPORTED_OBITOBUFF_MODELS.map((model) => model.id)).toContain(
      OBITOBUFF_GLM_V52_MODEL_ID,
    )
    expect(OBITOBUFF_MODELS.map((model) => model.id)).not.toContain(
      OBITOBUFF_GLM_V52_MODEL_ID,
    )
    expect(isObitobuffWebPremiumModelId(OBITOBUFF_GLM_V52_MODEL_ID)).toBe(false)
  })

  test('formats the close time in the user local timezone while deployment is open', () => {
    expect(
      getObitobuffDeploymentAvailabilityLabel(new Date('2026-01-05T18:00:00Z'), {
        locale: 'en-US',
        timeZone: 'America/Los_Angeles',
      }),
    ).toBe('until 5:00 PM')
  })

  test('formats the next open time in the user local timezone while deployment is closed', () => {
    expect(
      getObitobuffDeploymentAvailabilityLabel(new Date('2026-01-05T12:00:00Z'), {
        locale: 'en-US',
        timeZone: 'America/Los_Angeles',
      }),
    ).toBe('opens 6:00 AM')
  })

  test('includes the weekday when the next opening is on a later local day', () => {
    expect(
      getObitobuffDeploymentAvailabilityLabel(new Date('2026-01-11T03:00:00Z'), {
        locale: 'en-US',
        timeZone: 'America/Los_Angeles',
      }),
    ).toBe('opens Sun 6:00 AM')
  })

  test('tracks deployment hours correctly across the open and close boundaries', () => {
    expect(isObitobuffDeploymentHours(new Date('2026-01-05T13:59:00Z'))).toBe(
      false,
    )
    expect(isObitobuffDeploymentHours(new Date('2026-01-05T14:00:00Z'))).toBe(
      true,
    )
    expect(isObitobuffDeploymentHours(new Date('2026-01-06T00:59:00Z'))).toBe(
      true,
    )
    expect(isObitobuffDeploymentHours(new Date('2026-01-06T01:00:00Z'))).toBe(
      false,
    )
    expect(isObitobuffDeploymentHours(new Date('2026-01-10T20:00:00Z'))).toBe(
      true,
    )
  })
})

describe('limited-offer models (Claude Fable 5)', () => {
  test('is deliberately absent from every client picker catalog', () => {
    // The whole mechanism rests on this: no client may render Fable from its
    // own catalog, because only the server knows whether the wave still has
    // sessions. A client that has never been told about the offer must look
    // exactly like it does today.
    expect(OBITOBUFF_MODELS.map((m) => m.id)).not.toContain(
      OBITOBUFF_FABLE_5_MODEL_ID,
    )
    expect(isObitobuffModelId(OBITOBUFF_FABLE_5_MODEL_ID)).toBe(false)
    expect(OBITOBUFF_WEB_ALL_MODELS.map((m) => m.id)).not.toContain(
      OBITOBUFF_FABLE_5_MODEL_ID,
    )
    expect(
      getObitobuffModelsForAccessTier('full').map((m) => m.id),
    ).not.toContain(OBITOBUFF_FABLE_5_MODEL_ID)
  })

  test('is still a model the session and chat layers accept', () => {
    // Same shape as referral GLM: out of the picker catalog, in the supported
    // catalog, so admission, the chat gate and the display-name lookup all
    // resolve it.
    expect(isSupportedObitobuffModelId(OBITOBUFF_FABLE_5_MODEL_ID)).toBe(true)
    expect(
      isObitobuffSessionModelAllowedForAccessTier(
        OBITOBUFF_FABLE_5_MODEL_ID,
        'full',
      ),
    ).toBe(true)
    expect(getObitobuffModel(OBITOBUFF_FABLE_5_MODEL_ID).displayName).toBe(
      'Claude Fable 5',
    )
  })

  test('an explicit pick survives resolution instead of silently downgrading', () => {
    // resolveObitobuffModelForAccessTier runs on every explicit CLI pick. Before
    // the offer models were passed through, pressing Enter on the Fable row
    // would have started a DeepSeek session with no explanation.
    expect(
      resolveObitobuffModelForAccessTier(OBITOBUFF_FABLE_5_MODEL_ID, 'full'),
    ).toBe(OBITOBUFF_FABLE_5_MODEL_ID)
  })

  test('limited-region users cannot reach it', () => {
    expect(
      isObitobuffSessionModelAllowedForAccessTier(
        OBITOBUFF_FABLE_5_MODEL_ID,
        'limited',
      ),
    ).toBe(false)
    expect(
      resolveObitobuffSessionModelForAccessTier(
        OBITOBUFF_FABLE_5_MODEL_ID,
        'limited',
      ),
    ).toBe(LIMITED_OBITOBUFF_MODEL_ID)
  })

  test('traces are collected, which is the point of running the wave at all', () => {
    expect(isObitobuffTracedModelId(OBITOBUFF_FABLE_5_MODEL_ID)).toBe(true)
    const fable = SUPPORTED_OBITOBUFF_MODELS.find(
      (m) => m.id === OBITOBUFF_FABLE_5_MODEL_ID,
    )
    expect((fable as { warning?: string } | undefined)?.warning).toBe(
      'May use data for AI training',
    )
  })

  test('is metered by its own pool, never the shared daily premium one', () => {
    // It is marked `premium: true` for styling and to keep it out of the free
    // Standard pool, but joining OBITOBUFF_PREMIUM_MODEL_IDS would put trial
    // sessions on the quota M3 and DeepSeek Pro share.
    expect(isObitobuffPremiumModelId(OBITOBUFF_FABLE_5_MODEL_ID)).toBe(false)
    expect(isObitobuffWebPremiumModelId(OBITOBUFF_FABLE_5_MODEL_ID)).toBe(false)
    expect(OBITOBUFF_WEB_STANDARD_MODEL_IDS).not.toContain(
      OBITOBUFF_FABLE_5_MODEL_ID,
    )
    expect(isObitobuffLimitedOfferModelId(OBITOBUFF_FABLE_5_MODEL_ID)).toBe(true)
  })

  test('the offer predicate tolerates dated provider snapshots', () => {
    expect(
      isObitobuffLimitedOfferModelId(`${OBITOBUFF_FABLE_5_MODEL_ID}-20260815`),
    ).toBe(true)
    expect(
      isObitobuffLimitedOfferModelId(OBITOBUFF_DEEPSEEK_V4_FLASH_MODEL_ID),
    ).toBe(false)
    expect(isObitobuffLimitedOfferModelId(null)).toBe(false)
  })
})

describe('Meta Muse Spark 1.2 Contributor', () => {
  test('is a Obitobuff Web model and reachable from no other surface', () => {
    // Web-only is enforced by ABSENCE from the CLI/Desktop catalogs, which is
    // also what makes the session layer refuse it there
    // (isObitobuffSessionModelId reads SUPPORTED_OBITOBUFF_MODELS). The reason is
    // the queue, not the price: the browser can render a rate-limit wait with
    // an ETA and the CLI cannot, so on the CLI a 60-RPM team-wide ceiling would
    // just be unexplained 429s.
    expect(OBITOBUFF_WEB_MODELS.map((model) => model.id)).toContain(
      OBITOBUFF_MUSE_SPARK_12_CONTRIBUTOR_MODEL_ID,
    )
    expect(OBITOBUFF_MODELS.map((model) => model.id)).not.toContain(
      OBITOBUFF_MUSE_SPARK_12_CONTRIBUTOR_MODEL_ID,
    )
    expect(SUPPORTED_OBITOBUFF_MODELS.map((model) => model.id)).not.toContain(
      OBITOBUFF_MUSE_SPARK_12_CONTRIBUTOR_MODEL_ID,
    )
    // Absence from SUPPORTED_ is the Desktop gate, not just tidiness:
    // isModelForHarness('codebuff', …) validates against exactly this set, so a
    // Desktop client asking for Muse Spark is refused before session admission
    // ever sees it.
    expect(
      isSupportedObitobuffModelId(OBITOBUFF_MUSE_SPARK_12_CONTRIBUTOR_MODEL_ID),
    ).toBe(false)
    // Session admission DOES accept it — it must, or no Web session could run
    // on it. The shared gate is the union of the CLI and Web catalogs, so
    // "Web-only" is enforced by the catalogs above plus the free-mode agent
    // allowlist (only base2-free-muse-spark may run this model, and only the
    // Web bundle ships that root), never by this predicate.
    expect(
      isObitobuffSessionModelId(OBITOBUFF_MUSE_SPARK_12_CONTRIBUTOR_MODEL_ID),
    ).toBe(true)

    // Visible to every full-access Web user, not god-gated and not retired.
    expect(
      isObitobuffWebModelId(OBITOBUFF_MUSE_SPARK_12_CONTRIBUTOR_MODEL_ID),
    ).toBe(true)
    expect(
      isObitobuffWebGodOnlyModelId(OBITOBUFF_MUSE_SPARK_12_CONTRIBUTOR_MODEL_ID),
    ).toBe(false)
    expect(
      isObitobuffWebSelectableModelId(
        OBITOBUFF_MUSE_SPARK_12_CONTRIBUTOR_MODEL_ID,
      ),
    ).toBe(true)
  })

  test('is metered by the Web premium pool and no other', () => {
    // Premium here bounds how many users are inside the 60 RPM ceiling at once
    // — it is NOT a price signal, since Contributor is cheaper per token than
    // the standard-pool models. Being in some pool is mandatory:
    // OBITOBUFF_WEB_STANDARD_MODEL_IDS is derived by filtering `!premium`, so a
    // premium model missing from the premium list is metered by nothing.
    expect(
      isObitobuffWebPremiumModelId(OBITOBUFF_MUSE_SPARK_12_CONTRIBUTOR_MODEL_ID),
    ).toBe(true)
    expect(OBITOBUFF_WEB_STANDARD_MODEL_IDS).not.toContain(
      OBITOBUFF_MUSE_SPARK_12_CONTRIBUTOR_MODEL_ID,
    )
    expect(
      isObitobuffGlmV52ModelId(OBITOBUFF_MUSE_SPARK_12_CONTRIBUTOR_MODEL_ID),
    ).toBe(false)
    // The CLI's own premium pool must not learn about a model the CLI cannot
    // select.
    expect(
      isObitobuffPremiumModelId(OBITOBUFF_MUSE_SPARK_12_CONTRIBUTOR_MODEL_ID),
    ).toBe(false)
  })

  test('carries a reasoning effort that the server can actually resolve', () => {
    // Two halves, and the second is the one that used to silently fail.
    // getObitobuffModelReasoningEffort read SUPPORTED_OBITOBUFF_MODELS alone —
    // the CLI/Desktop catalog — which Muse Spark is deliberately absent from
    // (that absence IS the Desktop gate). So the field could be set on the row
    // and resolve to null anyway, with nothing to indicate why.
    const model = getObitobuffWebModel(
      OBITOBUFF_MUSE_SPARK_12_CONTRIBUTOR_MODEL_ID,
    )
    expect(model.reasoningEffort).toBe(OBITOBUFF_MUSE_SPARK_REASONING_EFFORT)
    expect(
      getObitobuffModelReasoningEffort(OBITOBUFF_MUSE_SPARK_12_CONTRIBUTOR_MODEL_ID),
    ).toBe(OBITOBUFF_MUSE_SPARK_REASONING_EFFORT)

    // Never 'none': Muse Spark answers that with a hard 400 (verified live),
    // and a 400 is neither retried nor queued, so it kills the turn outright.
    expect(OBITOBUFF_MUSE_SPARK_REASONING_EFFORT).not.toBe('none')
    // Meta's ladder, from its own 400 on an unknown value. `xhigh` and
    // `minimal` exist here and nowhere else in this repo, which is why the
    // shared agent-definition enum deliberately does not carry them.
    expect(['minimal', 'low', 'medium', 'high', 'xhigh']).toContain(
      OBITOBUFF_MUSE_SPARK_REASONING_EFFORT,
    )

    // Suffix-tolerant like every other id helper, so a dated provider snapshot
    // does not silently drop back to Meta's default effort.
    expect(
      getObitobuffModelReasoningEffort(
        `${OBITOBUFF_MUSE_SPARK_12_CONTRIBUTOR_MODEL_ID}-20260901`,
      ),
    ).toBe(OBITOBUFF_MUSE_SPARK_REASONING_EFFORT)

    // Widening the lookup to the Web catalog must not invent an effort for
    // models that declare none.
    expect(
      getObitobuffModelReasoningEffort(OBITOBUFF_KIMI_K3_ECO_MODEL_ID),
    ).toBeNull()
  })

  test('discloses the Contributor tier training terms', () => {
    // The discount IS the training grant, so the warning is the disclosure that
    // makes the row legitimate rather than decoration.
    const model = getObitobuffWebModel(
      OBITOBUFF_MUSE_SPARK_12_CONTRIBUTOR_MODEL_ID,
    )
    expect(model.displayName).toBe('Muse Spark 1.2')
    expect(model.dataUse).toBe('training')
    expect(model.warning).toBe('May use data for AI training')
  })

  test('has exactly one wire id, and the predicate tolerates dated snapshots', () => {
    // The queue, the premium pool and the free-mode agent allowlist all key off
    // this id. A second id reaching the same upstream is how `crof/glm-5.2`
    // handed out a metered model for free; do not add one.
    expect(OBITOBUFF_MUSE_SPARK_12_CONTRIBUTOR_MODEL_ID).toBe(
      'meta/muse-spark-1.2-contributor',
    )
    // Meta's own id is what the provider receives, never a wire id a caller
    // may send. Widened to string[] on purpose: the union type already proves
    // this at compile time, and the runtime check is what survives someone
    // later adding the bare id to a catalog.
    expect(
      OBITOBUFF_WEB_ALL_MODELS.map((model): string => model.id),
    ).not.toContain(MUSE_SPARK_12_CONTRIBUTOR_UPSTREAM_MODEL_ID)

    expect(
      isMuseSparkModelId(OBITOBUFF_MUSE_SPARK_12_CONTRIBUTOR_MODEL_ID),
    ).toBe(true)
    // A dated provider snapshot must not slip past the rate-limit queue.
    expect(
      isMuseSparkModelId(
        `${OBITOBUFF_MUSE_SPARK_12_CONTRIBUTOR_MODEL_ID}-20260901`,
      ),
    ).toBe(true)
    expect(isMuseSparkModelId('meta/muse-spark-1.2')).toBe(false)
    expect(isMuseSparkModelId(null)).toBe(false)
  })
})

describe('Muse Spark rate-limit fallback', () => {
  test('reroutes only to a model the caller is already entitled to', () => {
    // THE invariant. A fallback outside the shared daily premium pool would
    // turn "Muse Spark is busy" into a way to reach a model the user had not
    // earned — the same shape as the retired crof/glm-5.2 route, which handed
    // out a referral-earned model for nothing. Luna sits in the same pool, so
    // a rerouted request spends exactly the entitlement the original would.
    expect(isObitobuffWebPremiumModelId(MUSE_SPARK_FALLBACK_MODEL_ID)).toBe(true)
    expect(
      isObitobuffWebPremiumModelId(OBITOBUFF_MUSE_SPARK_12_CONTRIBUTOR_MODEL_ID),
    ).toBe(true)
    // Never the earned-GLM pool, and never the free standard pool.
    expect(isObitobuffGlmV52ModelId(MUSE_SPARK_FALLBACK_MODEL_ID)).toBe(false)
    expect(OBITOBUFF_WEB_STANDARD_MODEL_IDS).not.toContain(
      MUSE_SPARK_FALLBACK_MODEL_ID,
    )
    // And it must be a real, selectable Web model rather than a dangling id.
    expect(isObitobuffWebModelId(MUSE_SPARK_FALLBACK_MODEL_ID)).toBe(true)
    expect(MUSE_SPARK_FALLBACK_MODEL_ID).not.toBe(
      OBITOBUFF_MUSE_SPARK_12_CONTRIBUTOR_MODEL_ID,
    )
  })

  test('the picker promises exactly what the server does', () => {
    // The tooltip is a promise about behavior; drift between the two is how a
    // UI starts lying. Both read the same constant, and the threshold the copy
    // implies ("too long") is the one the server actually applies.
    const model = getObitobuffWebModel(
      OBITOBUFF_MUSE_SPARK_12_CONTRIBUTOR_MODEL_ID,
    )
    expect(model.tagline).toBe('Queue')
    expect(model.taglineTooltip).toBe(MUSE_SPARK_FALLBACK_NOTICE)
    expect(MUSE_SPARK_FALLBACK_NOTICE).toContain('GPT-5.6 Luna')
    // The row no longer advertises itself as new.
    expect(model.isNew).toBeUndefined()
    // A wait worth explaining, not one worth hiding — and the same number the
    // provider uses for its silent window, so the two cannot disagree about
    // what "too long" means.
    expect(MUSE_SPARK_FALLBACK_AFTER_MS).toBe(10_000)
  })
})
