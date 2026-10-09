-- Recovery 65 baseline reconstruction of the CURRENT People confirmation table.
-- Do not blindly re-apply to the existing production database.
-- This file exists so a fresh environment can reproduce the R64/R65 contract.

create schema if not exists leader_os;

create table if not exists leader_os.people_preference_confirmation_requests (
  request_id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  owner_user_id uuid not null,
  person_id text not null,
  token_hash text not null unique,
  safe_snapshot jsonb not null default '{}'::jsonb,
  proposal jsonb,
  comment text,
  status text not null default 'ACTIVE'
    check (status = any (array['ACTIVE','SUBMITTED','APPLIED','REJECTED','REVOKED','EXPIRED'])),
  expires_at timestamptz not null,
  created_at timestamptz not null default clock_timestamp(),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  updated_at timestamptz not null default clock_timestamp()
);

create index if not exists people_pref_confirm_owner_idx
  on leader_os.people_preference_confirmation_requests
  (workspace_id, owner_user_id, person_id, created_at desc);

create index if not exists people_pref_confirm_status_idx
  on leader_os.people_preference_confirmation_requests
  (status, expires_at);

alter table leader_os.people_preference_confirmation_requests enable row level security;

revoke all on table leader_os.people_preference_confirmation_requests from anon, authenticated;
