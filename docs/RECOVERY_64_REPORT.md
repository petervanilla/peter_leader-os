# Leader OS — Recovery 64 Report

Date: 2026-10-08

## Summary

Recovery 64 changes People from a one-sided leader profile into a collaborative Working Persona system.

The person being described can confirm or correct only their own explicit work-preference fields without gaining access to the leader's private People memory.

Canonical flow:

```text
Leader Working Persona draft
→ limited confirmation link
→ team member confirms/corrects
→ SUBMITTED
→ leader compares changes
→ Apply / Reject
→ preference history
→ verified input becomes eligible for instruction adaptation
```

## Recommendation Quality Fix

Recovery 63 allowed a semantic gap where a field labeled Self-reported could still influence a generated instruction before the person had actually confirmed it.

Recovery 64 fixes this.

A self-reported field is eligible for automated adaptation only when:

`preferenceConfirmedAt` exists.

Unverified preferences remain draft context only.

## Pattern Quality Fix

Confirmed does not mean permanently usable.

Instruction generation now excludes:

- Review-Due Patterns
- stale Patterns
- categories with multiple different Confirmed Patterns that create a Possible Conflict

Only current, confirmed, non-conflicted Patterns can affect adaptation.

## Confirmation Request

New table:

`leader_os.people_preference_confirmation_requests`

Status model:

- ACTIVE
- SUBMITTED
- APPLIED
- REJECTED
- REVOKED
- EXPIRED

Security:

- raw token is never stored
- SHA-256 token hash only
- random 256-bit token
- default expiry 7 days
- max expiry 30 days
- creating a new ACTIVE request revokes the previous ACTIVE request for the same leader/person pair

## Public Confirmation Architecture

Initial design attempted to serve HTML directly from a Supabase Hosted Edge Function.

This was found to be a poor deployment fit.

Current architecture:

```text
Leader OS deployment URL#peopleConfirm=<token>
→ frontend standalone confirmation UI
→ public JSON API
→ SUBMITTED proposal
→ leader review
```

Benefits:

- token stays in fragment instead of ordinary query
- private app UI is hidden in confirmation mode
- Edge Function remains API-only
- only safe preference fields are returned

## Privacy Boundary

Public confirmation surface exposes only:

- instruction
- autonomy
- checkpoint
- feedback
- reporting
- communication
- focus / work rhythm
- work-related availability
- optional comment

It does not expose:

- private leader notes
- Candidate/Confirmed Pattern reasoning
- sourceRefs
- 1:1 records
- Audio
- Transcript
- instruction history
- outcome history
- private Context
- HR data
- employee score/rank

## Authenticated Runtime

`leader-os-runtime`

Current:
- version v27
- ACTIVE
- JWT ON

New actions:

- people_preference_request_create
- people_preference_request_list
- people_preference_request_apply
- people_preference_request_resolve

## Public API

`leader-os-people-confirm`

Current:
- version v2
- ACTIVE
- JWT OFF intentionally
- expiring token auth
- JSON only
- CORS enabled

## Human Review Contract

A team-member submission never overwrites the profile directly.

Required transition:

```text
ACTIVE
→ SUBMITTED
→ leader review
→ APPLIED / REJECTED
```

Apply requires:

- authenticated owner leader
- matching Workspace
- current expected profile version
- request status SUBMITTED
- non-expired request

Apply:

- merges only allowed self-reported fields
- sets preferenceConfirmedAt
- preserves private Sources and Patterns
- appends preferenceHistory
- marks request APPLIED

## Validation

### Public API

Validated:

- invalid token → GET 404
- valid token → GET 200 JSON
- valid token → POST 200
- DB state becomes SUBMITTED
- temporary Smoke data cleaned

### Browser — Normal Leader OS

Validated:

- header retains 3 canonical controls
- 30 Mission Days remain intact
- People bridge PASS
- Auth bridge PASS
- Team Member Confirmation UI PASS
- share-link action disabled while signed out
- unverified preference excluded from generated brief
- verified preference becomes eligible
- People → 1:1 PASS
- People → Leader Coach PASS
- Mission → People PASS
- page errors 0
- console errors 0

### Browser — Public Confirmation

Validated:

- main Leader OS UI hidden
- safe confirmation form shown
- style-label / MBTI field exposed: 0
- audio field exposed: 0
- Pattern controls exposed: 0
- POST payload limited to allowed fields + token + comment
- successful terminal state PASS
- page errors 0
- console errors 0

## Bugs Fixed

1. unverified preferences affecting generated instructions
2. Review-Due/conflicted Patterns remaining eligible
3. direct Edge HTML hosting assumption
4. token loss when history/sessionStorage APIs fail
5. successful POST shown as failed when sessionStorage cleanup fails
6. older Recovery title overriding Recovery 64 title

## Remaining Release Gate

Authenticated owner flow must still be validated end-to-end:

```text
Login
→ create request
→ recipient submit
→ leader receives SUBMITTED
→ diff review
→ Apply
→ version increment
→ reload
→ preference history restore
```
