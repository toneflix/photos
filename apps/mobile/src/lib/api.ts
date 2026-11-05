import { createPhotosClient } from '@photos/api-client';
import ReactHook from 'alova/react';

/**
 * Shared API client for the app. Set EXPO_PUBLIC_API_URL in .env to point at
 * the API (apps/api). Token storage (e.g. expo-secure-store) is added with
 * sign-in in the mobile step.
 */
export const { api } = createPhotosClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api',
  statesHook: ReactHook,
  getToken: () => null,
});
