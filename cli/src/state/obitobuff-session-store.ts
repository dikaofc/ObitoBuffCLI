import { create } from 'zustand'

import { getSelectedObitobuffModel } from './obitobuff-model-store'
import { IS_LOCAL_MODE } from '../utils/constants'

import type { ObitobuffSessionResponse } from '../types/obitobuff-session'

/**
 * Synthesized session used in local mode (obitobuff.config.json with
 * providers): the app treats it like a permanently-active free session so the
 * session gate, banners and ads machinery stays inert. No server row exists.
 */
function createLocalModeSession(): ObitobuffSessionResponse {
  const now = Date.now()
  const remainingMs = 24 * 60 * 60 * 1000
  return {
    status: 'active',
    accessTier: 'full',
    instanceId: 'local',
    model: getSelectedObitobuffModel(),
    admittedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + remainingMs).toISOString(),
    remainingMs,
  }
}

export interface ObitobuffSessionRetry {
  /** One-based number of the request that will be made next. */
  attempt: number
  /** Absolute client timestamp when the poll loop will retry. */
  retryAtMs: number
}

interface ObitobuffSessionFailureBase {
  message: string
  retry: ObitobuffSessionRetry | null
  /** The server may have committed a mutating request before its result was lost. */
  outcomeUnknown: boolean
}

export type ObitobuffSessionFailure =
  | (ObitobuffSessionFailureBase & {
      type: 'http'
      statusCode: number
    })
  | (ObitobuffSessionFailureBase & {
      type: 'timeout' | 'other'
    })

/**
 * Shared state for the obitobuff free session.
 *
 * The hook in `use-obitobuff-session.ts` owns the poll loop and writes into
 * this store; React components subscribe via selectors, and non-React code
 * reads via `useObitobuffSessionStore.getState()`.
 *
 * Imperative session controls (force re-POST, mark superseded/ended) live on
 * the module exports of `use-obitobuff-session.ts` rather than on this store —
 * that way callers don't need to null-check a "driver" slot whose lifetime
 * is tied to the React tree.
 */
interface ObitobuffSessionStore {
  session: ObitobuffSessionResponse | null
  failure: ObitobuffSessionFailure | null

  setSession: (session: ObitobuffSessionResponse | null) => void
  setFailure: (failure: ObitobuffSessionFailure | null) => void
}

export const useObitobuffSessionStore = create<ObitobuffSessionStore>((set) => ({
  // Local mode starts "admitted" so the app renders Chat directly and never
  // shows the free-session landing screen.
  session: IS_LOCAL_MODE ? createLocalModeSession() : null,
  failure: null,
  setSession: (session) => set({ session }),
  setFailure: (failure) => set({ failure }),
}))
