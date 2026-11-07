/**
 * Payments for plans. Keys stay in .env; regions and prices are set in the dashboard.
 */
export default () => {
  return {
    /**
     * Where payments start each reference. The payment relay routes webhooks to Photos by this prefix.
     */
    reference_prefix: String(env('PAYMENT_REFERENCE_PREFIX', 'tfp_')),

    /**
     * The secret the payment relay signs forwarded webhooks with. Once set, webhooks are accepted only from the relay.
     */
    relay_secret: String(env('PAYMENT_RELAY_SECRET', '')),

    /**
     * The name Photos is registered under on the payment relay, sent with each payment.
     */
    relay_app: String(env('PAYMENT_RELAY_APP', 'photos')),

    flutterwave: {
      public_key: String(env('FLUTTERWAVE_PUBLIC_KEY', '')),
      secret_key: String(env('FLUTTERWAVE_SECRET_KEY', '')),
      /**
       * The secret hash set under Webhooks in the Flutterwave dashboard. Flutterwave sends it back as `verif-hash`.
       */
      webhook_hash: String(env('FLUTTERWAVE_WEBHOOK_HASH', '')),
      api_url: String(env('FLUTTERWAVE_API_URL', 'https://api.flutterwave.com/v3')),
    },

    /**
     * Live exchange rates through @toneflix/money, for regions without a fixed rate.
     * `provider` is frankfurter or exchangerate-api (needs `key`). Rates are kept for `hours`.
     */
    exchange_rates: {
      provider: String(env('EXCHANGE_RATES_PROVIDER', 'frankfurter')),
      key: String(env('EXCHANGERATE_API_KEY', '')),
      hours: Number(env('EXCHANGE_RATE_HOURS', 6)),
    },
  }
}
