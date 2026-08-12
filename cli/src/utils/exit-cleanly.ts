import { flushAnalytics } from './analytics'
import { IS_OBITOBUFF } from './constants'
import { stopEngagementTracking } from './engagement'
import { endObitobuffSessionBestEffort } from './obitobuff-session-api'
import { drainClientLogs } from './log-shipper'
import { withTimeout } from './terminal-color-detection'

const EXIT_CLEANUP_TIMEOUT_MS = 1_000

type ExitCliDependencies = {
  isObitobuff: boolean
  cleanupLocal: () => void
  stopEngagementTracking: () => void
  flushAnalytics: () => Promise<void>
  drainClientLogs: () => Promise<void>
  endObitobuffSession: () => Promise<void>
  waitForRemoteCleanup: (tasks: Promise<void>[]) => Promise<void>
  exit: (code: number) => void
}

let localExitCleanup: (() => void) | undefined

/** Register the synchronous renderer/terminal finalizer once it is available. */
export function registerExitCleanup(cleanup: () => void): void {
  localExitCleanup = cleanup
}

/**
 * Build an idempotent exit request. Exported for dependency-injected tests;
 * production uses the singleton below so competing exit triggers converge.
 */
export function createExitCliCleanly(deps: ExitCliDependencies) {
  let exitPromise: Promise<void> | undefined

  return (exitCode = 0): Promise<void> => {
    if (exitPromise) return exitPromise

    // Start on the next microtask so exitPromise is assigned before any cleanup
    // callback can re-enter this function.
    exitPromise = Promise.resolve().then(async () => {
      try {
        deps.cleanupLocal()
      } catch {
        // Cleanup is best-effort; never strand the process in a half-exited UI.
      }
      if (deps.isObitobuff) {
        try {
          deps.stopEngagementTracking()
        } catch {}
      }

      const remoteTasks = [
        Promise.resolve().then(deps.flushAnalytics),
        Promise.resolve().then(deps.drainClientLogs),
      ]
      if (deps.isObitobuff) {
        remoteTasks.push(Promise.resolve().then(deps.endObitobuffSession))
      }

      try {
        await deps.waitForRemoteCleanup(remoteTasks)
      } finally {
        deps.exit(exitCode)
      }
    })

    return exitPromise
  }
}

export const exitCliCleanly = createExitCliCleanly({
  isObitobuff: IS_OBITOBUFF,
  cleanupLocal: () => localExitCleanup?.(),
  stopEngagementTracking,
  flushAnalytics,
  drainClientLogs,
  endObitobuffSession: endObitobuffSessionBestEffort,
  waitForRemoteCleanup: async (tasks) => {
    await withTimeout(
      Promise.allSettled(tasks),
      EXIT_CLEANUP_TIMEOUT_MS,
      undefined,
    )
  },
  exit: (code) => process.exit(code),
})
