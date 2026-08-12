/**
 * Obitobuff local configuration (`obitobuff.config.json` / `config.json`).
 *
 * Lets the CLI run fully on your own OpenAI-compatible providers (Ollama,
 * OmniRoute, 9Route, OpenRouter, LM Studio, vLLM, ...) without any account or
 * backend. When a config with providers is found, the CLI switches to "local
 * mode": models are routed straight to the configured base URLs, login and
 * session gates are skipped, and ads are disabled.
 *
 * Example config:
 *
 * ```json
 * {
 *   "defaultModel": "oc/deepseek-v4-flash-free",
 *   "providers": {
 *     "ollama": {
 *       "baseUrl": "http://localhost:20128/v1",
 *       "api": "openai-completions",
 *       "apiKey": "sk-...",
 *       "models": [
 *         { "id": "oc/deepseek-v4-flash-free" }
 *       ]
 *     }
 *   }
 * }
 * ```
 *
 * Discovery order (first match wins):
 *   1. `OBITOBUFF_CONFIG` environment variable (path to a file)
 *   2. `./obitobuff.config.json` (current working directory)
 *   3. `./config.json` (current working directory)
 *   4. `~/.obitobuff/config.json`
 *   5. `~/.config/obitobuff/config.json`
 *
 * String values (`baseUrl`, `apiKey`, custom `headers`) support
 * `${ENV_VAR}` / `$ENV_VAR` interpolation so secrets can stay out of the file.
 */

import fs from 'fs'
import os from 'os'
import path from 'path'

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

/**
 * The kind of wire API a provider speaks. Obitobuff routes chat through
 * `/chat/completions` for the openai-compatible variants; `openai-completion`
 * uses the raw `/completions` endpoint instead.
 */
export const LOCAL_PROVIDER_API_TYPES = [
  // OpenAI Chat Completions (/chat/completions)
  'openai',
  'openai-completions',
  // OpenAI legacy Completions (/completions)
  'openai-completion',
  'completions',
  // Aliases that all map to openai-compatible chat completions
  'ollama',
  'openrouter',
] as const

export type LocalProviderApiType = (typeof LOCAL_PROVIDER_API_TYPES)[number]

const localModelSchema = z.object({
  /** Model id used for selection AND sent as `model` in API requests. */
  id: z.string().min(1),
  /** Optional human-friendly label shown in the CLI model picker. */
  name: z.string().optional(),
  /** Optional explicit id sent to the provider; defaults to `id`. */
  model: z.string().optional(),
  /** Optional context window hint (informational; not enforced). */
  contextWindow: z.number().int().positive().optional(),
  /** Optional max output tokens hint (informational; not enforced). */
  maxOutputTokens: z.number().int().positive().optional(),
  /** Whether the provider reliably supports structured outputs. */
  supportsStructuredOutputs: z.boolean().optional(),
})

const localProviderSchema = z.object({
  /** Base URL of the OpenAI-compatible API, e.g. "http://localhost:11434/v1". */
  baseUrl: z.string().min(1),
  /** Wire API flavor. Defaults to "openai-completions". */
  api: z.enum(LOCAL_PROVIDER_API_TYPES).optional().default('openai-completions'),
  /** Optional bearer token. Supports ${ENV_VAR} interpolation. */
  apiKey: z.string().optional(),
  /** Optional extra headers sent with every request. */
  headers: z.record(z.string(), z.string()).optional(),
  /** Optional: the provider supports structured outputs. */
  supportsStructuredOutputs: z.boolean().optional(),
  /** Models this provider serves. */
  models: z.array(localModelSchema).optional().default([]),
})

const localConfigSchema = z.object({
  /** Provider keyed by name, e.g. "ollama", "omniroute", "9route". */
  providers: z.record(z.string(), localProviderSchema).optional().default({}),
  /** Model id to select by default when in local mode. */
  defaultModel: z.string().optional(),
  /** Provider name to prefer when resolving the default model. */
  defaultProvider: z.string().optional(),
})

export type LocalModelConfig = z.infer<typeof localModelSchema>
export type LocalProviderConfig = z.infer<typeof localProviderSchema>
export type LocalConfig = z.infer<typeof localConfigSchema>

export interface LocalModelOption {
  /** Model id (also sent to the provider API unless `model` overrides it). */
  id: string
  /** Display name for the picker. */
  name: string
  /** Provider name this model belongs to. */
  provider: string
}

export interface ResolvedLocalModel {
  /** Provider name (config key). */
  providerName: string
  /** Raw provider settings. */
  provider: LocalProviderConfig
  /** Raw model settings. */
  model: LocalModelConfig
  /** The id sent to the provider API. */
  apiModelId: string
}

// ---------------------------------------------------------------------------
// Discovery & loading
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG_FILE_NAMES = ['obitobuff.config.json', 'config.json'] as const

function candidatePaths(): string[] {
  const candidates: string[] = []

  const explicit = process.env.OBITOBUFF_CONFIG
  if (explicit && explicit.trim()) {
    candidates.push(path.resolve(explicit.trim()))
  }

  const cwd = process.cwd()
  for (const name of DEFAULT_CONFIG_FILE_NAMES) {
    candidates.push(path.join(cwd, name))
  }

  const home = os.homedir()
  candidates.push(path.join(home, '.obitobuff', 'config.json'))
  candidates.push(path.join(home, '.config', 'obitobuff', 'config.json'))

  return candidates
}

