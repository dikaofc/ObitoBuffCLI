#!/usr/bin/env bun
/**
 * Obitobuff Binary Smoke Test
 *
 * Verifies the compiled Obitobuff binary:
 * 1. Reports a valid version number
 * 2. Shows Obitobuff branding (not Codebuff) in --help output
 * 3. Excludes mode flags (--free, --max, --plan) from --help
 * 4. Renders the Obitobuff title screen (ASCII logo) in tmux
 *
 * Prerequisites:
 *   bun obitobuff/cli/build.ts <version>   # build the binary
 *   brew install tmux                     # for title-screen test
 *
 * Run:
 *   bun test obitobuff/cli/smoke-test.test.ts
 */

import { execFileSync, execSync, spawn, spawnSync } from 'child_process'
import { existsSync, rmSync, writeFileSync } from 'fs'
import os from 'os'
import path from 'path'

import { describe, test, expect, afterEach } from 'bun:test'

const REPO_ROOT = path.join(__dirname, '..', '..')
const BINARY_PATH = path.join(REPO_ROOT, 'cli', 'bin', 'obitobuff')
const TIMEOUT_MS = 20_000

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stripAnsiCodes(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '')
}

function isTmuxAvailable(): boolean {
  if (process.env.CI === 'true' || process.env.CI === '1') return false
  try {
    execSync(
      'which tmux && tmux new-session -d -s __obitobuff_tmux_check__ && tmux kill-session -t __obitobuff_tmux_check__',
      { stdio: 'pipe', timeout: 5000 },
    )
    return true
  } catch {
    return false
  }
}

function tmux(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('tmux', args, { stdio: 'pipe' })
    let stdout = ''
    let stderr = ''
    proc.stdout?.on('data', (d: Buffer) => {
      stdout += d.toString()
    })
    proc.stderr?.on('data', (d: Buffer) => {
      stderr += d.toString()
    })
    proc.on('close', (code) => {
      if (code === 0) resolve(stdout)
      else reject(new Error(`tmux failed (exit ${code}): ${stderr}`))
    })
  })
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function runBinary(args: string[]): string {
  return execFileSync(BINARY_PATH, args, {
    encoding: 'utf-8',
    timeout: 10_000,
    env: { ...process.env, NO_COLOR: '1' },
  })
}

function runBinaryResult(args: string[]) {
  return spawnSync(BINARY_PATH, args, {
    encoding: 'utf-8',
    timeout: 10_000,
    env: {
      ...process.env,
      OBITOBUFF_MODE: 'true',
      NO_COLOR: '1',
      NEXT_PUBLIC_CB_ENVIRONMENT: 'test',
      NEXT_PUBLIC_CODEBUFF_APP_URL: 'http://127.0.0.1:9',
      NEXT_PUBLIC_OBITOBUFF_APP_URL: 'http://127.0.0.1:9',
      NEXT_PUBLIC_SUPPORT_EMAIL: 'test@example.com',
      NEXT_PUBLIC_POSTHOG_API_KEY: 'test',
      NEXT_PUBLIC_POSTHOG_HOST_URL: 'http://127.0.0.1:9',
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'test',
      NEXT_PUBLIC_STRIPE_CUSTOMER_PORTAL: 'http://127.0.0.1:9',
      NEXT_PUBLIC_WEB_PORT: '3000',
    },
  })
}

