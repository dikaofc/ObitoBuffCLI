import { describe, expect, it } from 'bun:test'

import {
  assessObitobuffTrust,
  OBITOBUFF_TRUST_FALLBACK_LEVEL,
  OBITOBUFF_TRUST_LEVELS,
  OBITOBUFF_TRUST_EARNED,
  OBITOBUFF_TRUST_LIMITS,
  OBITOBUFF_TRUST_THRESHOLDS,
  obitobuffTrustLimits,
  isAtLeastTrustLevel,
  toObitobuffStandingInfo,
  type ObitobuffTrustSignals,
} from '../constants/obitobuff-trust'

const NOW = new Date('2026-08-11T00:00:00Z')
const DAY_MS = 24 * 60 * 60 * 1000

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * DAY_MS)
}

/** An account we know nothing about: every optional signal unknown. This is
 *  what most pre-provenance accounts actually look like. */
const UNKNOWN: ObitobuffTrustSignals = {
  accountCreatedAt: null,
  githubAccountCreatedAt: null,
  githubOldestRepoCreatedAt: null,
  githubPublicRepos: null,
  githubFollowers: null,
  githubTwoFactorEnabled: null,
  activeDays: 0,
  approvedBounties: 0,
  qualifiedReferrals: 0,
  hasPaid: false,
  signupPrivacySignals: null,
  signupIpSource: null,
  signupPrefixAccountCount: null,
  mailboxAccountCount: null,
  hasUnreversedBanEvent: false,
  currentRiskScore: null,
}

function signals(overrides: Partial<ObitobuffTrustSignals>) {
  return { ...UNKNOWN, ...overrides }
}

describe('level ordering', () => {
  it('orders least- to most-established', () => {
    expect(OBITOBUFF_TRUST_LEVELS).toEqual([
      'new',
      'verified',
      'established',
      'core',
    ])
  })

  it('compares by position, not alphabetically', () => {
    expect(isAtLeastTrustLevel('core', 'new')).toBe(true)
    expect(isAtLeastTrustLevel('new', 'verified')).toBe(false)
    expect(isAtLeastTrustLevel('established', 'established')).toBe(true)
  })
})

describe('limit matrix', () => {
  it('reproduces the pre-existing flat limits at established/full', () => {
    // This is the safety property of the whole rollout: the population that
    // already looked like ordinary heavy users must keep exactly what it had.
    const full = obitobuffTrustLimits('full', 'established')
    expect(full.messagesPerDay).toBe(5_000)
    expect(full.messagesPer5Hours).toBe(3_000)
    expect(full.dailySpendUsd).toBe(50)
    expect(full.premiumSessionsPerDay).toBe(6)

    const limited = obitobuffTrustLimits('limited', 'established')
    expect(limited.messagesPerDay).toBe(3_000)
    expect(limited.messagesPer5Hours).toBe(2_000)
  })

  it('is monotonic in level on every axis, in both regions', () => {
    for (const tier of ['full', 'limited'] as const) {
      for (let i = 1; i < OBITOBUFF_TRUST_LEVELS.length; i++) {
        const lower = OBITOBUFF_TRUST_LIMITS[tier][OBITOBUFF_TRUST_LEVELS[i - 1]]
        const higher = OBITOBUFF_TRUST_LIMITS[tier][OBITOBUFF_TRUST_LEVELS[i]]
        for (const key of Object.keys(lower) as (keyof typeof lower)[]) {
          expect(higher[key]).toBeGreaterThanOrEqual(lower[key])
        }
      }
    }
  })

  it('does not scale session-shape controls, only cost controls', () => {
    // Browser sessions and Desktop tabs were deliberately removed: an open
    // session costs nothing until it generates, and the generating is already
    // bounded. If either reappears here, something re-added a limit that takes
    // visible capability from new users and saves nothing.
    expect(Object.keys(OBITOBUFF_TRUST_LIMITS.full.new).sort()).toEqual([
      'dailySpendUsd',
      'messagesPer5Hours',
      'messagesPerDay',
      'premiumSessionsPerDay',
      'userMessagesPerDay',
    ])
  })

  it('never lets the limited tier reach a premium session', () => {
    // The model gate already refuses it; a non-zero number here would be a
    // promise the rest of the system cannot keep.
    for (const level of OBITOBUFF_TRUST_LEVELS) {
      expect(OBITOBUFF_TRUST_LIMITS.limited[level].premiumSessionsPerDay).toBe(0)
    }
  })

  it('lets a limited-region core member beat a full-region verified user', () => {
    // The promise the region split has to make to a real developer abroad.
    const limitedCore = obitobuffTrustLimits('limited', 'core')
    const fullVerified = obitobuffTrustLimits('full', 'verified')
    expect(limitedCore.messagesPerDay).toBeGreaterThan(
      fullVerified.messagesPerDay,
    )
    expect(limitedCore.userMessagesPerDay).toBeGreaterThan(
      fullVerified.userMessagesPerDay,
    )
    expect(limitedCore.dailySpendUsd).toBeGreaterThan(
      fullVerified.dailySpendUsd,
    )
  })

  it('keeps every new-account daily budget above the measured p90', () => {
    // Sizing anchor from free-mode-rate-limiter.ts: full-tier per-user-per-day
    // p90 is 837. A brand-new account doing genuinely heavy work must fit.
    expect(
      obitobuffTrustLimits('full', 'new').messagesPerDay,
    ).toBeGreaterThanOrEqual(837)
  })
})

