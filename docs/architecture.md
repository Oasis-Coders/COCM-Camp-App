# Architecture

## Current shape

- Root-level Next.js App Router application for the web client
- `supabase/` for local config, migrations, and seed data
- GitHub Actions for CI and database validation hooks
- Vercel-targeted deployment model with PR previews

## Auth strategy

- Real auth target is Supabase Auth
- Current scaffold includes Supabase browser/server helpers
- Local usability is preserved through demo-cookie auth so the app can be explored before external services are configured
- Middleware protects authenticated and admin routes now, with a clear path to swap in Supabase session validation

## Authorization strategy

- Roles live in the database via `roles` and `user_roles`
- RLS is enabled on all application tables
- Starter SQL functions `has_role` and `has_any_role` support policy composition
- App-level route restrictions complement, but do not replace, database authorization
