import { fromSupabaseUrl, withSupabase } from "npm:@supabase/server@1.8.0";
import postgres from "npm:postgres@3.4.7";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACCESS_SCOPES = new Set(["WORKSPACE", "RESTRICTED", "PRIVATE"]);
const OBJECT_TYPES = new Set([
  "PERSON","TEAM","COMPANY","PROJECT","MEETING","DECISION","ACTION",
  "COMMITMENT","EVIDENCE","RISK","MEMORY","SKILL_RUN","ATTENTION","RECOMMENDATION"
]);
const OPICKER_CAPABILITIES = new Set(["SEO_AUDIT","GEO_AUDIT","DESIGN_EXTRACT"]);
const OPICKER_MODULE_ID = "opicker-web-intelligence";
const OPICKER_PRODUCT_SKU = "opicker.pro";
const ONBOARDING_SETUP_IDS = new Set([
  "OBSERVE-ROLE","OBSERVE-TEAM","OBSERVE-1ON1",
  "MAP-CALENDAR","MAP-WORK","MAP-MILESTONE",
  "ALIGN-PRIORITY","ALIGN-DECISION","ALIGN-DELEGATE",
  "OPERATE-FEEDBACK","OPERATE-DEBRIEF","OPERATE-RHYTHM"
]);
const QUEST_EVIDENCE_DISPOSITIONS = new Set(["ACCEPTED_FOR_CONTEXT","NEEDS_WORK","REJECTED"]);
const OPERATING_ARTIFACT_TYPES = new Set([
  "MANAGER_CONTRACT","TEAM_MAP","TEAM_PATTERN","STAKEHOLDER_MAP","TEAM_CALENDAR",
  "WORK_MAP","MILESTONES","PRIORITY_CONTRACT","DECISION_RIGHTS","DELEGATION",
  "FEEDBACK_PRACTICE","OPERATING_RHYTHM","DEBRIEF","ONE_ON_ONE_COMMITMENT","WEEKLY_REVIEW","TEAM_OS_CHARTER",
  "NEXT_60_PLAN","NEXT_60_CHECKIN","REPORT_BRIEF"
]);
const OPERATING_ARTIFACT_STATES = new Set(["DRAFT","CONFIRMED"]);

const supabaseUrl = Deno.env.get("SUPABASE_URL");
if (!supabaseUrl) throw new Error("SUPABASE_URL_REQUIRED");

function json(body: unknown, status = 200, requestId?: string, extraHeaders?: Record<string,string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...(requestId ? { "X-Request-ID": requestId } : {}),
      ...(extraHeaders ?? {}),
    },
  });
}

function dbErrorCode(message: string): { code: string; status: number } {
  const known: Array<[string, number]> = [
    ["ACTIVE_WORKSPACE_MEMBERSHIP_REQUIRED", 403],
    ["WORKSPACE_WRITE_ROLE_REQUIRED", 403],
    ["LEADER_ROLE_REQUIRED", 403],
    ["ACCESS_GRANTS_REQUIRED", 400],
    ["WRITER_ACCESS_GRANT_REQUIRED", 403],
    ["ACCESS_GRANT_TARGET_NOT_ACTIVE_MEMBER", 403],
    ["HUMAN_CONFIRMATION_REQUIRED", 403],
    ["PEOPLE_RATING_FIELDS_PROHIBITED", 400],
    ["ADDON_CANNOT_WRITE_CONFIRMED_TRUTH", 403],
    ["RECOMMENDATION_HUMAN_REVIEW_REQUIRED", 403],
    ["WORK_REPORT_VERSION_CONFLICT", 409],
    ["VERSION_CONFLICT", 409],
    ["EVENT_ID_CONFLICT", 409],
    ["WORKSPACE_ID_CONFLICT", 409],
    ["ADDON_REQUEST_ID_CONFLICT", 409],
    ["UNSUPPORTED_ADDON_MODULE", 400],
    ["UNSUPPORTED_ADDON_PRODUCT", 400],
    ["UNSUPPORTED_ADDON_CAPABILITY", 400],
    ["ADDON_SCHEMA_VERSION_INVALID", 400],
    ["ADDON_MODULE_ID_MISMATCH", 400],
    ["ADDON_REQUEST_ID_MISMATCH", 400],
    ["ADDON_PRODUCT_SKU_MISMATCH", 400],
    ["ADDON_RESULT_TYPE_NOT_ALLOWED", 400],
    ["ADDON_RESULT_NOT_COMPLETED", 400],
    ["ADDON_RESULT_CANNOT_BE_FACT", 400],
    ["HUMAN_REVIEW_FLAG_REQUIRED", 400],
    ["ADDON_PROVENANCE_REQUIRED", 400],
    ["ADDON_CAPABILITY_REQUIRED", 400],
    ["ADDON_RESULT_TOO_LARGE", 413],
    ["INVALID_EVIDENCE_REVIEW_DISPOSITION", 400],
    ["ADDON_EVIDENCE_NOT_FOUND", 404],
    ["ADDON_EVIDENCE_REQUIRED", 400],
    ["ADDON_EVIDENCE_CANNOT_BE_CONFIRMED_TRUTH", 409],
    ["INVALID_REPORT_TIMEZONE", 400],
    ["INVALID_DAILY_WEEKDAYS", 400],
    ["INVALID_WEEKLY_ISODOW", 400],
    ["INVALID_REPORT_TYPE", 400],
    ["INVALID_REPORT_ACTOR_TYPE", 400],
    ["INVALID_REPORT_PATCH", 400],
    ["WORK_REPORT_NOT_FOUND", 404],
    ["WORK_REPORT_NOT_DRAFT", 409],
    ["WORK_REPORT_CONFIRMATION_REQUIRED", 409],
    ["INVALID_DELIVERY_CHANNEL", 400],
    ["DELIVERY_TARGET_REQUIRED", 400],
    ["SEARCH_QUERY_TOO_LONG", 400],
    ["QUEST_DAY_INVALID", 400],
    ["QUEST_LINK_TARGET_NOT_FOUND", 404],
    ["QUEST_LINK_TARGET_NOT_SEARCHABLE", 403],
    ["QUEST_EVIDENCE_SOURCE_REQUIRED", 400],
    ["OPERATING_ARTIFACT_DELETE_ROLE_REQUIRED", 403],
    ["OPERATING_ARTIFACT_NOT_FOUND", 404],
    ["OPERATING_ARTIFACT_PAYLOAD_TOO_LARGE", 413],
    ["INVALID_OPERATING_ARTIFACT_STATE", 400],
    ["INVALID_OPERATING_ARTIFACT_TYPE", 400],
    ["QUEST_EVIDENCE_NOT_FOUND", 404],
    ["INVALID_QUEST_EVIDENCE_DISPOSITION", 400],
    ["INVALID_SETUP_CHECK_IDS", 400],
    ["SEARCH_RESULT_NOT_FOUND", 404],
  ];
  for (const [code, status] of known) if (message.includes(code)) return { code, status };
  return { code: "RUNTIME_DATABASE_ERROR", status: 500 };
}

function requiredString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`INVALID_${name}`);
  return value.trim();
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function opickerConfig(): { baseUrl: string; token: string } | null {
  const rawBase =
    Deno.env.get("OPICKER_ADDON_BASE_URL")?.trim()
    || "https://o-picker-lab.onrender.com";
  const token = Deno.env.get("LEADER_OS_ADDON_TOKEN")?.trim();
  if (!token) return null;
  try {
    const parsed = new URL(rawBase);
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) return null;
    return { baseUrl: parsed.toString().replace(/\/$/,""), token };
  } catch {
    return null;
  }
}

async function workspaceRole(sql: any, workspaceId: string, userId: string): Promise<string | null> {
  const rows = await sql`
    select role
    from leader_os.workspace_members
    where workspace_id=${workspaceId}
      and user_id=${userId}::uuid
      and status='ACTIVE'
    limit 1
  `;
  return typeof rows[0]?.role === "string" ? rows[0].role : null;
}

async function requireWorkspaceRole(
  sql: any,
  workspaceId: string,
  userId: string,
  allowed?: Set<string>
): Promise<string> {
  const role = await workspaceRole(sql, workspaceId, userId);
  if (!role) throw new Error("ACTIVE_WORKSPACE_MEMBERSHIP_REQUIRED");
  if (allowed && !allowed.has(role)) {
    if (allowed.has("MEMBER")) throw new Error("WORKSPACE_WRITE_ROLE_REQUIRED");
    throw new Error("LEADER_ROLE_REQUIRED");
  }
  return role;
}

async function callOpicker(
  config: {baseUrl:string;token:string},
  path: string,
  init: RequestInit
): Promise<{status:number; body:any; retryAfter:string|null}> {
  const response = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-leader-addon-token": config.token,
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(120000),
  });
  const body = await response.json().catch(() => ({ error: "INVALID_ADDON_RESPONSE" }));
  return { status: response.status, body, retryAfter: response.headers.get("retry-after") };
}

function mapAddonUpstream(result: {status:number;body:any;retryAfter:string|null}, requestId: string) {
  const upstreamError = typeof result.body?.error === "string" ? result.body.error : null;
  if (result.status === 202) {
    return json(result.body, 202, requestId, result.retryAfter ? { "Retry-After": result.retryAfter } : undefined);
  }
  if (result.status === 409) return json({ error: upstreamError ?? "ADDON_REQUEST_ID_CONFLICT", details: result.body }, 409, requestId);
  if (result.status === 403) return json({ error: upstreamError ?? "ADDON_NOT_ENTITLED", details: result.body }, 403, requestId);
  if (result.status === 400 || result.status === 422) return json({ error: upstreamError ?? "INVALID_ADDON_REQUEST", details: result.body }, 400, requestId);
  if (result.status === 401) return json({ error: "ADDON_RUNTIME_AUTH_FAILED" }, 503, requestId);
  if (result.status >= 500) return json({ error: "ADDON_RUNTIME_UNAVAILABLE", upstreamStatus: result.status }, 503, requestId);
  return null;
}

