# Claude Handoff Guardrails

Claude 단계의 목적은 **Architecture rewrite가 아니라 UX / visual polish**다.

## Claude may change
- component layout
- spacing / typography
- visual hierarchy
- responsive behavior
- animation
- empty / loading / error presentation
- copy polish
- case-study screenshots
- component organization that preserves contracts

## Claude must not change without explicit review
- Supabase schema
- RLS / PRIVATE / RESTRICTED boundaries
- expectedVersion optimistic concurrency
- 30 Days × 5 required checks
- Mission completion rule
- Candidate → Human Confirm → Confirmed lifecycle
- People self-reported verification eligibility
- Pattern revalidation/conflict eligibility
- Team-member submission Apply / Reject gate
- Auth SSOT
- header 3-control contract
- report authority contract
- Add-on evidence ≠ Truth

## Mission completion
```text
all five required checks
AND Evidence exists
AND Self Verification != NOT_YET
```

## Header
Exactly:
1. 로그인 / Workspace
2. SHOWCASE DEMO
3. 전체 검색

Do not re-add Ask Leader OS.

## People automation eligibility
Self-reported preference:
```text
preferenceConfirmedAt != null
```

Pattern:
```text
state = CONFIRMED
AND revalidation not due
AND category not in POSSIBLE_CONFLICT
```

## Shared-data rule
Private People context may produce a leader-approved operational Artifact, but the private persona itself must not be copied wholesale into shared Workspace data.
