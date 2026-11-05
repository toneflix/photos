import type { ConfigContext, ExpoConfig } from 'expo/config'

/**
 * Adds universal links (iOS) and app links (Android) for the web app's address, so the
 * reset-password and verify-email links in emails, and shared book links, open the app when EXPO_PUBLIC_WEB_URL is an https address.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const web = process.env.EXPO_PUBLIC_WEB_URL ? new URL(process.env.EXPO_PUBLIC_WEB_URL) : null

  if (web?.protocol !== 'https:') return config as ExpoConfig

  const host = web.host

  return {
    ...config,
    ios: { ...config.ios, associatedDomains: [`applinks:${host}`] },
    android: {
      ...config.android,
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: ['/reset-password', '/verify-email', '/books'].map((pathPrefix) => ({ scheme: 'https', host, pathPrefix })),
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
  } as ExpoConfig
}
