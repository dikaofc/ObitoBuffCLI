#!/usr/bin/env node

const fs = require('fs')
const os = require('os')
const path = require('path')

const packagedLauncherPath = path.join(__dirname, 'launcher.js')
const sourceLauncherPath = path.join(
  __dirname,
  '..',
  '..',
  '..',
  'cli',
  'release-core',
  'launcher.js',
)
// Published packages must not let an unrelated sibling path shadow their
// bundled launcher. Source checkouts only fall back when that copy is absent.
const { createLauncher } = require(
  fs.existsSync(packagedLauncherPath)
    ? packagedLauncherPath
    : sourceLauncherPath,
)

const launcher = createLauncher({
  packageName: 'obitobuff',
  displayName: 'Obitobuff',
  wrapperVersion: require('./package.json').version,
  telemetryEvent: 'cli.update_obitobuff_failed',
  // Obitobuff binaries are hosted on GitHub Releases, not the Codebuff app
  // API, so the launcher checks the repo for updates and downloads assets
  // from github.com. Override the repo with OBITOBUFF_UPDATE_REPO.
  releaseSource: 'github',
  githubRepo: 'dikaofc/ObitoBuffCLI',
  configDir: path.join(os.homedir(), '.config', 'obitobuff'),
})

module.exports = launcher

if (require.main === module) {
  launcher.main().catch((error) => {
    console.error('❌ Unexpected error:', error.message)
    process.exit(1)
  })
}
