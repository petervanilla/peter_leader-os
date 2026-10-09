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

Post-migration verification passed: the migration is present in production history, the request table remains RLS-enabled, the private audio bucket remains non-public with a 25 MB limit and the expected MIME allowlist, and all four owner-only Storage policies are present.

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

### Canonical source verification

The 5,196,227-byte Recovery 64 source was reconstructed from the conversation artifact, split into 8 repository parts, fetched back from GitHub, concatenated in order, and compared against the source string. The comparison passed exactly.

Expected canonical SHA-256:

`8e16f50fdf1eebb31a35addd4b588a9421400d9d3712b83dfcb32bdeed690b9c`

`scripts/assemble-r64.mjs` verifies both byte length and SHA-256 before writing the assembled file to `dist/`.


### 6. Embedded modular source extracted

The canonical Recovery 64 HTML already carried its original module source map in `const MODULES`. Recovery 65 now extracts that source map into `src/canonical-r64/` without rewriting it.

- extracted modules: **36 / 36**
- extraction source: canonical Recovery 64 byte-verified artifact
- module manifest: `src/canonical-r64/module-manifest.json`
- parity command: `npm run verify:r64-modules`

This changes the migration problem from “rewrite a 5 MB HTML file” to “activate and modernize the original modular source while preserving canonical behavior.”


### 7. Modular production build path added

The repository now has a production build path that does not execute the embedded `const MODULES` blob-loader.

`npm run build`:
1. reconstructs and SHA-verifies canonical Recovery 64,
2. removes the inline module-map loader,
3. points the canonical shell at `/src/canonical-r64/app.js`,
4. validates every relative module import target,
5. copies the exact 36 extracted modules into `dist/src/canonical-r64/`,
6. writes the deployable canonical shell as `dist/index.html`.

`vercel.json` now uses this build and serves `dist/`. The repository root `index.html` remains a lightweight preview only; production Preview should use the build output.

## Still open after Recovery 65

P0 release work remains:

1. authenticated Login / Workspace E2E
2. People confirmation full E2E
3. activate the extracted modular frontend as the deployable canonical app/runtime, not only the lightweight preview
4. reload/persistence checks
5. error/loading/empty-state QA

Next milestone: Recovery 66 — Auth + People Full E2E.
