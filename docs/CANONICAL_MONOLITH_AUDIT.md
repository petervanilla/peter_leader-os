# Recovery 64 Canonical Monolith Audit

Source file audited locally:
`Leader_OS_Canonical_Workspace_Recovery_64_Collaborative_Working_Persona.html`

## Size / structure
- file size: 5,196,227 bytes (~5.0 MiB)
- inline script blocks: 54
- inline style blocks: 37
- buttons: 186
- forms: 16
- elements with IDs: 107

## Confirmed bridge/runtime references
- `window.LeaderOsPeopleBridge`
- `window.LeaderOsOperatingArtifactBridge`
- `window.LeaderOsMissionBridge`
- `window.LeaderOsAuthUi`

Confirmed runtime action references include:
- `people_preference_request_create`
- `mission_checklist_save`
- `leadership_self_check_save`
- `operating_artifact_save`

## R65 conclusion
The current canonical frontend is too large to treat as a durable single-file production source.

The next migration must preserve behavior while decomposing it into:
1. shell / navigation / theme
2. auth + workspace context
3. Today
4. 30-Day Mission
5. People / Working Persona
6. 1:1
7. Work / Operating Artifacts
8. Meetings
9. Decisions
10. Review
11. Reports
12. shared bridges / runtime client
13. privacy/truth guards

## Migration rule
Do not rewrite the product from scratch.

Use a strangler migration:
```text
canonical monolith
→ extract stable data contracts
→ extract runtime client
→ extract one section at a time
→ parity smoke test
→ remove migrated monolith block
```

Every extraction must prove:
- same 30 Mission Days
- same 150 required checks
- same completion condition
- same PRIVATE/RESTRICTED behavior
- same expectedVersion behavior
- same People eligibility rules
- same header 3 controls
- no Ask Leader OS regression
