import { useEffect, useSyncExternalStore } from 'react'
import { DEFAULT_LIMITS, type AppLimits } from '@photos/types'
import { api } from './api'
import { session } from './session'

/**
 * Upload sizes and sign-up status from `/limits`, following the signed-in account's plan.
 * Reloads when the account changes; the API still enforces its own limits.
 */
export class LimitsStore {
  private limits: AppLimits = DEFAULT_LIMITS
  private loading: Promise<AppLimits> | null = null
  private listeners = new Set<() => void>()

  constructor() {
    session.subscribe(() => {
      this.loading = null
    })
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)

    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = () => this.limits

  /** The current limits, fetched once per account. Falls back to the defaults when the API can't be reached. */
  load() {
    this.loading ??= api
      .limits()
      .send()
      .then(({ data }) => this.publish(data))
      .catch(() => this.limits)

    return this.loading
  }

  /** Fetch again, such as before an upload, so a plan change counts straight away. */
  refresh() {
    this.loading = null

    return this.load()
  }

  private publish(limits: AppLimits) {
    this.limits = limits
    this.listeners.forEach((listener) => listener())

    return limits
  }
}

export const appLimits = new LimitsStore()

/** Megabytes as bytes, for comparing with a picked file's size. */
export const megabytes = (mb: number) => mb * 1024 * 1024

export function useLimits(): AppLimits {
  const limits = useSyncExternalStore(appLimits.subscribe, appLimits.getSnapshot)

  useEffect(() => {
    appLimits.load()
  }, [])

  return limits
}