/** Find the first existing config file, if any. */
export function getLocalConfigPath(): string | null {
  for (const candidate of candidatePaths()) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate
      }
    } catch {
      // Ignore unreadable paths and keep scanning.
    }
  }
  return null
}

/**
 * Interpolate `${VAR}` / `$VAR` references from the process environment.
 * Unknown variables resolve to an empty string.
 */
export function interpolateEnv(value: string): string {
  return value.replace(
    /\$\{([A-Za-z_][A-Za-z0-9_]*)\}|\$([A-Za-z_][A-Za-z0-9_]*)/g,
    (_match, braced: string | undefined, plain: string | undefined) => {
      const name = (braced ?? plain) ?? ''
      return process.env[name] ?? ''
    },
  )
}

function interpolateProvider(provider: LocalProviderConfig): LocalProviderConfig {
  const headers = provider.headers
    ? Object.fromEntries(
        Object.entries(provider.headers).map(([key, value]) => [
          key,
          interpolateEnv(value),
        ]),
      )
    : undefined

  return {
    ...provider,
    baseUrl: interpolateEnv(provider.baseUrl),
    ...(provider.apiKey ? { apiKey: interpolateEnv(provider.apiKey) } : {}),
    ...(headers ? { headers } : {}),
  }
}

let cachedConfigPath: string | null | undefined
let cachedConfig: LocalConfig | null | undefined

/**
 * Read, parse and validate the local config file. Returns null when absent.
 * Throws when the file exists but is malformed.
 */
export function loadLocalConfig(): LocalConfig | null {
  const configPath = getLocalConfigPath()
  if (!configPath) return null

  let raw: string
  try {
    raw = fs.readFileSync(configPath, 'utf8')
  } catch {
    return null
  }

  const parsed = JSON.parse(raw) as unknown
  const config = localConfigSchema.parse(parsed)

  // Interpolate env references per provider.
  const providers = Object.fromEntries(
    Object.entries(config.providers).map(([name, provider]) => [
      name,
      interpolateProvider(provider),
    ]),
  )

  return { ...config, providers }
}

/** Format a config parse failure into a readable message. */
function formatConfigError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ')
  }
  return error instanceof Error ? error.message : String(error)
}

/**
 * Read the local config, cached for the process lifetime. A malformed config
 * file never crashes the caller: it logs a warning and behaves as "no local
 * config", so the CLI falls back to free mode.
 * Invalidate with `clearLocalConfigCache()` (mainly for tests).
 */
export function getLocalConfig(): LocalConfig | null {
  if (cachedConfig !== undefined) return cachedConfig
  if (cachedConfigPath === undefined) {
    cachedConfigPath = getLocalConfigPath()
  }
  if (!cachedConfigPath) {
    cachedConfig = null
    return cachedConfig
  }

  try {
    cachedConfig = loadLocalConfig()
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(
      `[obitobuff] Ignoring invalid local config at ${cachedConfigPath}: ${formatConfigError(error)}`,
    )
    cachedConfig = null
  }
  return cachedConfig
}

export function clearLocalConfigCache(): void {
  cachedConfig = undefined
  cachedConfigPath = undefined
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * True when a local config with at least one provider serving at least one
 * model is present — i.e. the CLI should run in local mode.
 */
export function isLocalMode(): boolean {
  const config = getLocalConfig()
  if (!config) return false
  return Object.values(config.providers).some(
    (provider) => provider.models.length > 0,
  )
}

/** Resolve every model served by the config, in provider declaration order. */
export function getLocalModelOptions(): LocalModelOption[] {
  const config = getLocalConfig()
  if (!config) return []

  const options: LocalModelOption[] = []
  for (const [providerName, provider] of Object.entries(config.providers)) {
    for (const model of provider.models) {
      options.push({
        id: model.id,
        name: model.name ?? model.id,
        provider: providerName,
      })
    }
  }
  return options
}

/** The default model id in local mode: config defaultModel (preferring the
 *  defaultProvider when the same id is served by several providers), then the
 *  first configured model. */
export function getLocalDefaultModel(): string | undefined {
  const config = getLocalConfig()
  if (!config) return undefined

  const options = getLocalModelOptions()
  if (options.length === 0) return undefined

  if (config.defaultModel) {
    if (config.defaultProvider) {
      const inDefaultProvider = options.find(
        (option) =>
          option.id === config.defaultModel &&
          option.provider === config.defaultProvider,
      )
      if (inDefaultProvider) return inDefaultProvider.id
    }
    if (options.some((option) => option.id === config.defaultModel)) {
      return config.defaultModel
    }
  }

  return options[0].id
}

/** True when `modelId` is served by the local config. */
export function isLocalModelId(modelId: string): boolean {
  return getLocalModelOptions().some((option) => option.id === modelId)
}

/**
 * Resolve a model id to its configured provider, if any.
 * Returns undefined when the model is not served locally (callers then fall
 * back to the normal backend routing).
 */
export function resolveLocalModel(
  modelId: string,
): ResolvedLocalModel | undefined {
  const config = getLocalConfig()
  if (!config) return undefined

  for (const [providerName, provider] of Object.entries(config.providers)) {
    for (const model of provider.models) {
      if (model.id === modelId) {
        return {
          providerName,
          provider,
          model,
          apiModelId: model.model ?? model.id,
        }
      }
    }
  }
  return undefined
}
