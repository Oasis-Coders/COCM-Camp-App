alter table public.personal_calendar_event_invitees
add column if not exists invite_status text not null default 'pending'
  check (invite_status in ('pending', 'accepted', 'declined')),
add column if not exists responded_at timestamptz;

update public.personal_calendar_event_invitees
set invite_status = 'pending'
where invite_status is null;

create index if not exists personal_calendar_event_invitees_status_idx
on public.personal_calendar_event_invitees (invite_status);

drop policy if exists "personal_calendar_event_invitees_invitee_respond"
on public.personal_calendar_event_invitees;

create policy "personal_calendar_event_invitees_invitee_respond"
on public.personal_calendar_event_invitees
for update
using (invitee_profile_id = public.current_profile_id())
with check (invitee_profile_id = public.current_profile_id());

revoke update on public.personal_calendar_event_invitees from authenticated;
grant update (invite_status, responded_at) on public.personal_calendar_event_invitees to authenticated;