describe('scoring', () => {
  it('leaves an unknown account at the floor', () => {
    const result = assessObitobuffTrust(UNKNOWN, NOW)
    expect(result.level).toBe('new')
    expect(result.score).toBe(0)
    expect(result.cappedBy).toBeNull()
  })

  it('treats null signals as unknown, never as suspicious', () => {
    // A pre-provenance account (null everything) must score the same as one
    // explicitly checked and found to share nothing.
    const unknownProvenance = assessObitobuffTrust(
      signals({ githubAccountCreatedAt: daysAgo(400) }),
      NOW,
    )
    const cleanProvenance = assessObitobuffTrust(
      signals({
        githubAccountCreatedAt: daysAgo(400),
        signupPrefixAccountCount: 1,
        mailboxAccountCount: 1,
      }),
      NOW,
    )
    expect(unknownProvenance.level).toBe(cleanProvenance.level)
    expect(unknownProvenance.cappedBy).toBeNull()
  })

  it('reaches established on GitHub age plus ordinary account history', () => {
    const result = assessObitobuffTrust(
      signals({
        accountCreatedAt: daysAgo(120),
        githubAccountCreatedAt: daysAgo(3 * 365 + 10),
        githubOldestRepoCreatedAt: daysAgo(400),
        githubPublicRepos: 12,
        activeDays: 40,
      }),
      NOW,
    )
    // 10 linked + 20 age + 10 repo + 5 repos + 15 acct age + 10 active
    expect(result.score).toBe(70)
    expect(result.level).toBe('established')
  })

  it('lets a brand-new limited-region account climb with earned signals alone', () => {
    // The route that does not require owning an aged GitHub account: this is
    // what the Earn page has to be able to promise.
    const result = assessObitobuffTrust(
      signals({
        accountCreatedAt: daysAgo(10),
        approvedBounties: 4,
        qualifiedReferrals: 5,
      }),
      NOW,
    )
    // 5 acct age + 20 bounties + 15 referrals
    expect(result.score).toBe(40)
    expect(result.level).toBe('verified')
  })

  it('caps bounty and referral contributions', () => {
    const capped = assessObitobuffTrust(
      signals({ approvedBounties: 50, qualifiedReferrals: 50 }),
      NOW,
    )
    expect(capped.score).toBe(
      OBITOBUFF_TRUST_EARNED.BOUNTY_POINTS * OBITOBUFF_TRUST_EARNED.BOUNTY_CAP +
        OBITOBUFF_TRUST_EARNED.REFERRAL_POINTS *
          OBITOBUFF_TRUST_EARNED.REFERRAL_CAP,
    )
  })

  it('lets contribution alone reach core, with no GitHub and no payment', () => {
    // THE property the earned caps exist for. Before they were raised this
    // route peaked at 70 against a threshold of 75, so `core` was reachable
    // only by owning an aged GitHub account or by paying — which is backwards
    // for a program meant to give developers in unsupported regions a way to
    // raise their own limits.
    const earned = assessObitobuffTrust(
      signals({
        accountCreatedAt: daysAgo(120),
        activeDays: 40,
        approvedBounties: OBITOBUFF_TRUST_EARNED.BOUNTY_CAP,
        qualifiedReferrals: OBITOBUFF_TRUST_EARNED.REFERRAL_CAP,
        signupPrivacySignals: [],
        signupIpSource: 'cloudflare',
      }),
      NOW,
    )
    expect(earned.factors.map((f) => f.id)).not.toContain('github_linked')
    expect(earned.score).toBeGreaterThanOrEqual(OBITOBUFF_TRUST_THRESHOLDS.core)
    expect(earned.level).toBe('core')
  })

  it('keeps paying past the point someone has proved they are real', () => {
    // A flat incentive is not an incentive. The tenth referral and the sixth
    // bounty must still be worth something, or the program stops pulling
    // exactly where it should pull hardest.
    const few = assessObitobuffTrust(
      signals({ approvedBounties: 4, qualifiedReferrals: 5 }),
      NOW,
    )
    const many = assessObitobuffTrust(
      signals({ approvedBounties: 6, qualifiedReferrals: 10 }),
      NOW,
    )
    expect(many.score).toBeGreaterThan(few.score)
  })

  it('never returns a score outside 0..100', () => {
    const maxed = assessObitobuffTrust(
      signals({
        accountCreatedAt: daysAgo(1000),
        githubAccountCreatedAt: daysAgo(4000),
        githubOldestRepoCreatedAt: daysAgo(3000),
        githubPublicRepos: 100,
        githubFollowers: 500,
        githubTwoFactorEnabled: true,
        activeDays: 300,
        approvedBounties: 20,
        qualifiedReferrals: 20,
        hasPaid: true,
        signupPrivacySignals: [],
        signupIpSource: 'cloudflare',
      }),
      NOW,
    )
    expect(maxed.score).toBe(100)
    expect(maxed.level).toBe('core')
  })

  it('ignores a future-dated timestamp rather than crediting it', () => {
    const skewed = assessObitobuffTrust(
      signals({
        githubAccountCreatedAt: new Date(NOW.getTime() + 10 * DAY_MS),
      }),
      NOW,
    )
    // Linked (10) but no age credit.
    expect(skewed.score).toBe(10)
  })
})

