import fs from 'fs'
import os from 'os'
import path from 'path'

import { clearLocalConfigCache } from '@codebuff/common/config/local-config'
import { getModelForRequest } from '../model-provider'

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

const TMP_DIR = path.join(
  os.tmpdir(),
  `obitobuff-model-provider-test-${process.pid}`,
)

function writeConfig(data: unknown): void {
  fs.mkdirSync(TMP_DIR, { recursive: true })
  fs.writeFileSync(
    path.join(TMP_DIR, 'obitobuff.config.json'),
    JSON.stringify(data, null, 2),
  )
}

function withCwd<T>(dir: string, fn: () => T): T {
  const prev = process.cwd()
  process.chdir(dir)
  try {
    return fn()
  } finally {
    process.chdir(prev)
  }
}

beforeEach(() => {
  fs.rmSync(TMP_DIR, { recursive: true, force: true })
  fs.mkdirSync(TMP_DIR, { recursive: true })
  clearLocalConfigCache()
  delete process.env.OBITOBUFF_CONFIG
})

afterEach(() => {
  fs.rmSync(TMP_DIR, { recursive: true, force: true })
  clearLocalConfigCache()
})

describe('getModelForRequest with a local config', () => {
  test('routes a configured model to its provider', () => {
    writeConfig({
      providers: {
        ollama: {
          baseUrl: 'http://localhost:20128/v1',
          api: 'openai-completions',
          apiKey: 'sk-test',
          models: [{ id: 'oc/deepseek-v4-flash-free' }],
        },
      },
    })

    withCwd(TMP_DIR, () => {
      const model = getModelForRequest({
        apiKey: 'backend-key',
        model: 'oc/deepseek-v4-flash-free',
      }) as { provider: string; modelId: string }
      expect(model.provider).toBe('local-ollama')
      expect(model.modelId).toBe('oc/deepseek-v4-flash-free')
      // Must NOT be the codebuff backend provider.
      expect(model.provider).not.toBe('codebuff')
    })
  })

  test('unknown models in local mode route to the default provider, never the backend', () => {
    writeConfig({
      defaultModel: 'llama3',
      providers: {
        ollama: {
          baseUrl: 'http://localhost:20128/v1',
          apiKey: 'sk-test',
          models: [{ id: 'llama3' }],
        },
      },
    })

    withCwd(TMP_DIR, () => {
      const model = getModelForRequest({
        apiKey: 'backend-key',
        model: 'deepseek/deepseek-v4-flash',
      }) as { provider: string; modelId: string }
      // Local mode has no auth: an unlisted id is served by the default
      // provider under the requested id instead of hitting the backend.
      expect(model.provider).toBe('local-ollama')
      expect(model.modelId).toBe('deepseek/deepseek-v4-flash')
      expect(model.provider).not.toBe('codebuff')
    })
  })

  test('no config at all routes to the codebuff backend', () => {
    withCwd(TMP_DIR, () => {
      const model = getModelForRequest({
        apiKey: 'backend-key',
        model: 'deepseek/deepseek-v4-flash',
      }) as { provider: string; modelId: string }
      expect(model.provider).toBe('codebuff')
    })
  })
})
