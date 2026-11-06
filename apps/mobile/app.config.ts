import type { ConfigContext, ExpoConfig } from 'expo/config'

/**
 * Lets EAS_PROJECT_ID and EAS_OWNER override the EAS project in app.json, and adds universal links (iOS) and
 * app links (Android) for the web app's address, so the reset-password and verify-email links in
 * emails, and shared book links, open the app when EXPO_PUBLIC_WEB_URL is an https address.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const projectId = process.env.EAS_PROJECT_ID
  const owner = process.env.EAS_OWNER ?? config.owner
  const base = {
    ...config,
    owner,
    extra: projectId ? { ...config.extra, eas: { ...config.extra?.eas, projectId } } : config.extra,
  } as ExpoConfig
  const web = process.env.EXPO_PUBLIC_WEB_URL ? new URL(process.env.EXPO_PUBLIC_WEB_URL) : null

  if (web?.protocol !== 'https:') return base

  const host = web.host

  return {
    ...base,
    ios: { ...base.ios, associatedDomains: [`applinks:${host}`] },
    android: {
      ...base.android,
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: ['/reset-password', '/verify-email', '/books'].map((pathPrefix) => ({ scheme: 'https', host, pathPrefix })),
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
  }
}
