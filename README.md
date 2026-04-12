# Camp Management App

A collaborative web app for running camps and events with less manual coordination. The goal is to give staff, admins, and participants one place for sign-in, event registration, task tracking, calendar coordination, inventory, and check-in, with room for future chat and realtime collaboration.

## Live app

- Production URL: [https://cocm-camp-app.vercel.app](https://cocm-camp-app.vercel.app)
- Repository: [https://github.com/Oasis-Coders/COCM-Camp-App](https://github.com/Oasis-Coders/COCM-Camp-App)
- CI runs: [https://github.com/Oasis-Coders/COCM-Camp-App/actions](https://github.com/Oasis-Coders/COCM-Camp-App/actions)

## Why we are building this

Camp and event work usually gets spread across messages, spreadsheets, memory, and last-minute workarounds. This app is meant to reduce that friction by creating a single, reliable home for the core operational flow.

The early focus is not on polish or every edge case. The focus is to create a strong foundation that a small team can build on together without chaos.

## What the app is meant to do

The long-term product direction includes:

- Sign-in and account access
- Role-based access for admins, staff, and participants
- Event browsing and registration
- Personal and team calendar coordination
- Task management for operational work
- Inventory tracking and stock movement history
- Check-in support during live events
- Future support for chat and realtime coordination

## Current phase

We are in Phase 2 (Tasks and check-in). The core operations foundation is now in place: auth, roles, events, registrations, dashboard calendar, inventory, tasks, admin/dev tooling, and CI-backed automated tests. The next product milestone is check-in.

Completed so far:

- [x] Main app structure and role-aware navigation
- [x] Sign-in, sign-up, profile sync, and Supabase auth support
- [x] Database foundation with RLS and role-based permissions
- [x] Event browsing, registration, waitlist-aware capacity handling, and admin rosters
- [x] Dashboard weekly calendar with registrations, personal events, invitees, notes, and online or physical locations
- [x] Inventory tracking with stock movement history
- [x] Dev Tools user administration for account lookup, role changes, password resets, and test support
- [x] Task management: create, assign, reprioritize, transition, report on, and close tasks
- [x] Task notification event logging for future delivery channels
- [x] Unit and e2e testing with isolated test data
- [x] CI/CD and deployment to Vercel

Current priority:

- Check-in workflows: code generation, manual flows, and guided front-desk support
- Smoothing remaining staff/admin operational controls
- Keeping documentation aligned with the working product

## Delivery roadmap

### Phase 0: Foundation

This phase focused on putting the bones of the app in place:

- Basic app shell and navigation
- Sign-in flow foundation
- Core data structure for users, roles, events, tasks, and check-in
- Shared development workflow
- CI/CD and deployment readiness
- PWA-ready groundwork so the app can later feel installable

### Phase 1: Access and events

This phase focused on the first meaningful product loop:

- Profiles and roles
- Event listings and detail views
- Registration basics
- Early admin event management
- Dashboard and event experience for signed-in users

Implemented in this phase:

- `/events` - filterable event listing (All / Upcoming / Past) via `?filter=` query param
- `/events/[slug]` - event detail page with live registration count and status display
- `/events/[slug]/register` - dedicated multi-section registration form with capacity-aware status assignment and JSON payload storage
- `/dashboard` - personal dashboard with weekly calendar, registration events, editable personal events, invitees, notes, and online or physical locations
- `/admin/events/[id]/registrations` - staff/admin attendee roster grouped by registration status
- `lib/events/registration-utils.ts` - pure utility functions for capacity calculation, waitlist promotion, payload serialisation, and attendee grouping
- `tests/events.test.ts` - automated unit tests covering events logic

### Phase 2: Tasks and check-in

This phase adds the operational tools the team will use during real events:

- [x] Task workflows: full lifecycle (Draft -> Open -> In Progress -> Blocked -> Done / Cancelled)
- [x] Task CRUD: create, edit, delete with staff authorization
- [x] Task assignment: assign/reassign to any profile, with staff-only controls
- [x] Task reprioritization: low / medium / high / urgent
- [x] Status transitions: validated state machine with DB constraints and app-level guards
- [x] Admin & staff task management UI: list view with filters, detail view with inline editing
- [x] Task reporting view for operational summaries
- [x] Dashboard calendar: create/edit personal events with invitees, notes, and online or physical locations
- [x] Inventory operations: add, remove, and audit stock actions with e2e coverage
- [x] Account operations: sign-up, profile landing, and role-change e2e coverage
- [x] Dev Tools user directory: admin account lookup, role changes, password reset, and removal support
- [ ] Check-in code generation
- [ ] Manual and guided check-in flows
- [ ] Staff and admin operational controls for live check-in

### Phase 3: Chat foundation

This phase prepares the app for more live collaboration:

- Message and channel foundation
- Realtime direction behind a feature flag
- Early event-room communication model

## Out of scope for now

To keep the project healthy, we are deliberately not trying to build everything at once.

Deferred for later:

- Full chat experience
- Native mobile app
- Complex analytics
- Highly custom infrastructure
- Broad feature expansion before the core workflows feel solid

## Product principles

These are the standards we want to keep returning to as we make decisions:

- Keep the product simple enough for real camp staff to use under pressure
- Build for teamwork, not solo operator knowledge
- Prefer clarity and reliability over cleverness
- Use roles and permissions thoughtfully from the start
- Make it easy for future contributors to understand why the app works the way it does

## How to contribute

You do not need to take on the whole system to help meaningfully. Good contributions can come from many directions.

Useful contribution areas:

- Clarifying user flows and staff needs
- Stress-testing the plan against real event operations
- Reviewing naming, structure, and product language
- Helping shape admin, staff, and participant experiences
- Identifying missing scenarios before they become expensive
- Building or refining focused pieces of the app one step at a time

When contributing, it helps to anchor work to one of the current phases so the repo keeps moving forward as a team instead of scattering into unrelated experiments.

## Development and testing

Common local commands:

- `pnpm lint` - run ESLint and Prettier checks
- `pnpm typecheck` - run TypeScript checks
- `pnpm test` - run unit tests with Vitest
- `pnpm test:e2e` - run Playwright browser tests

E2E tests are intentionally isolated from production data. Local and CI browser tests use `E2E_SUPABASE_URL`, `E2E_SUPABASE_ANON_KEY`, and `E2E_SUPABASE_SERVICE_ROLE_KEY`; when those values are absent, Playwright skips the data-backed e2e suite rather than falling back to production Supabase credentials. See `docs/environment-strategy.md` for the current production/test environment setup.

Role and permission changes should prefer client state updates and inline feedback over redirect-based status messages, especially in Dev Tools flows where the saved selection needs to stay visually in sync with the persisted role.

## Team working style

We want the repo to feel collaborative, steady, and easy to join.

That means:

- Small, understandable contributions are preferred over giant rewrites
- Product direction should stay visible in the repo, not only in chat
- We should leave clear notes when decisions are intentionally deferred
- New teammates should be able to read this project and understand where it is going

## Success criteria

This project is on track when:

- The team shares a clear understanding of what we are building
- Contributors can tell what phase we are in and what matters now
- The app steadily grows from foundation to real workflows
- Operational users can eventually rely on it during real camp events

## Project snapshot

We are building a camp and event operations app in phases. The foundation (auth, permissions, events, registrations, dashboard calendar, inventory, tasks, admin/dev account tooling, CI, and isolated e2e testing) is complete enough to support real workflow hardening. The next milestone is check-in workflows.