Deno.serve(
  withSupabase(
    {
      auth: "user",
      issuer: fromSupabaseUrl(supabaseUrl),
    },
    async (req, ctx) => {
      const requestId = crypto.randomUUID();
      if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405, requestId);

      const userId = ctx.userClaims?.id;
      if (typeof userId !== "string" || !UUID_RE.test(userId)) {
        return json({ error: "AUTH_USER_REQUIRED" }, 401, requestId);
      }

      const dbUrl = Deno.env.get("SUPABASE_DB_URL");
      if (!dbUrl) return json({ error: "RUNTIME_DATABASE_UNAVAILABLE" }, 503, requestId);

      let body: Record<string, unknown>;
      try {
        body = await req.json();
      } catch {
        return json({ error: "INVALID_JSON" }, 400, requestId);
      }

      const sql = postgres(dbUrl, { prepare: false, max: 1, idle_timeout: 2 });
      try {
        const action = requiredString(body.action, "ACTION");
        const workspaceId = requiredString(body.workspaceId, "WORKSPACE_ID");

        if (action === "bootstrap") {
          const workspaceName = requiredString(body.workspaceName, "WORKSPACE_NAME");
          const rows = await sql`
            select * from leader_os.bootstrap_workspace(
              ${workspaceId},
              ${userId}::uuid,
              ${workspaceName}
            )
          `;
          return json({ requestId, workspace: rows[0] ?? null }, 200, requestId);
        }

        if (action === "context") {
          const rawMax = Number(body.maxRecords ?? 100);
          const maxRecords = Number.isInteger(rawMax) ? Math.max(1, Math.min(rawMax, 200)) : 100;
          const rows = await sql`
            select leader_os.build_context_pack(
              ${workspaceId},
              ${userId}::uuid,
              ${maxRecords}
            ) as pack
          `;
          return json({ requestId, contextPack: rows[0]?.pack ?? null }, 200, requestId);
        }

        if (action === "write") {
          const eventId = requiredString(body.eventId, "EVENT_ID");
          const objectType = requiredString(body.objectType, "OBJECT_TYPE").toUpperCase();
          const objectId = requiredString(body.objectId, "OBJECT_ID");
          const eventType = requiredString(body.eventType, "EVENT_TYPE");
          const source = typeof body.source === "string" && body.source.trim() ? body.source.trim() : "APP";
          const expectedVersion = Number(body.expectedVersion);
          if (!OBJECT_TYPES.has(objectType)) return json({ error: "INVALID_OBJECT_TYPE" }, 400, requestId);
          if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
            return json({ error: "INVALID_EXPECTED_VERSION" }, 400, requestId);
          }

          const patch = body.patch && typeof body.patch === "object" && !Array.isArray(body.patch) ? body.patch : {};
          const confirmed = typeof body.confirmed === "boolean" ? body.confirmed : null;
          const supersededBy = typeof body.supersededBy === "string" && body.supersededBy.trim() ? body.supersededBy.trim() : null;
          const accessScope = body.accessScope == null ? null : String(body.accessScope).toUpperCase();
          if (accessScope !== null && !ACCESS_SCOPES.has(accessScope)) {
            return json({ error: "INVALID_ACCESS_SCOPE" }, 400, requestId);
          }

          let granteeArrayLiteral: string | null = null;
          if (body.granteeUserIds != null) {
            if (!Array.isArray(body.granteeUserIds)) return json({ error: "INVALID_GRANTEE_USER_IDS" }, 400, requestId);
            const ids = [...new Set(body.granteeUserIds.map(String))];
            if (ids.some((id) => !UUID_RE.test(id))) return json({ error: "INVALID_GRANTEE_USER_IDS" }, 400, requestId);
            granteeArrayLiteral = `{${ids.join(",")}}`;
          }

          const rows = await sql`
            select * from leader_os.apply_user_core_write(
              ${eventId},
              ${workspaceId},
              ${userId}::uuid,
              ${objectType},
              ${objectId},
              ${eventType},
              ${expectedVersion},
              ${source},
              ${sql.json(patch)}::jsonb,
              ${confirmed},
              ${supersededBy},
              ${accessScope},
              ${granteeArrayLiteral}::uuid[]
            )
          `;
          return json({ requestId, record: rows[0] ?? null }, 200, requestId);
        }


        if (action === "report_status") {
          await requireWorkspaceRole(sql, workspaceId, userId);
          const rawLimit = Number(body.limit ?? 20);
          const limit = Number.isInteger(rawLimit) ? Math.max(1, Math.min(rawLimit, 50)) : 20;
          const rows = await sql`
            select leader_os.get_work_report_runtime(
              ${workspaceId},
              ${userId}::uuid,
              ${limit}
            ) as runtime
          `;
          return json({ requestId, reportRuntime: rows[0]?.runtime ?? null }, 200, requestId);
        }

        if (action === "report_schedule_save") {
          await requireWorkspaceRole(sql, workspaceId, userId, new Set(["OWNER","ADMIN","LEADER"]));
          const timezone = typeof body.timezone === "string" && body.timezone.trim()
            ? body.timezone.trim() : "Asia/Seoul";
          const dailyEnabled = body.dailyEnabled === true;
          const dailyTime = typeof body.dailyTime === "string" && body.dailyTime.trim()
            ? body.dailyTime.trim() : "17:30";
          const rawDailyWeekdays = Array.isArray(body.dailyWeekdays)
            ? body.dailyWeekdays.map(Number) : [1,2,3,4,5];
          if (
            rawDailyWeekdays.length < 1
            || rawDailyWeekdays.length > 7
            || rawDailyWeekdays.some((d) => !Number.isInteger(d) || d < 1 || d > 7)
          ) {
            return json({ error: "INVALID_DAILY_WEEKDAYS" }, 400, requestId);
          }
          const dailyWeekdays = [...new Set(rawDailyWeekdays)].sort((a,b) => a-b);
          const dailyWeekdaysLiteral = `{${dailyWeekdays.join(",")}}`;

          const weeklyEnabled = body.weeklyEnabled === true;
          const weeklyIsoDow = Number(body.weeklyIsoDow ?? 5);
          if (!Number.isInteger(weeklyIsoDow) || weeklyIsoDow < 1 || weeklyIsoDow > 7) {
            return json({ error: "INVALID_WEEKLY_ISODOW" }, 400, requestId);
          }
          const weeklyTime = typeof body.weeklyTime === "string" && body.weeklyTime.trim()
            ? body.weeklyTime.trim() : "16:00";

          const rows = await sql`
            select * from leader_os.save_work_report_schedule(
              ${workspaceId},
              ${userId}::uuid,
              ${timezone},
              ${dailyEnabled},
              ${dailyTime}::time,
              ${dailyWeekdaysLiteral}::smallint[],
              ${weeklyEnabled},
              ${weeklyIsoDow}::smallint,
              ${weeklyTime}::time
            )
          `;
          return json({ requestId, schedule: rows[0] ?? null }, 200, requestId);
        }

        if (action === "report_prepare_now") {
          await requireWorkspaceRole(sql, workspaceId, userId, new Set(["OWNER","ADMIN","LEADER"]));
          const reportType = requiredString(body.reportType, "REPORT_TYPE").toUpperCase();
          if (!["DAILY","WEEKLY"].includes(reportType)) {
            return json({ error: "INVALID_REPORT_TYPE" }, 400, requestId);
          }
          const rows = await sql`
            select * from leader_os.prepare_user_work_report(
              ${workspaceId},
              ${userId}::uuid,
              ${reportType},
              clock_timestamp()
            )
          `;
          return json({ requestId, report: rows[0] ?? null }, 200, requestId);
        }

        if (action === "report_confirm") {
          await requireWorkspaceRole(sql, workspaceId, userId, new Set(["OWNER","ADMIN","LEADER"]));
          const reportId = requiredString(body.reportId, "REPORT_ID");
          if (!UUID_RE.test(reportId)) return json({ error: "INVALID_REPORT_ID" }, 400, requestId);
          const expectedVersion = Number(body.expectedVersion);
          if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
            return json({ error: "INVALID_EXPECTED_VERSION" }, 400, requestId);
          }
          const finalPatch = body.finalPatch && typeof body.finalPatch === "object" && !Array.isArray(body.finalPatch)
            ? body.finalPatch : {};
          const rows = await sql`
            select * from leader_os.confirm_work_report(
              ${workspaceId},
              ${userId}::uuid,
              ${reportId}::uuid,
              ${expectedVersion},
              ${sql.json(finalPatch)}::jsonb
            )
          `;
          return json({ requestId, report: rows[0] ?? null }, 200, requestId);
        }

        if (action === "report_queue_delivery") {
          await requireWorkspaceRole(sql, workspaceId, userId, new Set(["OWNER","ADMIN","LEADER"]));
          const reportId = requiredString(body.reportId, "REPORT_ID");
          if (!UUID_RE.test(reportId)) return json({ error: "INVALID_REPORT_ID" }, 400, requestId);
          const channel = requiredString(body.channel, "DELIVERY_CHANNEL").toUpperCase();
          const targetRef = optionalString(body.targetRef);
          const rows = await sql`
            select * from leader_os.queue_work_report_delivery(
              ${workspaceId},
              ${userId}::uuid,
              ${reportId}::uuid,
              ${channel},
              ${targetRef}
            )
          `;
          return json({ requestId, delivery: rows[0] ?? null }, 200, requestId);
        }


        if (action === "report_ops_status") {
          await requireWorkspaceRole(sql, workspaceId, userId, new Set(["OWNER","ADMIN","LEADER"]));
          const rows = await sql`
            select leader_os.get_work_report_ops_status(
              ${workspaceId},
              ${userId}::uuid
            ) as ops
          `;
          return json({ requestId, reportOps: rows[0]?.ops ?? null }, 200, requestId);
        }

        if (action === "search") {
          await requireWorkspaceRole(sql, workspaceId, userId);
          const query = typeof body.query === "string" ? body.query.trim() : "";
          const rawLimit = Number(body.limit ?? 20);
          const limit = Number.isInteger(rawLimit) ? Math.max(1, Math.min(rawLimit, 50)) : 20;
          const rows = await sql`
            select leader_os.search_workspace(
              ${workspaceId},
              ${userId}::uuid,
              ${query},
              ${limit}
            ) as result
          `;
          return json({ requestId, search: rows[0]?.result ?? null }, 200, requestId);
        }

        if (action === "quest_evidence_link") {
          await requireWorkspaceRole(sql, workspaceId, userId, new Set(["OWNER","ADMIN","LEADER","MEMBER"]));
          const eventId = requiredString(body.eventId, "EVENT_ID");
          const rawDay = Number(body.questDay);
          if (!Number.isInteger(rawDay) || rawDay < 1 || rawDay > 30) {
            return json({ error: "QUEST_DAY_INVALID" }, 400, requestId);
          }
          const questTitle = requiredString(body.questTitle, "QUEST_TITLE");
          const artifactType = optionalString(body.artifactType);
          const evidenceText = optionalString(body.evidenceText);
          const linkedObjectType = optionalString(body.linkedObjectType)?.toUpperCase() ?? null;
          const linkedObjectId = optionalString(body.linkedObjectId);

          if ((linkedObjectType && !linkedObjectId) || (!linkedObjectType && linkedObjectId)) {
            return json({ error: "INVALID_QUEST_LINK_TARGET" }, 400, requestId);
          }
          if (linkedObjectType && !OBJECT_TYPES.has(linkedObjectType)) {
            return json({ error: "INVALID_OBJECT_TYPE" }, 400, requestId);
          }

          if (linkedObjectType && linkedObjectId) {
            const target = await sql`
              select object_type,object_id,access_scope
              from leader_os.core_records
              where workspace_id=${workspaceId}
                and object_type=${linkedObjectType}
                and object_id=${linkedObjectId}
              limit 1
            `;
            if (!target[0]) return json({ error: "QUEST_LINK_TARGET_NOT_FOUND" }, 404, requestId);
            if (target[0].access_scope !== "WORKSPACE") {
              return json({ error: "QUEST_LINK_TARGET_NOT_SEARCHABLE" }, 403, requestId);
            }
          }

          const evidenceId = `QUEST:${userId}:DAY-${String(rawDay).padStart(2,"0")}`;
          const existing = await sql`
            select version
            from leader_os.core_records
            where workspace_id=${workspaceId}
              and object_type='EVIDENCE'
              and object_id=${evidenceId}
            limit 1
          `;
          const expectedVersion = Number(existing[0]?.version ?? 0);
          const patch = {
            sourceType: "QUEST",
            learnerUserId: userId,
            truthStatus: "PRACTICE_EVIDENCE",
            confirmedFact: false,
            requiresHumanReviewBeforeCoreFact: true,
            questDay: rawDay,
            questTitle,
            artifactType,
            evidenceText,
            linkedObjectType,
            linkedObjectId,
            recordedAt: new Date().toISOString()
          };
          const rows = await sql`
            select * from leader_os.apply_user_core_write(
              ${eventId},
              ${workspaceId},
              ${userId}::uuid,
              'EVIDENCE',
              ${evidenceId},
              'QUEST_EVIDENCE_LINKED',
              ${expectedVersion},
              'LEADER_OS_30_DAY_QUEST',
              ${sql.json(patch)}::jsonb,
              false,
              ${null},
              'WORKSPACE',
              ${null}::uuid[]
            )
          `;
          return json({ requestId, evidence: rows[0] ?? null }, 200, requestId);
        }


        if (action === "search_detail") {
          await requireWorkspaceRole(sql, workspaceId, userId);
          const objectType = requiredString(body.objectType, "OBJECT_TYPE").toUpperCase();
          const objectId = requiredString(body.objectId, "OBJECT_ID");
          const rows = await sql`
            select leader_os.get_search_result_detail(
              ${workspaceId},
              ${userId}::uuid,
              ${objectType},
              ${objectId}
            ) as detail
          `;
          return json({ requestId, detail: rows[0]?.detail ?? null }, 200, requestId);
        }

        if (action === "onboarding_context_status") {
          await requireWorkspaceRole(sql, workspaceId, userId);
          const contextObjectId = `ONBOARDING-CONTEXT:${userId}`;
          const rows = await sql`
            select version,data,updated_at
            from leader_os.core_records
            where workspace_id=${workspaceId}
              and object_type='EVIDENCE'
              and object_id=${contextObjectId}
              and access_scope='PRIVATE'
            limit 1
          `;
          const row = rows[0];
          const data = row?.data ?? {};
          const teamName = typeof data.teamName === "string" ? data.teamName : "";
          const manager = typeof data.manager === "string" ? data.manager : "";
          return json({
            requestId,
            onboardingContext: {
              version: Number(row?.version ?? 0),
              role: typeof data.role === "string" ? data.role : "TEAM_MANAGER",
              situation: typeof data.situation === "string" ? data.situation : "NEW_ROLE",
              teamName,
              manager,
              startDate: typeof data.startDate === "string" ? data.startDate : "",
              managerSync: typeof data.managerSync === "string" ? data.managerSync : "",
              question: typeof data.question === "string" ? data.question : "",
              complete: Boolean(teamName.trim() && manager.trim()),
              updatedAt: row?.updated_at ?? null,
              storage: "SERVER_PRIVATE"
            }
          }, 200, requestId);
        }

        if (action === "onboarding_context_save") {
          await requireWorkspaceRole(sql, workspaceId, userId, new Set(["OWNER","ADMIN","LEADER","MEMBER"]));
          const contextObjectId = `ONBOARDING-CONTEXT:${userId}`;
          const allowedRoles = new Set(["TEAM_MANAGER","MARKETING_LEADER","CREATIVE_DIRECTOR","PRODUCT_LEAD"]);
          const allowedSituations = new Set(["NEW_ROLE","INHERITED_TEAM","REORG","RECOVERY"]);
          const role = requiredString(body.role ?? "TEAM_MANAGER", "ROLE").toUpperCase();
          const situation = requiredString(body.situation ?? "NEW_ROLE", "SITUATION").toUpperCase();
          if (!allowedRoles.has(role)) return json({ error: "INVALID_ONBOARDING_ROLE" }, 400, requestId);
          if (!allowedSituations.has(situation)) return json({ error: "INVALID_ONBOARDING_SITUATION" }, 400, requestId);
          const clip = (value: unknown, max: number) => {
            if (value == null) return "";
            const text = String(value).trim();
            if (text.length > max) throw new Error("ONBOARDING_CONTEXT_TOO_LONG");
            return text;
          };
          let teamName: string, manager: string, startDate: string, managerSync: string, question: string;
          try {
            teamName = clip(body.teamName, 120);
            manager = clip(body.manager, 120);
            startDate = clip(body.startDate, 20);
            managerSync = clip(body.managerSync, 20);
            question = clip(body.question, 800);
          } catch {
            return json({ error: "ONBOARDING_CONTEXT_TOO_LONG" }, 400, requestId);
          }
          const expectedVersion = Number(body.expectedVersion ?? 0);
          if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
            return json({ error: "INVALID_EXPECTED_VERSION" }, 400, requestId);
          }
          const eventId = requiredString(body.eventId, "EVENT_ID");
          const patch = {
            sourceType: "ONBOARDING_CONTEXT",
            learnerUserId: userId,
            title: "Leader Onboarding Context",
            truthStatus: "PRACTICE_STATE",
            role,
            situation,
            teamName,
            manager,
            startDate,
            managerSync,
            question,
            complete: Boolean(teamName && manager),
            updatedAt: new Date().toISOString()
          };
          const privateGrantees = `{${userId}}`;
          const rows = await sql`
            select * from leader_os.apply_user_core_write(
              ${eventId},
              ${workspaceId},
              ${userId}::uuid,
              'EVIDENCE',
              ${contextObjectId},
              'ONBOARDING_CONTEXT_UPDATED',
              ${expectedVersion},
              'LEADER_OS_ONBOARDING',
              ${sql.json(patch)}::jsonb,
              false,
              ${null},
              'PRIVATE',
              ${privateGrantees}::uuid[]
            )
          `;
          return json({ requestId, record: rows[0] ?? null }, 200, requestId);
        }

        if (action === "leadership_resume_status") {
          await requireWorkspaceRole(sql, workspaceId, userId);
          const contextObjectId = `ONBOARDING-CONTEXT:${userId}`;
          const setupObjectId = `ONBOARDING-SETUP-12:${userId}`;
          const progressObjectId = `LEADERSHIP-QUEST-PROGRESS:${userId}`;

          const contextRows = await sql`
            select version,data,updated_at
            from leader_os.core_records
            where workspace_id=${workspaceId}
              and object_type='EVIDENCE'
              and object_id=${contextObjectId}
              and access_scope='PRIVATE'
            limit 1
          `;
          const setupRows = await sql`
            select version,data,updated_at
            from leader_os.core_records
            where workspace_id=${workspaceId}
              and object_type='EVIDENCE'
              and object_id=${setupObjectId}
              and access_scope='WORKSPACE'
            limit 1
          `;
          const progressRows = await sql`
            select version,data,updated_at
            from leader_os.core_records
            where workspace_id=${workspaceId}
              and object_type='EVIDENCE'
              and object_id=${progressObjectId}
              and access_scope='WORKSPACE'
            limit 1
          `;
          const artifactRows = await sql`
            select distinct data->>'artifactType' as artifact_type
            from leader_os.core_records
            where workspace_id=${workspaceId}
              and object_type='EVIDENCE'
              and data->>'sourceType'='OPERATING_ARTIFACT'
              and coalesce(data->>'lifecycle','ACTIVE') <> 'DELETED'
              and access_scope='WORKSPACE'
          `;

          const context = contextRows[0]?.data ?? {};
          const contextComplete = Boolean(
            typeof context.teamName === "string" && context.teamName.trim()
            && typeof context.manager === "string" && context.manager.trim()
          );

          const manualSetup = Array.isArray(setupRows[0]?.data?.checkedIds)
            ? setupRows[0].data.checkedIds.filter((id: unknown) => typeof id === "string" && ONBOARDING_SETUP_IDS.has(id))
            : [];
          const artifactTypes = new Set(
            artifactRows
              .map((row: Record<string, unknown>) => row.artifact_type)
              .filter((value: unknown): value is string => typeof value === "string" && value.length > 0)
          );
          const setupDefs = [
            { id:"OBSERVE-ROLE", day:2, title:"상급자와 역할·성공 기준 합의", artifactType:"MANAGER_CONTRACT" },
            { id:"OBSERVE-TEAM", day:3, title:"팀 구성원과 실제 역할 파악", artifactType:"TEAM_MAP" },
            { id:"OBSERVE-1ON1", day:5, title:"팀원 1:1로 반복 패턴 확인", artifactType:"TEAM_PATTERN" },
            { id:"MAP-CALENDAR", day:8, title:"반복 일정과 회의 리듬 수집", artifactType:"TEAM_CALENDAR" },
            { id:"MAP-WORK", day:10, title:"현재 프로젝트와 Owner 연결", artifactType:"WORK_MAP" },
            { id:"MAP-MILESTONE", day:11, title:"마일스톤을 Outcome 기준으로 재정의", artifactType:"MILESTONES" },
            { id:"ALIGN-PRIORITY", day:13, title:"팀 Top 3 우선순위 합의", artifactType:"PRIORITY_CONTRACT" },
            { id:"ALIGN-DECISION", day:16, title:"중요 결정의 최종 결정권자 명확화", artifactType:"DECISION_RIGHTS" },
            { id:"ALIGN-DELEGATE", day:19, title:"업무별 위임 수준과 범위 정의", artifactType:"DELEGATION" },
            { id:"OPERATE-FEEDBACK", day:22, title:"관찰 기반 피드백 방식 적용", artifactType:"FEEDBACK_PRACTICE" },
            { id:"OPERATE-DEBRIEF", day:26, title:"프로젝트 Debrief로 학습 기록", artifactType:"DEBRIEF" },
            { id:"OPERATE-RHYTHM", day:30, title:"Team Operating System v1 확정", artifactType:"TEAM_OS_CHARTER" }
          ];
          const completedSetupIds = setupDefs
            .filter((item) => manualSetup.includes(item.id) || artifactTypes.has(item.artifactType))
            .map((item) => item.id);
          const nextSetup = setupDefs.find((item) => !completedSetupIds.includes(item.id)) ?? null;

          const rawCompleted = Array.isArray(progressRows[0]?.data?.completedDays)
            ? progressRows[0].data.completedDays : [];
          const completedDays = [...new Set(rawCompleted.map(Number))]
            .filter((day) => Number.isInteger(day) && day >= 1 && day <= 30)
            .sort((a,b) => a-b);
          const completedSet = new Set(completedDays);
          let nextQuestDay: number | null = null;
          for (let day=1; day<=30; day += 1) {
            if (!completedSet.has(day)) { nextQuestDay = day; break; }
          }
          const selectedDayRaw = Number(progressRows[0]?.data?.selectedDay ?? 1);
          const selectedDay = Number.isInteger(selectedDayRaw) && selectedDayRaw >= 1 && selectedDayRaw <= 30
            ? selectedDayRaw : 1;

          let nextBestAction: Record<string, unknown>;
          if (!contextComplete) {
            nextBestAction = {
              kind:"CONTEXT",
              title:"내 역할과 팀 Context를 먼저 맞추기",
              reason:"개인화된 30일 코칭과 Resume 기준을 만들기 위한 최소 입력입니다.",
              targetPage:"LEADER_ONBOARDING"
            };
          } else if (nextSetup) {
            nextBestAction = {
              kind:"SETUP",
              title:`Day ${nextSetup.day} · ${nextSetup.title}`,
              reason:"12 Setup의 다음 미완료 운영 결과물입니다.",
              targetPage:"ONBOARDING",
              targetDay:nextSetup.day,
              setupId:nextSetup.id,
              artifactType:nextSetup.artifactType
            };
          } else if (nextQuestDay != null) {
            const phase = nextQuestDay <= 7 ? "UNDERSTAND" : nextQuestDay <= 14 ? "ALIGN" : nextQuestDay <= 21 ? "EMPOWER" : "COACH";
            nextBestAction = {
              kind:"QUEST",
              title:`Day ${nextQuestDay} · 30-Day Leadership Quest 이어가기`,
              reason:`${phase} Phase의 다음 미완료 Practice입니다.`,
              targetPage:"ONBOARDING",
              targetDay:nextQuestDay,
              phase
            };
          } else {
            nextBestAction = {
              kind:"COMPLETE",
              title:"30일 완주 · Team OS를 다음 60일 운영으로 전환",
              reason:"Team OS Charter와 다음 60일 Outcome/Experiment를 검토합니다.",
              targetPage:"ONBOARDING",
              targetDay:30
            };
          }

          return json({
            requestId,
            resume: {
              schemaVersion:"1.0",
              workspaceId,
              userId,
              context: {
                version:Number(contextRows[0]?.version ?? 0),
                complete:contextComplete,
                role:typeof context.role === "string" ? context.role : "TEAM_MANAGER",
                situation:typeof context.situation === "string" ? context.situation : "NEW_ROLE",
                teamName:typeof context.teamName === "string" ? context.teamName : "",
                manager:typeof context.manager === "string" ? context.manager : "",
                startDate:typeof context.startDate === "string" ? context.startDate : "",
                managerSync:typeof context.managerSync === "string" ? context.managerSync : "",
                question:typeof context.question === "string" ? context.question : "",
                updatedAt:contextRows[0]?.updated_at ?? null
              },
              setup: {
                version:Number(setupRows[0]?.version ?? 0),
                completedIds:completedSetupIds,
                completedCount:completedSetupIds.length,
                itemCount:12,
                next:nextSetup
              },
              quest: {
                version:Number(progressRows[0]?.version ?? 0),
                completedDays,
                completionCount:completedDays.length,
                itemCount:30,
                selectedDay,
                nextDay:nextQuestDay,
                updatedAt:progressRows[0]?.updated_at ?? null
              },
              artifactTypes:[...artifactTypes].sort(),
              nextBestAction
            }
          }, 200, requestId);
        }


        if (action === "leadership_onboarding_roster") {
          const member = await requireWorkspaceRole(sql, workspaceId, userId, new Set(["OWNER","ADMIN"]));
          const rows = await sql`
            with members as (
              select wm.user_id,wm.role,wm.joined_at,
                     coalesce(nullif(u.raw_user_meta_data->>'name',''), nullif(u.email,''), wm.user_id::text) as display_name
              from leader_os.workspace_members wm
              left join auth.users u on u.id=wm.user_id
              where wm.workspace_id=${workspaceId}
                and wm.status='ACTIVE'
            ),
            setup as (
              select
                data->>'learnerUserId' as learner_user_id,
                jsonb_array_length(coalesce(data->'checkedIds','[]'::jsonb)) as setup_count,
                updated_at
              from leader_os.core_records
              where workspace_id=${workspaceId}
                and object_type='EVIDENCE'
                and data->>'sourceType'='ONBOARDING_SETUP'
                and access_scope='WORKSPACE'
            ),
            mission as (
              select
                data->>'learnerUserId' as learner_user_id,
                (
                  select count(*)
                  from jsonb_each(coalesce(data->'checksByDay','{}'::jsonb)) e
                  where jsonb_typeof(e.value)='array' and jsonb_array_length(e.value)>=5
                )::int as mission_complete_days,
                coalesce((data->>'totalChecked')::int,0) as total_checked,
                updated_at
              from leader_os.core_records
              where workspace_id=${workspaceId}
                and object_type='EVIDENCE'
                and data->>'sourceType'='MISSION_CHECKLIST'
                and access_scope='WORKSPACE'
            ),
            progress as (
              select
                data->>'learnerUserId' as learner_user_id,
                coalesce((data->>'completionCount')::int,0) as quest_complete_days,
                coalesce((data->>'selectedDay')::int,1) as selected_day,
                data->>'currentPhase' as current_phase,
                updated_at
              from leader_os.core_records
              where workspace_id=${workspaceId}
                and object_type='EVIDENCE'
                and data->>'sourceType'='QUEST_PROGRESS'
                and access_scope='WORKSPACE'
            ),
            evidence as (
              select
                data->>'learnerUserId' as learner_user_id,
                count(distinct (data->>'questDay')) filter (where data ? 'questDay')::int as evidence_days,
                max(updated_at) as updated_at
              from leader_os.core_records
              where workspace_id=${workspaceId}
                and object_type='EVIDENCE'
                and data->>'sourceType'='QUEST'
                and access_scope<>'PRIVATE'
              group by data->>'learnerUserId'
            ),
            artifacts as (
              select
                created_by::text as learner_user_id,
                count(*)::int as artifact_count,
                count(*) filter (where data->>'artifactState'='CONFIRMED')::int as confirmed_artifact_count,
                max(updated_at) as updated_at
              from leader_os.core_records
              where workspace_id=${workspaceId}
                and object_type='EVIDENCE'
                and data->>'sourceType'='OPERATING_ARTIFACT'
                and access_scope='WORKSPACE'
                and coalesce(data->>'lifecycle','ACTIVE')<>'DELETED'
              group by created_by
            )
            select
              m.user_id,m.role,m.display_name,m.joined_at,
              coalesce(s.setup_count,0)::int as setup_count,
              coalesce(mc.mission_complete_days,0)::int as mission_complete_days,
              coalesce(mc.total_checked,0)::int as mission_checks,
              coalesce(p.quest_complete_days,0)::int as quest_complete_days,
              coalesce(p.selected_day,1)::int as selected_day,
              coalesce(p.current_phase,'UNDERSTAND') as current_phase,
              coalesce(e.evidence_days,0)::int as evidence_days,
              coalesce(a.artifact_count,0)::int as artifact_count,
              coalesce(a.confirmed_artifact_count,0)::int as confirmed_artifact_count,
              greatest(
                coalesce(s.updated_at,'epoch'::timestamptz),
                coalesce(mc.updated_at,'epoch'::timestamptz),
                coalesce(p.updated_at,'epoch'::timestamptz),
                coalesce(e.updated_at,'epoch'::timestamptz),
                coalesce(a.updated_at,'epoch'::timestamptz)
              ) as last_activity_at
            from members m
            left join setup s on s.learner_user_id=m.user_id::text
            left join mission mc on mc.learner_user_id=m.user_id::text
            left join progress p on p.learner_user_id=m.user_id::text
            left join evidence e on e.learner_user_id=m.user_id::text
            left join artifacts a on a.learner_user_id=m.user_id::text
            order by m.joined_at asc
          `;

          const roster = rows.map((row: Record<string,unknown>) => {
            const quest = Number(row.quest_complete_days ?? 0);
            return {
              userId: row.user_id,
              displayName: row.display_name,
              workspaceRole: row.role,
              status: quest >= 30 ? "COMPLETED" : quest > 0 || Number(row.mission_checks ?? 0) > 0 ? "IN_PROGRESS" : "NOT_STARTED",
              setup: { complete:Number(row.setup_count ?? 0), total:12 },
              mission: { completeDays:Number(row.mission_complete_days ?? 0), totalDays:30, checkedItems:Number(row.mission_checks ?? 0), totalItems:150 },
              quest: { completeDays:quest, totalDays:30, selectedDay:Number(row.selected_day ?? 1), phase:row.current_phase },
              evidenceDays:Number(row.evidence_days ?? 0),
              artifacts:{ total:Number(row.artifact_count ?? 0), confirmed:Number(row.confirmed_artifact_count ?? 0) },
              lastActivityAt: row.last_activity_at
            };
          });

          return json({
            requestId,
            onboardingRoster:{
              workspaceId,
              viewerRole:member.role,
              privacy:{
                privateOneOnOneIncluded:false,
                privateSelfCheckIncluded:false,
                privateContextIncluded:false,
                peopleScoring:false
              },
              roster,
              count:roster.length
            }
          },200,requestId);
        }


        if (action === "mission_checklist_status") {
          await requireWorkspaceRole(sql, workspaceId, userId);
          const objectId = `LEADERSHIP-MISSION-CHECKLIST:${userId}`;
          const rows = await sql`
            select version,data,updated_at
            from leader_os.core_records
            where workspace_id=${workspaceId}
              and object_type='EVIDENCE'
              and object_id=${objectId}
              and access_scope='WORKSPACE'
            limit 1
          `;
          const row = rows[0];
          const raw = row?.data?.checksByDay;
          const checksByDay = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
          return json({
            requestId,
            missionChecklist: {
              version: Number(row?.version ?? 0),
              checksByDay,
              updatedAt: row?.updated_at ?? null,
              storage: "SERVER"
            }
          }, 200, requestId);
        }

        if (action === "mission_checklist_save") {
          await requireWorkspaceRole(sql, workspaceId, userId, new Set(["OWNER","ADMIN","LEADER","MEMBER"]));
          const objectId = `LEADERSHIP-MISSION-CHECKLIST:${userId}`;
          const expectedVersion = Number(body.expectedVersion ?? 0);
          if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
            return json({ error: "INVALID_EXPECTED_VERSION" }, 400, requestId);
          }
          if (!body.checksByDay || typeof body.checksByDay !== "object" || Array.isArray(body.checksByDay)) {
            return json({ error: "INVALID_MISSION_CHECKLIST" }, 400, requestId);
          }
          const normalized: Record<string,string[]> = {};
          let totalChecked = 0;
          for (const [rawDay, rawIds] of Object.entries(body.checksByDay)) {
            const day = Number(rawDay);
            if (!Number.isInteger(day) || day < 1 || day > 30 || !Array.isArray(rawIds)) {
              return json({ error: "INVALID_MISSION_CHECKLIST" }, 400, requestId);
            }
            const prefix = `D${String(day).padStart(2,"0")}-C`;
            const ids = [...new Set(rawIds.map(String))]
              .filter((id) => id.startsWith(prefix) && /^D\d{2}-C\d{2}$/.test(id));
            if (ids.length > 10 || ids.length !== new Set(rawIds.map(String)).size) {
              return json({ error: "INVALID_MISSION_CHECKLIST" }, 400, requestId);
            }
            normalized[String(day)] = ids.sort();
            totalChecked += ids.length;
          }
          const eventId = requiredString(body.eventId, "EVENT_ID");
          const patch = {
            sourceType: "MISSION_CHECKLIST",
            learnerUserId: userId,
            title: "30-Day Team Leader Mission Checklist",
            truthStatus: "PRACTICE_STATE",
            checksByDay: normalized,
            totalChecked,
            updatedAt: new Date().toISOString()
          };
          const rows = await sql`
            select * from leader_os.apply_user_core_write(
              ${eventId},
              ${workspaceId},
              ${userId}::uuid,
              'EVIDENCE',
              ${objectId},
              'LEADERSHIP_MISSION_CHECKLIST_UPDATED',
              ${expectedVersion},
              'LEADER_OS_30_DAY_MISSION',
              ${sql.json(patch)}::jsonb,
              false,
              ${null},
              'WORKSPACE',
              ${null}::uuid[]
            )
          `;
          return json({ requestId, record: rows[0] ?? null }, 200, requestId);
        }

        if (action === "leadership_self_check_status") {
          await requireWorkspaceRole(sql, workspaceId, userId);
          const objectId = `LEADERSHIP-SELF-CHECK:${userId}`;
          const rows = await sql`
            select version,data,updated_at
            from leader_os.core_records
            where workspace_id=${workspaceId}
              and object_type='EVIDENCE'
              and object_id=${objectId}
              and access_scope='PRIVATE'
            limit 1
          `;
          const row = rows[0];
          const raw = row?.data?.levelsByDay;
          const levelsByDay = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
          return json({
            requestId,
            selfCheck: {
              version: Number(row?.version ?? 0),
              levelsByDay,
              updatedAt: row?.updated_at ?? null,
              storage: "SERVER_PRIVATE"
            }
          }, 200, requestId);
        }

        if (action === "leadership_self_check_save") {
          await requireWorkspaceRole(sql, workspaceId, userId, new Set(["OWNER","ADMIN","LEADER","MEMBER"]));
          const objectId = `LEADERSHIP-SELF-CHECK:${userId}`;
          const expectedVersion = Number(body.expectedVersion ?? 0);
          if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
            return json({ error: "INVALID_EXPECTED_VERSION" }, 400, requestId);
          }
          if (!body.levelsByDay || typeof body.levelsByDay !== "object" || Array.isArray(body.levelsByDay)) {
            return json({ error: "INVALID_SELF_CHECK" }, 400, requestId);
          }
          const allowed = new Set(["NOT_YET","TRIED","EVIDENCED","REPEATABLE"]);
          const normalized: Record<string,string> = {};
          for (const [rawDay, rawLevel] of Object.entries(body.levelsByDay)) {
            const day = Number(rawDay);
            const level = String(rawLevel);
            if (!Number.isInteger(day) || day < 1 || day > 30 || !allowed.has(level)) {
              return json({ error: "INVALID_SELF_CHECK" }, 400, requestId);
            }
            normalized[String(day)] = level;
          }
          const eventId = requiredString(body.eventId, "EVENT_ID");
          const patch = {
            sourceType: "LEADERSHIP_SELF_CHECK",
            learnerUserId: userId,
            title: "Leadership Self Verification",
            truthStatus: "PRIVATE_REFLECTION_STATE",
            levelsByDay: normalized,
            updatedAt: new Date().toISOString()
          };
          const privateGrantees = `{${userId}}`;
          const rows = await sql`
            select * from leader_os.apply_user_core_write(
              ${eventId},
              ${workspaceId},
              ${userId}::uuid,
              'EVIDENCE',
              ${objectId},
              'LEADERSHIP_SELF_CHECK_UPDATED',
              ${expectedVersion},
              'LEADER_OS_30_DAY_MISSION',
              ${sql.json(patch)}::jsonb,
              false,
              ${null},
              'PRIVATE',
              ${privateGrantees}::uuid[]
            )
          `;
          return json({ requestId, record: rows[0] ?? null }, 200, requestId);
        }


        if (action === "people_collaboration_status") {
          await requireWorkspaceRole(sql, workspaceId, userId);
          const personFilter = typeof body.personId === "string" && body.personId.trim() ? body.personId.trim() : null;
          const rows = await sql`
            select object_id,version,data,updated_at
            from leader_os.core_records
            where workspace_id=${workspaceId}
              and object_type='EVIDENCE'
              and access_scope='PRIVATE'
              and data->>'ownerUserId'=${userId}
              and data->>'sourceType' in ('PEOPLE_WORKING_PROFILE','PEOPLE_COLLAB_SOURCE','PEOPLE_INSTRUCTION_DRAFT')
              and (${personFilter}::text is null or data->>'personId'=${personFilter})
            order by updated_at desc
            limit 500
          `;
          const profiles:any[]=[]; const sources:any[]=[]; const instructions:any[]=[];
          for (const row of rows) {
            const item={ objectId:row.object_id, version:Number(row.version||0), updatedAt:row.updated_at, ...(row.data||{}) };
            const sourceType=String(row.data?.sourceType||'');
            if(sourceType==='PEOPLE_WORKING_PROFILE') profiles.push(item);
            else if(sourceType==='PEOPLE_COLLAB_SOURCE') sources.push(item);
            else if(sourceType==='PEOPLE_INSTRUCTION_DRAFT') instructions.push(item);
          }
          const reviewQueue:any[]=[];
          const todayMs=Date.now();
          for(const profile of profiles){
            const patterns=Array.isArray(profile.patterns)?profile.patterns:[];
            const confirmedByCategory=new Map<string,any[]>();
            for(const pattern of patterns){
              const category=String(pattern?.category||'');
              const state=String(pattern?.state||'');
              if(state==='CANDIDATE'){
                reviewQueue.push({
                  kind:'CANDIDATE_PATTERN',
                  personId:profile.personId,
                  patternId:pattern.id,
                  category,
                  statement:pattern.statement,
                  sourceRefs:Array.isArray(pattern.sourceRefs)?pattern.sourceRefs:[],
                  reason:'Human Confirm required'
                });
              }
              if(state==='CONFIRMED'){
                if(!confirmedByCategory.has(category)) confirmedByCategory.set(category,[]);
                confirmedByCategory.get(category)!.push(pattern);
                const reviewedAt=String(pattern.reviewedAt||pattern.confirmedAt||pattern.updatedAt||'');
                const revalidateAt=String(pattern.revalidateAt||'');
                const reviewedMs=reviewedAt?Date.parse(reviewedAt):NaN;
                const revalidateMs=revalidateAt?Date.parse(revalidateAt):NaN;
                const due=(Number.isFinite(revalidateMs)&&revalidateMs<=todayMs) || (!revalidateAt&&Number.isFinite(reviewedMs)&&(todayMs-reviewedMs)>90*86400000);
                if(due){
                  reviewQueue.push({
                    kind:'REVALIDATION_DUE',
                    personId:profile.personId,
                    patternId:pattern.id,
                    category,
                    statement:pattern.statement,
                    reviewedAt:reviewedAt||null,
                    revalidateAt:revalidateAt||null,
                    reason:'Confirmed pattern needs revalidation'
                  });
                }
              }
            }
            for(const [category,items] of confirmedByCategory.entries()){
              const distinct=[...new Set(items.map((p:any)=>String(p.statement||'').trim()).filter(Boolean))];
              if(distinct.length>1){
                reviewQueue.push({
                  kind:'POSSIBLE_CONFLICT',
                  personId:profile.personId,
                  category,
                  patternIds:items.map((p:any)=>p.id),
                  statements:distinct,
                  reason:'Multiple different confirmed patterns exist in the same category; review context before using them together.'
                });
              }
            }
          }
          const profilePatternSourceRefs=new Set(
            profiles.flatMap((profile:any)=>(Array.isArray(profile.patterns)?profile.patterns:[])
              .flatMap((pattern:any)=>Array.isArray(pattern.sourceRefs)?pattern.sourceRefs:[]))
          );
          for(const source of sources){
            const sourceId=String(source.sourceId||'');
            const candidates=Array.isArray(source.candidatePatterns)?source.candidatePatterns:[];
            if(candidates.length && !profilePatternSourceRefs.has(sourceId)){
              reviewQueue.push({
                kind:'SOURCE_PATTERN_REVIEW',
                personId:source.personId,
                sourceId,
                sourceKind:source.sourceKind,
                candidatePatterns:candidates,
                reason:'Source contains pattern candidates that are not yet linked to a Working Persona pattern.'
              });
            }
            if(String(source.sourceKind||'')==='AUDIO_TRANSCRIPT' && !String(source.transcriptExcerpt||'').trim()){
              reviewQueue.push({
                kind:'TRANSCRIPT_NEEDED',
                personId:source.personId,
                sourceId,
                fileName:source.fileName||'',
                reason:'Audio is stored but transcript text has not been reviewed or attached.'
              });
            }
          }
          return json({
            requestId,
            peopleCollaboration:{
              profiles,sources,instructions,reviewQueue,
              privacy:{scope:'PRIVATE',employeeScore:false,protectedTraitOptimization:false}
            }
          },200,requestId);
        }

        if (action === "people_profile_save") {
          await requireWorkspaceRole(sql, workspaceId, userId, new Set(["OWNER","ADMIN","LEADER","MEMBER"]));
          const personId=requiredString(body.personId,"PERSON_ID");
          if(!/^[A-Za-z0-9:_-]{1,96}$/.test(personId)) return json({error:"INVALID_PERSON_ID"},400,requestId);
          const expectedVersion=Number(body.expectedVersion??0);
          if(!Number.isInteger(expectedVersion)||expectedVersion<0) return json({error:"INVALID_EXPECTED_VERSION"},400,requestId);
          const eventId=requiredString(body.eventId,"EVENT_ID");
          const clip=(value:unknown,max:number)=>String(value??'').trim().slice(0,max);
          const allowedAutonomy=new Set(["GUIDE","COACH","SUPPORT","DELEGATE",""]);
          const autonomyPreference=clip(body.autonomyPreference,24).toUpperCase();
          if(!allowedAutonomy.has(autonomyPreference)) return json({error:"INVALID_AUTONOMY_PREFERENCE"},400,requestId);
          const rawPatterns=Array.isArray(body.patterns)?body.patterns:[];
          if(rawPatterns.length>40) return json({error:"TOO_MANY_PATTERNS"},400,requestId);
          const allowedCategories=new Set(["BRIEF","AUTONOMY","CHECKPOINT","FEEDBACK","REPORTING","COMMUNICATION","MEETING","DECISION"]);
          let invalidPattern=false;
          const patterns=rawPatterns.map((raw:any,index:number)=>{
            const category=clip(raw?.category,24).toUpperCase();
            const state=clip(raw?.state,16).toUpperCase();
            if(!allowedCategories.has(category)||!new Set(["CANDIDATE","CONFIRMED"]).has(state)){ invalidPattern=true; return null; }
            const confirmedAt=clip(raw?.confirmedAt,40);
            const reviewedAt=clip(raw?.reviewedAt,40);
            const revalidateAt=clip(raw?.revalidateAt,40);
            return {
              id:clip(raw?.id,64)||`PATTERN-${index+1}`,
              category,
              statement:clip(raw?.statement,500),
              state,
              sourceRefs:Array.isArray(raw?.sourceRefs)?raw.sourceRefs.map((v:any)=>clip(v,120)).filter(Boolean).slice(0,12):[],
              confirmedAt:state==='CONFIRMED'?(confirmedAt||new Date().toISOString()):'',
              reviewedAt:state==='CONFIRMED'?(reviewedAt||confirmedAt||new Date().toISOString()):'',
              revalidateAt:state==='CONFIRMED'?revalidateAt:'',
              updatedAt:clip(raw?.updatedAt,40)||new Date().toISOString()
            };
          }).filter((item:any)=>item&&item.statement);
          if(invalidPattern) return json({error:"INVALID_PEOPLE_PATTERN"},400,requestId);
          const patch={
            sourceType:"PEOPLE_WORKING_PROFILE",
            ownerUserId:userId,
            personId,
            title:`Working Persona · ${clip(body.personName,120)||personId}`,
            personName:clip(body.personName,120),
            role:clip(body.role,120),
            selfReported:{
              instructionPreference:clip(body.instructionPreference,500),
              autonomyPreference,
              checkpointPreference:clip(body.checkpointPreference,300),
              feedbackPreference:clip(body.feedbackPreference,300),
              reportingPreference:clip(body.reportingPreference,300),
              communicationPreference:clip(body.communicationPreference,300),
              focusPreference:clip(body.focusPreference,300),
              availabilityPreference:clip(body.availabilityPreference,300),
              styleLabel:clip(body.styleLabel,80),
              styleLabelReferenceOnly:true,
              preferenceConfirmedAt:clip(body.preferenceConfirmedAt,40)
            },
            patterns,
            truthStatus:"PRIVATE_WORKING_DRAFT",
            employeeScore:false,
            protectedTraitOptimization:false,
            updatedAt:new Date().toISOString()
          };
          const objectId=`WORKING-PERSONA:${userId}:${personId}`;
          const privateGrantees=`{${userId}}`;
          let rows;
          try{
            rows=await sql`
              select * from leader_os.apply_user_core_write(
                ${eventId},${workspaceId},${userId}::uuid,
                'EVIDENCE',${objectId},'PEOPLE_WORKING_PROFILE_UPDATED',
                ${expectedVersion},'LEADER_OS_PEOPLE',${sql.json(patch)}::jsonb,
                false,${null},'PRIVATE',${privateGrantees}::uuid[]
              )
            `;
          }catch(error){
            if(String(error).includes("INVALID_PEOPLE_PATTERN")) return json({error:"INVALID_PEOPLE_PATTERN"},400,requestId);
            throw error;
          }
          return json({requestId,record:rows[0]??null},200,requestId);
        }

        if (action === "people_source_save") {
          await requireWorkspaceRole(sql, workspaceId, userId, new Set(["OWNER","ADMIN","LEADER","MEMBER"]));
          const personId=requiredString(body.personId,"PERSON_ID");
          const sourceId=requiredString(body.sourceId,"SOURCE_ID");
          if(!/^[A-Za-z0-9:_-]{1,96}$/.test(personId)||!/^[A-Za-z0-9:_-]{1,120}$/.test(sourceId)) return json({error:"INVALID_PEOPLE_SOURCE_ID"},400,requestId);
          const expectedVersion=Number(body.expectedVersion??0);
          if(!Number.isInteger(expectedVersion)||expectedVersion<0) return json({error:"INVALID_EXPECTED_VERSION"},400,requestId);
          const eventId=requiredString(body.eventId,"EVENT_ID");
          const clip=(value:unknown,max:number)=>String(value??'').trim().slice(0,max);
          const sourceKind=clip(body.sourceKind,32).toUpperCase();
          const allowedKinds=new Set(["ONE_ON_ONE","AUDIO_TRANSCRIPT","WORK_RESULT","FEEDBACK","NOTE"]);
          if(!allowedKinds.has(sourceKind)) return json({error:"INVALID_SOURCE_KIND"},400,requestId);
          const consentConfirmed=Boolean(body.consentConfirmed);
          if(sourceKind==="AUDIO_TRANSCRIPT"&&!consentConfirmed) return json({error:"AUDIO_CONSENT_REQUIRED"},400,requestId);
          const storagePath=clip(body.storagePath,500);
          if(storagePath&&!storagePath.startsWith(`${userId}/${workspaceId}/${personId}/`)) return json({error:"INVALID_AUDIO_STORAGE_PATH"},400,requestId);
          const candidatePatterns=Array.isArray(body.candidatePatterns)?body.candidatePatterns.map((v:any)=>({
            category:clip(v?.category,24).toUpperCase(),
            statement:clip(v?.statement,500)
          })).filter((v:any)=>v.statement).slice(0,10):[];
          const patch={
            sourceType:"PEOPLE_COLLAB_SOURCE",
            ownerUserId:userId,
            personId,
            sourceId,
            title:`Collaboration Source · ${sourceKind}`,
            sourceKind,
            occurredAt:clip(body.occurredAt,40),
            summary:clip(body.summary,2000),
            transcriptExcerpt:clip(body.transcriptExcerpt,6000),
            candidatePatterns,
            consentConfirmed,
            fileName:clip(body.fileName,240),
            mimeType:clip(body.mimeType,120),
            sizeBytes:Number.isFinite(Number(body.sizeBytes))?Math.max(0,Number(body.sizeBytes)):0,
            storagePath,
            linkedInstructionId:clip(body.linkedInstructionId,120),
            outcomeSignals:{
              reworkRounds:(body.reworkRounds===null||body.reworkRounds===undefined||body.reworkRounds==="")
                ? null
                : (Number.isInteger(Number(body.reworkRounds))?Math.max(0,Math.min(20,Number(body.reworkRounds))):null),
              checkpointOutcome:new Set(["","WORKED","MIXED","MISSED","NOT_APPLICABLE"]).has(clip(body.checkpointOutcome,24).toUpperCase())?clip(body.checkpointOutcome,24).toUpperCase():"",
              instructionOutcome:clip(body.instructionOutcome,1200)
            },
            truthStatus:"PRIVATE_SOURCE",
            employeeScore:false,
            updatedAt:new Date().toISOString()
          };
          const objectId=`PEOPLE-SOURCE:${userId}:${personId}:${sourceId}`;
          const privateGrantees=`{${userId}}`;
          const rows=await sql`
            select * from leader_os.apply_user_core_write(
              ${eventId},${workspaceId},${userId}::uuid,
              'EVIDENCE',${objectId},'PEOPLE_COLLAB_SOURCE_UPDATED',
              ${expectedVersion},'LEADER_OS_PEOPLE',${sql.json(patch)}::jsonb,
              false,${null},'PRIVATE',${privateGrantees}::uuid[]
            )
          `;
          return json({requestId,record:rows[0]??null},200,requestId);
        }

        if (action === "people_instruction_save") {
          await requireWorkspaceRole(sql, workspaceId, userId, new Set(["OWNER","ADMIN","LEADER","MEMBER"]));
          const personId=requiredString(body.personId,"PERSON_ID");
          const instructionId=requiredString(body.instructionId,"INSTRUCTION_ID");
          if(!/^[A-Za-z0-9:_-]{1,96}$/.test(personId)||!/^[A-Za-z0-9:_-]{1,120}$/.test(instructionId)) return json({error:"INVALID_INSTRUCTION_ID"},400,requestId);
          const expectedVersion=Number(body.expectedVersion??0);
          if(!Number.isInteger(expectedVersion)||expectedVersion<0) return json({error:"INVALID_EXPECTED_VERSION"},400,requestId);
          const eventId=requiredString(body.eventId,"EVENT_ID");
          const clip=(value:unknown,max:number)=>String(value??'').trim().slice(0,max);
          const patch={
            sourceType:"PEOPLE_INSTRUCTION_DRAFT",
            ownerUserId:userId,
            personId,
            instructionId,
            title:`People-aware Instruction · ${clip(body.task,180)||personId}`,
            task:clip(body.task,500),
            goal:clip(body.goal,1200),
            context:clip(body.context,1600),
            output:clip(body.output,1200),
            doneCriteria:clip(body.doneCriteria,1600),
            autonomy:clip(body.autonomy,80),
            guardrail:clip(body.guardrail,1200),
            checkpoint:clip(body.checkpoint,500),
            reporting:clip(body.reporting,500),
            feedback:clip(body.feedback,500),
            workflow:Array.isArray(body.workflow)?body.workflow.map((v:any)=>clip(v,500)).filter(Boolean).slice(0,12):[],
            rationaleSources:Array.isArray(body.rationaleSources)?body.rationaleSources.map((v:any)=>clip(v,180)).filter(Boolean).slice(0,20):[],
            patternRefs:Array.isArray(body.patternRefs)?body.patternRefs.map((v:any)=>clip(v,80)).filter(Boolean).slice(0,20):[],
            rationaleDetails:Array.isArray(body.rationaleDetails)?body.rationaleDetails.map((v:any)=>({
              field:clip(v?.field,40),
              sourceType:clip(v?.sourceType,40),
              sourceRef:clip(v?.sourceRef,120),
              explanation:clip(v?.explanation,400)
            })).filter((v:any)=>v.field&&v.explanation).slice(0,24):[],
            truthStatus:"PRIVATE_INSTRUCTION_DRAFT",
            humanDecisionRequired:true,
            employeeScore:false,
            protectedTraitOptimization:false,
            updatedAt:new Date().toISOString()
          };
          const objectId=`PEOPLE-INSTRUCTION:${userId}:${personId}:${instructionId}`;
          const privateGrantees=`{${userId}}`;
          const rows=await sql`
            select * from leader_os.apply_user_core_write(
              ${eventId},${workspaceId},${userId}::uuid,
              'EVIDENCE',${objectId},'PEOPLE_INSTRUCTION_DRAFT_UPDATED',
              ${expectedVersion},'LEADER_OS_PEOPLE',${sql.json(patch)}::jsonb,
              false,${null},'PRIVATE',${privateGrantees}::uuid[]
            )
          `;
          return json({requestId,record:rows[0]??null},200,requestId);
        }


        if (action === "people_preference_request_create") {
          await requireWorkspaceRole(sql, workspaceId, userId, new Set(["OWNER","ADMIN","LEADER","MEMBER"]));
          const personId=requiredString(body.personId,"PERSON_ID");
          if(!/^[A-Za-z0-9:_-]{1,96}$/.test(personId)) return json({error:"INVALID_PERSON_ID"},400,requestId);
          const profileObjectId=`WORKING-PERSONA:${userId}:${personId}`;
          const profiles=await sql`
            select version,data,updated_at
            from leader_os.core_records
            where workspace_id=${workspaceId}
              and object_type='EVIDENCE'
              and object_id=${profileObjectId}
              and access_scope='PRIVATE'
              and data->>'ownerUserId'=${userId}
            limit 1
          `;
          const profile=profiles[0];
          if(!profile) return json({error:"PEOPLE_PROFILE_NOT_FOUND"},404,requestId);
          const sr=profile.data?.selfReported??{};
          const safeSnapshot={
            personName:String(profile.data?.personName??'').slice(0,120),
            role:String(profile.data?.role??'').slice(0,120),
            instructionPreference:String(sr.instructionPreference??'').slice(0,500),
            autonomyPreference:String(sr.autonomyPreference??'').slice(0,24),
            checkpointPreference:String(sr.checkpointPreference??'').slice(0,300),
            feedbackPreference:String(sr.feedbackPreference??'').slice(0,300),
            reportingPreference:String(sr.reportingPreference??'').slice(0,300),
            communicationPreference:String(sr.communicationPreference??'').slice(0,300),
            focusPreference:String(sr.focusPreference??'').slice(0,300),
            availabilityPreference:String(sr.availabilityPreference??'').slice(0,300),
            preferenceConfirmedAt:String(sr.preferenceConfirmedAt??'').slice(0,40)
          };
          const daysRaw=Number(body.expiresInDays??7);
          const expiresInDays=Number.isInteger(daysRaw)?Math.min(30,Math.max(1,daysRaw)):7;
          const bytes=new Uint8Array(32); crypto.getRandomValues(bytes);
          const token=btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
          const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
          const tokenHash=Array.from(new Uint8Array(digest)).map((b)=>b.toString(16).padStart(2,'0')).join('');
          await sql`
            update leader_os.people_preference_confirmation_requests
               set status='REVOKED',reviewed_at=clock_timestamp(),updated_at=clock_timestamp()
             where workspace_id=${workspaceId}
               and owner_user_id=${userId}::uuid
               and person_id=${personId}
               and status='ACTIVE'
          `;
          const rows=await sql`
            insert into leader_os.people_preference_confirmation_requests(
              workspace_id,owner_user_id,person_id,token_hash,safe_snapshot,status,expires_at
            ) values (
              ${workspaceId},${userId}::uuid,${personId},${tokenHash},
              ${sql.json(safeSnapshot)}::jsonb,'ACTIVE',
              clock_timestamp()+make_interval(days=>${expiresInDays})
            )
            returning request_id,status,expires_at,created_at
          `;
          const base=(Deno.env.get("SUPABASE_URL")??"").replace(/\/$/,'');
          return json({
            requestId,
            preferenceRequest:{
              ...rows[0],
              personId,
              token,
              apiUrl:`${base}/functions/v1/leader-os-people-confirm`,
              tokenShownOnce:true
            }
          },201,requestId);
        }

        if (action === "people_preference_request_list") {
          await requireWorkspaceRole(sql, workspaceId, userId);
          const personFilter=typeof body.personId==="string"&&body.personId.trim()?body.personId.trim():null;
          await sql`
            update leader_os.people_preference_confirmation_requests
               set status='EXPIRED',updated_at=clock_timestamp()
             where workspace_id=${workspaceId}
               and owner_user_id=${userId}::uuid
               and status='ACTIVE'
               and expires_at<=clock_timestamp()
          `;
          const rows=await sql`
            select request_id,person_id,safe_snapshot,proposal,comment,status,expires_at,created_at,submitted_at,reviewed_at,updated_at
            from leader_os.people_preference_confirmation_requests
            where workspace_id=${workspaceId}
              and owner_user_id=${userId}::uuid
              and (${personFilter}::text is null or person_id=${personFilter})
            order by created_at desc
            limit 100
          `;
          return json({requestId,preferenceRequests:rows},200,requestId);
        }

        if (action === "people_preference_request_apply") {
          await requireWorkspaceRole(sql, workspaceId, userId, new Set(["OWNER","ADMIN","LEADER","MEMBER"]));
          const prefRequestId=requiredString(body.preferenceRequestId,"PREFERENCE_REQUEST_ID");
          const expectedVersion=Number(body.expectedProfileVersion??0);
          if(!Number.isInteger(expectedVersion)||expectedVersion<0) return json({error:"INVALID_EXPECTED_VERSION"},400,requestId);
          const reqRows=await sql`
            select *
            from leader_os.people_preference_confirmation_requests
            where request_id=${prefRequestId}::uuid
              and workspace_id=${workspaceId}
              and owner_user_id=${userId}::uuid
            limit 1
          `;
          const prefReq=reqRows[0];
          if(!prefReq) return json({error:"PREFERENCE_REQUEST_NOT_FOUND"},404,requestId);
          if(prefReq.status!=='SUBMITTED') return json({error:"PREFERENCE_REQUEST_NOT_SUBMITTED",status:prefReq.status},409,requestId);
          if(new Date(prefReq.expires_at).getTime()<=Date.now()) return json({error:"PREFERENCE_REQUEST_EXPIRED"},410,requestId);
          const personId=String(prefReq.person_id);
          const profileObjectId=`WORKING-PERSONA:${userId}:${personId}`;
          const profileRows=await sql`
            select version,data
            from leader_os.core_records
            where workspace_id=${workspaceId}
              and object_type='EVIDENCE'
              and object_id=${profileObjectId}
              and access_scope='PRIVATE'
              and data->>'ownerUserId'=${userId}
            limit 1
          `;
          const profile=profileRows[0];
          if(!profile) return json({error:"PEOPLE_PROFILE_NOT_FOUND"},404,requestId);
          if(Number(profile.version)!==expectedVersion) return json({error:"VERSION_CONFLICT",currentVersion:Number(profile.version)},409,requestId);
          const proposal=prefReq.proposal??{};
          const allowedAutonomy=new Set(["","GUIDE","COACH","SUPPORT","DELEGATE"]);
          const clip=(value:unknown,max:number)=>String(value??'').trim().slice(0,max);
          const autonomy=clip(proposal.autonomyPreference,24).toUpperCase();
          if(!allowedAutonomy.has(autonomy)) return json({error:"INVALID_AUTONOMY_PREFERENCE"},400,requestId);
          const currentData=profile.data??{};
          const currentSr=currentData.selfReported??{};
          const appliedAt=new Date().toISOString();
          const mergedSr={
            ...currentSr,
            instructionPreference:clip(proposal.instructionPreference,500),
            autonomyPreference:autonomy,
            checkpointPreference:clip(proposal.checkpointPreference,300),
            feedbackPreference:clip(proposal.feedbackPreference,300),
            reportingPreference:clip(proposal.reportingPreference,300),
            communicationPreference:clip(proposal.communicationPreference,300),
            focusPreference:clip(proposal.focusPreference,300),
            availabilityPreference:clip(proposal.availabilityPreference,300),
            preferenceConfirmedAt:appliedAt,
            styleLabelReferenceOnly:true
          };
          const history=Array.isArray(currentData.preferenceHistory)?currentData.preferenceHistory:[];
          const changedFields=["instructionPreference","autonomyPreference","checkpointPreference","feedbackPreference","reportingPreference","communicationPreference","focusPreference","availabilityPreference"]
            .filter((field)=>String(currentSr?.[field]??'')!==String((mergedSr as any)[field]??''));
          const patch={
            ...currentData,
            selfReported:mergedSr,
            preferenceHistory:[...history,{
              requestId:prefRequestId,
              submittedAt:prefReq.submitted_at,
              appliedAt,
              changedFields,
              source:"TEAM_MEMBER_CONFIRMATION"
            }].slice(-30),
            updatedAt:appliedAt
          };
          const privateGrantees=`{${userId}}`;
          const eventId=requiredString(body.eventId,"EVENT_ID");
          const writes=await sql`
            select * from leader_os.apply_user_core_write(
              ${eventId},${workspaceId},${userId}::uuid,
              'EVIDENCE',${profileObjectId},'PEOPLE_PREFERENCE_CONFIRMATION_APPLIED',
              ${expectedVersion},'LEADER_OS_PEOPLE',${sql.json(patch)}::jsonb,
              false,${null},'PRIVATE',${privateGrantees}::uuid[]
            )
          `;
          await sql`
            update leader_os.people_preference_confirmation_requests
               set status='APPLIED',reviewed_at=clock_timestamp(),updated_at=clock_timestamp()
             where request_id=${prefRequestId}::uuid
          `;
          return json({requestId,record:writes[0]??null,changedFields},200,requestId);
        }

        if (action === "people_preference_request_resolve") {
          await requireWorkspaceRole(sql, workspaceId, userId, new Set(["OWNER","ADMIN","LEADER","MEMBER"]));
          const prefRequestId=requiredString(body.preferenceRequestId,"PREFERENCE_REQUEST_ID");
          const decision=requiredString(body.decision,"DECISION").toUpperCase();
          if(!new Set(["REJECTED","REVOKED"]).has(decision)) return json({error:"INVALID_PREFERENCE_REQUEST_DECISION"},400,requestId);
          const rows=await sql`
            update leader_os.people_preference_confirmation_requests
               set status=${decision},reviewed_at=clock_timestamp(),updated_at=clock_timestamp()
             where request_id=${prefRequestId}::uuid
               and workspace_id=${workspaceId}
               and owner_user_id=${userId}::uuid
               and status in ('ACTIVE','SUBMITTED')
            returning request_id,status,updated_at
          `;
          if(!rows[0]) return json({error:"PREFERENCE_REQUEST_NOT_RESOLVABLE"},409,requestId);
          return json({requestId,preferenceRequest:rows[0]},200,requestId);
        }


        if (action === "setup_checklist_status") {
          await requireWorkspaceRole(sql, workspaceId, userId);
          const setupObjectId = `ONBOARDING-SETUP-12:${userId}`;
          let rows = await sql`
            select version,data,updated_at
            from leader_os.core_records
            where workspace_id=${workspaceId}
              and object_type='EVIDENCE'
              and object_id=${setupObjectId}
              and access_scope='WORKSPACE'
            limit 1
          `;
          let migratedFromLegacy = false;
          let legacyAmbiguous = false;

          if (!rows[0]) {
            const membership = await sql`
              select count(*)::int as active_member_count
              from leader_os.workspace_members
              where workspace_id=${workspaceId}
                and status='ACTIVE'
            `;
            const activeMemberCount = Number(membership[0]?.active_member_count ?? 0);
            const legacy = await sql`
              select version,data,updated_at
              from leader_os.core_records
              where workspace_id=${workspaceId}
                and object_type='EVIDENCE'
                and object_id='ONBOARDING-SETUP-12'
                and access_scope='WORKSPACE'
              limit 1
            `;

            if (legacy[0] && activeMemberCount === 1) {
              const legacyIds = Array.isArray(legacy[0]?.data?.checkedIds)
                ? legacy[0].data.checkedIds.filter((id: unknown) => typeof id === "string" && ONBOARDING_SETUP_IDS.has(id))
                : [];
              const patch = {
                ...legacy[0].data,
                sourceType: "ONBOARDING_SETUP",
                learnerUserId: userId,
                title: "New Leader Setup · 12 Checklist",
                truthStatus: "PRACTICE_STATE",
                checkedIds: legacyIds,
                completionCount: legacyIds.length,
                itemCount: 12,
                migratedFromObjectId: "ONBOARDING-SETUP-12",
                migratedAt: new Date().toISOString()
              };
              await sql`
                select * from leader_os.apply_user_core_write(
                  ${`MIGRATE-SETUP-${workspaceId}-${userId}`},
                  ${workspaceId},
                  ${userId}::uuid,
                  'EVIDENCE',
                  ${setupObjectId},
                  'ONBOARDING_SETUP_MIGRATED',
                  0,
                  'LEADER_OS_MIGRATION',
                  ${sql.json(patch)}::jsonb,
                  false,
                  ${null},
                  'WORKSPACE',
                  ${null}::uuid[]
                )
              `;
              rows = await sql`
                select version,data,updated_at
                from leader_os.core_records
                where workspace_id=${workspaceId}
                  and object_type='EVIDENCE'
                  and object_id=${setupObjectId}
                  and access_scope='WORKSPACE'
                limit 1
              `;
              migratedFromLegacy = true;
            } else if (legacy[0] && activeMemberCount > 1) {
              legacyAmbiguous = true;
            }
          }

          const row = rows[0];
          const checkedIds = Array.isArray(row?.data?.checkedIds)
            ? row.data.checkedIds.filter((id: unknown) => typeof id === "string" && ONBOARDING_SETUP_IDS.has(id))
            : [];
          return json({
            requestId,
            setupChecklist: {
              version: Number(row?.version ?? 0),
              checkedIds,
              updatedAt: row?.updated_at ?? null,
              storage: "SERVER",
              migratedFromLegacy,
              legacyAmbiguous
            }
          }, 200, requestId);
        }

        if (action === "setup_checklist_save") {
          await requireWorkspaceRole(sql, workspaceId, userId, new Set(["OWNER","ADMIN","LEADER","MEMBER"]));
          const setupObjectId = `ONBOARDING-SETUP-12:${userId}`;
          if (!Array.isArray(body.checkedIds)) return json({ error: "INVALID_SETUP_CHECK_IDS" }, 400, requestId);
          const checkedIds = [...new Set(body.checkedIds.map(String))];
          if (checkedIds.some((id) => !ONBOARDING_SETUP_IDS.has(id))) {
            return json({ error: "INVALID_SETUP_CHECK_IDS" }, 400, requestId);
          }
          const expectedVersion = Number(body.expectedVersion ?? 0);
          if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
            return json({ error: "INVALID_EXPECTED_VERSION" }, 400, requestId);
          }
          const eventId = requiredString(body.eventId, "EVENT_ID");
          const patch = {
            sourceType: "ONBOARDING_SETUP",
            learnerUserId: userId,
            title: "New Leader Setup · 12 Checklist",
            truthStatus: "PRACTICE_STATE",
            checkedIds,
            completionCount: checkedIds.length,
            itemCount: 12,
            updatedAt: new Date().toISOString()
          };
          const rows = await sql`
            select * from leader_os.apply_user_core_write(
              ${eventId},
              ${workspaceId},
              ${userId}::uuid,
              'EVIDENCE',
              ${setupObjectId},
              'ONBOARDING_SETUP_UPDATED',
              ${expectedVersion},
              'LEADER_OS_ONBOARDING',
              ${sql.json(patch)}::jsonb,
              false,
              ${null},
              'WORKSPACE',
              ${null}::uuid[]
            )
          `;
          return json({ requestId, record: rows[0] ?? null }, 200, requestId);
        }

        if (action === "quest_evidence_review") {
          await requireWorkspaceRole(sql, workspaceId, userId, new Set(["OWNER","ADMIN","LEADER"]));
          const evidenceId = requiredString(body.evidenceId, "EVIDENCE_ID");
          const expectedVersion = Number(body.expectedVersion);
          if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
            return json({ error: "INVALID_EXPECTED_VERSION" }, 400, requestId);
          }
          const disposition = requiredString(body.disposition, "DISPOSITION").toUpperCase();
          if (!QUEST_EVIDENCE_DISPOSITIONS.has(disposition)) {
            return json({ error: "INVALID_QUEST_EVIDENCE_DISPOSITION" }, 400, requestId);
          }
          const current = await sql`
            select version,data,confirmed
            from leader_os.core_records
            where workspace_id=${workspaceId}
              and object_type='EVIDENCE'
              and object_id=${evidenceId}
              and access_scope='WORKSPACE'
            limit 1
          `;
          if (!current[0]) return json({ error: "QUEST_EVIDENCE_NOT_FOUND" }, 404, requestId);
          if (current[0]?.data?.sourceType !== "QUEST") {
            return json({ error: "QUEST_EVIDENCE_SOURCE_REQUIRED" }, 400, requestId);
          }
          const eventId = requiredString(body.eventId, "EVENT_ID");
          const notes = optionalString(body.notes);
          const patch = {
            reviewStatus: disposition,
            reviewNotes: notes,
            reviewedAt: new Date().toISOString(),
            promotionCandidate: disposition === "ACCEPTED_FOR_CONTEXT",
            confirmedFact: false,
            requiresHumanReviewBeforeCoreFact: true
          };
          const rows = await sql`
            select * from leader_os.apply_user_core_write(
              ${eventId},
              ${workspaceId},
              ${userId}::uuid,
              'EVIDENCE',
              ${evidenceId},
              'QUEST_EVIDENCE_REVIEWED',
              ${expectedVersion},
              'LEADER_OS_30_DAY_QUEST',
              ${sql.json(patch)}::jsonb,
              false,
              ${null},
              'WORKSPACE',
              ${null}::uuid[]
            )
          `;
          return json({ requestId, evidence: rows[0] ?? null }, 200, requestId);
        }


        if (action === "quest_progress_status") {
          await requireWorkspaceRole(sql, workspaceId, userId);
          const progressObjectId = `LEADERSHIP-QUEST-PROGRESS:${userId}`;
          let rows = await sql`
            select version,data,updated_at
            from leader_os.core_records
            where workspace_id=${workspaceId}
              and object_type='EVIDENCE'
              and object_id=${progressObjectId}
              and access_scope='WORKSPACE'
            limit 1
          `;
          let migratedFromLegacy = false;
          let legacyAmbiguous = false;

          if (!rows[0]) {
            const membership = await sql`
              select count(*)::int as active_member_count
              from leader_os.workspace_members
              where workspace_id=${workspaceId}
                and status='ACTIVE'
            `;
            const activeMemberCount = Number(membership[0]?.active_member_count ?? 0);
            const legacy = await sql`
              select version,data,updated_at
              from leader_os.core_records
              where workspace_id=${workspaceId}
                and object_type='EVIDENCE'
                and object_id='LEADERSHIP-QUEST-PROGRESS'
                and access_scope='WORKSPACE'
              limit 1
            `;

            if (legacy[0] && activeMemberCount === 1) {
              const rawLegacyDays = Array.isArray(legacy[0]?.data?.completedDays) ? legacy[0].data.completedDays : [];
              const legacyDays = [...new Set(rawLegacyDays.map(Number))]
                .filter((day) => Number.isInteger(day) && day >= 1 && day <= 30)
                .sort((a,b) => a-b);
              const legacySelectedRaw = Number(legacy[0]?.data?.selectedDay ?? 1);
              const legacySelected = Number.isInteger(legacySelectedRaw) && legacySelectedRaw >= 1 && legacySelectedRaw <= 30 ? legacySelectedRaw : 1;
              const legacyPhase = legacySelected <= 7 ? "UNDERSTAND" : legacySelected <= 14 ? "ALIGN" : legacySelected <= 21 ? "EMPOWER" : "COACH";
              const patch = {
                ...legacy[0].data,
                sourceType: "QUEST_PROGRESS",
                learnerUserId: userId,
                title: "30-Day Leadership Quest Progress",
                truthStatus: "PRACTICE_STATE",
                completedDays: legacyDays,
                completionCount: legacyDays.length,
                itemCount: 30,
                percent: Math.round((legacyDays.length / 30) * 100),
                selectedDay: legacySelected,
                currentPhase: legacyPhase,
                migratedFromObjectId: "LEADERSHIP-QUEST-PROGRESS",
                migratedAt: new Date().toISOString()
              };
              await sql`
                select * from leader_os.apply_user_core_write(
                  ${`MIGRATE-QUEST-PROGRESS-${workspaceId}-${userId}`},
                  ${workspaceId},
                  ${userId}::uuid,
                  'EVIDENCE',
                  ${progressObjectId},
                  'LEADERSHIP_QUEST_PROGRESS_MIGRATED',
                  0,
                  'LEADER_OS_MIGRATION',
                  ${sql.json(patch)}::jsonb,
                  false,
                  ${null},
                  'WORKSPACE',
                  ${null}::uuid[]
                )
              `;
              rows = await sql`
                select version,data,updated_at
                from leader_os.core_records
                where workspace_id=${workspaceId}
                  and object_type='EVIDENCE'
                  and object_id=${progressObjectId}
                  and access_scope='WORKSPACE'
                limit 1
              `;
              migratedFromLegacy = true;
            } else if (legacy[0] && activeMemberCount > 1) {
              legacyAmbiguous = true;
            }
          }

          const row = rows[0];
          const rawCompleted = Array.isArray(row?.data?.completedDays) ? row.data.completedDays : [];
          const completedDays = [...new Set(rawCompleted.map(Number))]
            .filter((day) => Number.isInteger(day) && day >= 1 && day <= 30)
            .sort((a,b) => a-b);
          const selectedDayRaw = Number(row?.data?.selectedDay ?? 1);
          const selectedDay = Number.isInteger(selectedDayRaw) && selectedDayRaw >= 1 && selectedDayRaw <= 30 ? selectedDayRaw : 1;
          return json({
            requestId,
            questProgress: {
              version: Number(row?.version ?? 0),
              completedDays,
              selectedDay,
              currentPhase: row?.data?.currentPhase ?? null,
              updatedAt: row?.updated_at ?? null,
              storage: "SERVER",
              migratedFromLegacy,
              legacyAmbiguous
            }
          }, 200, requestId);
        }

        if (action === "quest_progress_save") {
          await requireWorkspaceRole(sql, workspaceId, userId, new Set(["OWNER","ADMIN","LEADER","MEMBER"]));
          const progressObjectId = `LEADERSHIP-QUEST-PROGRESS:${userId}`;
          if (!Array.isArray(body.completedDays)) return json({ error: "INVALID_QUEST_PROGRESS" }, 400, requestId);
          const completedDays = [...new Set(body.completedDays.map(Number))]
            .filter((day) => Number.isInteger(day) && day >= 1 && day <= 30)
            .sort((a,b) => a-b);
          if (completedDays.length !== new Set(body.completedDays.map(Number)).size) {
            return json({ error: "INVALID_QUEST_PROGRESS" }, 400, requestId);
          }
          const selectedDay = Number(body.selectedDay ?? 1);
          if (!Number.isInteger(selectedDay) || selectedDay < 1 || selectedDay > 30) {
            return json({ error: "INVALID_QUEST_PROGRESS" }, 400, requestId);
          }
          const expectedVersion = Number(body.expectedVersion ?? 0);
          if (!Number.isInteger(expectedVersion) || expectedVersion < 0) {
            return json({ error: "INVALID_EXPECTED_VERSION" }, 400, requestId);
          }
          const eventId = requiredString(body.eventId, "EVENT_ID");
          const phase = selectedDay <= 7 ? "UNDERSTAND" : selectedDay <= 14 ? "ALIGN" : selectedDay <= 21 ? "EMPOWER" : "COACH";
          const patch = {
            sourceType: "QUEST_PROGRESS",
            learnerUserId: userId,
            title: "30-Day Leadership Quest Progress",
            truthStatus: "PRACTICE_STATE",
            completedDays,
            completionCount: completedDays.length,
            itemCount: 30,
            percent: Math.round((completedDays.length / 30) * 100),
            selectedDay,
            currentPhase: phase,
            updatedAt: new Date().toISOString()
          };
          const rows = await sql`
            select * from leader_os.apply_user_core_write(
              ${eventId},
              ${workspaceId},
              ${userId}::uuid,
              'EVIDENCE',
              ${progressObjectId},
              'LEADERSHIP_QUEST_PROGRESS_UPDATED',
              ${expectedVersion},
              'LEADER_OS_30_DAY_HARNESS',
              ${sql.json(patch)}::jsonb,
              false,
              ${null},
              'WORKSPACE',
              ${null}::uuid[]
            )
          `;
          return json({ requestId, record: rows[0] ?? null }, 200, requestId);
        }


        if (action === "operating_artifacts_status") {
          await requireWorkspaceRole(sql, workspaceId, userId);
          const rawLimit = Number(body.limit ?? 200);
          const limit = Number.isInteger(rawLimit) ? Math.max(1, Math.min(rawLimit, 300)) : 200;
          const rows = await sql`
            select object_id,version,data,updated_at
            from leader_os.core_records
            where workspace_id=${workspaceId}
              and object_type='EVIDENCE'
              and access_scope='WORKSPACE'
              and data->>'sourceType'='OPERATING_ARTIFACT'
              and coalesce(data->>'lifecycle','ACTIVE') <> 'DELETED'
            order by updated_at desc
            limit ${limit}
          `;
          const artifacts = rows.map((row: any) => ({
            objectId: row.object_id,
            version: Number(row.version ?? 0),
            artifactId: row.data?.artifactId ?? null,
            artifactType: row.data?.artifactType ?? null,
            artifactState: row.data?.artifactState ?? "DRAFT",
            localVersion: Number(row.data?.localVersion ?? 1),
            title: row.data?.title ?? null,
            payload: row.data?.payload && typeof row.data.payload === "object" ? row.data.payload : {},
            updatedAt: row.updated_at ?? null,
          })).filter((item: any) => item.artifactId && OPERATING_ARTIFACT_TYPES.has(String(item.artifactType)));
          return json({ requestId, artifacts, count: artifacts.length }, 200, requestId);
        }

        if (action === "operating_artifact_save") {
          const role = await requireWorkspaceRole(sql, workspaceId, userId, new Set(["OWNER","ADMIN","LEADER","MEMBER"]));
          const eventId = requiredString(body.eventId, "EVENT_ID");
          const artifactId = requiredString(body.artifactId, "ARTIFACT_ID");
          const artifactType = requiredString(body.artifactType, "ARTIFACT_TYPE").toUpperCase();
          const artifactState = requiredString(body.artifactState, "ARTIFACT_STATE").toUpperCase();
          if (!OPERATING_ARTIFACT_TYPES.has(artifactType)) return json({ error: "INVALID_OPERATING_ARTIFACT_TYPE" }, 400, requestId);
          if (!OPERATING_ARTIFACT_STATES.has(artifactState)) return json({ error: "INVALID_OPERATING_ARTIFACT_STATE" }, 400, requestId);
          const expectedVersion = Number(body.expectedVersion ?? 0);
          if (!Number.isInteger(expectedVersion) || expectedVersion < 0) return json({ error: "INVALID_EXPECTED_VERSION" }, 400, requestId);
          const localVersion = Number(body.localVersion ?? 1);
          if (!Number.isInteger(localVersion) || localVersion < 1) return json({ error: "INVALID_LOCAL_VERSION" }, 400, requestId);
          const payload = body.payload && typeof body.payload === "object" && !Array.isArray(body.payload) ? body.payload : {};
          if (JSON.stringify(payload).length > 64000) return json({ error: "OPERATING_ARTIFACT_PAYLOAD_TOO_LARGE" }, 413, requestId);

          const objectId = `ARTIFACT:${artifactId}`;
          const existing = await sql`
            select version,data,created_by_user_id
            from leader_os.core_records
            where workspace_id=${workspaceId}
              and object_type='EVIDENCE'
              and object_id=${objectId}
            limit 1
          `;
          const previousState = String(existing[0]?.data?.artifactState ?? "DRAFT").toUpperCase();
          if ((artifactState === "CONFIRMED" || previousState === "CONFIRMED") && !["OWNER","ADMIN","LEADER"].includes(role)) {
            return json({ error: "LEADER_ROLE_REQUIRED" }, 403, requestId);
          }

          const title = optionalString(body.title) ?? artifactType.replaceAll("_"," ");
          const patch = {
            sourceType: "OPERATING_ARTIFACT",
            truthStatus: artifactState === "CONFIRMED" ? "CONFIRMED_ARTIFACT" : "DRAFT_ARTIFACT",
            artifactId,
            artifactType,
            artifactState,
            localVersion,
            title,
            payload,
            lifecycle: "ACTIVE",
            humanConfirmed: artifactState === "CONFIRMED",
            confirmedFact: false,
            requiresHumanReviewBeforeCoreFact: true,
            syncedAt: new Date().toISOString(),
          };
          const rows = await sql`
            select * from leader_os.apply_user_core_write(
              ${eventId},
              ${workspaceId},
              ${userId}::uuid,
              'EVIDENCE',
              ${objectId},
              ${artifactState === "CONFIRMED" ? "OPERATING_ARTIFACT_CONFIRMED" : "OPERATING_ARTIFACT_SAVED"},
              ${expectedVersion},
              'LEADER_OS_OPERATING_ARTIFACT',
              ${sql.json(patch)}::jsonb,
              false,
              ${null},
              'WORKSPACE',
              ${null}::uuid[]
            )
          `;
          return json({ requestId, artifact: rows[0] ?? null }, 200, requestId);
        }

        if (action === "operating_artifact_delete") {
          const role = await requireWorkspaceRole(sql, workspaceId, userId, new Set(["OWNER","ADMIN","LEADER","MEMBER"]));
          const eventId = requiredString(body.eventId, "EVENT_ID");
          const artifactId = requiredString(body.artifactId, "ARTIFACT_ID");
          const objectId = `ARTIFACT:${artifactId}`;
          const expectedVersion = Number(body.expectedVersion);
          if (!Number.isInteger(expectedVersion) || expectedVersion < 1) return json({ error: "INVALID_EXPECTED_VERSION" }, 400, requestId);
          const existing = await sql`
            select version,data,created_by_user_id
            from leader_os.core_records
            where workspace_id=${workspaceId}
              and object_type='EVIDENCE'
              and object_id=${objectId}
            limit 1
          `;
          if (!existing[0]) return json({ error: "OPERATING_ARTIFACT_NOT_FOUND" }, 404, requestId);
          const priorState = String(existing[0]?.data?.artifactState ?? "DRAFT").toUpperCase();
          const isLeader = ["OWNER","ADMIN","LEADER"].includes(role);
          const isCreator = String(existing[0]?.created_by_user_id ?? "") === userId;
          if (priorState === "CONFIRMED" && !isLeader) return json({ error: "LEADER_ROLE_REQUIRED" }, 403, requestId);
          if (!isLeader && !isCreator) return json({ error: "OPERATING_ARTIFACT_DELETE_ROLE_REQUIRED" }, 403, requestId);

          const patch = {
            lifecycle: "DELETED",
            artifactState: "DRAFT",
            humanConfirmed: false,
            confirmedFact: false,
            deletedAt: new Date().toISOString(),
            deletedBy: userId
          };
          const rows = await sql`
            select * from leader_os.apply_user_core_write(
              ${eventId},
              ${workspaceId},
              ${userId}::uuid,
              'EVIDENCE',
              ${objectId},
              'OPERATING_ARTIFACT_DELETED',
              ${expectedVersion},
              'LEADER_OS_OPERATING_ARTIFACT',
              ${sql.json(patch)}::jsonb,
              false,
              ${null},
              'WORKSPACE',
              ${null}::uuid[]
            )
          `;
          return json({ requestId, artifact: rows[0] ?? null }, 200, requestId);
        }


        if (action === "addon_health") {
          await requireWorkspaceRole(sql, workspaceId, userId);
          const config = opickerConfig();
          if (!config) return json({ error: "ADDON_RUNTIME_UNAVAILABLE", addonId: OPICKER_MODULE_ID }, 503, requestId);
          const upstream = await callOpicker(config, "/api/leader-addon/health", { method: "GET" });
          const mapped = mapAddonUpstream(upstream, requestId);
          if (mapped) return mapped;
          return json({ requestId, addonId: OPICKER_MODULE_ID, health: upstream.body }, 200, requestId);
        }

        if (action === "addon_trial_start") {
          await requireWorkspaceRole(sql, workspaceId, userId, new Set(["OWNER","ADMIN"]));
          const config = opickerConfig();
          if (!config) return json({ error: "ADDON_RUNTIME_UNAVAILABLE", addonId: OPICKER_MODULE_ID }, 503, requestId);
          const upstream = await callOpicker(config, "/api/leader-addon/trial/start", {
            method: "POST",
            body: JSON.stringify({ workspaceId }),
          });
          const mapped = mapAddonUpstream(upstream, requestId);
          if (mapped) return mapped;
          return json({ requestId, addonId: OPICKER_MODULE_ID, ...upstream.body }, upstream.status, requestId);
        }

        if (action === "addon_analyze") {
          await requireWorkspaceRole(sql, workspaceId, userId, new Set(["OWNER","ADMIN","LEADER","MEMBER"]));
          const config = opickerConfig();
          if (!config) return json({ error: "ADDON_RUNTIME_UNAVAILABLE", addonId: OPICKER_MODULE_ID }, 503, requestId);

          const addonRequestId = requiredString(body.requestId, "REQUEST_ID");
          const input = body.input && typeof body.input === "object" && !Array.isArray(body.input)
            ? body.input as Record<string,unknown> : {};
          const targetUrl = requiredString(input.url, "TARGET_URL");
          let parsedUrl: URL;
          try { parsedUrl = new URL(targetUrl); } catch { return json({ error: "INVALID_TARGET_URL" }, 400, requestId); }
          if (!["http:","https:"].includes(parsedUrl.protocol)) return json({ error: "INVALID_TARGET_URL" }, 400, requestId);

          if (!Array.isArray(body.capabilities) || body.capabilities.length === 0) {
            return json({ error: "INVALID_ADDON_CAPABILITIES" }, 400, requestId);
          }
          const capabilities = [...new Set(body.capabilities.map(String))];
          if (capabilities.some((c) => !OPICKER_CAPABILITIES.has(c))) {
            return json({ error: "UNSUPPORTED_ADDON_CAPABILITY" }, 400, requestId);
          }

          const route = body.routeContext && typeof body.routeContext === "object" && !Array.isArray(body.routeContext)
            ? body.routeContext as Record<string,unknown> : {};

          const envelope = {
            schemaVersion: "0.2",
            moduleId: OPICKER_MODULE_ID,
            requestId: addonRequestId,
            workspaceId,
            capabilities,
            allowedContext: { namespaces: ["project","company","evidence"] },
            routeContext: {
              projectId: optionalString(route.projectId),
              companyId: optionalString(route.companyId),
            },
            input: {
              url: parsedUrl.toString(),
              forceRefresh: input.forceRefresh === true,
            },
          };

          const upstream = await callOpicker(config, "/api/leader-addon/analyze", {
            method: "POST",
            body: JSON.stringify(envelope),
          });
          const mapped = mapAddonUpstream(upstream, requestId);
          if (mapped) return mapped;
          if (upstream.status < 200 || upstream.status >= 300 || !upstream.body || typeof upstream.body !== "object") {
            return json({ error: "INVALID_ADDON_RESPONSE" }, 502, requestId);
          }

          const rows = await sql`
            select * from leader_os.ingest_addon_evidence(
              ${workspaceId},
              ${userId}::uuid,
              ${OPICKER_MODULE_ID},
              ${OPICKER_PRODUCT_SKU},
              ${addonRequestId},
              ${sql.json(upstream.body)}::jsonb
            )
          `;
          return json({
            requestId,
            addonId: OPICKER_MODULE_ID,
            productSku: OPICKER_PRODUCT_SKU,
            evidence: rows[0] ?? null,
            upstreamIdempotency: upstream.body?.idempotency ?? null,
          }, 200, requestId);
        }

        if (action === "addon_review") {
          await requireWorkspaceRole(sql, workspaceId, userId, new Set(["OWNER","ADMIN","LEADER"]));
          const eventId = requiredString(body.eventId, "EVENT_ID");
          const evidenceId = requiredString(body.evidenceId, "EVIDENCE_ID");
          const disposition = requiredString(body.disposition, "DISPOSITION").toUpperCase();
          const expectedVersion = Number(body.expectedVersion);
          if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
            return json({ error: "INVALID_EXPECTED_VERSION" }, 400, requestId);
          }
          const notes = optionalString(body.notes);
          const rows = await sql`
            select * from leader_os.review_addon_evidence(
              ${eventId},
              ${workspaceId},
              ${userId}::uuid,
              ${evidenceId},
              ${expectedVersion},
              ${disposition},
              ${notes}
            )
          `;
          return json({ requestId, evidence: rows[0] ?? null }, 200, requestId);
        }

        return json({ error: "UNKNOWN_ACTION" }, 400, requestId);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.startsWith("INVALID_")) return json({ error: message }, 400, requestId);
        const mapped = dbErrorCode(message);
        console.error(JSON.stringify({ requestId, code: mapped.code }));
        return json({ error: mapped.code, requestId }, mapped.status, requestId);
      } finally {
        await sql.end({ timeout: 1 }).catch(() => {});
      }
    }
  )
);
