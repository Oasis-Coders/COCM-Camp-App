# Environment Strategy

## Supabase Projects

Use separate Supabase projects for production data and e2e test data.

- Production app runtime uses `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
- Playwright e2e tests use `E2E_SUPABASE_URL`, `E2E_SUPABASE_ANON_KEY`, and `E2E_SUPABASE_SERVICE_ROLE_KEY`.
- E2E tests intentionally ignore the production Supabase variables. If the `E2E_SUPABASE_*` values are absent, the browser tests skip instead of running against production.

## GitHub Actions Secrets

Configure these repository secrets for the normal app and production migration path:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_ID`

Configure these repository secrets for e2e test isolation:

- `E2E_SUPABASE_URL`
- `E2E_SUPABASE_ANON_KEY`
- `E2E_SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_TEST_PROJECT_ID`

## Migration Flow

The `Supabase DB` workflow validates migrations for pull requests. On `main`, it can push migrations to both hosted projects:

- `SUPABASE_TEST_PROJECT_ID` keeps the e2e test project schema aligned.
- `SUPABASE_PROJECT_ID` keeps the production project schema aligned.

Both hosted projects should receive the same migration files. Seed data can differ, but required reference rows such as roles should exist in both projects when a feature depends on them.

## Local E2E Setup

For local e2e runs, create `.env.e2e.local` with test-project credentials:

```env
E2E_SUPABASE_URL=
E2E_SUPABASE_ANON_KEY=
E2E_SUPABASE_SERVICE_ROLE_KEY=
```

Run the suite with:

```bash
pnpm test:e2e
```

During Playwright runs, `playwright.config.ts` maps the `E2E_SUPABASE_*` values into the app server's runtime Supabase variables. This makes the browser, Next.js server actions, and Supabase admin cleanup all point at the test project for e2e only.
