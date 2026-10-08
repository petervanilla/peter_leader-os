# Leader OS

> 30일 안에 새 팀장이 팀·회사·목표·사람·업무를 이해하고, 실제 운영 시스템과 코칭 리듬을 만드는 Leadership Onboarding OS.

## Product North Star

Leader OS의 핵심 질문은 다음입니다.

> 새 팀장이 30일 안에 무엇을 알아야 하고, 누구와 어떤 대화를 해야 하며, 어떤 운영 체계를 만들어야 팀장 역할을 제대로 시작했다고 볼 수 있는가?

핵심 실행 흐름:

```text
Today
→ 30-Day Mission Checklist
→ Evidence
→ Self Verification
→ Leader Coach
→ Operating Artifact
→ Next Mission
```

## Core Product Structure

```text
Onboarding
→ 30-Day Quest
→ Today
→ Team / People
→ 1:1
→ Work
→ Meetings
→ Decisions
→ Review
→ Reports
```

### 30-Day Mission

30일 동안 총 150개의 실제 행동 체크리스트를 수행합니다.

6개 역량 축:

1. 조직·목표 이해
2. 팀·사람 이해
3. 운영 시스템
4. 결정·위임
5. 커뮤니케이션·코칭
6. 자기검증·학습

Mission 완료 조건:

```text
Required Checklist complete
AND Evidence present
AND Self Verification complete
```

## People · Collaboration Intelligence

People은 직원 명부가 아니라 다음 구조로 작동합니다.

```text
Collaboration Memory
→ Working Persona
→ People-aware Instruction
→ Delegation / Feedback / 1:1
→ Work Result
→ Candidate Pattern
→ Human Confirm
→ Revalidation
→ Better Instruction
```

핵심 원칙:

- 사람을 점수화하지 않음
- 실제 업무 Evidence 중심
- Self-reported preference는 본인 확인 후 자동 최적화에 사용
- Pattern은 Human Confirm 후 사용
- Review-Due / conflicted Pattern은 자동 적용하지 않음
- PRIVATE People Memory는 HR / Search에 노출하지 않음

## Current Recovery

Current canonical product state:

**Recovery 64 — Collaborative Working Persona**

핵심 추가 사항:

- 팀원이 자신의 Working Preference를 제한된 확인 링크에서 수정/확인
- 제출 내용은 Working Persona를 자동 덮어쓰지 않음
- 리더가 Before / After를 확인한 뒤 Apply / Reject
- Preference history 유지
- 공개 확인 화면은 PRIVATE 1:1, Audio, Transcript, Pattern reasoning을 노출하지 않음
- 미확인 Preference는 업무지시 생성에 사용하지 않음
- 재검증 기한이 지난 Pattern과 상충 Pattern도 자동 적용하지 않음

## Server

Supabase project runtime:

- `leader-os-runtime` — v27 / JWT ON
- `leader-os-people-confirm` — v2 / token-authenticated public JSON API

People private audio bucket:

- `leader-os-people-audio`

## Truth / Privacy Constitution

```text
CONTEXT BEFORE RECOMMENDATION.
AI RECOMMENDS. HUMAN DECIDES.

SOURCE
→ NORMALIZE
→ SIGNAL / EVIDENCE
→ CANDIDATE / DRAFT
→ HUMAN REVIEW
→ CONFIRMED DOMAIN CONTEXT
```

Never:

- hidden employee scoring
- people ranking
- sensitive/protected-trait optimization
- PRIVATE 1:1 leakage
- automatic personality conclusion
- automatic Candidate → Confirmed promotion

## Documentation

- [Work Specification](docs/WORK_SPEC.md)
- [Implementation Guide](docs/IMPLEMENTATION_GUIDE.md)
- [Recovery 64 Report](docs/RECOVERY_64_REPORT.md)

## Current Release Gate

Production rollout still requires an authenticated end-to-end test:

```text
Login
→ Working Persona
→ create confirmation request
→ team member submits
→ leader reviews diff
→ Apply
→ profile version increments
→ reload
→ preference history restored
```

---

Leader OS is designed as a practical operating system for leaders, not an employee surveillance or scoring tool.
