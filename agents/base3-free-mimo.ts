import { OBITOBUFF_MIMO_V25_MODEL_ID } from '@codebuff/common/constants/obitobuff-models'

import { createBase3CliRoot } from './base3'

const definition = {
  ...createBase3CliRoot({
    model: OBITOBUFF_MIMO_V25_MODEL_ID,
    isObitobuff: true,
  }),
  id: 'base3-free-mimo',
  displayName: 'Buffy on MiMo',
}

export default definition
