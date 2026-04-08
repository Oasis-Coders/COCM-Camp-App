# Camp Management App

A collaborative web app for running camps and events with less manual coordination. The goal is to give staff, admins, and participants one place for sign-in, event registration, task tracking, and check-in, with room for future chat and realtime collaboration.

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
- Task management for operational work
- Check-in support during live events
- Future support for chat and realtime coordination

## Current phase

We are currently in the infrastructure and foundation phase.

That means the current priority is:

- Establish the main app structure
- Create the first version of the user flow and navigation
- Set up the database foundation and permissions model
- Make the project easy for multiple collaborators to work in
- Prepare the repo for testing, review, and deployment

This phase is successful when the team has a stable base to build on and new contributors can join without needing to reconstruct the project direction from scratch.

## Delivery roadmap

### Phase 0: Foundation

This phase focuses on putting the bones of the app in place:

- Basic app shell and navigation
- Sign-in flow foundation
- Core data structure for users, roles, events, tasks, and check-in
- Shared development workflow
- CI/CD and deployment readiness
- PWA-ready groundwork so the app can later feel installable

### Phase 1: Access and events

This phase focuses on the first meaningful product loop:

- Profiles and roles
- Event listings and detail views
- Registration basics
- Early admin event management
- Dashboard and event experience for signed-in users

### Phase 2: Tasks and check-in

This phase adds the operational tools the team will use during real events:

- Task workflows
- Check-in code generation
- Manual and guided check-in flows
- Staff and admin operational controls

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

We are building a camp and event operations app in phases. Right now the mission is to create a clean, collaborative foundation for authentication, permissions, events, tasks, and check-in so the team can confidently build the real product on top of it.