describe('caps', () => {
  const HIGH_SCORE: Partial<ObitobuffTrustSignals> = {
    accountCreatedAt: daysAgo(400),
    githubAccountCreatedAt: daysAgo(2000),
    githubOldestRepoCreatedAt: daysAgo(1000),
    githubPublicRepos: 20,
    githubFollowers: 50,
    githubTwoFactorEnabled: true,
    activeDays: 100,
    approvedBounties: 4,
  }

  it('caps a live anonymous network at verified however high the score', () => {
    const result = assessObitobuffTrust(
      signals({ ...HIGH_SCORE, currentRiskScore: 90 }),
      NOW,
    )
    expect(result.uncappedLevel).toBe('core')
    expect(result.level).toBe('verified')
    expect(result.cappedBy).toBe('anonymous_network')
  })

  it('does not cap on a low current risk score', () => {
    const result = assessObitobuffTrust(
      signals({ ...HIGH_SCORE, currentRiskScore: 10 }),
      NOW,
    )
    expect(result.level).toBe('core')
    expect(result.cappedBy).toBeNull()
  })

  it('caps a VPN signup at established, not lower', () => {
    const result = assessObitobuffTrust(
      signals({ ...HIGH_SCORE, signupPrivacySignals: ['vpn'] }),
      NOW,
    )
    expect(result.level).toBe('established')
    expect(result.cappedBy).toBe('signup_privacy_egress')
  })

  it('credits a clean signup rather than capping it', () => {
    const result = assessObitobuffTrust(
      signals({ ...HIGH_SCORE, signupPrivacySignals: [] }),
      NOW,
    )
    expect(result.cappedBy).toBeNull()
    expect(result.factors.some((f) => f.id === 'clean_signup')).toBe(true)
  })

  it('applies the lowest cap when several bind', () => {
    const result = assessObitobuffTrust(
      signals({
        ...HIGH_SCORE,
        signupPrivacySignals: ['vpn'],
        mailboxAccountCount: 5,
      }),
      NOW,
    )
    expect(result.level).toBe('verified')
    expect(result.cappedBy).toBe('shared_mailbox')
  })

  it('leads the next steps with the cap, since points cannot clear it', () => {
    const result = assessObitobuffTrust(
      signals({ ...HIGH_SCORE, currentRiskScore: 90 }),
      NOW,
    )
    expect(result.nextSteps[0]?.id).toBe('cap_anonymous_network')
    expect(result.nextSteps[0]?.label).toMatch(/VPN/i)
  })

  it('caps an account with unreversed enforcement history', () => {
    const result = assessObitobuffTrust(
      signals({ ...HIGH_SCORE, hasUnreversedBanEvent: true }),
      NOW,
    )
    expect(result.level).toBe('verified')
    expect(result.cappedBy).toBe('past_enforcement')
  })
})

