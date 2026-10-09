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
    check (status = any (array['ACTIVE'::text,'SUBMITTED'::text,'APPLIED'::text,'REJECTED'::text,'REVOKED'::text,'EXPIRED'::text])),
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

revoke all on table leader_os.people_preference_confirmation_requests from anon;
revoke all on table leader_os.people_preference_confirmation_requests from authenticated;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'leader-os-people-audio',
  'leader-os-people-audio',
  false,
  26214400,
  array['audio/mpeg','audio/mp4','audio/x-m4a','audio/wav','audio/webm','audio/ogg']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects'
      and policyname='leader_os_people_audio_select_own'
  ) then
    create policy leader_os_people_audio_select_own
      on storage.objects for select to authenticated
      using (
        bucket_id='leader-os-people-audio'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects'
      and policyname='leader_os_people_audio_insert_own'
  ) then
    create policy leader_os_people_audio_insert_own
      on storage.objects for insert to authenticated
      with check (
        bucket_id='leader-os-people-audio'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects'
      and policyname='leader_os_people_audio_update_own'
  ) then
    create policy leader_os_people_audio_update_own
      on storage.objects for update to authenticated
      using (
        bucket_id='leader-os-people-audio'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
      with check (
        bucket_id='leader-os-people-audio'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects'
      and policyname='leader_os_people_audio_delete_own'
  ) then
    create policy leader_os_people_audio_delete_own
      on storage.objects for delete to authenticated
      using (
        bucket_id='leader-os-people-audio'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
end $$;
