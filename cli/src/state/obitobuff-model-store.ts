import {
  getLocalDefaultModel,
  getLocalModelOptions,
  isLocalModelId,
} from '@codebuff/common/config/local-config'
import {
  DEFAULT_OBITOBUFF_MODEL_ID,
  resolveAvailableObitobuffModel,
  resolveSupportedObitobuffModel,
} from '@codebuff/common/constants/obitobuff-models'
import { create } from 'zustand'

import { IS_LOCAL_MODE } from '../utils/constants'
import { loadObitobuffModelPreference } from '../utils/settings'

/**
 * Pick the model the CLI should start on.
 *
 * In local mode (obitobuff.config.json with providers) the selection comes
 * from the config: the user's saved preference when it names a configured
 * model, otherwise the config's `defaultModel`, otherwise the first
 * configured model. Outside local mode the free catalog applies.
 */
function resolveInitialModel(): string {
  if (IS_LOCAL_MODE) {
    const preference = loadObitobuffModelPreference()
    if (preference && isLocalModelId(preference)) return preference
    const localDefault = getLocalDefaultModel()
    if (localDefault) return localDefault
    const options = getLocalModelOptions()
    if (options.length > 0) return options[0].id
    return DEFAULT_OBITOBUFF_MODEL_ID
  }
  return resolveAvailableObitobuffModel(
    loadObitobuffModelPreference() ?? DEFAULT_OBITOBUFF_MODEL_ID,
  )
}

/**
 * Holds the user's currently-selected obitobuff model. Initialized from the
 * persisted settings file so obitobuff defaults to whatever model the user
 * last picked.
 *
 * `setSelectedModel` is in-memory only — it does NOT persist. Persistence
 * happens exclusively in `startObitobuffSession` (the explicit-pick path), so
 * server-driven auto-flips (`model_locked`, `model_unavailable`, takeover)
 * can update the in-memory selection without overwriting the user's saved
 * preference. The latter previously caused users to get permanently flipped
 * to the fallback model after a single auto-fallback.
 *
 * Components on the landing screen read this to highlight the current row in
 * the model picker; the session hook reads it to decide which model to start.
 */
interface ObitobuffModelStore {
  selectedModel: string
  setSelectedModel: (model: string) => void
}

export const useObitobuffModelStore = create<ObitobuffModelStore>((set) => ({
  selectedModel: resolveInitialModel(),
  setSelectedModel: (model) =>
    set({
      selectedModel: IS_LOCAL_MODE
        ? model
        : resolveSupportedObitobuffModel(model),
    }),
}))

/** Imperative read for non-React callers (the session hook's tick loop and
 *  the chat-completions metadata builder). */
export function getSelectedObitobuffModel(): string {
  return useObitobuffModelStore.getState().selectedModel
}
