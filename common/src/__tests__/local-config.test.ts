import fs from 'fs'
import os from 'os'
import path from 'path'

import {
  clearLocalConfigCache,
  getLocalConfig,
  getLocalDefaultModel,
  getLocalModelOptions,
  interpolateEnv,
  isLocalMode,
  isLocalModelId,
  loadLocalConfig,
  resolveLocalModel,
} from '../config/local-config'

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

const TMP_DIR = path.join(os.tmpdir(), `obitobuff-config-test-${process.pid}`)

const CONFIG_JSON = {
  defaultModel: 'oc/deepseek-v4-flash-free',
  providers: {
    ollama: {
      baseUrl: 'http://localhost:20128/v1',
      api: 'openai-completions',
      apiKey: 'sk-test-${OLLAMA_KEY}',
      models: [{ id: 'oc/deepseek-v4-flash-free' }, { id: 'llama3' }],
    },
    '9route': {
      baseUrl: 'https://api.9route.io/v1',
      api: 'openai-completions',
      models: [{ id: 'gpt-5', name: 'GPT-5 via 9Route' }],
    },
  },
}

function writeConfig(data: unknown, name = 'obitobuff.config.json'): string {
  const file = path.join(TMP_DIR, name)
  fs.mkdirSync(TMP_DIR, { recursive: true })
  fs.writeFileSync(file, JSON.stringify(data, null, 2))
  return file
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
  delete process.env.OLLAMA_KEY
})

describe('interpolateEnv', () => {
  test('replaces ${VAR} and $VAR references', () => {
    process.env.OLLAMA_KEY = 'secret'
    expect(interpolateEnv('sk-${OLLAMA_KEY}')).toBe('sk-secret')
    expect(interpolateEnv('$OLLAMA_KEY')).toBe('secret')
    expect(interpolateEnv('plain')).toBe('plain')
    expect(interpolateEnv('sk-${MISSING_VAR}')).toBe('sk-')
  })
})

describe('local config discovery and parsing', () => {
  test('discovers obitobuff.config.json in cwd and interpolates env vars', () => {
    writeConfig(CONFIG_JSON)
    process.env.OLLAMA_KEY = 'abc123'

    withCwd(TMP_DIR, () => {
      const config = loadLocalConfig()
      expect(config).not.toBeNull()
      expect(config!.providers.ollama.baseUrl).toBe('http://localhost:20128/v1')
      expect(config!.providers.ollama.apiKey).toBe('sk-test-abc123')
      expect(config!.providers.ollama.models).toHaveLength(2)
      expect(config!.providers['9route'].models[0]!.name).toBe(
        'GPT-5 via 9Route',
      )
    })
  })

  test('honors OBITOBUFF_CONFIG env var over cwd files', () => {
    const file = writeConfig(CONFIG_JSON, 'explicit.json')
    // A different config in cwd should lose to the explicit env path.
    writeConfig({ providers: {} }, 'obitobuff.config.json')
    process.env.OBITOBUFF_CONFIG = file

    withCwd(TMP_DIR, () => {
      const config = getLocalConfig()
      expect(config?.providers.ollama).toBeDefined()
      expect(config?.providers.ollama.models).toHaveLength(2)
    })
  })

  test('returns null when no config exists', () => {
    withCwd(TMP_DIR, () => {
      expect(loadLocalConfig()).toBeNull()
      expect(isLocalMode()).toBe(false)
    })
  })

  test('loadLocalConfig throws a descriptive error for invalid configs', () => {
    writeConfig({ providers: { bad: { baseUrl: 42 } } })
    withCwd(TMP_DIR, () => {
      expect(() => loadLocalConfig()).toThrow(/baseUrl/)
    })
  })

  test('getLocalConfig never throws and falls back to no-config', () => {
    writeConfig({ providers: { bad: { baseUrl: 42 } } })
    withCwd(TMP_DIR, () => {
      expect(getLocalConfig()).toBeNull()
      expect(isLocalMode()).toBe(false)
    })
  })

  test('empty providers are not local mode', () => {
    writeConfig({ providers: {} })
    withCwd(TMP_DIR, () => {
      expect(isLocalMode()).toBe(false)
    })
  })
})

describe('local mode helpers', () => {
  beforeEach(() => {
    writeConfig(CONFIG_JSON)
  })

  test('isLocalMode is true with configured models', () => {
    withCwd(TMP_DIR, () => {
      expect(isLocalMode()).toBe(true)
    })
  })

  test('getLocalModelOptions lists all models across providers', () => {
    withCwd(TMP_DIR, () => {
      const options = getLocalModelOptions()
      expect(options.map((o) => o.id)).toEqual([
        'oc/deepseek-v4-flash-free',
        'llama3',
        'gpt-5',
      ])
      expect(options[2]).toMatchObject({
        provider: '9route',
        name: 'GPT-5 via 9Route',
      })
    })
  })

  test('getLocalDefaultModel prefers defaultModel then first model', () => {
    withCwd(TMP_DIR, () => {
      expect(getLocalDefaultModel()).toBe('oc/deepseek-v4-flash-free')
    })
  })

  test('isLocalModelId checks membership', () => {
    withCwd(TMP_DIR, () => {
      expect(isLocalModelId('llama3')).toBe(true)
      expect(isLocalModelId('nope')).toBe(false)
    })
  })

  test('resolveLocalModel returns provider + api model id', () => {
    withCwd(TMP_DIR, () => {
      const resolved = resolveLocalModel('oc/deepseek-v4-flash-free')
      expect(resolved).toBeDefined()
      expect(resolved!.providerName).toBe('ollama')
      expect(resolved!.apiModelId).toBe('oc/deepseek-v4-flash-free')
      expect(resolveLocalModel('missing')).toBeUndefined()
    })
  })

  test('resolveLocalModel honors per-model apiModelId override', () => {
    writeConfig({
      providers: {
        p: {
          baseUrl: 'http://x/v1',
          models: [{ id: 'alias', model: 'real-model-name' }],
        },
      },
    })
    withCwd(TMP_DIR, () => {
      expect(resolveLocalModel('alias')?.apiModelId).toBe('real-model-name')
    })
  })
})
