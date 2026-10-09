# Leader OS — Implementation Guide / Handoff

## Canonical Recovery

Current canonical product state:

`Recovery 64 — Collaborative Working Persona`

## Core Product Contract

Do not create a third onboarding system.

Canonical progress models remain:

1. 12 Setup — operational onboarding
2. 30-Day Mission / Quest — practice and execution

Today should surface the next mission rather than becoming another parallel workflow.

## Header Contract

Exactly three visible top controls:

1. 로그인 / Workspace
2. SHOWCASE DEMO
3. 전체 검색

Do not reintroduce duplicate login surfaces.

## Auth Surface

SSOT:

`Header 로그인 / Workspace → canonical account/workspace dialog`

Screens may show auth status, but should not own separate login forms.

## Truth Architecture

```text
SOURCE
→ NORMALIZE
→ SIGNAL / EVIDENCE
→ CANDIDATE / DRAFT
→ HUMAN REVIEW
→ CONFIRMED DOMAIN CONTEXT
```

Rules:

- AI RECOMMENDS. HUMAN DECIDES.
- Add-on evidence is not Truth.
- Artifact Human Confirm is not arbitrary domain truth.
- PRIVATE onboarding Context remains private.
- PRIVATE 1:1 body remains excluded from Global Search.
- RESTRICTED data requires explicit grants.

## People Architecture

Canonical loop:

```text
People
→ Working Persona
→ People-aware Instruction
→ Delegation / Feedback / 1:1
→ Work Result
→ Collaboration Source
→ Candidate Pattern
→ Human Confirm
→ Revalidation
→ Better Instruction
```

### Current preference rule

Only use self-reported fields for instruction adaptation when:

`preferenceConfirmedAt` exists.

### Current Pattern rule

Only use Patterns that are:

- CONFIRMED
- not Review Due
- not part of a same-category Possible Conflict

Never silently prefer one conflicting Pattern.

## Team Member Confirmation

Public share format:

`<Leader OS deployment URL>#peopleConfirm=<token>`

The public form belongs to the frontend.

The public Edge Function is a JSON API only.

### Public fields

Allowed:

- instructionPreference
- autonomyPreference
- checkpointPreference
- feedbackPreference
- reportingPreference
- communicationPreference
- focusPreference
- availabilityPreference
- comment

Never return:

- private notes
- pattern reasoning
- sourceRefs
- 1:1 notes
- audio/transcript
- instruction history
- outcome history
- HR data

### Security

- token = cryptographically random 256-bit
- raw token returned once
- database stores SHA-256 hash only
- default expiration = 7 days
- max expiration = 30 days
- new ACTIVE request revokes previous ACTIVE request for the same leader/person pair

## People Server

Authenticated runtime:

`leader-os-runtime`
- v27
- ACTIVE
- JWT ON

Public confirmation API:

`leader-os-people-confirm`
- v2
- ACTIVE
- JWT OFF intentionally
- expiring token authentication
- JSON only

Audio Storage:

`leader-os-people-audio`
- private
- authenticated user's folder only
- max 25 MB

## Artifact Integration

People-aware instruction may be promoted only after leader action.

Current shared Artifact path:

`People private instruction draft → leader approves → DELEGATION Operating Artifact`

Do not copy full private Working Persona data into a shared Artifact.

## 30-Day People Links

People is directly relevant to:

- Day 3 Team Map
- Day 4 First 1:1
- Day 5 Team Pattern
- Day 20 Real Delegation
- Day 22 Feedback
- Day 24 Coaching Questions
- Day 25 Difficult Conversation

## Safety / Privacy

Do not add automated recommendation fields for:

- age
- family
- household situation
- health
- religion
- politics
- sensitive personal traits

MBTI / style label stays reference only.

Never add:

- employee score
- person rank
- hidden performance score
- cross-person rework leaderboard

## Current Release Gate

Before production rollout, complete an authenticated E2E test:

```text
Login
→ Working Persona
→ Create confirmation request
→ Recipient opens share link
→ Recipient submits proposal
→ Leader sees SUBMITTED
→ Leader reviews field diff
→ Apply
→ Profile version increments
→ Reload
→ Preference history restored
```

## Next Recommended Work

Do not add more profile fields.

Prefer:

1. task-context conditions for Patterns
2. contextual conflict resolution
3. inline diff against default Brief
4. outcome analysis by task class, not across people
5. revalidation reminders without exposing private content to HR
6. real transcription provider only when credentials/provider are intentionally selected


## Recovery 65 Repository Rule

From Recovery 65 onward, `petervanilla/peter_leader-os` is the repository handoff Source of Truth for:

- runtime source snapshots
- migration changes
- Product Constitution
- Claude handoff constraints
- canonical Recovery source preservation

Before changing Supabase Edge Functions, fetch the current deployed source and compare it with the repository snapshot.

Before changing database schema, create/apply a tracked migration and update the migration inventory.

The root `index.html` is a lightweight preview only. Do not treat it as equivalent to the assembled canonical Recovery 64 runtime.
