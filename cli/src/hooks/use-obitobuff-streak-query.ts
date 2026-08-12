import { useQuery } from '@tanstack/react-query'

import { getAuthToken } from '../utils/auth'
import { getApiClient, setApiClientAuthToken } from '../utils/codebuff-api'
import { logger as defaultLogger } from '../utils/logger'

import type { ObitobuffStreakResponse } from '@codebuff/common/types/obitobuff-streak'
import type { Logger } from '@codebuff/common/types/contracts/logger'

export const obitobuffStreakQueryKeys = {
  all: ['obitobuffStreak'] as const,
  current: () => [...obitobuffStreakQueryKeys.all, 'current'] as const,
}

export async function fetchObitobuffStreak(params: {
  authToken: string
  logger?: Logger
}): Promise<ObitobuffStreakResponse> {
  const { authToken, logger = defaultLogger } = params
  setApiClientAuthToken(authToken)
  const response = await getApiClient().get<ObitobuffStreakResponse>(
    '/api/v1/obitobuff/streak',
    { retry: false },
  )

  if (!response.ok) {
    logger.error(
      { status: response.status, error: response.error },
      'Failed to fetch obitobuff streak',
    )
    throw new Error(`Failed to fetch obitobuff streak (HTTP ${response.status})`)
  }

  if (!response.data) {
    throw new Error('Failed to fetch obitobuff streak: empty response')
  }

  return response.data
}

export function useObitobuffStreakQuery(
  params: {
    enabled?: boolean
    logger?: Logger
  } = {},
) {
  const { enabled = true, logger = defaultLogger } = params
  const authToken = getAuthToken()

  return useQuery({
    queryKey: obitobuffStreakQueryKeys.current(),
    queryFn: () => fetchObitobuffStreak({ authToken: authToken!, logger }),
    enabled: enabled && !!authToken,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    retry: false,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}
