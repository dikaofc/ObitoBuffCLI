/**
 * Pins the launcher's platform support matrix to the platforms Obitobuff
 * actually ships: Linux (x64/arm64), Windows (x64), and macOS (Intel/Apple
 * Silicon). Every supported platform must resolve to a downloadable release
 * asset, the AVX2 baseline fallbacks must still work, and platforms outside
 * the supported set (e.g. Android) must fail loudly instead of downloading a
 * binary that cannot run there.
 */
import { execFileSync } from 'child_process'
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs'
import { createServer } from 'http'
import type { AddressInfo } from 'net'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from 'bun:test'

// NOTE: Unlike sibling launcher tests this does not call ensureCliTestEnv():
// the launcher itself needs no Codebuff environment, and packages/internal is
// absent from this fork, so the env loader cannot run here. The release server
// env below (NEXT_PUBLIC_CODEBUFF_APP_URL / NO_PROXY) is all the launcher's
// HTTP client needs.
const launcherPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  '..',
  'cli',
  'release-core',
  'launcher.js',
)
const { createLauncher } = require(launcherPath)

const SUPPORTED_PLATFORMS = [
  { platform: 'linux', arch: 'x64', target: 'linux-x64' },
  { platform: 'linux', arch: 'arm64', target: 'linux-arm64' },
  { platform: 'win32', arch: 'x64', target: 'win32-x64' },
  { platform: 'darwin', arch: 'x64', target: 'darwin-x64' },
  { platform: 'darwin', arch: 'arm64', target: 'darwin-arm64' },
] as const

let tempConfigDir: string
let originalPlatform: PropertyDescriptor | undefined
let originalArch: PropertyDescriptor | undefined
let originalTargetOverride: string | undefined

/** URLs the release host was asked for, in order. */
const requestedUrls: string[] = []

let releaseTarball: Buffer
let releaseServer: ReturnType<typeof createServer>
let restoreReleaseEnv = () => {}

function makeLauncher(
  platform: NodeJS.Platform = 'linux',
  arch: string = 'x64',
) {
  Object.defineProperty(process, 'platform', {
    value: platform,
    configurable: true,
  })
  Object.defineProperty(process, 'arch', { value: arch, configurable: true })
  return createLauncher({ packageName: 'obitobuff', configDir: tempConfigDir })
    .__testing
}

/** A tar.gz holding both binary spellings, so one tarball serves every platform. */
function anyPlatformTarball() {
  const stageDir = mkdtempSync(join(tmpdir(), 'launcher-targets-'))
  writeFileSync(join(stageDir, 'obitobuff'), '#!/bin/sh\necho ok\n', {
    mode: 0o755,
  })
  writeFileSync(join(stageDir, 'obitobuff.exe'), '#!/bin/sh\necho ok\n', {
    mode: 0o755,
  })
  const archive = join(stageDir, 'out.tar.gz')
  execFileSync('tar', [
    '-czf',
    archive,
    '-C',
    stageDir,
    'obitobuff',
    'obitobuff.exe',
  ])
  return readFileSync(archive)
}

beforeAll(async () => {
  releaseTarball = anyPlatformTarball()
  releaseServer = createServer((request, response) => {
    requestedUrls.push(request.url ?? '')
    if (request.url?.endsWith('.tar.gz')) {
      response.writeHead(200)
      response.end(releaseTarball)
    } else {
      response.writeHead(404)
      response.end('missing')
    }
  })
  await new Promise<void>((resolve) =>
    releaseServer.listen(0, '127.0.0.1', resolve),
  )
  const { port } = releaseServer.address() as AddressInfo
  const original = {
    app: process.env.NEXT_PUBLIC_CODEBUFF_APP_URL,
    noProxy: process.env.NO_PROXY,
  }
  process.env.NEXT_PUBLIC_CODEBUFF_APP_URL = `http://127.0.0.1:${port}`
  process.env.NO_PROXY = '127.0.0.1'
  restoreReleaseEnv = () => {
    if (original.app === undefined) {
      delete process.env.NEXT_PUBLIC_CODEBUFF_APP_URL
    } else {
      process.env.NEXT_PUBLIC_CODEBUFF_APP_URL = original.app
    }
    if (original.noProxy === undefined) delete process.env.NO_PROXY
    else process.env.NO_PROXY = original.noProxy
  }
})

