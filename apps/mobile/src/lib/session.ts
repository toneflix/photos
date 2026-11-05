import { useSyncExternalStore } from 'react'
import { invalidateCache } from 'alova'
import { PhotosApiError } from '@photos/api-client'
import type { SignedIn, User } from '@photos/types'
import { secureStorage } from './secure-storage'

export type SessionState = { status: 'restoring'; user: null } | { status: 'ready'; user: User | null }

/**
 * The signed-in account on this device. The API token lives in secure storage,
 * with the user cached beside it so the app opens signed in while offline.
 */
export class AuthSession {
  private static readonly TOKEN_KEY = 'photos.token'
  private static readonly USER_KEY = 'photos.user'

  private token: string | null = null
  private state: SessionState = { status: 'restoring', user: null }
  private listeners = new Set<() => void>()

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)

    return () => {
      this.listeners.delete(listener)
    }
  }

  getState = () => this.state

  getToken = () => this.token

  /** Loads the saved token, then refreshes the user from the API. */
  async restore(fetchUser: () => Promise<User>) {
    const [token, cached] = await Promise.all([
      secureStorage.get(AuthSession.TOKEN_KEY),
      secureStorage.get(AuthSession.USER_KEY),
    ])

    this.token = token
    if (!token) return this.publish(null)

    try {
      await this.setUser(await fetchUser())
    } catch (error) {
      if (error instanceof PhotosApiError && error.code === 401) return this.clear()

      this.publish(cached ? (JSON.parse(cached) as User) : null)
    }
  }

  async signIn({ token, user }: Pick<SignedIn, 'token' | 'user'>) {
    this.token = token
    await secureStorage.set(AuthSession.TOKEN_KEY, token)
    await this.setUser(user)
  }

  async setUser(user: User) {
    await secureStorage.set(AuthSession.USER_KEY, JSON.stringify(user))
    this.publish(user)
  }

  /** Forgets the token and user on this device, and drops cached responses. */
  async clear() {
    this.token = null
    invalidateCache()
    await Promise.all([secureStorage.remove(AuthSession.TOKEN_KEY), secureStorage.remove(AuthSession.USER_KEY)])
    this.publish(null)
  }

  private publish(user: User | null) {
    this.state = { status: 'ready', user }
    this.listeners.forEach((listener) => listener())
  }
}

export const session = new AuthSession()

/** The current session state; re-renders when someone signs in or out. */
export function useSession() {
  return useSyncExternalStore(session.subscribe, session.getState)
}

/** The signed-in user. Only use it on screens behind the signed-in guard. */
export function useUser() {
  const { user } = useSession()
  if (!user) throw new Error('useUser() needs a signed-in user.')

  return user
}
