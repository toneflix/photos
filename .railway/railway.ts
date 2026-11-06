import { defineRailway, github, postgres, preserve, project, service, volume } from 'railway/iac'

/** Sets a variable only when Railway does not already hold a value for it. */
const fallback = (value: string) => ({ value, preserveExisting: true })

export default defineRailway(() => {
  const db = postgres('postgres')
  const storage = volume('api-storage')

  const api = service('api', {
    source: github('toneflix/photos', { branch: 'main' }),
    build: {
      builder: 'RAILPACK',
      watchPatterns: [
        '/apps/api/**',
        '/packages/**',
        '/package.json',
        '/pnpm-lock.yaml',
        '/pnpm-workspace.yaml',
        '/.npmrc',
        '/tsconfig.base.json',
        '/railpack.json',
      ],
    },
    deploy: {
      preDeployCommand: ['pnpm --filter @photos/api exec ark migrate --no-interaction'],
      healthcheckPath: '/api',
      healthcheckTimeout: 120,
      restartPolicyType: 'ON_FAILURE',
      restartPolicyMaxRetries: 10,
    },
    volumeMounts: {
      '/app/apps/api/storage': storage,
    },
    domains: [{ domain: 'api.photos.toneflix.net', port: 8080 }],
    env: {
      PORT: fallback('8080'),
      APP_NAME: fallback('Toneflix Photos'),
      APP_URL: fallback('https://api.photos.toneflix.net'),
      FRONTEND_URL: fallback('https://photos.toneflix.net'),
      DATABASE_URL: db.env.DATABASE_URL,
      TRUST_PROXY: fallback('2'),
      CACHE_STORE: fallback('memory'),
      QUEUE_CONNECTION: fallback('sync'),
      APP_KEY: preserve(),
      CORS_ALLOWED_ORIGINS: preserve(),
      MAIL_TRANSPORT: fallback('smtp'),
      MAIL_HOST: preserve(),
      MAIL_PORT: fallback('587'),
      MAIL_SECURE: fallback('false'),
      MAIL_USERNAME: preserve(),
      MAIL_PASSWORD: preserve(),
      MAIL_FROM_ADDRESS: preserve(),
      PHOTOS_DISK: preserve(),
      AWS_ACCESS_KEY_ID: preserve(),
      AWS_SECRET_ACCESS_KEY: preserve(),
      AWS_DEFAULT_REGION: preserve(),
      AWS_BUCKET: preserve(),
      AWS_URL: preserve(),
      AWS_ENDPOINT: preserve(),
    },
  })

  return project('toneflix-photos', {
    resources: [db, storage, api],
  })
})
