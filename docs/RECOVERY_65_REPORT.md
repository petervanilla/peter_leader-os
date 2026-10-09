# Leader OS — Recovery 65 Repository & Runtime Consolidation

Date: 2026-10-09

## Goal

Make `petervanilla/peter_leader-os` the durable product handoff repository before visual refinement in Claude.

Recovery 65 is a consolidation milestone. It does not replace the Recovery 64 product behavior contract.

## Work completed

### 1. Current production backend source captured

The production Supabase Edge Function sources were fetched before any backend change and are now mirrored in the repository:

- `leader-os-runtime` v27 / JWT ON
- `leader-os-people-confirm` v2 / JWT OFF intentionally

This prevents the repository from containing a guessed or stale runtime contract.

### 2. Previously untracked Recovery 64 database change captured

The production database already contained:

- `leader_os.people_preference_confirmation_requests`
- private bucket `leader-os-people-audio`
- authenticated-user-owned Storage policies

but the migration history stopped before that Recovery 64 change.

Recovery 65 added and applied an idempotent migration:

`leader_os_people_confirmation_and_audio_baseline`

The migration records the table, indexes, RLS state, direct privilege revocation, bucket configuration, and owner-only Storage policies.

### 3. Product Constitution added

The non-regression product rules are now explicit in `docs/PRODUCT_CONSTITUTION.md`.

### 4. Claude handoff boundary added

`docs/CLAUDE_HANDOFF.md` separates UI/UX work that Claude may freely improve from architecture/privacy/runtime contracts that require explicit review.

### 5. Environment contract added

`.env.example` distinguishes browser-safe variables from server-only secrets.

## Canonical artifact handling

The current canonical Recovery 64 HTML is approximately 5 MB, which exceeds the normal GitHub Contents API single-file path used by this connector.

Recovery 65 therefore stores the canonical artifact as numbered text parts plus an assembly script. The assembled output must reproduce the canonical HTML byte-for-byte before it is treated as a release artifact.

The root `index.html` remains a browser-ready preview, not the canonical runtime.

## Still open after Recovery 65

P0 release work remains:

1. authenticated Login / Workspace E2E
2. People confirmation full E2E
3. assembled canonical artifact hash verification
4. deployment of the canonical app/runtime, not only the lightweight preview
5. reload/persistence checks
6. error/loading/empty-state QA

Next milestone: Recovery 66 — Auth + People Full E2E.
