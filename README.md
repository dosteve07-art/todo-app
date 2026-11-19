# Todo App

A Korean-language, single-user Todo app built with Next.js. Tasks are stored in a Turso/libSQL database.

## Set up the database

Create a Turso database. If `.env.local` does not exist in this project directory, copy `.env.example` to create it. If it already exists, keep it and verify that it contains the database URL and auth token. Never commit `.env.local`.

The app creates its task table on first use.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Check the app

Install the Playwright browser once:

```bash
npx playwright install chromium
```

Run the store and browser tests:

```bash
npm test
```

Tests use an isolated in-memory libSQL database rather than the configured Turso database.

Run linting and type-checking:

```bash
npm run lint
npm run typecheck
```