describe('next steps', () => {
  it('leads with connecting GitHub for an account that has none', () => {
    const result = assessObitobuffTrust(UNKNOWN, NOW)
    expect(result.nextSteps[0]?.id).toBe('connect_github')
    expect(result.nextSteps[0]?.points).toBe(30)
  })

  it('stops offering steps the user has already exhausted', () => {
    const result = assessObitobuffTrust(
      signals({
        approvedBounties: OBITOBUFF_TRUST_EARNED.BOUNTY_CAP,
        qualifiedReferrals: OBITOBUFF_TRUST_EARNED.REFERRAL_CAP,
      }),
      NOW,
    )
    expect(result.nextSteps.map((s) => s.id)).not.toContain('bounties')
    expect(result.nextSteps.map((s) => s.id)).not.toContain('referrals')
  })

  it('offers the remaining value, not the full value, of a partial step', () => {
    const result = assessObitobuffTrust(signals({ approvedBounties: 2 }), NOW)
    const remaining =
      (OBITOBUFF_TRUST_EARNED.BOUNTY_CAP - 2) *
      OBITOBUFF_TRUST_EARNED.BOUNTY_POINTS
    expect(result.nextSteps.find((s) => s.id === 'bounties')?.points).toBe(
      remaining,
    )
  })
})

describe('wire shape', () => {
  it('carries resolved limits so a client never maps level to numbers itself', () => {
    const info = toObitobuffStandingInfo(
      assessObitobuffTrust(signals({ approvedBounties: 4 }), NOW),
      'limited',
    )
    expect(info.limits).toEqual(obitobuffTrustLimits('limited', info.level))
    expect(info.accessTier).toBe('limited')
  })

  it('reports the next threshold, and nothing beyond core', () => {
    const verified = toObitobuffStandingInfo(
      assessObitobuffTrust(
        signals({ approvedBounties: 4, activeDays: 10 }),
        NOW,
      ),
      'full',
    )
    expect(verified.level).toBe('verified')
    expect(verified.nextLevel).toBe('established')
    expect(verified.nextLevelAt).toBe(OBITOBUFF_TRUST_THRESHOLDS.established)

    const core = toObitobuffStandingInfo(
      assessObitobuffTrust(
        signals({
          accountCreatedAt: daysAgo(400),
          githubAccountCreatedAt: daysAgo(2000),
          githubOldestRepoCreatedAt: daysAgo(1000),
          githubPublicRepos: 20,
          githubFollowers: 50,
          githubTwoFactorEnabled: true,
          activeDays: 100,
          approvedBounties: 4,
        }),
        NOW,
      ),
      'full',
    )
    expect(core.level).toBe('core')
    expect(core.nextLevel).toBeNull()
    expect(core.nextLevelAt).toBeNull()
  })

  it('explains a cap in the copy the client renders', () => {
    const info = toObitobuffStandingInfo(
      assessObitobuffTrust(
        signals({
          accountCreatedAt: daysAgo(400),
          githubAccountCreatedAt: daysAgo(2000),
          activeDays: 100,
          currentRiskScore: 99,
        }),
        NOW,
      ),
      'full',
    )
    expect(info.cappedBy).toBe('anonymous_network')
    expect(info.cappedReason).toMatch(/VPN/i)
  })

  it('reports no cap when the cap sits at or above the earned level', () => {
    // An account scoring 'new' is not "capped at verified" — nothing bound.
    const info = toObitobuffStandingInfo(
      assessObitobuffTrust(signals({ currentRiskScore: 99 }), NOW),
      'full',
    )
    expect(info.level).toBe('new')
    expect(info.cappedBy).toBeNull()
  })
})

describe('failure behaviour', () => {
  it('falls back to the level that reproduces the old flat limits', () => {
    // A broken resolver must cost us the enforcement, never the users: if this
    // were 'new', one degraded query would throttle the whole product.
    expect(OBITOBUFF_TRUST_FALLBACK_LEVEL).toBe('established')
    expect(obitobuffTrustLimits('full', OBITOBUFF_TRUST_FALLBACK_LEVEL)).toEqual(
      obitobuffTrustLimits('full', 'established'),
    )
  })
})
