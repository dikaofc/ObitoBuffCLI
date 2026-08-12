import { OBITOBUFF_MIMO_V25_MODEL_ID } from '@codebuff/common/constants/obitobuff-models'

import { publisher } from '../constants'
import type { SecretAgentDefinition } from '../types/secret-agent-definition'
import { createReviewer } from './code-reviewer'

const definition: SecretAgentDefinition = {
  id: 'code-reviewer-mimo',
  publisher,
  ...createReviewer(OBITOBUFF_MIMO_V25_MODEL_ID),
}

export default definition
