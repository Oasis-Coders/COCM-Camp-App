create table if not exists public.personal_calendar_events (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (ends_at > starts_at)
);

create index if not exists personal_calendar_events_owner_starts_idx
on public.personal_calendar_events (owner_profile_id, starts_at);

drop trigger if exists set_personal_calendar_events_updated_at on public.personal_calendar_events;

create trigger set_personal_calendar_events_updated_at
before update on public.personal_calendar_events
for each row execute function public.set_updated_at();

alter table public.personal_calendar_events enable row level security;

drop policy if exists "personal_calendar_events_owner_or_staff_read"
on public.personal_calendar_events;

create policy "personal_calendar_events_owner_or_staff_read"
on public.personal_calendar_events
for select
using (
  owner_profile_id = public.current_profile_id()
  or public.has_any_role(array['super_admin', 'admin', 'staff'])
);

drop policy if exists "personal_calendar_events_owner_create"
on public.personal_calendar_events;

create policy "personal_calendar_events_owner_create"
on public.personal_calendar_events
for insert
with check (owner_profile_id = public.current_profile_id());

drop policy if exists "personal_calendar_events_owner_update"
on public.personal_calendar_events;

create policy "personal_calendar_events_owner_update"
on public.personal_calendar_events
for update
using (owner_profile_id = public.current_profile_id())
with check (owner_profile_id = public.current_profile_id());

drop policy if exists "personal_calendar_events_owner_delete"
on public.personal_calendar_events;

create policy "personal_calendar_events_owner_delete"
on public.personal_calendar_events
for delete
using (owner_profile_id = public.current_profile_id());
