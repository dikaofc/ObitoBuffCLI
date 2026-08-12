import type { ObitobuffIpPrivacySignal } from '../types/obitobuff-session'

export const OBITOBUFF_HARD_BLOCKED_PRIVACY_SIGNALS = [
  'vpn',
  'proxy',
  'tor',
  'res_proxy',
] as const satisfies readonly ObitobuffIpPrivacySignal[]

type ObitobuffHardBlockedPrivacySignal =
  (typeof OBITOBUFF_HARD_BLOCKED_PRIVACY_SIGNALS)[number]

const OBITOBUFF_HARD_BLOCKED_PRIVACY_SIGNAL_SET =
  new Set<ObitobuffIpPrivacySignal>(OBITOBUFF_HARD_BLOCKED_PRIVACY_SIGNALS)

const OBITOBUFF_HARD_BLOCKED_PRIVACY_SIGNAL_LABELS: Record<
  ObitobuffHardBlockedPrivacySignal,
  string
> = {
  vpn: 'VPN',
  proxy: 'proxy',
  res_proxy: 'proxy',
  tor: 'Tor',
}

export function isObitobuffHardBlockedPrivacySignal(
  signal: ObitobuffIpPrivacySignal,
): signal is ObitobuffHardBlockedPrivacySignal {
  return OBITOBUFF_HARD_BLOCKED_PRIVACY_SIGNAL_SET.has(signal)
}

/**
 * ipinfo's `as.type` classifies the owning ASN as one of: ISP, Hosting,
 * Education, Government or Business (see ipinfo's "IPinfo Plus" sample DB).
 * Only `hosting` is a meaningful abuse signal — that's where VPN/proxy exits
 * and bot infrastructure live. The other classes are ordinary networks real
 * users sit behind, so we treat them as benign even when other heuristics
 * (e.g. ipinfo's `is_hosting` flag) would otherwise fire.
 */
const OBITOBUFF_BENIGN_AS_TYPES = new Set([
  'isp',
  'business',
  'education',
  'government',
])

export function isObitobuffBenignAsType(
  asType: string | null | undefined,
): boolean {
  return asType != null && OBITOBUFF_BENIGN_AS_TYPES.has(asType.toLowerCase())
}

export function isObitobuffHostingAsType(
  asType: string | null | undefined,
): boolean {
  return typeof asType === 'string' && asType.toLowerCase() === 'hosting'
}

export function formatObitobuffHardBlockedPrivacySignals(
  signals: readonly ObitobuffIpPrivacySignal[] | null | undefined,
): string {
  const labels = Array.from(
    new Set(
      (signals ?? []).flatMap((signal): string[] => {
        if (!isObitobuffHardBlockedPrivacySignal(signal)) return []
        return [OBITOBUFF_HARD_BLOCKED_PRIVACY_SIGNAL_LABELS[signal]]
      }),
    ),
  )

  if (labels.length === 0) return 'VPN, proxy, or Tor'
  if (labels.length === 1) return labels[0]
  return `${labels.slice(0, -1).join(', ')} or ${labels[labels.length - 1]}`
}

export function formatObitobuffHardBlockedMessage(
  signals: readonly ObitobuffIpPrivacySignal[] | null | undefined,
): string {
  return `Obitobuff cannot be used from ${formatObitobuffHardBlockedPrivacySignals(
    signals,
  )} traffic. Please disable it and try again.`
}
