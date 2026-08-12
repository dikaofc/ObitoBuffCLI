import { OBITOBUFF_DEEPSEEK_V4_FLASH_MODEL_ID } from '@codebuff/common/constants/obitobuff-models'

import { createBase3CliRoot } from './base3'

const definition = {
  ...createBase3CliRoot({
    model: OBITOBUFF_DEEPSEEK_V4_FLASH_MODEL_ID,
    isObitobuff: true,
  }),
  id: 'base3-free-deepseek-flash',
  displayName: 'Buffy on DeepSeek Flash',
}

export default definition
