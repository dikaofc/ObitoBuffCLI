import { existsSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const REPO_ROOT = resolve(__dirname, '../../..')

export function getObitobuffBinaryPath(): string {
  if (process.env.OBITOBUFF_BINARY) {
    return resolve(process.env.OBITOBUFF_BINARY)
  }
  return resolve(REPO_ROOT, 'cli/bin/obitobuff')
}

export function requireObitobuffBinary(): string {
  const binaryPath = getObitobuffBinaryPath()
  if (!existsSync(binaryPath)) {
    throw new Error(
      `Obitobuff binary not found at ${binaryPath}. ` +
        'Build with: bun obitobuff/cli/build.ts <version>',
    )
  }
  return binaryPath
}
