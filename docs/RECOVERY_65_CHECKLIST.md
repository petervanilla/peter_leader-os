# Recovery 65 — Repository & Production Runtime Consolidation

Status: IN PROGRESS  
Branch: `recovery-65-runtime-consolidation`

## Objective
GitHub를 Leader OS의 재현 가능한 Source of Truth로 만들고, 실제 Supabase Runtime과 문서/프리뷰가 서로 어긋나지 않게 정리한다.

## Completed in this checkpoint
- [x] R65 review branch created from `main`
- [x] current Supabase `leader-os-runtime` source snapshot copied into repository
- [x] runtime snapshot verified as v27 / JWT ON
- [x] current `leader-os-people-confirm` source snapshot copied into repository
- [x] public confirmation snapshot verified as v2 / JWT OFF intentionally
- [x] Product Constitution added
- [x] Supabase current-state inventory added
- [x] People preference confirmation baseline migration added
- [x] environment variable contract added
- [x] Claude handoff guardrails added

## Not completed yet
- [x] embedded Recovery 64 source map extracted byte-for-byte into 36 canonical modules\n- [ ] activate extracted modules as the production frontend build instead of the monolith
- [ ] actual frontend Runtime wired from repo build instead of preview-only `index.html`
- [ ] authenticated Login → Workspace → Reload E2E
- [ ] full People confirmation owner E2E
- [ ] all historical production DDL reconstructed as ordered migrations
- [ ] Vercel production preview linked to this repository
- [ ] Today / Mission / Artifact full persistence regression
- [ ] error / loading / empty / mobile / theme regression pass

## R65 Release Gate
R65 is complete when:
1. repository can reproduce current frontend + runtime without relying on an external 5 MB recovery file;
2. Supabase function source in repo matches deployed function source;
3. DB migration history can create the People confirmation contract and document all current runtime dependencies;
4. Preview build uses the same source tree intended for production;
5. no privacy or truth-contract regression is introduced.

## Important
Do not merge this branch into `main` until the mid-review is complete.
