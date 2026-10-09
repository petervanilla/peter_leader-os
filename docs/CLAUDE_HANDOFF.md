# Claude Handoff Boundary

This repository remains the Source of Truth for Leader OS product contracts, runtime rules, privacy boundaries, and Supabase integration.

Claude may improve:

- visual system
- component hierarchy
- layout
- responsive behavior
- empty/loading/error states
- motion and micro-interaction
- copy hierarchy
- navigation clarity
- accessibility
- screenshot/case-study presentation
- front-end componentization

Claude must not change without explicit review:

- Supabase schema or RLS/privacy boundaries
- Truth architecture
- PRIVATE / RESTRICTED semantics
- 30-Day Mission completion condition
- 30 Days / 150 required action checks
- Candidate → Human Confirm → Confirmed Pattern lifecycle
- Working Preference verification rule
- Review-Due / Possible Conflict exclusion rules
- team-member submission Apply/Reject workflow
- optimistic expectedVersion behavior
- Auth SSOT
- Header canonical controls
- Operating Artifact truth semantics
- HR visibility boundaries
- employee scoring/ranking prohibition

## Canonical header

Exactly three top-level controls:

1. 로그인 / Workspace
2. SHOWCASE DEMO
3. 전체 검색

Do not re-add Ask Leader OS as a generic Q&A section.

## Current architecture state

Product canonical behavior: Recovery 64.

Repository consolidation milestone: Recovery 65.

The browser-ready root `index.html` is a preview surface. It is not a substitute for the full canonical Recovery 64 runtime artifact.

Before broad UI refactoring, verify:

```text
Login
→ Workspace
→ People Working Persona
→ Create confirmation request
→ Team member submits
→ Leader reviews diff
→ Apply
→ profile version increments
→ Reload
→ history restored
```

If any UI change would weaken or bypass that flow, stop and preserve the runtime contract first.
