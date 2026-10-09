# Leader OS — Current Work Specification

## 1. Product Definition

Leader OS is a **30-Day Leadership Onboarding OS**.

Primary outcome:

> A newly appointed team leader completes real leadership missions, understands the team and company context, builds a minimum viable team operating system, and develops a repeatable coaching rhythm within 30 days.

Canonical transformation:

```text
New leader with incomplete context
→ understands people / work / dependencies
→ aligns company / team / role goals
→ creates operating rules
→ clarifies decisions / delegation
→ practices feedback / coaching
→ produces Team OS Charter + Next 60 Days
```

## 2. Canonical 30-Day Architecture

### UNDERSTAND · Days 1–7

- Observation Log
- Company / Team Goal Alignment
- Team Map
- 1:1 Context
- Team Pattern
- Stakeholder Map
- Week 1 AAR

### ALIGN · Days 8–14

- Team Calendar
- Meeting Purpose Audit
- Work Map
- Milestone Card
- WVR
- Priority Contract
- Operating Gap Review

### EMPOWER · Days 15–21

- Decision Inventory
- Decision Rights / RAPID
- Decision Brief
- Delegation Inventory
- Delegation Matrix
- Delegation Contract
- Delegation AAR

### COACH · Days 22–30

- SBI+Intent Feedback
- Recognition
- Coaching Questions
- Difficult Conversation
- Project AAR
- Process Experiment
- Operating Rhythm
- Leader Self Review
- Team OS Charter + Next 60 Days

## 3. Daily Mission Contract

Every day must contain:

1. Mission
2. five required action checks
3. Evidence
4. private Self Verification
5. contextual Leader Coach
6. reusable Artifact or operational output
7. Debrief
8. Next Mission

Mission closes only when:

```text
Checklist complete
AND Evidence present
AND Self Verification != NOT_YET
```

## 4. People · Collaboration Intelligence

### Product role

People exists to answer:

> How can I communicate, delegate and structure work more clearly with this person based on explicit preferences and real collaboration evidence?

It must not answer:

> What kind of person is this employee?

### Evidence layers

```text
Self-reported preference
→ Collaboration Source
→ Candidate Pattern
→ Human Confirm
→ Confirmed Pattern
→ Revalidation
→ People-aware Instruction
→ Work Result
→ Outcome Learning
```

### Working Preference fields

Allowed operational preferences:

- instruction format
- autonomy preference
- checkpoint preference
- feedback preference
- reporting preference
- communication preference
- focus / work rhythm
- work-related availability preference

### Excluded optimization inputs

Never use for automated task assignment, instruction adaptation, or evaluation:

- age
- family / household information
- health
- religion
- political views
- sensitive/protected personal traits
- inferred psychological diagnosis

MBTI / style label:

- display/reference only
- never an adaptation input

## 5. Preference Eligibility

A value typed into a field is not automatically verified self-reported data.

For a self-reported preference to influence instruction adaptation:

```text
preferenceConfirmedAt != null
```

Confirmation may happen by:

1. direct conversation explicitly recorded by the leader
2. team-member confirmation proposal applied by the leader

## 6. Pattern Eligibility

A Pattern may influence generated instructions only when:

- state = CONFIRMED
- revalidation is not due
- the category is not in Possible Conflict

Candidate, stale, or conflicted patterns remain visible for review but are excluded from adaptation.

## 7. Team Member Confirmation

Canonical state flow:

```text
ACTIVE
→ SUBMITTED
→ Leader Review
→ APPLIED / REJECTED
```

No direct overwrite.

Public confirmation surface exposes only safe working-preference fields.

It must never expose:

- leader private notes
- Pattern reasoning
- Source content
- 1:1 notes
- Audio / Transcript
- instruction history
- outcome history
- private Context
- HR information

## 8. Instruction Adaptation Priority

```text
1. current task requirements
2. verified self-reported preference
3. current non-conflicted Confirmed Pattern
4. default Leader OS delegation model
```

Generated brief structure:

```text
Goal
→ Context
→ Output
→ Done Criteria
→ Authority
→ Guardrail
→ Checkpoint
→ Reporting
→ Feedback
→ Workflow
```

Every adaptation must expose its rationale source.

## 9. Privacy Contract

### PRIVATE

- Working Persona
- Collaboration Sources
- Audio / Transcript
- Self Verification
- personal instruction drafts
- private 1:1 notes

### WORKSPACE after explicit leader action

- approved operational Delegation Artifact
- other confirmed operational outputs

### HR / Admin

May see:

- Mission completion
- Quest completion
- Evidence day count
- Artifact progress

May not see:

- private Self Verification
- private People reasoning
- private 1:1 content
- private Context contents

## 10. Current Server Contract

Authenticated runtime:

`leader-os-runtime`

People actions:

- people_collaboration_status
- people_profile_save
- people_source_save
- people_instruction_save
- people_preference_request_create
- people_preference_request_list
- people_preference_request_apply
- people_preference_request_resolve

Public confirmation API:

`leader-os-people-confirm`

Database:

`leader_os.people_preference_confirmation_requests`

Audio:

`leader-os-people-audio`

## 11. Non-Regression Requirements

- no person score
- no ranking
- no hidden performance rating
- no protected-trait optimization
- no automatic personality conclusion
- no automatic Candidate → Confirmed
- no PRIVATE People context in Universal Search
- no PRIVATE People context in HR roster
- no guest state silently uploaded to authenticated Workspace
- optimistic versioning stays required
- AI recommends; human decides


## 12. Recovery 65 Repository Consolidation Status

Completed:

- GitHub repository established as durable handoff source
- production `leader-os-runtime` v27 source mirrored
- production `leader-os-people-confirm` v2 source mirrored
- Recovery 64 People confirmation/audio database drift captured in migration history
- Product Constitution added
- Claude handoff boundary added
- canonical Recovery 64 source preserved as 8 verified ordered parts
- assembly/hash verification script added
- environment contract added

Still P0:

- authenticated Login / Workspace E2E
- People confirmation full E2E
- canonical runtime deployment
- reload/persistence verification
- error/loading/empty-state QA

Next milestone:

**Recovery 66 — Auth + People Full E2E**
