import React from 'react'

import { useObitobuffSessionProgress } from '../hooks/use-obitobuff-session-progress'
import { useNow } from '../hooks/use-now'
import { useTheme } from '../hooks/use-theme'
import { formatObitobuffPremiumResetCountdown } from '../utils/obitobuff-premium-reset'
import { formatSessionUnits } from '../utils/format-session-units'

import type { ObitobuffSessionResponse } from '../types/obitobuff-session'

interface ObitobuffActiveSessionSummaryProps {
  session: ObitobuffSessionResponse | null
}

export const ObitobuffActiveSessionSummary: React.FC<
  ObitobuffActiveSessionSummaryProps
> = ({ session }) => {
  const theme = useTheme()
  const now = useNow(60_000, session?.status === 'active')
  const progress = useObitobuffSessionProgress(session)
  const quota = session?.status === 'active' ? session.rateLimit : undefined

  if (session?.status !== 'active' || !progress) {
    return null
  }

  if (!quota) {
    return null
  }

  const resetCountdown = formatObitobuffPremiumResetCountdown(
    new Date(quota.resetAt),
    now
  )
  const label =
    'accessTier' in session && session.accessTier === 'limited'
      ? 'sessions'
      : 'premium sessions'
  // recentCount already includes the active session's 1.0-unit reservation
  // (written as an admit row at promotion), so it reflects everything counted
  // against the quota — spent plus in-flight. Show it as the total used to match
  // the model selection menu and the other session-status screens.
  return (
    <box
      style={{
        paddingLeft: 1,
        paddingRight: 1,
        marginBottom: 1,
        flexShrink: 0,
      }}
    >
      <text style={{ wrapMode: 'word', fg: theme.muted }}>
        <span fg={theme.foreground}>
          {formatSessionUnits(quota.recentCount)} of {quota.limit}
        </span>
        <span fg={theme.muted}>
          {' '}
          {label} used · resets in {resetCountdown}
        </span>
      </text>
    </box>
  )
}
