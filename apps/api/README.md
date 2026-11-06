# Arkstack Express.js

Express.js app scaffolded with Toneflix's Arkstack.

Full framework documentations are available from [https://arkstack.toneflix.net](https://arkstack.toneflix.net/).

- Runtime interaction guide: [guide/express-runtime](https://arkstack.toneflix.net/guide/express-runtime)
- Getting started guide: [guide/getting-started](https://arkstack.toneflix.net/guide/getting-started)

## Developing

### Install dependencies

```sh
npm install
```

### Run migrations

```sh
npx ark migrate dev
```

### Seed the plans

Creates the Free (default) and Premium plans. Plans that already exist are left alone.

```sh
npx ark seed PlanSeeder
```

Put an account on a plan without payment with `npx ark users:plan you@example.com premium` (`free` ends any paid time). Admins can do the same from a user's page in the dashboard.

### Payments

Plans are paid through Flutterwave's hosted checkout (`app/services/payments`). Set `FLUTTERWAVE_SECRET_KEY` to take payments locally; Flutterwave test keys work. Webhooks reach `POST /api/payments/flutterwave/webhook` and are checked against `FLUTTERWAVE_WEBHOOK_HASH`. Payment regions price plans in a country's own currency, at a fixed rate or the live rate from @toneflix/money plus a markup.

### Start dev server

```sh
npm run dev
```
