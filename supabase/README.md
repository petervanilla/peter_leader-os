# Supabase Runtime Snapshot

Project: `leader-os-runtime`  
Project ref: `lclibscjesyvsnxvdhoy`  
Region: `ap-northeast-2`

## Canonical Edge Functions

### leader-os-runtime
- current production version: v27
- JWT verification: ON
- repository snapshot path: `supabase/functions/leader-os-runtime/`

### leader-os-people-confirm
- current production version: v2
- JWT verification: OFF intentionally
- authentication: expiring capability token
- JSON API only
- repository snapshot path: `supabase/functions/leader-os-people-confirm/`

## People confirmation storage

Table:

`leader_os.people_preference_confirmation_requests`

Private audio bucket:

`leader-os-people-audio`

- public: false
- max file size: 25 MB
- allowed MIME: audio/mpeg, audio/mp4, audio/x-m4a, audio/wav, audio/webm, audio/ogg
- first path segment must match authenticated user id

## Migration discipline

Existing production migrations predate this repository snapshot. The tracked migration inventory must be treated as historical database state.

Recovery 65 adds an idempotent baseline migration for the People confirmation request table and private audio bucket/policies so this previously untracked Recovery 64 database change is now represented in migration history.

Do not make future production DDL changes outside a migration.