afterAll(async () => {
  restoreReleaseEnv()
  await new Promise<void>((resolve) => releaseServer.close(() => resolve()))
})

beforeEach(() => {
  tempConfigDir = mkdtempSync(join(tmpdir(), 'launcher-targets-'))
  originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform')
  originalArch = Object.getOwnPropertyDescriptor(process, 'arch')
  originalTargetOverride = process.env.OBITOBUFF_BINARY_TARGET
  delete process.env.OBITOBUFF_BINARY_TARGET
  requestedUrls.length = 0
})

afterEach(() => {
  if (originalTargetOverride === undefined) {
    delete process.env.OBITOBUFF_BINARY_TARGET
  } else {
    process.env.OBITOBUFF_BINARY_TARGET = originalTargetOverride
  }
  if (originalPlatform) {
    Object.defineProperty(process, 'platform', originalPlatform)
  }
  if (originalArch) Object.defineProperty(process, 'arch', originalArch)
  rmSync(tempConfigDir, { recursive: true, force: true })
})

describe('supported platform targets', () => {
  for (const { platform, arch, target } of SUPPORTED_PLATFORMS) {
    test(`${platform}-${arch} resolves to ${target}`, async () => {
      const t = makeLauncher(platform, arch)
      expect(t.getDefaultTargetKey()).toBe(target)
      expect(t.getDownloadTargetKey()).toBe(target)

      const staged = await t.stageBinary('1.2.3', target, { quiet: true })
      expect(staged.targetKey).toBe(target)
      // The release asset must exist under the canonical name.
      expect(requestedUrls.at(-1)).toEndWith(`obitobuff-${target}.tar.gz`)
      // And the extracted binary must actually be there to install.
      expect(existsSync(staged.tempBinaryPath)).toBe(true)
    })
  }
})

describe('baseline fallbacks on x64', () => {
  test('a linux machine without AVX2 resolves to linux-x64-baseline', async () => {
    const t = makeLauncher('linux', 'x64')
    t.recordMachineLacksAvx2()

    expect(t.getDefaultTargetKey()).toBe('linux-x64-baseline')
    expect(t.getDownloadTargetKey()).toBe('linux-x64-baseline')

    const staged = await t.stageBinary('1.2.3', 'linux-x64-baseline', {
      quiet: true,
    })
    expect(staged.targetKey).toBe('linux-x64-baseline')
    expect(requestedUrls.at(-1)).toEndWith(
      'obitobuff-linux-x64-baseline.tar.gz',
    )
  })

  test('a windows machine without AVX2 resolves to win32-x64-baseline', async () => {
    const t = makeLauncher('win32', 'x64')
    t.recordMachineLacksAvx2()

    expect(t.getDefaultTargetKey()).toBe('win32-x64-baseline')
    expect(t.getDownloadTargetKey()).toBe('win32-x64-baseline')

    const staged = await t.stageBinary('1.2.3', 'win32-x64-baseline', {
      quiet: true,
    })
    expect(staged.targetKey).toBe('win32-x64-baseline')
    expect(requestedUrls.at(-1)).toEndWith(
      'obitobuff-win32-x64-baseline.tar.gz',
    )
  })

  test('arm64 has no baseline build, so the optimized build is the only one', () => {
    const t = makeLauncher('linux', 'arm64')
    t.recordMachineLacksAvx2()
    expect(t.getDefaultTargetKey()).toBe('linux-arm64')
  })
})

describe('unsupported platforms', () => {
  test('android fails instead of downloading a binary that cannot run', async () => {
    const t = makeLauncher('android', 'arm64')
    expect(t.getDefaultTargetKey()).toBe('android-arm64')

    await expect(t.stageBinary('1.2.3', 'android-arm64', { quiet: true }))
      .rejects.toThrow('Unsupported platform: android arm64')
    // Nothing should have been downloaded.
    expect(requestedUrls).toHaveLength(0)
  })

  test('a 32-bit linux arch has no asset either', async () => {
    const t = makeLauncher('linux', 'ia32')
    await expect(t.stageBinary('1.2.3', 'linux-ia32', { quiet: true }))
      .rejects.toThrow('Unsupported platform: linux ia32')
  })
})
