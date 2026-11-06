import { defineRailway, github, postgres, preserve, project, service, volume } from 'railway/iac'

export default defineRailway(() => {
  const db = postgres('postgres')
  const storage = volume('api-storage')

  const api = service('api', {
    source: github('toneflix/photos', { branch: 'main' }),
    build: {
      builder: 'DOCKERFILE',
      dockerfilePath: 'apps/api/Dockerfile',
      watchPatterns: [
        '/apps/api/**',
        '/packages/**',
        '/package.json',
        '/pnpm-lock.yaml',
        '/pnpm-workspace.yaml',
        '/.npmrc',
        '/tsconfig.base.json',
      ],
    },
    deploy: {
      preDeployCommand: ['pnpm exec ark migrate --no-interaction'],
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
      PORT: '8080',
      APP_NAME: 'Toneflix Photos',
      APP_URL: 'https://api.photos.toneflix.net',
      FRONTEND_URL: 'https://photos.toneflix.net',
      DATABASE_URL: db.env.DATABASE_URL,
      TRUST_PROXY: '2',
      CACHE_STORE: 'memory',
      QUEUE_CONNECTION: 'sync',
      APP_KEY: preserve(),
      CORS_ALLOWED_ORIGINS: preserve(),
      MAIL_TRANSPORT: preserve(),
      MAIL_HOST: preserve(),
      MAIL_PORT: preserve(),
      MAIL_SECURE: preserve(),
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
