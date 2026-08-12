import {
  getObitobuffBase3RootAgentIdForModel,
  getObitobuffRootAgentIdForModel,
} from '@codebuff/common/constants/free-agents'

import { getSelectedObitobuffModel } from '../state/obitobuff-model-store'
import {
  AGENT_MODE_TO_ID,
  CLI_HARNESS,
  IS_OBITOBUFF,
  type AgentMode,
} from './constants'

/**
 * Obitobuff is locked to LITE (chat-store's setAgentMode is a no-op when
 * IS_OBITOBUFF), so this is effectively "which root does the selected model
 * run". Both harnesses have a root per picker model; CLI_HARNESS picks the
 * family, and carries the measurement that says base2 for now.
 */
export function getAgentIdForMode(agentMode: AgentMode): string {
  if (IS_OBITOBUFF && agentMode === 'LITE') {
    const model = getSelectedObitobuffModel()
    return CLI_HARNESS === 'base3'
      ? getObitobuffBase3RootAgentIdForModel(model)
      : getObitobuffRootAgentIdForModel(model)
  }

  return AGENT_MODE_TO_ID[agentMode]
}
