import { Cache } from '@arkstack/cache'
import { abort } from '@arkstack/common'

/**
 * Counts failed attempts at something (a password, a code) under one key, and locks
 * the key once too many fail within the decay window. Counts live in the cache store.
 */
export class Throttle {
  constructor(
    readonly key: string,
    readonly maxAttempts: number,
    readonly decaySeconds: number,
  ) {}

  async attempts(): Promise<number> {
    return Number((await Cache.get(`throttle:${this.key}`)) ?? 0)
  }

  async tooManyAttempts(): Promise<boolean> {
    return (await this.attempts()) >= this.maxAttempts
  }

  /** Seconds until the window resets. */
  async availableIn(): Promise<number> {
    const resetAt = Number((await Cache.get(`throttle:${this.key}:reset`)) ?? 0)

    return Math.max(0, Math.ceil((resetAt - Date.now()) / 1000))
  }

  /** Count one failed attempt. The window starts at the first failure. */
  async hit(): Promise<number> {
    if (await Cache.add(`throttle:${this.key}:reset`, Date.now() + this.decaySeconds * 1000, this.decaySeconds)) {
      await Cache.put(`throttle:${this.key}`, 0, this.decaySeconds)
    }

    return Number(await Cache.increment(`throttle:${this.key}`))
  }

  async clear(): Promise<void> {
    await Cache.forget(`throttle:${this.key}`)
    await Cache.forget(`throttle:${this.key}:reset`)
  }

  /** Stop with a 429 while the key is locked. */
  async ensureAllowed(message: string): Promise<void> {
    if (!(await this.tooManyAttempts())) return

    const minutes = Math.max(1, Math.ceil((await this.availableIn()) / 60))

    abort(`${message} Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`, 429)
  }
}
