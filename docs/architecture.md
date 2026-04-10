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

## Task management

- Tasks follow a defined lifecycle: **Draft → Open → In Progress → (Blocked) → Done / Cancelled**
- Status transitions are validated in the application layer (`lib/tasks/task-model.ts`) and enforced by database check constraints
- Completion tracking (`completed_at`, `completed_by`) is handled by a database trigger
- See [docs/task-workflow.md](task-workflow.md) for the full status model, assignment rules, and team workflow reference
