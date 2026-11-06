/**
 * Payments for plans. Keys stay in .env; regions and prices are set in the dashboard.
 */
export default () => {
  return {
    /**
     * Where payments start each reference, to tell them apart in the provider's dashboard.
     */
    reference_prefix: String(env('PAYMENT_REFERENCE_PREFIX', 'TPH-')),

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
     * `provider` is exchangerate-api (needs `key`) or frankfurter. Rates are kept for `hours`.
     */
    exchange_rates: {
      provider: String(env('EXCHANGE_RATES_PROVIDER', 'exchangerate-api')),
      key: String(env('EXCHANGERATE_API_KEY', '')),
      hours: Number(env('EXCHANGE_RATE_HOURS', 6)),
    },
  }
}