const binaryExists = existsSync(BINARY_PATH)
const tmuxAvailable = isTmuxAvailable()

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe.skipIf(!binaryExists)('Obitobuff Binary Smoke Tests', () => {
  test(
    '--version outputs a valid semver version',
    () => {
      const output = stripAnsiCodes(runBinary(['--version'])).trim()
      // The binary may print env info before the version; grab the last line
      const lastLine =
        output
          .split('\n')
          .filter((l) => l.trim())
          .pop() ?? ''
      expect(lastLine.trim()).toMatch(/^\d+\.\d+\.\d+/)
    },
    TIMEOUT_MS,
  )

  test(
    '--help shows Obitobuff branding',
    () => {
      const output = stripAnsiCodes(runBinary(['--help']))

      // CLI name is "obitobuff"
      expect(output).toContain('Usage: obitobuff')
      // Description is Obitobuff-specific
      expect(output).toContain('Free AI coding assistant')
      // Must NOT contain the Codebuff CLI name in the usage line
      expect(output).not.toContain('Usage: codebuff')
    },
    TIMEOUT_MS,
  )

  test(
    '--help excludes mode flags (Obitobuff is free-only)',
    () => {
      const output = stripAnsiCodes(runBinary(['--help']))

      // Mode flags should not be present in Obitobuff
      expect(output).not.toMatch(/--free\b/)
      expect(output).not.toMatch(/--max\b/)
      expect(output).not.toMatch(/--plan\b/)
      expect(output).not.toMatch(/--lite\b/)
    },
    TIMEOUT_MS,
  )

  test(
    'login command explains local-only mode',
    () => {
      const result = runBinaryResult(['login'])
      const output = stripAnsiCodes(
        `${result.stdout ?? ''}${result.stderr ?? ''}`,
      )

      // Obitobuff is local-only: the login flow must never start (it would
      // hit a hosted API). The CLI explains this and exits cleanly.
      expect(result.status).toBe(0)
      expect(output).toContain('local-only')
      expect(output).toContain('obitobuff.config.json')
      expect(output).not.toContain('Generating login URL')
      expect(output).not.toContain('Obitobuff Login')
    },
    TIMEOUT_MS,
  )

  test(
    'refuses to start without a local config (no hosted fallback)',
    () => {
      const result = runBinaryResult([])
      const output = stripAnsiCodes(
        `${result.stdout ?? ''}${result.stderr ?? ''}`,
      )

      expect(result.status).toBe(1)
      expect(output).toContain('No local provider configured')
      expect(output).toContain('obitobuff.config.json')
      // Must not try any hosted login/session URL.
      expect(output).not.toContain('/api/auth')
      expect(output).not.toContain('Generating login URL')
    },
    TIMEOUT_MS,
  )

  // -------------------------------------------------------------------------
  // tmux local-only startup test
  // -------------------------------------------------------------------------

  describe.skipIf(!tmuxAvailable)('tmux local-only startup', () => {
    let sessionName = ''
    let configPath = ''

    afterEach(async () => {
      if (sessionName) {
        try {
          await tmux(['kill-session', '-t', sessionName])
        } catch {
          // session may have already exited
        }
        sessionName = ''
      }
      if (configPath) {
        try {
          rmSync(configPath, { force: true })
        } catch {
          // ignore
        }
        configPath = ''
      }
    })

    test(
      'starts straight into chat on the local config (no login/landing screen)',
      async () => {
        // The local-only binary refuses to start without a config; give it one
        // so the TUI boots and renders the chat surface directly.
        configPath = path.join(
          os.tmpdir(),
          `obitobuff-smoke-config-${Date.now()}.json`,
        )
        writeFileSync(
          configPath,
          JSON.stringify({
            defaultModel: 'test/local-model',
            providers: {
              local: {
                baseUrl: 'http://127.0.0.1:9/v1',
                apiKey: 'sk-test',
                models: [{ id: 'test/local-model', name: 'Local Model' }],
              },
            },
          }),
          'utf-8',
        )

        sessionName = `obitobuff-smoke-${Date.now()}`
        await tmux(['new-session', '-d', '-s', sessionName, '-x', '120', '-y', '35'])
        await tmux([
          'send-keys',
          '-t',
          sessionName,
          `OBITOBUFF_CONFIG=${configPath} ${BINARY_PATH}`,
          'Enter',
        ])

        // Poll until the chat input placeholder renders.
        let cleanOutput = ''
        for (let attempt = 0; attempt < 20; attempt++) {
          await sleep(500)
          cleanOutput = stripAnsiCodes(
            await tmux(['capture-pane', '-t', sessionName, '-p']),
          )
          if (cleanOutput.includes('Enter a coding task')) break
        }

        expect(cleanOutput).toContain('Enter a coding task')
        // Local-only: no hosted landing/login screens may appear.
        expect(cleanOutput).not.toContain('Start coding for free')
        expect(cleanOutput).not.toContain('Press ENTER to login')
        expect(cleanOutput).not.toContain('Generating login URL')
      },
      TIMEOUT_MS,
    )
  })
})

// Show skip messages so test output is informative
if (!binaryExists) {
  describe('Obitobuff Binary Required', () => {
    test.skip(
      'Build the binary first: bun obitobuff/cli/build.ts <version>',
      () => {},
    )
  })
}

if (binaryExists && !tmuxAvailable) {
  describe('tmux Required for Title Screen Test', () => {
    test.skip(
      'Install tmux: brew install tmux (macOS) or apt-get install tmux (Linux)',
      () => {},
    )
  })
}
