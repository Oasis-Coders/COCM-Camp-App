-- Add is_mandatory flag to event_registrations
-- Mandatory registrations are created by staff when they assign required attendees to an event.
-- They are always in 'registered' status and cannot be cancelled by the participant.
alter table public.event_registrations
  add column if not exists is_mandatory boolean not null default false;
