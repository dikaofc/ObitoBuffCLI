import { OBITOBUFF_GLM_V52_MODEL_ID } from '@codebuff/common/constants/obitobuff-models'

import { publisher } from '../constants'
import type { SecretAgentDefinition } from '../types/secret-agent-definition'
import { createReviewer } from './code-reviewer'

const definition: SecretAgentDefinition = {
  id: 'code-reviewer-glm',
  publisher,
  ...createReviewer(OBITOBUFF_GLM_V52_MODEL_ID),
}

export default definition
