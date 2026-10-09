# Supabase Runtime Inventory

Project: `leader-os-runtime`  
Project ref: `lclibscjesyvsnxvdhoy`  
Region: `ap-northeast-2`

## Canonical functions snapshot
- `leader-os-runtime` — v27 — verify_jwt=true
- `leader-os-people-confirm` — v2 — verify_jwt=false intentionally; custom expiring-token auth

The repository copies under `supabase/functions/` are current production snapshots captured during Recovery 65. Before any future server modification, fetch deployed source again and compare first.

## Current leader_os base tables
- addon_runtime_binding_events
- addon_runtime_bindings
- core_records
- domain_events
- people_preference_confirmation_requests
- record_access_grants
- user_preferences
- work_report_delivery_queue
- work_report_events
- work_report_schedules
- work_reports
- workspace_members
- workspaces

## People confirmation table
`leader_os.people_preference_confirmation_requests`

Key properties:
- RLS enabled
- no direct anon/authenticated table policy
- direct application access goes through controlled server functions / Edge API
- token hash is UNIQUE
- status check: ACTIVE / SUBMITTED / APPLIED / REJECTED / REVOKED / EXPIRED
- owner index: workspace_id, owner_user_id, person_id, created_at desc
- status index: status, expires_at

## Private audio bucket
`leader-os-people-audio`
- public=false
- max file size: 25 MiB
- allowed MIME: audio/mpeg, audio/mp4, audio/x-m4a, audio/wav, audio/webm, audio/ogg
- authenticated own-folder policies exist for SELECT / INSERT / UPDATE / DELETE
