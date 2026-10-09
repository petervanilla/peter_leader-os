# Supabase Migration Inventory

Project: `lclibscjesyvsnxvdhoy`

This file records the production migration history visible on 2026-10-09 after Recovery 65 baseline capture.

| Version | Migration |
|---|---|
| 20260928040744 | `leader_os_core_store_event_log` |
| 20260928040831 | `leader_os_function_search_path_hardening` |
| 20260928041212 | `leader_os_workspace_membership_tenancy` |
| 20260928041445 | `leader_os_record_access_scope` |
| 20260928041844 | `leader_os_auth_bound_write` |
| 20260928041939 | `leader_os_service_role_helper_execute` |
| 20260928042052 | `leader_os_acl_conflict_constraint_fix` |
| 20260928042529 | `leader_os_persistent_context_pack` |
| 20260928061936 | `leader_os_workspace_bootstrap` |
| 20260928062115 | `leader_os_workspace_bootstrap_conflict_fix` |
| 20260928084530 | `leader_os_enable_pg_net_transport_probe` |
| 20260928085717 | `leader_os_addon_evidence_ingest_review` |
| 20260928105322 | `leader_os_addon_replay_stable_hash` |
| 20260928134424 | `leader_os_workspace_addon_vault_binding` |
| 20260928212423 | `leader_os_private_runtime_secret_store` |
| 20260928213253 | `leader_os_remove_unused_runtime_secret_store` |
| 20260928213442 | `leader_os_addon_binding_service_role_policies` |
| 20260930003307 | `leader_os_user_preferences` |
| 20260930003757 | `leader_os_user_preferences_workspace_index` |
| 20261004234248 | `leader_os_report_scheduler_runtime` |
| 20261004234409 | `leader_os_report_runtime_rls_policies` |
| 20261005000853 | `leader_os_report_ops_and_delivery_result` |
| 20261005171018 | `workspace_search_result_contract` |
| 20261005222813 | `search_v2_alias_and_detail_contract` |
| 20261005224657 | `search_v3_operating_artifact_labels` |
| 20261006054841 | `search_exclude_internal_progress_state` |
| 20261009044545 | `leader_os_people_confirmation_and_audio_baseline` |

## Rule

Future DDL changes must be represented by a migration before or at the same time they are applied to production.
