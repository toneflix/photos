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

Put an account on a plan without payment with `npx ark users:plan you@example.com premium` (`free` ends any paid time).

### Start dev server

```sh
npm run dev
```
