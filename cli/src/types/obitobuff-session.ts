export type { ObitobuffSessionServerResponse } from '@codebuff/common/types/obitobuff-session'

import type { ObitobuffSessionServerResponse } from '@codebuff/common/types/obitobuff-session'

/**
 * CLI session shape. Most states are wire-level `/api/v1/obitobuff/session`
 * responses; `takeover_prompt` is local-only so startup can ask before POSTing
 * and rotating another running CLI's instance id.
 */
export type ObitobuffSessionResponse =
  | ObitobuffSessionServerResponse
  | {
      status: 'takeover_prompt'
      model: string
    }

export type ObitobuffSessionStatus = ObitobuffSessionResponse['status']
