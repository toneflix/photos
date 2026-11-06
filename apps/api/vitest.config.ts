import { defineConfig } from 'vitest/config'

export default defineConfig({
  oxc: {
    decorator: {
      legacy: true,
      emitDecoratorMetadata: true,
    },
  },
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
    env: {
      NODE_ENV: 'test',
      VERBOSITY: '0',
      MAIL_TRANSPORT: 'file',
      FLUTTERWAVE_SECRET_KEY: 'FLWSECK_TEST-secret',
      FLUTTERWAVE_WEBHOOK_HASH: 'test-webhook-hash',
      FLUTTERWAVE_API_URL: 'https://flutterwave.test/v3',
      EXCHANGERATE_API_KEY: 'test-key',
    },
  },
})
