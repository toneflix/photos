import { createPhotosClient } from '@photos/api-client'
import ReactHook from 'alova/react'
import { deviceAgent } from './device'
import { session } from './session'

/** Shared API client. Set EXPO_PUBLIC_API_URL in .env to point at the API (apps/api). */
export const { api } = createPhotosClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api',
  statesHook: ReactHook,
  getToken: session.getToken,
  onUnauthorized: () => void session.clear(),
  headers: { 'X-Device-Agent': deviceAgent },
})
