import { useChatStore } from '../state/chat-store'
import { IS_LOCAL_MODE, IS_OBITOBUFF } from '../utils/constants'
import { logger } from '../utils/logger'
import { getSystemMessage } from '../utils/message-history'
import { saveSettings, loadSettings } from '../utils/settings'

import type { ChatMessage } from '../types/chat'

export const handleAdsEnable = (): {
  postUserMessage: (messages: ChatMessage[]) => ChatMessage[]
} => {
  logger.info('[gravity] Enabling ads')

  saveSettings({ adsEnabled: true })

  return {
    postUserMessage: (messages) => [
      ...messages,
      getSystemMessage('Ads enabled. You will see contextual ads above the input and in the chat.'),
    ],
  }
}

export const handleAdsDisable = (): {
  postUserMessage: (messages: ChatMessage[]) => ChatMessage[]
} => {
  logger.info('[gravity] Disabling ads')
  saveSettings({ adsEnabled: false })

  return {
    postUserMessage: (messages) => [
      ...messages,
      getSystemMessage('Ads disabled.'),
    ],
  }
}

export const getAdsEnabled = (): boolean => {
  // Local-only Obitobuff never shows or fetches ads: there is no ad-funded
  // backend to support. IS_LOCAL_MODE is compile-time true in Obitobuff builds.
  if (IS_LOCAL_MODE) return false
  if (IS_OBITOBUFF) return true

  // Codebuff LITE is a paid mode now, so use the normal saved setting.
  const settings = loadSettings()
  return settings.adsEnabled ?? false
}
