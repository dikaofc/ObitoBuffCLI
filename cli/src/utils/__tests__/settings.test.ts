import fs from 'fs'
import os from 'os'
import path from 'path'

import { afterEach, describe, expect, spyOn, test } from 'bun:test'
import {
  FALLBACK_OBITOBUFF_MODEL_ID,
  OBITOBUFF_DEEPSEEK_V4_FLASH_MODEL_ID,
  OBITOBUFF_DEEPSEEK_V4_PRO_MODEL_ID,
  OBITOBUFF_GLM_V52_MODEL_ID,
  OBITOBUFF_MIMO_V25_MODEL_ID,
} from '@codebuff/common/constants/obitobuff-models'

import * as auth from '../auth'
import {
  loadObitobuffModelPreference,
  saveObitobuffModelPreference,
} from '../settings'

let testConfigDir: string | undefined
let getConfigDirSpy: ReturnType<typeof spyOn> | undefined

afterEach(() => {
  getConfigDirSpy?.mockRestore()
  getConfigDirSpy = undefined
  if (testConfigDir) {
    fs.rmSync(testConfigDir, { recursive: true, force: true })
    testConfigDir = undefined
  }
})

describe('obitobuff model preference', () => {
  test('referral-only GLM does not replace the remembered picker model', () => {
    testConfigDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'obitobuff-settings-test-'),
    )
    getConfigDirSpy = spyOn(auth, 'getConfigDir').mockReturnValue(testConfigDir)

    saveObitobuffModelPreference(FALLBACK_OBITOBUFF_MODEL_ID)
    saveObitobuffModelPreference(OBITOBUFF_GLM_V52_MODEL_ID)

    expect(loadObitobuffModelPreference()).toBe(FALLBACK_OBITOBUFF_MODEL_ID)
  })

  test('steers a saved superseded pick to its replacement on every load', () => {
    testConfigDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'obitobuff-settings-test-'),
    )
    getConfigDirSpy = spyOn(auth, 'getConfigDir').mockReturnValue(testConfigDir)

    // A preference saved before Flash overtook Pro. Written directly so it has
    // no migration marker, exactly like a real pre-upgrade settings file.
    fs.writeFileSync(
      path.join(testConfigDir, 'settings.json'),
      JSON.stringify({ obitobuffModel: OBITOBUFF_DEEPSEEK_V4_PRO_MODEL_ID }),
    )
    expect(loadObitobuffModelPreference()).toBe(
      OBITOBUFF_DEEPSEEK_V4_FLASH_MODEL_ID,
    )

    // Re-picking Pro does NOT make it the standing default again: the next
    // session steers back to Flash. Selecting it still works for the session
    // the user is in — this only governs what a fresh launch opens on.
    saveObitobuffModelPreference(OBITOBUFF_DEEPSEEK_V4_PRO_MODEL_ID)
    expect(loadObitobuffModelPreference()).toBe(
      OBITOBUFF_DEEPSEEK_V4_FLASH_MODEL_ID,
    )

    // Same for the limited tier's other pick, MiMo 2.5.
    saveObitobuffModelPreference(OBITOBUFF_MIMO_V25_MODEL_ID)
    expect(loadObitobuffModelPreference()).toBe(
      OBITOBUFF_DEEPSEEK_V4_FLASH_MODEL_ID,
    )
  })
})
