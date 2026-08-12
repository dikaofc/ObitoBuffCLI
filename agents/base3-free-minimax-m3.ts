import { OBITOBUFF_MINIMAX_M3_MODEL_ID } from '@codebuff/common/constants/obitobuff-models'

import { createBase3CliRoot } from './base3'

const definition = {
  ...createBase3CliRoot({
    model: OBITOBUFF_MINIMAX_M3_MODEL_ID,
    isObitobuff: true,
  }),
  id: 'base3-free-minimax-m3',
  displayName: 'Buffy on MiniMax M3',
}

export default definition
