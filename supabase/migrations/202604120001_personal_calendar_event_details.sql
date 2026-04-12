alter table public.personal_calendar_events
add column if not exists location_type text not null default 'physical'
  check (location_type in ('physical', 'online')),
add column if not exists location text,
add column if not exists notes text;

create table if not exists public.personal_calendar_event_invitees (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.personal_calendar_events(id) on delete cascade,
  invitee_profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (event_id, invitee_profile_id)
);

create index if not exists personal_calendar_event_invitees_event_idx
on public.personal_calendar_event_invitees (event_id);

create index if not exists personal_calendar_event_invitees_profile_idx
on public.personal_calendar_event_invitees (invitee_profile_id);

alter table public.personal_calendar_event_invitees enable row level security;

create or replace function public.owns_personal_calendar_event(event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.personal_calendar_events events
    where events.id = event_id
      and events.owner_profile_id = public.current_profile_id()
  );
$$;

drop policy if exists "personal_calendar_events_owner_or_staff_read"
on public.personal_calendar_events;

create policy "personal_calendar_events_owner_or_staff_read"
on public.personal_calendar_events
for select
using (
  owner_profile_id = public.current_profile_id()
  or exists (
    select 1
    from public.personal_calendar_event_invitees invitees
    where invitees.event_id = personal_calendar_events.id
      and invitees.invitee_profile_id = public.current_profile_id()
  )
  or public.has_any_role(array['super_admin', 'admin', 'staff'])
);

drop policy if exists "personal_calendar_event_invitees_related_read"
on public.personal_calendar_event_invitees;

create policy "personal_calendar_event_invitees_related_read"
on public.personal_calendar_event_invitees
for select
using (
  invitee_profile_id = public.current_profile_id()
  or public.owns_personal_calendar_event(event_id)
  or public.has_any_role(array['super_admin', 'admin', 'staff'])
);

drop policy if exists "personal_calendar_event_invitees_owner_manage"
on public.personal_calendar_event_invitees;

create policy "personal_calendar_event_invitees_owner_manage"
on public.personal_calendar_event_invitees
for all
using (public.owns_personal_calendar_event(event_id))
with check (public.owns_personal_calendar_event(event_id));

grant select, insert, update, delete on public.personal_calendar_event_invitees to authenticated;
grant execute on function public.owns_personal_calendar_event(uuid) to authenticated;
