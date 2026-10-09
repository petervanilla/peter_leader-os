export class RuntimeHttpError extends Error {
    code;
    status;
    requestId;
    constructor(code, status, requestId = null) {
        super(code);
        this.code = code;
        this.status = status;
        this.requestId = requestId;
        this.name = 'RuntimeHttpError';
    }
}
function required(value, name) {
    const trimmed = value?.trim();
    if (!trimmed)
        throw new Error(`${name}_REQUIRED`);
    return trimmed;
}
export class LeaderOsRuntimeClient {
    config;
    transport;
    baseUrl;
    constructor(config, transport = fetch) {
        this.config = config;
        this.transport = transport;
        const supabaseUrl = required(config.supabaseUrl, 'SUPABASE_URL').replace(/\/+$/, '');
        required(config.publishableKey, 'SUPABASE_PUBLISHABLE_KEY');
        if (!config.accessToken?.trim() && !config.accessTokenProvider) {
            throw new Error('SUPABASE_ACCESS_TOKEN_REQUIRED');
        }
        this.baseUrl = `${supabaseUrl}/functions/v1/leader-os-runtime`;
    }
    async accessToken() {
        const raw = this.config.accessTokenProvider
            ? await this.config.accessTokenProvider()
            : this.config.accessToken;
        return required(raw, 'SUPABASE_ACCESS_TOKEN');
    }
    async invoke(body) {
        const accessToken = await this.accessToken();
        const response = await this.transport(this.baseUrl, {
            method: 'POST',
            headers: {
                apikey: this.config.publishableKey,
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        let payload = {};
        try {
            payload = (await response.json());
        }
        catch {
            // Keep an empty payload so transport failures still map to a stable error.
        }
        if (!response.ok) {
            throw new RuntimeHttpError(typeof payload.error === 'string' ? payload.error : 'RUNTIME_REQUEST_FAILED', response.status, typeof payload.requestId === 'string' ? payload.requestId : response.headers.get('x-request-id'));
        }
        return payload;
    }
    async bootstrapWorkspace(input) {
        const workspaceId = required(input.workspaceId, 'WORKSPACE_ID');
        const workspaceName = required(input.workspaceName, 'WORKSPACE_NAME');
        return this.invoke({ action: 'bootstrap', workspaceId, workspaceName });
    }
    async getContext(workspaceId, maxRecords = 100) {
        return this.invoke({
            action: 'context',
            workspaceId: required(workspaceId, 'WORKSPACE_ID'),
            maxRecords
        });
    }
    async addonHealth(workspaceId) {
        return this.invoke({
            action: 'addon_health',
            workspaceId: required(workspaceId, 'WORKSPACE_ID')
        });
    }
    async startAddonTrial(workspaceId) {
        return this.invoke({
            action: 'addon_trial_start',
            workspaceId: required(workspaceId, 'WORKSPACE_ID')
        });
    }
    async analyzeAddon(input) {
        return this.invoke({
            action: 'addon_analyze',
            workspaceId: required(input.workspaceId, 'WORKSPACE_ID'),
            requestId: required(input.requestId, 'REQUEST_ID'),
            capabilities: input.capabilities,
            input: input.input,
            routeContext: input.routeContext ?? {}
        });
    }
    async reviewAddonEvidence(input) {
        return this.invoke({
            action: 'addon_review',
            workspaceId: required(input.workspaceId, 'WORKSPACE_ID'),
            eventId: required(input.eventId, 'EVENT_ID'),
            evidenceId: required(input.evidenceId, 'EVIDENCE_ID'),
            expectedVersion: input.expectedVersion,
            disposition: input.disposition,
            notes: input.notes ?? null
        });
    }
    async reportStatus(workspaceId, limit = 20) {
        return this.invoke({
            action: 'report_status',
            workspaceId: required(workspaceId, 'WORKSPACE_ID'),
            limit
        });
    }
    async reportOpsStatus(workspaceId) {
        return this.invoke({
            action: 'report_ops_status',
            workspaceId: required(workspaceId, 'WORKSPACE_ID')
        });
    }
    async searchWorkspace(workspaceId, query = '', limit = 20) {
        return this.invoke({
            action: 'search',
            workspaceId: required(workspaceId, 'WORKSPACE_ID'),
            query: typeof query === 'string' ? query : '',
            limit
        });
    }
    async searchDetail(workspaceId, objectType, objectId) {
        return this.invoke({
            action: 'search_detail',
            workspaceId: required(workspaceId, 'WORKSPACE_ID'),
            objectType: required(objectType, 'OBJECT_TYPE'),
            objectId: required(objectId, 'OBJECT_ID')
        });
    }
    async onboardingContextStatus(workspaceId) {
        return this.invoke({
            action: 'onboarding_context_status',
            workspaceId: required(workspaceId, 'WORKSPACE_ID')
        });
    }
    async saveOnboardingContext(input) {
        return this.invoke({
            action: 'onboarding_context_save',
            workspaceId: required(input.workspaceId, 'WORKSPACE_ID'),
            eventId: required(input.eventId, 'EVENT_ID'),
            expectedVersion: input.expectedVersion ?? 0,
            role: input.role ?? 'TEAM_MANAGER',
            situation: input.situation ?? 'NEW_ROLE',
            teamName: input.teamName ?? '',
            manager: input.manager ?? '',
            startDate: input.startDate ?? '',
            managerSync: input.managerSync ?? '',
            question: input.question ?? ''
        });
    }
    async leadershipResumeStatus(workspaceId) {
        return this.invoke({
            action: 'leadership_resume_status',
            workspaceId: required(workspaceId, 'WORKSPACE_ID')
        });
    }
    async leadershipOnboardingRoster(workspaceId) {
        return this.invoke({
            action: 'leadership_onboarding_roster',
            workspaceId: required(workspaceId, 'WORKSPACE_ID')
        });
    }
    async missionChecklistStatus(workspaceId) {
        return this.invoke({
            action: 'mission_checklist_status',
            workspaceId: required(workspaceId, 'WORKSPACE_ID')
        });
    }
    async saveMissionChecklist(input) {
        return this.invoke({
            action: 'mission_checklist_save',
            workspaceId: required(input.workspaceId, 'WORKSPACE_ID'),
            eventId: required(input.eventId, 'EVENT_ID'),
            expectedVersion: input.expectedVersion ?? 0,
            checksByDay: input.checksByDay ?? {}
        });
    }
    async leadershipSelfCheckStatus(workspaceId) {
        return this.invoke({
            action: 'leadership_self_check_status',
            workspaceId: required(workspaceId, 'WORKSPACE_ID')
        });
    }
    async saveLeadershipSelfCheck(input) {
        return this.invoke({
            action: 'leadership_self_check_save',
            workspaceId: required(input.workspaceId, 'WORKSPACE_ID'),
            eventId: required(input.eventId, 'EVENT_ID'),
            expectedVersion: input.expectedVersion ?? 0,
            levelsByDay: input.levelsByDay ?? {}
        });
    }
    async createPeoplePreferenceRequest(input) {
        return this.invoke({
            action: 'people_preference_request_create',
            workspaceId: required(input.workspaceId, 'WORKSPACE_ID'),
            personId: required(input.personId, 'PERSON_ID'),
            expiresInDays: input.expiresInDays ?? 7
        });
    }
    async listPeoplePreferenceRequests(workspaceId, personId = null) {
        return this.invoke({
            action: 'people_preference_request_list',
            workspaceId: required(workspaceId, 'WORKSPACE_ID'),
            personId: personId || null
        });
    }
    async applyPeoplePreferenceRequest(input) {
        return this.invoke({
            action: 'people_preference_request_apply',
            workspaceId: required(input.workspaceId, 'WORKSPACE_ID'),
            preferenceRequestId: required(input.preferenceRequestId, 'PREFERENCE_REQUEST_ID'),
            expectedProfileVersion: input.expectedProfileVersion ?? 0,
            eventId: required(input.eventId, 'EVENT_ID')
        });
    }
    async resolvePeoplePreferenceRequest(input) {
        return this.invoke({
            action: 'people_preference_request_resolve',
            workspaceId: required(input.workspaceId, 'WORKSPACE_ID'),
            preferenceRequestId: required(input.preferenceRequestId, 'PREFERENCE_REQUEST_ID'),
            decision: required(input.decision, 'DECISION')
        });
    }
    async peopleCollaborationStatus(workspaceId, personId = null) {
        return this.invoke({
            action: 'people_collaboration_status',
            workspaceId: required(workspaceId, 'WORKSPACE_ID'),
            personId: personId || null
        });
    }
    async savePeopleProfile(input) {
        return this.invoke({
            action: 'people_profile_save',
            workspaceId: required(input.workspaceId, 'WORKSPACE_ID'),
            eventId: required(input.eventId, 'EVENT_ID'),
            expectedVersion: input.expectedVersion ?? 0,
            personId: required(input.personId, 'PERSON_ID'),
            personName: input.personName ?? '',
            role: input.role ?? '',
            instructionPreference: input.instructionPreference ?? '',
            autonomyPreference: input.autonomyPreference ?? '',
            checkpointPreference: input.checkpointPreference ?? '',
            feedbackPreference: input.feedbackPreference ?? '',
            reportingPreference: input.reportingPreference ?? '',
            communicationPreference: input.communicationPreference ?? '',
            focusPreference: input.focusPreference ?? '',
            availabilityPreference: input.availabilityPreference ?? '',
            styleLabel: input.styleLabel ?? '',
            preferenceConfirmedAt: input.preferenceConfirmedAt ?? '',
            patterns: Array.isArray(input.patterns) ? input.patterns : []
        });
    }
    async savePeopleSource(input) {
        return this.invoke({
            action: 'people_source_save',
            workspaceId: required(input.workspaceId, 'WORKSPACE_ID'),
            eventId: required(input.eventId, 'EVENT_ID'),
            expectedVersion: input.expectedVersion ?? 0,
            personId: required(input.personId, 'PERSON_ID'),
            sourceId: required(input.sourceId, 'SOURCE_ID'),
            sourceKind: input.sourceKind ?? 'NOTE',
            occurredAt: input.occurredAt ?? '',
            summary: input.summary ?? '',
            transcriptExcerpt: input.transcriptExcerpt ?? '',
            candidatePatterns: Array.isArray(input.candidatePatterns) ? input.candidatePatterns : [],
            consentConfirmed: Boolean(input.consentConfirmed),
            fileName: input.fileName ?? '',
            mimeType: input.mimeType ?? '',
            sizeBytes: input.sizeBytes ?? 0,
            storagePath: input.storagePath ?? '',
            linkedInstructionId: input.linkedInstructionId ?? '',
            reworkRounds: input.reworkRounds ?? null,
            checkpointOutcome: input.checkpointOutcome ?? '',
            instructionOutcome: input.instructionOutcome ?? ''
        });
    }
    async savePeopleInstruction(input) {
        return this.invoke({
            action: 'people_instruction_save',
            workspaceId: required(input.workspaceId, 'WORKSPACE_ID'),
            eventId: required(input.eventId, 'EVENT_ID'),
            expectedVersion: input.expectedVersion ?? 0,
            personId: required(input.personId, 'PERSON_ID'),
            instructionId: required(input.instructionId, 'INSTRUCTION_ID'),
            task: input.task ?? '',
            goal: input.goal ?? '',
            context: input.context ?? '',
            output: input.output ?? '',
            doneCriteria: input.doneCriteria ?? '',
            autonomy: input.autonomy ?? '',
            guardrail: input.guardrail ?? '',
            checkpoint: input.checkpoint ?? '',
            reporting: input.reporting ?? '',
            feedback: input.feedback ?? '',
            workflow: Array.isArray(input.workflow) ? input.workflow : [],
            rationaleSources: Array.isArray(input.rationaleSources) ? input.rationaleSources : [],
            patternRefs: Array.isArray(input.patternRefs) ? input.patternRefs : [],
            rationaleDetails: Array.isArray(input.rationaleDetails) ? input.rationaleDetails : []
        });
    }
    async setupChecklistStatus(workspaceId) {
        return this.invoke({
            action: 'setup_checklist_status',
            workspaceId: required(workspaceId, 'WORKSPACE_ID')
        });
    }
    async questProgressStatus(workspaceId) {
        return this.invoke({
            action: 'quest_progress_status',
            workspaceId: required(workspaceId, 'WORKSPACE_ID')
        });
    }
    async saveQuestProgress(input) {
        return this.invoke({
            action: 'quest_progress_save',
            workspaceId: required(input.workspaceId, 'WORKSPACE_ID'),
            eventId: required(input.eventId, 'EVENT_ID'),
            expectedVersion: input.expectedVersion ?? 0,
            completedDays: Array.isArray(input.completedDays) ? input.completedDays : [],
            selectedDay: input.selectedDay ?? 1
        });
    }
    async saveSetupChecklist(input) {
        return this.invoke({
            action: 'setup_checklist_save',
            workspaceId: required(input.workspaceId, 'WORKSPACE_ID'),
            eventId: required(input.eventId, 'EVENT_ID'),
            expectedVersion: input.expectedVersion ?? 0,
            checkedIds: Array.isArray(input.checkedIds) ? input.checkedIds : []
        });
    }
    async reviewQuestEvidence(input) {
        return this.invoke({
            action: 'quest_evidence_review',
            workspaceId: required(input.workspaceId, 'WORKSPACE_ID'),
            eventId: required(input.eventId, 'EVENT_ID'),
            evidenceId: required(input.evidenceId, 'EVIDENCE_ID'),
            expectedVersion: input.expectedVersion,
            disposition: required(input.disposition, 'DISPOSITION'),
            notes: input.notes ?? null
        });
    }
    async operatingArtifactsStatus(workspaceId, limit = 200) {
        return this.invoke({
            action: 'operating_artifacts_status',
            workspaceId: required(workspaceId, 'WORKSPACE_ID'),
            limit
        });
    }
    async saveOperatingArtifact(input) {
        return this.invoke({
            action: 'operating_artifact_save',
            workspaceId: required(input.workspaceId, 'WORKSPACE_ID'),
            eventId: required(input.eventId, 'EVENT_ID'),
            artifactId: required(input.artifactId, 'ARTIFACT_ID'),
            artifactType: required(input.artifactType, 'ARTIFACT_TYPE'),
            artifactState: required(input.artifactState, 'ARTIFACT_STATE'),
            expectedVersion: input.expectedVersion ?? 0,
            localVersion: input.localVersion ?? 1,
            title: input.title ?? null,
            payload: input.payload ?? {}
        });
    }
    async deleteOperatingArtifact(input) {
        return this.invoke({
            action: 'operating_artifact_delete',
            workspaceId: required(input.workspaceId, 'WORKSPACE_ID'),
            eventId: required(input.eventId, 'EVENT_ID'),
            artifactId: required(input.artifactId, 'ARTIFACT_ID'),
            expectedVersion: input.expectedVersion
        });
    }
    async linkQuestEvidence(input) {
        return this.invoke({
            action: 'quest_evidence_link',
            workspaceId: required(input.workspaceId, 'WORKSPACE_ID'),
            eventId: required(input.eventId, 'EVENT_ID'),
            questDay: input.questDay,
            questTitle: required(input.questTitle, 'QUEST_TITLE'),
            artifactType: input.artifactType ?? null,
            evidenceText: input.evidenceText ?? null,
            linkedObjectType: input.linkedObjectType ?? null,
            linkedObjectId: input.linkedObjectId ?? null
        });
    }
    async saveReportSchedule(input) {
        return this.invoke({
            action: 'report_schedule_save',
            workspaceId: required(input.workspaceId, 'WORKSPACE_ID'),
            timezone: input.timezone ?? 'Asia/Seoul',
            dailyEnabled: input.dailyEnabled === true,
            dailyTime: input.dailyTime ?? '17:30',
            dailyWeekdays: input.dailyWeekdays ?? [1, 2, 3, 4, 5],
            weeklyEnabled: input.weeklyEnabled === true,
            weeklyIsoDow: input.weeklyIsoDow ?? 5,
            weeklyTime: input.weeklyTime ?? '16:00'
        });
    }
    async prepareReportNow(input) {
        return this.invoke({
            action: 'report_prepare_now',
            workspaceId: required(input.workspaceId, 'WORKSPACE_ID'),
            reportType: input.reportType
        });
    }
    async confirmReport(input) {
        return this.invoke({
            action: 'report_confirm',
            workspaceId: required(input.workspaceId, 'WORKSPACE_ID'),
            reportId: required(input.reportId, 'REPORT_ID'),
            expectedVersion: input.expectedVersion,
            finalPatch: input.finalPatch ?? {}
        });
    }
    async queueReportDelivery(input) {
        return this.invoke({
            action: 'report_queue_delivery',
            workspaceId: required(input.workspaceId, 'WORKSPACE_ID'),
            reportId: required(input.reportId, 'REPORT_ID'),
            channel: input.channel,
            targetRef: input.targetRef ?? null
        });
    }
    async write(input) {
        return this.invoke({
            action: 'write',
            workspaceId: required(input.workspaceId, 'WORKSPACE_ID'),
            eventId: required(input.eventId, 'EVENT_ID'),
            objectType: input.objectType,
            objectId: required(input.objectId, 'OBJECT_ID'),
            eventType: required(input.eventType, 'EVENT_TYPE'),
            expectedVersion: input.expectedVersion,
            source: input.source ?? 'APP',
            patch: input.patch ?? {},
            confirmed: input.confirmed ?? null,
            supersededBy: input.supersededBy ?? null,
            accessScope: input.accessScope ?? null,
            granteeUserIds: input.granteeUserIds ?? null
        });
    }
}
export function allContextItems(pack) {
    return [
        ...pack.truth,
        ...pack.evidence,
        ...pack.recommendations,
        ...pack.operational,
        ...pack.candidates
    ];
}
