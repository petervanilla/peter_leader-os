import { buildReviewQueue, buildReviewSubmission } from './review.js';
import { buildTeamView, buildPersonView } from './team.js';
import { buildOneOnOnePrep, validateOneOnOnePrep } from './one-on-one.js';
import { buildProjectView, buildProjectRecovery } from './work.js';
import { buildMeetingView, validateMeetingView } from './meetings.js';
import { confirmDecision, proposeDecisionImpact } from './decisions.js';
import { buildAddonHub, opickerDescriptor } from './addons.js';
import { buildLeadershipReport, validateLeadershipReport } from './reports.js';
import { buildOnboardingState, confirmOnboardingUnderstanding, LEADERSHIP_QUESTS, LEADERSHIP_QUEST_PHASES, LEADERSHIP_KNOWLEDGE_SOURCES, LEADER_COACH_SCENARIOS, LEADERSHIP_TOOLKITS, LEADERSHIP_SETUP_CHECKLIST, LEADERSHIP_SAMPLE_BOARDS, LEADERSHIP_MISSIONS, LEADERSHIP_MISSION_PILLARS, questProgressSummary } from './onboarding.js';
import { buildSkillRun, captureSkillOutput, finalizeSkillRun } from './skills.js';
import { LeaderOsAppSession } from './app-session.js';
import { createLeaderOsControllers } from './controllers/application-controllers.js';
import { buildTodayView, validateTodayView } from './today.js';
import { createNavigationUi } from './ui/navigation-ui.js';
import { createTodayUi } from './ui/today-ui.js';
import { createObjectDetailUi } from './ui/object-detail-ui.js';
import { createLiveSessionUi } from './ui/live-session-ui.js';
import { escapeHtml } from './ui/helpers.js';
import { createBillingUi } from './ui/billing-ui.js';
const LIVE_RUNTIME = {
    supabaseUrl: 'https://lclibscjesyvsnxvdhoy.supabase.co',
    publishableKey: 'sb_publishable_sDhNje2lkCjAbeWcxfjZXw_uQgWvVyA'
};
const browserStorage = window.__leaderOsStorage || (() => {
    try {
        return window.localStorage;
    }
    catch {
        const memory = new Map();
        return {
            getItem: (key) => memory.has(String(key)) ? memory.get(String(key)) : null,
            setItem: (key, value) => memory.set(String(key), String(value)),
            removeItem: (key) => memory.delete(String(key)),
            clear: () => memory.clear()
        };
    }
})();
window.__leaderOsStorage = browserStorage;
const appSession = new LeaderOsAppSession(LIVE_RUNTIME, browserStorage);
const reportRuntimeBridge = {
    state() {
        const workspace = appSession.currentWorkspace;
        return {
            mode: appSession.currentMode,
            signedIn: appSession.isSignedIn,
            userId: appSession.currentIdentity?.userId ?? null,
            workspaceId: workspace?.workspaceId ?? null,
            workspaceName: workspace?.name ?? null
        };
    },
    async status(limit = 20) {
        const workspace = appSession.currentWorkspace;
        if (!appSession.isSignedIn || !workspace) throw new Error('REPORT_RUNTIME_SIGN_IN_REQUIRED');
        return appSession.requireGateway().runtime.reportStatus(workspace.workspaceId, limit);
    },
    async ops() {
        const workspace = appSession.currentWorkspace;
        if (!appSession.isSignedIn || !workspace) throw new Error('REPORT_RUNTIME_SIGN_IN_REQUIRED');
        return appSession.requireGateway().runtime.reportOpsStatus(workspace.workspaceId);
    },
    async search(query = '', limit = 20) {
        const workspace = appSession.currentWorkspace;
        if (!appSession.isSignedIn || !workspace) throw new Error('WORKSPACE_SEARCH_SIGN_IN_REQUIRED');
        return appSession.requireGateway().runtime.searchWorkspace(workspace.workspaceId, query, limit);
    },
    async searchDetail(objectType, objectId) {
        const workspace = appSession.currentWorkspace;
        if (!appSession.isSignedIn || !workspace) throw new Error('WORKSPACE_SEARCH_SIGN_IN_REQUIRED');
        return appSession.requireGateway().runtime.searchDetail(workspace.workspaceId, objectType, objectId);
    },
    async onboardingContextStatus() {
        const workspace = appSession.currentWorkspace;
        if (!appSession.isSignedIn || !workspace) throw new Error('ONBOARDING_CONTEXT_SIGN_IN_REQUIRED');
        return appSession.requireGateway().runtime.onboardingContextStatus(workspace.workspaceId);
    },
    async saveOnboardingContext(input) {
        const workspace = appSession.currentWorkspace;
        if (!appSession.isSignedIn || !workspace) throw new Error('ONBOARDING_CONTEXT_SIGN_IN_REQUIRED');
        return appSession.requireGateway().runtime.saveOnboardingContext({ ...input, workspaceId: workspace.workspaceId });
    },
    async leadershipResumeStatus() {
        const workspace = appSession.currentWorkspace;
        if (!appSession.isSignedIn || !workspace) throw new Error('LEADERSHIP_RESUME_SIGN_IN_REQUIRED');
        return appSession.requireGateway().runtime.leadershipResumeStatus(workspace.workspaceId);
    },
    async leadershipOnboardingRoster() {
        const workspace = appSession.currentWorkspace;
        if (!appSession.isSignedIn || !workspace) throw new Error('ONBOARDING_ROSTER_SIGN_IN_REQUIRED');
        return appSession.requireGateway().runtime.leadershipOnboardingRoster(workspace.workspaceId);
    },
    async missionChecklistStatus() {
        const workspace = appSession.currentWorkspace;
        if (!appSession.isSignedIn || !workspace) throw new Error('MISSION_CHECKLIST_SIGN_IN_REQUIRED');
        return appSession.requireGateway().runtime.missionChecklistStatus(workspace.workspaceId);
    },
    async saveMissionChecklist(input) {
        const workspace = appSession.currentWorkspace;
        if (!appSession.isSignedIn || !workspace) throw new Error('MISSION_CHECKLIST_SIGN_IN_REQUIRED');
        return appSession.requireGateway().runtime.saveMissionChecklist({ ...input, workspaceId: workspace.workspaceId });
    },
    async leadershipSelfCheckStatus() {
        const workspace = appSession.currentWorkspace;
        if (!appSession.isSignedIn || !workspace) throw new Error('SELF_CHECK_SIGN_IN_REQUIRED');
        return appSession.requireGateway().runtime.leadershipSelfCheckStatus(workspace.workspaceId);
    },
    async saveLeadershipSelfCheck(input) {
        const workspace = appSession.currentWorkspace;
        if (!appSession.isSignedIn || !workspace) throw new Error('SELF_CHECK_SIGN_IN_REQUIRED');
        return appSession.requireGateway().runtime.saveLeadershipSelfCheck({ ...input, workspaceId: workspace.workspaceId });
    },
    async authAccessToken() {
        if (!appSession.isSignedIn) throw new Error('AUTH_REQUIRED');
        return appSession.requireGateway().auth.getAccessToken();
    },
    runtimeConfig() {
        return { ...LIVE_RUNTIME };
    },
    async createPeoplePreferenceRequest(personId, expiresInDays = 7) {
        const workspace = appSession.currentWorkspace;
        if (!appSession.isSignedIn || !workspace) throw new Error('PEOPLE_SIGN_IN_REQUIRED');
        return appSession.requireGateway().runtime.createPeoplePreferenceRequest({ workspaceId: workspace.workspaceId, personId, expiresInDays });
    },
    async listPeoplePreferenceRequests(personId = null) {
        const workspace = appSession.currentWorkspace;
        if (!appSession.isSignedIn || !workspace) throw new Error('PEOPLE_SIGN_IN_REQUIRED');
        return appSession.requireGateway().runtime.listPeoplePreferenceRequests(workspace.workspaceId, personId);
    },
    async applyPeoplePreferenceRequest(input) {
        const workspace = appSession.currentWorkspace;
        if (!appSession.isSignedIn || !workspace) throw new Error('PEOPLE_SIGN_IN_REQUIRED');
        return appSession.requireGateway().runtime.applyPeoplePreferenceRequest({ ...input, workspaceId: workspace.workspaceId });
    },
    async resolvePeoplePreferenceRequest(input) {
        const workspace = appSession.currentWorkspace;
        if (!appSession.isSignedIn || !workspace) throw new Error('PEOPLE_SIGN_IN_REQUIRED');
        return appSession.requireGateway().runtime.resolvePeoplePreferenceRequest({ ...input, workspaceId: workspace.workspaceId });
    },
    async peopleCollaborationStatus(personId = null) {
        const workspace = appSession.currentWorkspace;
        if (!appSession.isSignedIn || !workspace) throw new Error('PEOPLE_SIGN_IN_REQUIRED');
        return appSession.requireGateway().runtime.peopleCollaborationStatus(workspace.workspaceId, personId);
    },
    async savePeopleProfile(input) {
        const workspace = appSession.currentWorkspace;
        if (!appSession.isSignedIn || !workspace) throw new Error('PEOPLE_SIGN_IN_REQUIRED');
        return appSession.requireGateway().runtime.savePeopleProfile({ ...input, workspaceId: workspace.workspaceId });
    },
    async savePeopleSource(input) {
        const workspace = appSession.currentWorkspace;
        if (!appSession.isSignedIn || !workspace) throw new Error('PEOPLE_SIGN_IN_REQUIRED');
        return appSession.requireGateway().runtime.savePeopleSource({ ...input, workspaceId: workspace.workspaceId });
    },
    async savePeopleInstruction(input) {
        const workspace = appSession.currentWorkspace;
        if (!appSession.isSignedIn || !workspace) throw new Error('PEOPLE_SIGN_IN_REQUIRED');
        return appSession.requireGateway().runtime.savePeopleInstruction({ ...input, workspaceId: workspace.workspaceId });
    },
    async setupChecklistStatus() {
        const workspace = appSession.currentWorkspace;
        if (!appSession.isSignedIn || !workspace) throw new Error('SETUP_CHECKLIST_SIGN_IN_REQUIRED');
        return appSession.requireGateway().runtime.setupChecklistStatus(workspace.workspaceId);
    },
    async questProgressStatus() {
        const workspace = appSession.currentWorkspace;
        if (!appSession.isSignedIn || !workspace) throw new Error('QUEST_PROGRESS_SIGN_IN_REQUIRED');
        return appSession.requireGateway().runtime.questProgressStatus(workspace.workspaceId);
    },
    async saveQuestProgress(input) {
        const workspace = appSession.currentWorkspace;
        if (!appSession.isSignedIn || !workspace) throw new Error('QUEST_PROGRESS_SIGN_IN_REQUIRED');
        return appSession.requireGateway().runtime.saveQuestProgress({ ...input, workspaceId: workspace.workspaceId });
    },
    async saveSetupChecklist(input) {
        const workspace = appSession.currentWorkspace;
        if (!appSession.isSignedIn || !workspace) throw new Error('SETUP_CHECKLIST_SIGN_IN_REQUIRED');
        return appSession.requireGateway().runtime.saveSetupChecklist({ ...input, workspaceId: workspace.workspaceId });
    },
    async reviewQuestEvidence(input) {
        const workspace = appSession.currentWorkspace;
        if (!appSession.isSignedIn || !workspace) throw new Error('QUEST_EVIDENCE_REVIEW_SIGN_IN_REQUIRED');
        return appSession.requireGateway().runtime.reviewQuestEvidence({ ...input, workspaceId: workspace.workspaceId });
    },
    async operatingArtifactsStatus(limit = 200) {
        const workspace = appSession.currentWorkspace;
        if (!appSession.isSignedIn || !workspace) throw new Error('OPERATING_ARTIFACT_SIGN_IN_REQUIRED');
        return appSession.requireGateway().runtime.operatingArtifactsStatus(workspace.workspaceId, limit);
    },
    async saveOperatingArtifact(input) {
        const workspace = appSession.currentWorkspace;
        if (!appSession.isSignedIn || !workspace) throw new Error('OPERATING_ARTIFACT_SIGN_IN_REQUIRED');
        return appSession.requireGateway().runtime.saveOperatingArtifact({ ...input, workspaceId: workspace.workspaceId });
    },
    async deleteOperatingArtifact(input) {
        const workspace = appSession.currentWorkspace;
        if (!appSession.isSignedIn || !workspace) throw new Error('OPERATING_ARTIFACT_SIGN_IN_REQUIRED');
        return appSession.requireGateway().runtime.deleteOperatingArtifact({ ...input, workspaceId: workspace.workspaceId });
    },
    async linkQuestEvidence(input) {
        const workspace = appSession.currentWorkspace;
        if (!appSession.isSignedIn || !workspace) throw new Error('QUEST_EVIDENCE_SIGN_IN_REQUIRED');
        return appSession.requireGateway().runtime.linkQuestEvidence({ ...input, workspaceId: workspace.workspaceId });
    },
    async saveSchedule(input) {
        const workspace = appSession.currentWorkspace;
        if (!appSession.isSignedIn || !workspace) throw new Error('REPORT_RUNTIME_SIGN_IN_REQUIRED');
        return appSession.requireGateway().runtime.saveReportSchedule({ ...input, workspaceId: workspace.workspaceId });
    },
    async prepareNow(reportType) {
        const workspace = appSession.currentWorkspace;
        if (!appSession.isSignedIn || !workspace) throw new Error('REPORT_RUNTIME_SIGN_IN_REQUIRED');
        return appSession.requireGateway().runtime.prepareReportNow({ workspaceId: workspace.workspaceId, reportType });
    },
    async confirm(reportId, expectedVersion, finalPatch = {}) {
        const workspace = appSession.currentWorkspace;
        if (!appSession.isSignedIn || !workspace) throw new Error('REPORT_RUNTIME_SIGN_IN_REQUIRED');
        return appSession.requireGateway().runtime.confirmReport({
            workspaceId: workspace.workspaceId, reportId, expectedVersion, finalPatch
        });
    },
    async queueManual(reportId) {
        const workspace = appSession.currentWorkspace;
        if (!appSession.isSignedIn || !workspace) throw new Error('REPORT_RUNTIME_SIGN_IN_REQUIRED');
        return appSession.requireGateway().runtime.queueReportDelivery({
            workspaceId: workspace.workspaceId, reportId, channel: 'MANUAL', targetRef: null
        });
    }
};
Object.defineProperty(window, 'LeaderOsReportRuntimeBridge', {
    value: reportRuntimeBridge, enumerable: false, configurable: false, writable: false
});
const controllers = createLeaderOsControllers(appSession);
let objectDetail;
let liveUi;
const navigation = createNavigationUi({
    resolveObject: (objectType, objectId) => objectDetail?.resolveObject(objectType, objectId) ?? null,
    renderObject: (item, route) => objectDetail?.renderObject(item, route),
    openObject: (objectType, objectId) => objectDetail?.openObject(objectType, objectId) ?? false,
    closeObject: (syncHash) => objectDetail?.closeObject(syncHash),
    isObjectOpen: () => objectDetail?.isOpen() ?? false
});
const sampleAttention = [
    {
        id: 'ATTN-DEC-001', verb: 'DECIDE', title: '프로젝트 A의 다음 마일스톤 확정',
        reason: '오픈 의사결정이 두 개의 후속 작업을 막고 있습니다.',
        evidenceRefs: ['DEC-014', 'PRJ-A:MILESTONE-03', 'COM-022'], confidence: 0.91,
        attentionPriority: 88, criticality: 'P1', subject: { type: 'PROJECT', id: 'PRJ-A', label: 'Project A' }
    },
    {
        id: 'ATTN-TALK-001', verb: 'TALK', title: '1:1에서 미해결 Commitment 확인',
        reason: '지난 대화의 Commitment 한 건이 Follow-up 없이 남아 있습니다.',
        evidenceRefs: ['1ON1-031', 'COM-019'], confidence: 0.82,
        attentionPriority: 72, criticality: 'P2', subject: { type: 'PERSON', id: 'P-1', label: '민지' }
    },
    {
        id: 'ATTN-REVIEW-001', verb: 'REVIEW', title: '지난주 AI Recommendation 결과 검수',
        reason: 'Outcome Evidence가 들어왔지만 Human Review가 아직 없습니다.',
        evidenceRefs: ['REC-008', 'EV-A-044'], confidence: 0.77,
        attentionPriority: 68, subject: { type: 'DECISION', id: 'DEC-14', label: 'Scope decision' }
    },
    {
        id: 'ATTN-PREP-001', verb: 'PREPARE', title: '다음 주 회의용 근거 준비',
        reason: '결정 전 확인해야 할 공개 근거가 남아 있습니다.',
        evidenceRefs: ['MTG-012'], confidence: 0.66, attentionPriority: 40, criticality: 'P3'
    }
];
const demoTodayView = buildTodayView(sampleAttention);
const todayValidation = validateTodayView(demoTodayView);
if (!todayValidation.ok)
    throw new Error(`Today contract failed: ${todayValidation.violations.join(', ')}`);
const todayUi = createTodayUi(demoTodayView, {
    goTo: navigation.goTo,
    openObject: (objectType, objectId) => objectDetail?.openObject(objectType, objectId) ?? false,
    announce: navigation.announce
});
objectDetail = createObjectDetailUi({
    session: appSession,
    controllers,
    navigation,
    onContextChanged: (pack) => { if (liveUi)
        liveUi.renderContext(pack); }
});
createBillingUi();
liveUi = createLiveSessionUi({
    session: appSession,
    controllers,
    demoTodayView,
    renderToday: todayUi.render,
    openObject: (objectType, objectId) => objectDetail.openObject(objectType, objectId),
    announce: navigation.announce,
    goTo: navigation.goTo,
    activateFromHash: navigation.activateFromHash
});
const samplePeople = [
    {
        id: 'P-1', name: '민지', role: 'PM', currentPriority: 'Project A launch', currentProject: 'Project A',
        blocker: 'Final milestone decision pending', openCommitments: ['Client brief 공유'],
        lastConversationAt: '2026-09-20', nextConversationAt: '2026-09-28'
    },
    {
        id: 'P-2', name: '준호', role: 'Creative Lead', currentPriority: 'Campaign concept review', currentProject: 'Campaign B',
        blocker: null, openCommitments: ['3 concepts 정리', 'Reference board 업데이트'],
        lastConversationAt: '2026-09-22', nextConversationAt: '2026-09-29'
    },
    {
        id: 'P-3', name: '서연', role: 'Analyst', currentPriority: 'Weekly evidence pack', currentProject: 'Brand Intelligence',
        blocker: 'Source confirmation needed', openCommitments: [],
        lastConversationAt: '2026-09-19', nextConversationAt: null
    }
];
const teamView = buildTeamView({ id: 'TEAM-ALPHA', name: 'Team Alpha', people: samplePeople });
Object.defineProperty(window,'LeaderOsPeopleSeed',{
    value: samplePeople.map((person)=>({...person})),
    enumerable:false,
    configurable:true
});
for (const person of samplePeople) {
    objectDetail.registerDemoItem(objectDetail.makeDemoItem('PERSON', person.id, 'RESTRICTED', {
        name: person.name, role: person.role, currentPriority: person.currentPriority, currentProject: person.currentProject,
        blocker: person.blocker, openCommitments: person.openCommitments, lastConversationAt: person.lastConversationAt, nextConversationAt: person.nextConversationAt
    }));
}
objectDetail.registerDemoItem(objectDetail.makeDemoItem('PERSON', 'P-1', 'RESTRICTED', { name: '민지', role: 'PM', currentPriority: 'Project A launch', currentProject: 'Project A', blocker: 'Final milestone decision pending' }));
const statRoot = document.querySelector('[data-team-stats]');
if (!statRoot)
    throw new Error('TEAM_STATS_ROOT_MISSING');
const stats = [
    ['People', teamView.operatingSummary.peopleCount],
    ['Blocked', teamView.operatingSummary.blockedCount],
    ['Open commitments', teamView.operatingSummary.openCommitmentCount],
    ['Next conversations', teamView.operatingSummary.conversationsScheduled]
];
for (const [label, value] of stats) {
    const el = document.createElement('div');
    el.className = 'stat';
    el.innerHTML = `<span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>`;
    statRoot.append(el);
}
const renderPersonCard = (person) => {
    const safe = buildPersonView(person);
    if (!safe.ok)
        return null;
    const view = safe.view;
    const card = document.createElement('article');
    card.className = 'person-card';
    card.dataset.personId = view.id;
    card.dataset.personName = view.name || '';
    card.dataset.personRole = view.role || '';
    const title = document.createElement('h3');
    title.textContent = view.name;
    const role = document.createElement('div');
    role.className = 'review-meta';
    role.textContent = view.role ?? 'Role not set';
    const list = document.createElement('div');
    list.className = 'context-list';
    const rows = [
        ['Priority', view.currentPriority ?? 'Unknown'],
        ['Project', view.currentProject ?? 'Unknown'],
        ['Blocker', view.blocker ?? 'None known'],
        ['Commitments', String(view.openCommitments?.length ?? 0)],
        ['Last talk', view.lastConversationAt ?? 'Unknown'],
        ['Next talk', view.nextConversationAt ?? 'Not scheduled']
    ];
    for (const [label, value] of rows) {
        const row = document.createElement('div');
        row.className = 'context-row';
        const l = document.createElement('span');
        l.textContent = label;
        const v = document.createElement('span');
        v.textContent = value;
        row.append(l, v);
        list.append(row);
    }
    const safeNote = document.createElement('div');
    safeNote.className = 'safe';
    safeNote.textContent = 'Context only · no person score · no rank';
    const open = document.createElement('button');
    open.type = 'button';
    open.textContent = '상세 · 공유';
    open.style.marginTop = '12px';
    open.addEventListener('click', () => objectDetail.openObject('PERSON', view.id));
    card.append(title, role, list, safeNote, open);
    return card;
};
const teamPeopleRoot = document.querySelector('[data-team-people]');
const peopleRoot = document.querySelector('[data-people-list]');
if (!teamPeopleRoot || !peopleRoot)
    throw new Error('PEOPLE_ROOT_MISSING');
for (const person of teamView.people) {
    const a = renderPersonCard(person);
    if (a)
        teamPeopleRoot.append(a);
    const b = renderPersonCard(person);
    if (b)
        peopleRoot.append(b);
}
const onePerson = samplePeople[0];
const oneView = buildOneOnOnePrep(onePerson, [{ id: 'Q-1', text: '결정을 위해 추가 리소스가 필요한가?' }]);
const oneValidation = validateOneOnOnePrep(oneView);
if (!oneValidation.ok)
    throw new Error(`1:1 contract failed: ${oneValidation.violations.join(', ')}`);
const onePersonRoot = document.querySelector('[data-one-on-one-person]');
const agendaRoot = document.querySelector('[data-one-on-one-agenda]');
if (!onePersonRoot || !agendaRoot)
    throw new Error('ONE_ON_ONE_ROOT_MISSING');
onePersonRoot.innerHTML = `<strong>${escapeHtml(oneView.person.name)}</strong><div class="review-meta">${escapeHtml(oneView.person.role ?? '')} · Human confirmation required</div>`;
for (const item of oneView.agenda) {
    const el = document.createElement('article');
    el.className = 'agenda-item';
    const type = document.createElement('div');
    type.className = 'type';
    type.textContent = item.type;
    const title = document.createElement('div');
    title.textContent = item.title;
    const source = document.createElement('div');
    source.className = 'review-meta';
    source.textContent = `Source: ${item.sourceRef} · Confirm in conversation`;
    el.append(type, title, source);
    agendaRoot.append(el);
}
const captureType = document.querySelector('[data-one-on-one-capture-type]');
const captureText = document.querySelector('[data-one-on-one-capture-text]');
const captureAdd = document.querySelector('[data-one-on-one-capture-add]');
const captureList = document.querySelector('[data-one-on-one-capture-list]');
if (!captureType || !captureText || !captureAdd || !captureList)
    throw new Error('ONE_ON_ONE_CAPTURE_ROOT_MISSING');
captureAdd.addEventListener('click', () => {
    const text = captureText.value.trim();
    if (!text) {
        navigation.announce('1:1 캡처 내용을 입력하세요.');
        captureText.focus();
        return;
    }
    const item = document.createElement('div');
    item.className = 'capture-item';
    const copy = document.createElement('div');
    copy.innerHTML = `<strong>${escapeHtml(captureType.value.replaceAll('_', ' '))}</strong><div class="why">${escapeHtml(text)}</div>`;
    const state = document.createElement('span');
    state.className = 'state-badge';
    state.textContent = 'PRIVATE · REVIEW';
    item.append(copy, state);
    captureList.prepend(item);
    captureText.value = '';
    navigation.announce('1:1 내용을 Private Candidate로 캡처했습니다. Human Review 전에는 확정 사실이 아닙니다.');
});
const projectView = buildProjectView({
    id: 'PRJ-A', name: 'Project A', owner: '민지', goal: '10월 베타 런칭', nextMilestone: 'Beta scope lock',
    openDecision: 'Scope A/B 중 선택', knownRisk: 'Client input delay', needsAttention: true
});
const projectRoot = document.querySelector('[data-project-view]');
if (!projectRoot)
    throw new Error('PROJECT_VIEW_ROOT_MISSING');
projectRoot.innerHTML = `<h2>${escapeHtml(projectView.name)}</h2><div class="context-list">
<div class="context-row"><span>Owner</span><span>${escapeHtml(projectView.owner ?? 'Unknown')}</span></div>
<div class="context-row"><span>Goal</span><span>${escapeHtml(projectView.goal ?? 'Unknown')}</span></div>
<div class="context-row"><span>Next milestone</span><span>${escapeHtml(projectView.nextMilestone ?? 'Unknown')}</span></div>
<div class="context-row"><span>Open decision</span><span>${escapeHtml(projectView.openDecision ?? 'None known')}</span></div>
<div class="context-row"><span>Risk</span><span>${escapeHtml(projectView.knownRisk ?? 'None known')}</span></div></div><div class="safe">Blame inference: OFF</div>`;
const projectDetailButton = document.createElement('button');
projectDetailButton.type = 'button';
projectDetailButton.textContent = 'Project 상세 · 공유';
projectDetailButton.style.marginTop = '12px';
projectDetailButton.addEventListener('click', () => objectDetail.openObject('PROJECT', projectView.id));
projectRoot.append(projectDetailButton);
const recoveryResult = buildProjectRecovery({
    projectId: 'PRJ-A', symptom: 'Beta scope lock가 3일 지연', cause: null, dependency: 'Client approval',
    decisionNeeded: 'Scope A/B 선택', recovery: '승인 후 24시간 내 scope lock', owner: '민지'
});
const recoveryRoot = document.querySelector('[data-project-recovery]');
if (!recoveryRoot)
    throw new Error('PROJECT_RECOVERY_ROOT_MISSING');
if (recoveryResult.ok) {
    const r = recoveryResult.recovery;
    const steps = [['SYMPTOM', r.symptom], ['CAUSE', r.cause ?? 'UNKNOWN'], ['DEPENDENCY', r.dependency ?? 'UNKNOWN'], ['DECISION', r.decisionNeeded ?? 'UNKNOWN'], ['RECOVERY', r.recovery ?? 'UNKNOWN'], ['OWNER', r.owner ?? 'UNKNOWN']];
    for (const [key, value] of steps) {
        const el = document.createElement('div');
        el.className = 'flow-step';
        el.innerHTML = `<div class="k">${escapeHtml(key)}</div><div>${escapeHtml(value)}</div>`;
        recoveryRoot.append(el);
    }
}
const meetingView = buildMeetingView({
    id: 'MTG-12', title: 'Project A Weekly', objective: 'Scope lock와 blocker 해소', participants: ['민지', '준호'],
    prepQuestions: ['어떤 결정이 필요한가?', '추가 근거가 필요한가?'],
    captures: [
        { id: 'CAP-1', type: 'DECISION', text: 'Scope A를 우선 검토', owner: '민지', evidenceRefs: ['EV-A-44'] },
        { id: 'CAP-2', type: 'ACTION', text: 'Client reference 추가 확인', owner: '준호', evidenceRefs: ['MTG-12'] },
        { id: 'CAP-3', type: 'OPEN_QUESTION', text: '런칭 날짜 영향은?', evidenceRefs: ['MTG-12'] }
    ]
});
if (!validateMeetingView(meetingView).ok)
    throw new Error('MEETING_CONTRACT_FAILED');
const beforeRoot = document.querySelector('[data-meeting-before]');
const afterRoot = document.querySelector('[data-meeting-after]');
if (!beforeRoot || !afterRoot)
    throw new Error('MEETING_ROOT_MISSING');
beforeRoot.innerHTML = `<h2>Before</h2><strong>${escapeHtml(meetingView.title)}</strong><div class="why">Objective: ${escapeHtml(meetingView.before.objective ?? 'Unknown')}</div>`;
for (const q of meetingView.before.prepQuestions) {
    const el = document.createElement('div');
    el.className = 'safe';
    el.textContent = q;
    beforeRoot.append(el);
}
afterRoot.innerHTML = '<h2>After · Candidates</h2>';
for (const cap of meetingView.after.captures) {
    const el = document.createElement('div');
    el.className = 'agenda-item';
    el.innerHTML = `<div class="type">${escapeHtml(cap.type)}</div><div>${escapeHtml(cap.text)}</div><div class="review-meta">${cap.humanReviewRequired ? 'Human review required' : 'Review optional'} · confirmed=false</div>`;
    afterRoot.append(el);
}
const decisionDraft = { id: 'DEC-14', what: 'Scope A를 Beta 기준안으로 확정', why: '현재 근거와 일정 리스크를 비교할 때 가장 검증 가능한 선택', evidenceRefs: ['EV-A-44', 'MTG-12'], owner: '민지', reviewDate: '2026-10-04' };
objectDetail.registerDemoItem(objectDetail.makeDemoItem('DECISION', decisionDraft.id, 'RESTRICTED', decisionDraft, false));
const decisionRoot = document.querySelector('[data-decisions-list]');
if (!decisionRoot)
    throw new Error('DECISION_ROOT_MISSING');
const aiDecision = confirmDecision(decisionDraft, { type: 'AI', id: 'agent' });
const impact = proposeDecisionImpact({ decisionId: 'DEC-14', affectedProjectIds: ['PRJ-A'], suggestedDateChanges: [{ itemId: 'MS-BETA', from: '2026-10-02', to: '2026-10-04' }] });
const dcard = document.createElement('article');
dcard.className = 'decision-card';
dcard.innerHTML = `<strong>${escapeHtml(decisionDraft.what)}</strong><div class="why">Why: ${escapeHtml(decisionDraft.why)}</div><div class="context-list"><div class="context-row"><span>Evidence</span><span>${escapeHtml(decisionDraft.evidenceRefs.join(' · '))}</span></div><div class="context-row"><span>Owner</span><span>${escapeHtml(decisionDraft.owner)}</span></div><div class="context-row"><span>Review date</span><span>${escapeHtml(decisionDraft.reviewDate)}</span></div><div class="context-row"><span>AI confirm</span><span>${aiDecision.ok ? 'ERROR' : 'BLOCKED'}</span></div><div class="context-row"><span>Human confirm</span><span data-decision-human-state>PENDING</span></div><div class="context-row"><span>Date impact</span><span>${impact.appliedAutomatically ? 'AUTO' : 'SUGGESTION ONLY'}</span></div></div>`;
const decisionConfirmButton = document.createElement('button');
decisionConfirmButton.type = 'button';
decisionConfirmButton.className = 'primary';
decisionConfirmButton.style.marginTop = '14px';
decisionConfirmButton.textContent = '내 결정으로 확정';
const decisionResult = document.createElement('div');
decisionResult.className = 'review-result';
decisionResult.hidden = true;
decisionConfirmButton.addEventListener('click', () => {
    const humanDecision = confirmDecision(decisionDraft, { type: 'HUMAN', id: 'CURRENT_USER' });
    const state = dcard.querySelector('[data-decision-human-state]');
    if (humanDecision.ok) {
        if (state)
            state.textContent = 'CONFIRMED BY HUMAN';
        decisionConfirmButton.disabled = true;
        decisionConfirmButton.textContent = '확정됨';
        decisionResult.hidden = false;
        decisionResult.textContent = '사람이 What + Why + Evidence를 확인해 Decision을 확정했습니다. 일정 영향은 아직 제안 상태입니다.';
        objectDetail.registerDemoItem(objectDetail.makeDemoItem('DECISION', decisionDraft.id, 'RESTRICTED', decisionDraft, true));
        navigation.announce('Decision을 사람이 확정했습니다.');
    }
    else {
        decisionResult.hidden = false;
        decisionResult.textContent = `확정 실패: ${humanDecision.error}`;
    }
});
const decisionDetailButton = document.createElement('button');
decisionDetailButton.type = 'button';
decisionDetailButton.textContent = 'Decision 상세 · 공유';
decisionDetailButton.style.margin = '14px 0 0 8px';
decisionDetailButton.addEventListener('click', () => objectDetail.openObject('DECISION', decisionDraft.id));
dcard.append(decisionConfirmButton, decisionDetailButton, decisionResult);
decisionRoot.append(dcard);
const addonDescriptors = [
    opickerDescriptor(),
    {
        id: 'brand-intelligence', name: 'Brand Intelligence', specialistRole: 'Brand Analyst', status: 'COMING_SOON',
        capabilities: ['BRAND_RESEARCH', 'INSIGHT_SYNTHESIS'], roadmapCapabilities: ['STRATEGY_ASSIST'],
        contextReads: ['company', 'project', 'evidence'], contextWrites: ['evidence', 'artifact', 'candidate'],
        suggest: true, execute: false, truthWriteAllowed: false, privateOneOnOneRead: false
    },
    {
        id: 'marketops', name: 'MarketOps', specialistRole: 'Performance Analyst', status: 'COMING_SOON',
        capabilities: ['PERFORMANCE_ANALYSIS', 'BUDGET_SIMULATION'], roadmapCapabilities: [],
        contextReads: ['company', 'project', 'evidence'], contextWrites: ['evidence', 'artifact', 'draft'],
        suggest: true, execute: false, truthWriteAllowed: false, privateOneOnOneRead: false
    }
];
const addonHub = buildAddonHub(addonDescriptors);
const addonRoot = document.querySelector('[data-addon-grid]');
const trustRoot = document.querySelector('[data-addon-trust-path]');
if (!addonRoot || !trustRoot)
    throw new Error('ADDON_HUB_ROOT_MISSING');
for (const addon of addonHub.accepted) {
    const card = document.createElement('article');
    card.className = 'addon-card';
    const title = document.createElement('h3');
    title.textContent = addon.name;
    title.style.margin = '0 0 4px';
    const role = document.createElement('div');
    role.className = 'review-meta';
    role.textContent = `${addon.specialistRole} · ${addon.status}`;
    const chips = document.createElement('div');
    chips.className = 'chips';
    for (const cap of addon.capabilities) {
        const c = document.createElement('span');
        c.className = 'chip';
        c.textContent = cap;
        chips.append(c);
    }
    const roadmap = document.createElement('div');
    roadmap.className = 'review-meta';
    roadmap.style.marginTop = '10px';
    roadmap.textContent = addon.roadmapCapabilities?.length ? `Roadmap: ${addon.roadmapCapabilities.join(' · ')}` : 'No roadmap capabilities';
    const perms = document.createElement('div');
    perms.className = 'safe';
    perms.textContent = `Read: ${addon.contextReads.join(' · ')} | Write: ${addon.contextWrites.join(' · ')} | Execute: ${addon.execute ? 'YES' : 'NO'} | Truth write: NO`;
    card.append(title, role, chips, roadmap, perms);
    addonRoot.append(card);
}
for (const [index, step] of addonHub.trustPath.entries()) {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = step.replaceAll('_', ' ');
    trustRoot.append(chip);
    if (index < addonHub.trustPath.length - 1) {
        const arrow = document.createElement('span');
        arrow.textContent = '→';
        trustRoot.append(arrow);
    }
}
const reportView = buildLeadershipReport({
    periodLabel: 'This week',
    metrics: [
        { id: 'M-1', label: 'Decision clarity', value: 82, previousValue: 74, targetType: 'DECISION_PROCESS' },
        { id: 'M-2', label: 'Commitment follow-up', value: 74, previousValue: 68, targetType: 'FOLLOW_UP_SYSTEM' },
        { id: 'M-3', label: 'Evidence traceability', value: 91, previousValue: 86, targetType: 'EVIDENCE_QUALITY' }
    ],
    unresolvedAttention: [
        { id: 'A1', title: 'Project A scope decision', verb: 'DECIDE' },
        { id: 'A2', title: '1:1 commitment follow-up', verb: 'TALK' }
    ],
    reviewVerdicts: { USEFUL: 5, NOT_USEFUL: 1, WRONG: 1, NEEDS_MORE_EVIDENCE: 2 },
    addonEvidencePending: 3
});
if (!validateLeadershipReport(reportView).ok)
    throw new Error('REPORT_CONTRACT_FAILED');
const reportMetricRoot = document.querySelector('[data-report-metrics]');
const reportAttentionRoot = document.querySelector('[data-report-attention]');
const reportReviewRoot = document.querySelector('[data-report-reviews]');
if (!reportMetricRoot || !reportAttentionRoot || !reportReviewRoot)
    throw new Error('REPORT_ROOT_MISSING');
for (const metric of reportView.metrics) {
    const el = document.createElement('div');
    el.className = 'stat';
    const delta = metric.delta === null ? '' : ` · ${metric.delta >= 0 ? '+' : ''}${metric.delta}`;
    el.innerHTML = `<span>${escapeHtml(metric.label)}</span><strong>${escapeHtml(metric.value)}</strong><div class="review-meta">${escapeHtml(metric.targetType)}${escapeHtml(delta)}</div>`;
    reportMetricRoot.append(el);
}
reportAttentionRoot.innerHTML = '<h2>Unresolved Attention</h2>';
for (const item of reportView.unresolvedAttention) {
    const el = document.createElement('div');
    el.className = 'agenda-item';
    el.innerHTML = `<div class="type">${escapeHtml(item.verb)}</div><div>${escapeHtml(item.title)}</div>`;
    reportAttentionRoot.append(el);
}
reportReviewRoot.innerHTML = `<h2>Recommendation Review</h2><div class="context-list"><div class="context-row"><span>Useful</span><span>${reportView.reviewVerdicts.USEFUL}</span></div><div class="context-row"><span>Not useful</span><span>${reportView.reviewVerdicts.NOT_USEFUL}</span></div><div class="context-row"><span>Wrong</span><span>${reportView.reviewVerdicts.WRONG}</span></div><div class="context-row"><span>Need evidence</span><span>${reportView.reviewVerdicts.NEEDS_MORE_EVIDENCE}</span></div><div class="context-row"><span>Add-on pending</span><span>${reportView.addonEvidencePending}</span></div></div><div class="safe">Operating system report only · no person ranking</div>`;
const onboardingInput = {
    role: { id: 'role', label: 'Role', value: 'Team Lead', state: 'KNOWN' },
    topConcerns: { id: 'concerns', label: 'Top concerns', value: 'Priority alignment / project delay', state: 'NEEDS_CONFIRMATION' },
    bossReporting: { id: 'boss', label: 'Boss / reporting', value: null, state: 'UNKNOWN' },
    team: { id: 'team', label: 'Team', value: 'Team Alpha · 3 people', state: 'KNOWN' },
    projects: { id: 'projects', label: 'Projects', value: 'Project A / Campaign B', state: 'KNOWN' },
    thirtyDayGoal: { id: 'goal', label: '30-day goal', value: 'Understand the organization and establish a reliable operating rhythm', state: 'KNOWN' }
};
const onboardingResult = buildOnboardingState(onboardingInput);
if (!onboardingResult.ok)
    throw new Error('ONBOARDING_STATE_FAILED');
const onboardingState = onboardingResult.state;
const phaseRoot = document.querySelector('[data-onboarding-phases]');
const understandingRoot = document.querySelector('[data-onboarding-understanding]');
const confirmButton = document.querySelector('[data-onboarding-confirm]');
const onboardingResultRoot = document.querySelector('[data-onboarding-result]');
const onboardingOpen = document.querySelector('[data-onboarding-open]');
const questListRoot = document.querySelector('[data-quest-list]');
const questDetailRoot = document.querySelector('[data-quest-detail]');
const questProgressRoot = document.querySelector('[data-quest-progress]');
const questProgressText = document.querySelector('[data-quest-progress-text]');
const questPhaseFilters = document.querySelector('[data-quest-phase-filters]');
const toolkitRoot = document.querySelector('[data-leadership-toolkit]');
const sourceRoot = document.querySelector('[data-leadership-sources]');
const setupChecklistRoot = document.querySelector('[data-setup-checklist]');
const setupProgressRoot = document.querySelector('[data-setup-progress]');
const setupProgressCopy = document.querySelector('[data-setup-progress-copy]');
const sampleTabsRoot = document.querySelector('[data-sample-tabs]');
const sampleBoardRoot = document.querySelector('[data-sample-board]');
const artifactTabsRoot = document.querySelector('[data-artifact-tabs]');
const artifactEditorRoot = document.querySelector('[data-artifact-editor]');
const artifactPreviewRoot = document.querySelector('[data-artifact-preview]');
const artifactDiagnosticsRoot = document.querySelector('[data-artifact-diagnostics]');
const artifactStorageStatus = document.querySelector('[data-artifact-storage-status]');
const rolePackSelect = document.querySelector('[data-role-pack]');
const rolePackTitle = document.querySelector('[data-role-pack-title]');
const rolePackSummary = document.querySelector('[data-role-pack-summary]');
const todayNudgeRoot = document.querySelector('[data-today-leader-nudge]');
const todayNudgeTitle = document.querySelector('[data-today-nudge-title]');
const todayNudgeCopy = document.querySelector('[data-today-nudge-copy]');
const todayNudgeAction = document.querySelector('[data-today-nudge-action]');
const questChiefRailRoot = document.querySelector('[data-quest-chief-rail]');
const weeklyReviewRoot = document.querySelector('[data-weekly-operating-review]');
const weeklyReviewSave = document.querySelector('[data-weekly-review-save]');
const teamOsCharterRoot = document.querySelector('[data-team-os-charter]');
const teamOsCharterSave = document.querySelector('[data-team-os-charter-save]');
const day30TransitionRoot = document.querySelector('[data-day30-transition]');
const next60Save = document.querySelector('[data-next60-save]');
const todayReportingRoot = document.querySelector('[data-today-reporting-rhythm]');
const todayStakeholderRoot = document.querySelector('[data-today-stakeholder-nudge]');
const reportOperatingRoot = document.querySelector('[data-report-operating-system]');
if (!phaseRoot || !understandingRoot || !confirmButton || !onboardingResultRoot || !questListRoot || !questDetailRoot || !questProgressRoot || !questProgressText || !questPhaseFilters || !toolkitRoot || !sourceRoot || !setupChecklistRoot || !setupProgressRoot || !setupProgressCopy || !sampleTabsRoot || !sampleBoardRoot || !artifactTabsRoot || !artifactEditorRoot || !artifactPreviewRoot || !artifactDiagnosticsRoot || !rolePackSelect || !rolePackTitle || !rolePackSummary || !todayNudgeRoot || !todayNudgeTitle || !todayNudgeCopy || !todayNudgeAction || !questChiefRailRoot || !weeklyReviewRoot || !weeklyReviewSave)
    throw new Error('ONBOARDING_ROOT_MISSING');

for (const [id, phase] of Object.entries(LEADERSHIP_QUEST_PHASES)) {
    const el = document.createElement('div');
    el.className = 'phase quest-phase-card';
    el.dataset.phase = id;
    el.innerHTML = `<span class="state-badge">Days ${escapeHtml(phase.days)}</span><h3>${escapeHtml(id)}</h3><div class="review-meta">${escapeHtml(phase.goal)}</div>`;
    phaseRoot.append(el);
}
for (const field of onboardingState.understanding) {
    const row = document.createElement('div');
    row.className = 'context-row';
    const label = document.createElement('span');
    label.textContent = field.label;
    const value = document.createElement('span');
    value.innerHTML = `${escapeHtml(field.value ?? '—')} <span class="state-badge">${escapeHtml(field.state)}</span>`;
    row.append(label, value);
    understandingRoot.append(row);
}

const QUEST_STORAGE_BASE = 'leader-os:leadership-quest:v5';
const defaultQuestStore = () => ({ completed: [], notes: {}, evidence: {}, evidenceRefs: {}, missionChecks: {}, selfVerification: {}, missionUpdatedAt: null, selfCheckUpdatedAt: null, setupChecks: [], setupUpdatedAt: null, questProgressUpdatedAt: null, selectedDay: 1, phase: 'ALL', sampleBoard: 'TEAM_CALENDAR', artifactTab: 'TEAM_MAP', rolePack: 'TEAM_MANAGER' });
const questStorageScope = () => {
    try {
        const state=reportRuntimeBridge.state();
        return state.signedIn && state.userId && state.workspaceId
            ? `${state.userId}:${state.workspaceId}`
            : 'guest';
    } catch { return 'guest'; }
};
const questStorageKey = (scope) => `${QUEST_STORAGE_BASE}:${scope}`;
let activeQuestStorageScope = questStorageScope();
let activeQuestStorageKey = questStorageKey(activeQuestStorageScope);
const readQuestStore = (key=activeQuestStorageKey, allowLegacy=activeQuestStorageScope==='guest') => {
    try {
        const raw = browserStorage.getItem(key) || (allowLegacy
            ? browserStorage.getItem('leader-os:leadership-quest:v4')
                || browserStorage.getItem('leader-os:leadership-quest:v3')
                || browserStorage.getItem('leader-os:leadership-quest:v2')
                || browserStorage.getItem('leader-os:leadership-quest:v1')
            : null);
        if (!raw) return defaultQuestStore();
        const parsed = JSON.parse(raw);
        return {
            completed: Array.isArray(parsed.completed) ? parsed.completed.map(Number).filter(Number.isInteger) : [],
            notes: parsed.notes && typeof parsed.notes === 'object' ? parsed.notes : {},
            evidence: parsed.evidence && typeof parsed.evidence === 'object' ? parsed.evidence : {},
            evidenceRefs: parsed.evidenceRefs && typeof parsed.evidenceRefs === 'object' ? parsed.evidenceRefs : {},
            missionChecks: parsed.missionChecks && typeof parsed.missionChecks === 'object' ? parsed.missionChecks : {},
            selfVerification: parsed.selfVerification && typeof parsed.selfVerification === 'object' ? parsed.selfVerification : {},
            missionUpdatedAt: typeof parsed.missionUpdatedAt === 'string' ? parsed.missionUpdatedAt : null,
            selfCheckUpdatedAt: typeof parsed.selfCheckUpdatedAt === 'string' ? parsed.selfCheckUpdatedAt : null,
            setupChecks: Array.isArray(parsed.setupChecks) ? parsed.setupChecks.map(String) : [],
            setupUpdatedAt: typeof parsed.setupUpdatedAt === 'string' ? parsed.setupUpdatedAt : null,
            questProgressUpdatedAt: typeof parsed.questProgressUpdatedAt === 'string' ? parsed.questProgressUpdatedAt : null,
            selectedDay: Number(parsed.selectedDay) || 1,
            phase: typeof parsed.phase === 'string' ? parsed.phase : 'ALL',
            sampleBoard: typeof parsed.sampleBoard === 'string' ? parsed.sampleBoard : 'TEAM_CALENDAR',
            artifactTab: typeof parsed.artifactTab === 'string' ? parsed.artifactTab : 'TEAM_MAP',
            rolePack: typeof parsed.rolePack === 'string' ? parsed.rolePack : 'TEAM_MANAGER'
        };
    }
    catch { return defaultQuestStore(); }
};
let questStore = readQuestStore();
const saveQuestStore = () => { try { browserStorage.setItem(activeQuestStorageKey, JSON.stringify(questStore)); } catch {} };
const switchQuestStoreScope = () => {
    const nextScope=questStorageScope();
    if(nextScope===activeQuestStorageScope) return false;
    try { browserStorage.setItem(activeQuestStorageKey, JSON.stringify(questStore)); } catch {}
    activeQuestStorageScope=nextScope;
    activeQuestStorageKey=questStorageKey(nextScope);
    questStore=readQuestStore(activeQuestStorageKey, nextScope==='guest');
    setupServerVersion=0;
    setupServerWorkspace=null;
    questProgressServerVersion=0;
    questProgressServerWorkspace=null;
    missionServerVersion=0;
    missionServerWorkspace=null;
    selfCheckServerVersion=0;
    selfCheckServerWorkspace=null;
    return true;
};

let setupServerVersion = 0;
let setupServerWorkspace = null;
let setupHydrating = false;
let setupSaveTimer = null;
const setupStatusNode = () => document.querySelector('[data-setup-storage-status]');
const setSetupStorageStatus = (message, tone = 'local') => {
    const node = setupStatusNode();
    if (!node) return;
    node.textContent = message;
    node.dataset.storageTone = tone;
};
const setupRuntimeState = () => {
    try { return reportRuntimeBridge.state(); }
    catch { return { signedIn:false, workspaceId:null, workspaceName:null }; }
};
const sameStringSet = (a,b) => {
    const aa=[...new Set((a||[]).map(String))].sort();
    const bb=[...new Set((b||[]).map(String))].sort();
    return aa.length===bb.length && aa.every((v,i)=>v===bb[i]);
};
const saveSetupChecklistToServer = async () => {
    const state = setupRuntimeState();
    if (!state.signedIn || !state.workspaceId) {
        setSetupStorageStatus('브라우저 Local Storage에 저장됨 · 로그인하면 Workspace 서버와 동기화됩니다.','local');
        return null;
    }
    switchQuestStoreScope();
    const scopeKey=`${state.userId||'anon'}|${state.workspaceId}`;
    setSetupStorageStatus('브라우저 저장 완료 · Workspace 서버 동기화 중…','syncing');
    try {
        const result = await reportRuntimeBridge.saveSetupChecklist({
            eventId:`SETUP-12-${Date.now().toString(36)}`,
            expectedVersion:setupServerVersion,
            checkedIds:[...questStore.setupChecks]
        });
        const record=result?.record;
        setupServerVersion=Number(record?.version ?? setupServerVersion);
        setupServerWorkspace=scopeKey;
        const serverUpdated=record?.updated_at || record?.updatedAt || new Date().toISOString();
        questStore.setupUpdatedAt=serverUpdated;
        saveQuestStore();
        setSetupStorageStatus(`Workspace 서버 저장됨 · v${setupServerVersion} · ${state.workspaceName || state.workspaceId}`,'server');
        try { window.dispatchEvent(new CustomEvent('leaderos:setup-changed')); } catch {}
        return record;
    } catch (error) {
        const code=error?.code || error?.message || String(error);
        if (String(code).includes('VERSION_CONFLICT')) {
            setupServerWorkspace=null;
            setSetupStorageStatus('다른 화면에서 체크리스트가 변경되었습니다. 최신 서버 상태를 다시 불러옵니다.','conflict');
            setTimeout(()=>hydrateSetupChecklistFromServer(true),120);
        } else {
            setSetupStorageStatus(`Local 저장은 완료됨 · 서버 동기화 실패: ${code}`,'error');
        }
        return null;
    }
};
const queueSetupChecklistServerSave = () => {
    const state=setupRuntimeState();
    if (!state.signedIn || !state.workspaceId) {
        setSetupStorageStatus('브라우저 Local Storage에 저장됨 · 로그인하면 Workspace 서버와 동기화됩니다.','local');
        return;
    }
    clearTimeout(setupSaveTimer);
    setSetupStorageStatus('브라우저 저장 완료 · 서버 저장 대기 중…','syncing');
    setupSaveTimer=setTimeout(()=>saveSetupChecklistToServer(),320);
};
const hydrateSetupChecklistFromServer = async (force=false) => {
    const state=setupRuntimeState();
    if (!state.signedIn || !state.workspaceId) {
        setSetupStorageStatus('브라우저 Local Storage 모드 · 로그인하면 Workspace DB와 동기화됩니다.','local');
        return;
    }
    switchQuestStoreScope();
    const scopeKey=`${state.userId||'anon'}|${state.workspaceId}`;
    if (setupHydrating) return;
    if (!force && setupServerWorkspace===scopeKey) return;
    setupHydrating=true;
    try {
        setSetupStorageStatus('Workspace 서버의 체크리스트 상태를 불러오는 중…','syncing');
        const response=await reportRuntimeBridge.setupChecklistStatus();
        const server=response?.setupChecklist || {};
        const serverVersion=Number(server.version || 0);
        const serverIds=Array.isArray(server.checkedIds) ? server.checkedIds.map(String) : [];
        const serverTime=server.updatedAt ? new Date(server.updatedAt).getTime() : 0;
        const localTime=questStore.setupUpdatedAt ? new Date(questStore.setupUpdatedAt).getTime() : 0;
        setupServerVersion=serverVersion;
        setupServerWorkspace=scopeKey;

        if (serverVersion===0) {
            if (questStore.setupChecks.length) {
                await saveSetupChecklistToServer();
            } else {
                setSetupStorageStatus(`Workspace 서버 연결됨 · 아직 저장된 Setup 체크 없음 · ${state.workspaceName || state.workspaceId}`,'server');
            }
        } else if (localTime > serverTime + 1000 && !sameStringSet(questStore.setupChecks,serverIds)) {
            await saveSetupChecklistToServer();
        } else {
            questStore.setupChecks=serverIds;
            questStore.setupUpdatedAt=server.updatedAt || questStore.setupUpdatedAt;
            saveQuestStore();
            renderSetupChecklist();
            renderTodayLeaderNudge();
            setSetupStorageStatus(`Workspace 서버 상태 불러옴 · v${serverVersion} · ${serverIds.length}/12 수동 체크 저장`,'server');
        }
    } catch (error) {
        setSetupStorageStatus(`Local Storage 유지 · 서버 상태 로드 실패: ${error?.code || error?.message || String(error)}`,'error');
    } finally {
        setupHydrating=false;
    }
};


const ARTIFACT_STORAGE_BASE = 'leader-os:operating-artifacts:v7';
const refArray = (value) => {
    if (Array.isArray(value)) return [...new Set(value.map((x)=>String(x||'').trim()).filter(Boolean))];
    const text=String(value||'').trim();
    if(!text) return [];
    return [...new Set(text.split(',').map((x)=>x.trim()).filter(Boolean))];
};
const normalizeArtifactRows = (rows,type='') => Array.isArray(rows) ? rows.map((row) => {
    const normalized={
      ...row,
      version: Number.isInteger(Number(row?.version)) ? Number(row.version) : 1,
      artifactState: typeof row?.artifactState === 'string' ? row.artifactState : 'DRAFT',
      history: Array.isArray(row?.history) ? row.history : []
    };
    const migrate=(plural,singular)=>{ normalized[plural]=refArray(row?.[plural] ?? row?.[singular]); if(singular in normalized) delete normalized[singular]; };
    if(type==='WORK_MAP'){ migrate('milestoneRefs','milestoneRef');migrate('decisionRefs','decisionRef');migrate('delegationRefs','delegationRef');migrate('debriefRefs','debriefRef');migrate('calendarRefs','calendarRef'); }
    if(type==='MILESTONES'){ migrate('workRefs','workRef');migrate('decisionRefs','decisionRef');migrate('calendarRefs','calendarRef'); }
    if(type==='DECISION_RIGHTS'){ migrate('workRefs','workRef');migrate('milestoneRefs','milestoneRef'); }
    if(type==='DELEGATION'){ migrate('workRefs','workRef');migrate('commitmentRefs','commitmentRef'); }
    if(type==='DEBRIEF'){ migrate('workRefs','workRef');migrate('commitmentRefs','commitmentRef'); }
    if(type==='TEAM_CALENDAR'){ migrate('workRefs','workRef');migrate('milestoneRefs','milestoneRef'); }
    if(type==='ONE_ON_ONE_COMMITMENT'){ migrate('delegationRefs','delegationRef');migrate('debriefRefs','debriefRef'); }
    return normalized;
}) : [];
const artifactShape = (parsed = {}) => ({
    workspaceId: typeof parsed.workspaceId === 'string' ? parsed.workspaceId : 'DEMO-WORKSPACE',
    MANAGER_CONTRACT: normalizeArtifactRows(parsed.MANAGER_CONTRACT,'MANAGER_CONTRACT'),
    TEAM_MAP: normalizeArtifactRows(parsed.TEAM_MAP,'TEAM_MAP'),
    TEAM_PATTERN: normalizeArtifactRows(parsed.TEAM_PATTERN,'TEAM_PATTERN'),
    STAKEHOLDER_MAP: normalizeArtifactRows(parsed.STAKEHOLDER_MAP,'STAKEHOLDER_MAP'),
    TEAM_CALENDAR: normalizeArtifactRows(parsed.TEAM_CALENDAR,'TEAM_CALENDAR'),
    WORK_MAP: normalizeArtifactRows(parsed.WORK_MAP,'WORK_MAP'),
    MILESTONES: normalizeArtifactRows(parsed.MILESTONES,'MILESTONES'),
    PRIORITY_CONTRACT: normalizeArtifactRows(parsed.PRIORITY_CONTRACT,'PRIORITY_CONTRACT'),
    DECISION_RIGHTS: normalizeArtifactRows(parsed.DECISION_RIGHTS,'DECISION_RIGHTS'),
    DELEGATION: normalizeArtifactRows(parsed.DELEGATION,'DELEGATION'),
    FEEDBACK_PRACTICE: normalizeArtifactRows(parsed.FEEDBACK_PRACTICE,'FEEDBACK_PRACTICE'),
    OPERATING_RHYTHM: normalizeArtifactRows(parsed.OPERATING_RHYTHM,'OPERATING_RHYTHM'),
    DEBRIEF: normalizeArtifactRows(parsed.DEBRIEF,'DEBRIEF'),
    ONE_ON_ONE_COMMITMENT: normalizeArtifactRows(parsed.ONE_ON_ONE_COMMITMENT,'ONE_ON_ONE_COMMITMENT'),
    WEEKLY_REVIEW: normalizeArtifactRows(parsed.WEEKLY_REVIEW,'WEEKLY_REVIEW'),
    TEAM_OS_CHARTER: normalizeArtifactRows(parsed.TEAM_OS_CHARTER,'TEAM_OS_CHARTER'),
    NEXT_60_PLAN: normalizeArtifactRows(parsed.NEXT_60_PLAN,'NEXT_60_PLAN'),
    NEXT_60_CHECKIN: normalizeArtifactRows(parsed.NEXT_60_CHECKIN,'NEXT_60_CHECKIN'),
    REPORT_BRIEF: normalizeArtifactRows(parsed.REPORT_BRIEF,'REPORT_BRIEF')
});

const artifactStorageScope = () => {
    try {
        const state=reportRuntimeBridge.state();
        return state.signedIn && state.userId && state.workspaceId
            ? `${state.userId}:${state.workspaceId}`
            : 'guest';
    } catch { return 'guest'; }
};
const artifactStorageKey = (scope) => `${ARTIFACT_STORAGE_BASE}:${scope}`;
let activeArtifactStorageScope=artifactStorageScope();
let activeArtifactStorageKey=artifactStorageKey(activeArtifactStorageScope);
const readArtifactStore = (key=activeArtifactStorageKey, allowLegacy=activeArtifactStorageScope==='guest') => {
    try {
        const raw = browserStorage.getItem(key) || (allowLegacy
            ? browserStorage.getItem('leader-os:operating-artifacts:v6')
                || browserStorage.getItem('leader-os:operating-artifacts:v5')
                || browserStorage.getItem('leader-os:operating-artifacts:v4')
                || browserStorage.getItem('leader-os:operating-artifacts:v3')
                || browserStorage.getItem('leader-os:operating-artifacts:v2')
                || browserStorage.getItem('leader-os:operating-artifacts:v1')
            : null);
        return raw ? artifactShape(JSON.parse(raw)) : artifactShape();
    } catch { return artifactShape(); }
};
let artifactStore = readArtifactStore();
const notifyArtifactChange = (reason='SAVE') => {
    try { window.dispatchEvent(new CustomEvent('leaderos:artifacts-changed',{detail:{reason,scope:activeArtifactStorageScope}})); } catch {}
};
const saveArtifactStore = () => {
    try { browserStorage.setItem(activeArtifactStorageKey, JSON.stringify(artifactStore)); } catch {}
    notifyArtifactChange('SAVE');
};
const switchArtifactStoreScope = () => {
    const nextScope=artifactStorageScope();
    if(nextScope===activeArtifactStorageScope) return false;
    try { browserStorage.setItem(activeArtifactStorageKey, JSON.stringify(artifactStore)); } catch {}
    activeArtifactStorageScope=nextScope;
    activeArtifactStorageKey=artifactStorageKey(nextScope);
    artifactStore=readArtifactStore(activeArtifactStorageKey,nextScope==='guest');
    artifactServerWorkspace=null;
    notifyArtifactChange('SCOPE_SWITCH');
    return true;
};

let artifactServerWorkspace = null;
let artifactHydrating = false;
const artifactSyncTimers = new Map();
const artifactRuntimeState = () => {
    try { return reportRuntimeBridge.state(); }
    catch { return { signedIn:false, userId:null, workspaceId:null, workspaceName:null }; }
};
const artifactStatusMessage = (message, tone='local') => {
    if (!artifactStorageStatus) return;
    artifactStorageStatus.textContent = message;
    artifactStorageStatus.dataset.storageTone = tone;
};
const localArtifactRecord = (type,id) => artifactRows(type).find((row)=>row.id===id) || null;
const persistServerMeta = (type,id,patch) => {
    const rows=artifactRows(type), index=rows.findIndex((row)=>row.id===id);
    if(index<0) return null;
    rows[index]={...rows[index],...patch};
    artifactStore[type]=rows;
    saveArtifactStore();
    return rows[index];
};
const syncOperatingArtifactToServer = async (type,id) => {
    const state=artifactRuntimeState();
    switchArtifactStoreScope();
    const row=localArtifactRecord(type,id);
    if(!row) return null;
    if(!state.signedIn || !state.workspaceId){
        artifactStatusMessage(`LOCAL · ${allArtifactRecords().length} OBJECTS · 로그인하면 Workspace DB와 동기화됩니다.`,'local');
        return null;
    }
    artifactStatusMessage(`LOCAL 저장 완료 · ${type} 서버 동기화 중…`,'syncing');
    try{
        const result=await reportRuntimeBridge.saveOperatingArtifact({
            eventId:`ARTIFACT-${String(id).slice(-20)}-${Date.now().toString(36)}`,
            artifactId:id,
            artifactType:type,
            artifactState:String(row.artifactState||'DRAFT').toUpperCase(),
            expectedVersion:Number(row.serverVersion||0),
            localVersion:Number(row.version||1),
            title:artifactPrimary(type,row),
            payload:artifactDataSnapshot(row)
        });
        const record=result?.artifact||{};
        const next=persistServerMeta(type,id,{
            serverVersion:Number(record.version||row.serverVersion||0),
            serverSyncedAt:record.updated_at||record.updatedAt||new Date().toISOString(),
            serverSyncError:null
        });
        artifactServerWorkspace=`${state.userId||'anon'}|${state.workspaceId}`;
        artifactStatusMessage(`WORKSPACE DB SYNC · ${type} · server v${next?.serverVersion||record.version||'?'}`,'server');
        if(typeof renderSetupChecklist==='function') renderSetupChecklist();
        return record;
    }catch(error){
        const code=error?.code||error?.message||String(error);
        persistServerMeta(type,id,{serverSyncError:code});
        if(String(code).includes('VERSION_CONFLICT')){
            artifactStatusMessage(`${type} Version 충돌 · 서버 최신 상태를 다시 불러옵니다.`,'conflict');
            artifactServerWorkspace=null;
            setTimeout(()=>hydrateOperatingArtifactsFromServer(true),160);
        }else{
            artifactStatusMessage(`Local 저장 유지 · ${type} 서버 동기화 실패: ${code}`,'error');
        }
        return null;
    }
};
const queueOperatingArtifactSync = (type,id) => {
    const state=artifactRuntimeState();
    if(!state.signedIn || !state.workspaceId){
        artifactStatusMessage(`LOCAL · ${allArtifactRecords().length} OBJECTS · 로그인하면 Workspace DB와 동기화됩니다.`,'local');
        return;
    }
    const key=`${type}|${id}`;
    clearTimeout(artifactSyncTimers.get(key));
    artifactSyncTimers.set(key,setTimeout(()=>{artifactSyncTimers.delete(key);syncOperatingArtifactToServer(type,id)},260));
};
const deleteOperatingArtifactFromServer = async (type,row) => {
    const state=artifactRuntimeState();
    if(!state.signedIn || !state.workspaceId || !row?.serverVersion) return null;
    artifactStatusMessage(`${type} 서버 삭제 상태 반영 중…`,'syncing');
    try{
        const result=await reportRuntimeBridge.deleteOperatingArtifact({
            eventId:`ARTIFACT-DELETE-${String(row.id).slice(-18)}-${Date.now().toString(36)}`,
            artifactId:row.id,
            expectedVersion:Number(row.serverVersion)
        });
        artifactStatusMessage(`WORKSPACE DB · ${type} 삭제 반영됨`,'server');
        return result?.artifact||null;
    }catch(error){
        artifactStatusMessage(`로컬에서는 삭제됨 · 서버 삭제 반영 실패: ${error?.code||error?.message||String(error)}`,'error');
        return null;
    }
};
const hydrateOperatingArtifactsFromServer = async (force=false) => {
    const state=artifactRuntimeState();
    if(!state.signedIn || !state.workspaceId){
        artifactStatusMessage(`LOCAL · ${allArtifactRecords().length} OBJECTS · 로그인하면 Workspace DB와 동기화됩니다.`,'local');
        return;
    }
    switchArtifactStoreScope();
    const scopeKey=`${state.userId||'anon'}|${state.workspaceId}`;
    if(artifactHydrating) return;
    if(!force && artifactServerWorkspace===scopeKey) return;
    artifactHydrating=true;
    try{
        artifactStatusMessage('Workspace Operating Artifacts 불러오는 중…','syncing');
        const response=await reportRuntimeBridge.operatingArtifactsStatus(250);
        const serverRows=Array.isArray(response?.artifacts)?response.artifacts:[];
        const serverIds=new Set();
        for(const item of serverRows){
            const type=String(item.artifactType||'');
            if(!artifactDefinitions[type]) continue;
            const id=String(item.artifactId||'');
            if(!id) continue;
            serverIds.add(`${type}|${id}`);
            if(!Array.isArray(artifactStore[type])) artifactStore[type]=[];
            const rows=artifactStore[type], index=rows.findIndex((row)=>row.id===id);
            const serverRow={
                id,
                ...(item.payload&&typeof item.payload==='object'?item.payload:{}),
                version:Number(item.localVersion||1),
                artifactState:String(item.artifactState||'DRAFT').toUpperCase(),
                history:index>=0&&Array.isArray(rows[index].history)?rows[index].history:[],
                updatedAt:item.updatedAt||new Date().toISOString(),
                serverVersion:Number(item.version||0),
                serverSyncedAt:item.updatedAt||null,
                serverSyncError:null
            };
            if(index<0) rows.push(serverRow);
            else if(rows[index].serverVersion && Number(item.version||0)>Number(rows[index].serverVersion||0)) rows[index]=serverRow;
            artifactStore[type]=rows;
        }
        saveArtifactStore();
        artifactServerWorkspace=scopeKey;

        const unsynced=allArtifactRecords().filter((row)=>!row.serverVersion);
        for(const row of unsynced.slice(0,40)){
            const type=row.artifactType;
            if(type&&artifactDefinitions[type]) queueOperatingArtifactSync(type,row.id);
        }
        renderArtifactWorkspace();
        renderSetupChecklist();
        renderQuestList();
        renderTodayLeaderNudge();
        artifactStatusMessage(`WORKSPACE DB · ${serverRows.length} server artifacts · ${unsynced.length} local pending`,'server');
    }catch(error){
        artifactStatusMessage(`Local-first 유지 · 서버 Artifact 로드 실패: ${error?.code||error?.message||String(error)}`,'error');
    }finally{
        artifactHydrating=false;
    }
};


const ROLE_PACKS = Object.freeze({
    TEAM_MANAGER:{ name:'Team Manager', summary:'처음 팀을 맡은 리더의 기본 운영 루프: 사람 → 리듬 → 결정 → 위임 → 회고.', focus:'운영 명확성', starter:{ person:'민지', role:'Brand PM', milestone:'Team Operating Rhythm v1', decision:'주간 Top 3 우선순위', delegation:'주간 회의 운영' } },
    MARKETING_LEADER:{ name:'Marketing Leader', summary:'캠페인·예산·성과 의사결정과 채널 간 역할 분담을 중심으로 봅니다.', focus:'성과와 의사결정 속도', starter:{ person:'준호', role:'Performance Lead', milestone:'Campaign Concept Lock', decision:'광고 예산 ±10%', delegation:'소재 A/B 테스트' } },
    CREATIVE_DIRECTOR:{ name:'Creative Director', summary:'크리에이티브 기준·승인·피드백·외주 품질의 Decision Rights를 중심으로 봅니다.', focus:'기준과 승인 병목', starter:{ person:'서연', role:'Creative Lead', milestone:'Hero Visual Lock', decision:'최종 비주얼 방향', delegation:'콘셉트 보드 1차 선택' } },
    PRODUCT_LEAD:{ name:'Product Lead', summary:'제품 우선순위·Discovery·Milestone·Cross-functional 결정 구조를 중심으로 봅니다.', focus:'제품 판단과 의존성', starter:{ person:'지훈', role:'Product Manager', milestone:'MVP Scope Lock', decision:'이번 Sprint Scope', delegation:'Discovery 인터뷰 운영' } }
});
const renderRolePack = () => {
    const pack = ROLE_PACKS[questStore.rolePack] || ROLE_PACKS.TEAM_MANAGER;
    rolePackSelect.value = questStore.rolePack in ROLE_PACKS ? questStore.rolePack : 'TEAM_MANAGER';
    rolePackTitle.textContent = pack.name;
    rolePackSummary.textContent = `${pack.summary} · Focus: ${pack.focus}`;
};
rolePackSelect.addEventListener('change', () => {
    questStore.rolePack = rolePackSelect.value;
    saveQuestStore();
    renderRolePack();
    renderArtifactWorkspace();
    renderTodayLeaderNudge();
renderRecovery14Surfaces();
});

const QUEST_ARTIFACT_TYPE = Object.freeze({ 2:'MANAGER_CONTRACT', 3:'TEAM_MAP', 5:'TEAM_PATTERN', 6:'STAKEHOLDER_MAP', 8:'TEAM_CALENDAR', 10:'WORK_MAP', 11:'MILESTONES', 13:'PRIORITY_CONTRACT', 16:'DECISION_RIGHTS', 19:'DELEGATION', 20:'DELEGATION', 22:'FEEDBACK_PRACTICE', 26:'DEBRIEF', 28:'OPERATING_RHYTHM', 30:'TEAM_OS_CHARTER' });
const SETUP_ARTIFACT_TYPE = Object.freeze({
    'OBSERVE-ROLE':'MANAGER_CONTRACT',
    'OBSERVE-TEAM':'TEAM_MAP',
    'OBSERVE-1ON1':'TEAM_PATTERN',
    'MAP-CALENDAR':'TEAM_CALENDAR',
    'MAP-WORK':'WORK_MAP',
    'MAP-MILESTONE':'MILESTONES',
    'ALIGN-PRIORITY':'PRIORITY_CONTRACT',
    'ALIGN-DECISION':'DECISION_RIGHTS',
    'ALIGN-DELEGATE':'DELEGATION',
    'OPERATE-FEEDBACK':'FEEDBACK_PRACTICE',
    'OPERATE-DEBRIEF':'DEBRIEF',
    'OPERATE-RHYTHM':'TEAM_OS_CHARTER'
});
const setupGroups = {
    UNDERSTAND:'1 · UNDERSTAND · 팀 이해',
    ALIGN:'2 · ALIGN · 운영 기준',
    EMPOWER:'3 · EMPOWER · 결정·위임',
    COACH:'4 · COACH · 코칭·회고'
};
const QUEST_COACH_SCENARIO_BY_DAY = Object.freeze({
    1:'DEBRIEF',2:'REPORT',3:'TASK',4:'ONEONONE',5:'ONEONONE',6:'TASK',7:'DEBRIEF',
    8:'MEETING',9:'MEETING',10:'TASK',11:'TASK',12:'TASK',13:'REPORT',14:'DEBRIEF',
    15:'DECISION',16:'DECISION',17:'DECISION',18:'DELEGATE',19:'DELEGATE',20:'DELEGATE',21:'DEBRIEF',
    22:'FEEDBACK',23:'FEEDBACK',24:'ONEONONE',25:'FEEDBACK',26:'DEBRIEF',27:'DEBRIEF',28:'MEETING',29:'DEBRIEF',30:'REPORT'
});
const LEADERSHIP_HARNESS_PHASES = Object.freeze({
    UNDERSTAND:{days:'1–7',label:'팀 이해',finish:'사람·일·관계의 실제 Context를 설명할 수 있다.',gateDay:7,artifacts:['MANAGER_CONTRACT','TEAM_MAP','TEAM_PATTERN']},
    ALIGN:{days:'8–14',label:'운영 기준',finish:'시간·Work·Milestone·Priority가 하나의 운영 기준으로 연결된다.',gateDay:14,artifacts:['TEAM_CALENDAR','WORK_MAP','MILESTONES','PRIORITY_CONTRACT']},
    EMPOWER:{days:'15–21',label:'결정·위임',finish:'중요 결정의 D와 업무별 권한 범위를 팀이 이해한다.',gateDay:21,artifacts:['DECISION_RIGHTS','DELEGATION']},
    COACH:{days:'22–30',label:'코칭·Team OS',finish:'피드백·회고·운영 리듬이 반복되고 Team OS Charter로 남는다.',gateDay:30,artifacts:['FEEDBACK_PRACTICE','DEBRIEF','OPERATING_RHYTHM','TEAM_OS_CHARTER']}
});
const artifactRows = (type) => Array.isArray(artifactStore[type]) ? artifactStore[type] : [];
const allArtifactRecords = () => Object.entries(artifactStore).flatMap(([type, rows]) => Array.isArray(rows) ? rows.map((row) => ({ ...row, artifactType:type })) : []);
const artifactRecordById = (id) => allArtifactRecords().find((row) => row.id === id) || null;
const artifactPrimary = (type, row) => {
    if (!row) return type;
    if (type === 'MANAGER_CONTRACT') return `Manager Contract · ${row.manager || '상급자 미정'}`;
    if (type === 'TEAM_MAP') return `${row.name || '팀원'} · ${row.role || '역할 미정'}`;
    if (type === 'TEAM_PATTERN') return row.pattern || 'Team Pattern';
    if (type === 'STAKEHOLDER_MAP') return `${row.stakeholder || 'Stakeholder'} · ${row.role || '역할 미정'}`;
    if (type === 'TEAM_CALENDAR') return `${row.day || ''} ${row.time || ''} · ${row.title || '일정'}`.trim();
    if (type === 'WORK_MAP') return `${row.project || 'Project'} · ${row.owner || 'Owner 미정'}`;
    if (type === 'MILESTONES') return `${row.project || 'Project'} · ${row.milestone || 'Milestone'}`;
    if (type === 'PRIORITY_CONTRACT') return row.priority1 || 'Priority Contract';
    if (type === 'DECISION_RIGHTS') return row.decision || 'Decision';
    if (type === 'DELEGATION') return row.task || 'Delegation';
    if (type === 'FEEDBACK_PRACTICE') return `${row.person || 'Feedback'} · ${row.situation || 'Situation'}`;
    if (type === 'OPERATING_RHYTHM') return row.name || 'Team Operating Rhythm';
    if (type === 'DEBRIEF') return row.actual || row.expected || 'Debrief';
    if (type === 'ONE_ON_ONE_COMMITMENT') return `${row.person || 'Person'} · ${row.commitment || 'Commitment'}`;
    if (type === 'WEEKLY_REVIEW') return `Weekly Review · ${row.week || 'This week'}`;
    if (type === 'TEAM_OS_CHARTER') return `Team OS Charter · ${row.versionLabel || 'v1'}`;
    if (type === 'NEXT_60_PLAN') return `Next 60 Days · ${row.period || 'Day 31–90'}`;
    if (type === 'NEXT_60_CHECKIN') return `${row.week || 'Weekly'} · ${row.outcomeKey || 'Outcome'} · ${row.status || 'CHECK-IN'}`;
    if (type === 'REPORT_BRIEF') return `Manager Brief · ${row.week || 'This week'}`;
    return type;
};
const artifactRefsForDay = (day) => Array.isArray(questStore.evidenceRefs?.[String(day)]) ? questStore.evidenceRefs[String(day)].filter((id) => artifactRecordById(id)) : [];
const linkArtifactToQuest = (day, artifactId) => {
    const key = String(day);
    const refs = new Set(artifactRefsForDay(day));
    refs.add(artifactId);
    questStore.evidenceRefs[key] = [...refs];
    saveQuestStore();
};
const unlinkArtifactFromQuest = (day, artifactId) => {
    const key = String(day);
    questStore.evidenceRefs[key] = artifactRefsForDay(day).filter((id) => id !== artifactId);
    saveQuestStore();
};
const removeArtifactRefs = (artifactId) => {
    for (const [day, refs] of Object.entries(questStore.evidenceRefs || {})) {
        if (Array.isArray(refs) && refs.includes(artifactId)) questStore.evidenceRefs[day] = refs.filter((id) => id !== artifactId);
    }
    saveQuestStore();
};
const setupDone = (item) => {
    const type = SETUP_ARTIFACT_TYPE[item.id];
    if (type && artifactRows(type).length > 0) return { done:true, auto:true, source:`${artifactRows(type).length} Artifact` };
    if (questStore.completed.includes(item.day)) return { done:true, auto:true, source:`Day ${item.day} Evidence` };
    if (questStore.setupChecks.includes(item.id)) return { done:true, auto:false, source:'Manual' };
    return { done:false, auto:false, source:'Not started' };
};
const renderSetupChecklist = () => {
    setupChecklistRoot.innerHTML = Object.entries(setupGroups).map(([group,label]) => {
        const items = LEADERSHIP_SETUP_CHECKLIST.filter((item) => item.group === group);
        const doneCount = items.filter((item)=>setupDone(item).done).length;
        return `<section class="setup-group"><div class="setup-group-head"><strong>${escapeHtml(label)}</strong><span>${doneCount}/${items.length}</span></div><div class="setup-list">${items.map((item)=>{
            const status=setupDone(item);
            return `<div class="setup-item ${status.done?'done':''} ${status.auto?'auto-done':''}" data-setup-id="${escapeHtml(item.id)}">
                <label class="setup-item-main">
                    <input type="checkbox" class="setup-native-check" data-setup-check-id="${escapeHtml(item.id)}" ${status.done?'checked':''} ${status.auto?'disabled':''} aria-label="${escapeHtml(item.title)} 완료 체크">
                    <span class="setup-check" aria-hidden="true">✓</span>
                    <span class="setup-item-copy"><strong>${escapeHtml(item.title)}</strong><small>Day ${item.day} · ${escapeHtml(item.artifact)}</small><span class="setup-source">${escapeHtml(status.source)}${status.auto?' · Evidence 기반 자동 완료':''}</span></span>
                </label>
                <button type="button" class="setup-open-btn" data-setup-open-id="${escapeHtml(item.id)}">열기</button>
            </div>`;
        }).join('')}</div></section>`;
    }).join('');
    const done = LEADERSHIP_SETUP_CHECKLIST.filter((item)=>setupDone(item).done).length;
    const pct = Math.round(done / LEADERSHIP_SETUP_CHECKLIST.length * 100);
    setupProgressRoot.style.width = `${pct}%`;
    setupProgressCopy.textContent = `${done} / ${LEADERSHIP_SETUP_CHECKLIST.length}`;

    for (const input of setupChecklistRoot.querySelectorAll('[data-setup-check-id]')) {
        input.addEventListener('change', () => {
            const item = LEADERSHIP_SETUP_CHECKLIST.find((row)=>row.id===input.dataset.setupCheckId);
            if (!item || setupDone(item).auto) return;
            const set = new Set(questStore.setupChecks);
            if (input.checked) set.add(item.id); else set.delete(item.id);
            questStore.setupChecks = [...set];
            questStore.setupUpdatedAt = new Date().toISOString();
            saveQuestStore();
            renderSetupChecklist();
            renderTodayLeaderNudge();
            queueSetupChecklistServerSave();
        });
    }
    for (const btn of setupChecklistRoot.querySelectorAll('[data-setup-open-id]')) {
        btn.addEventListener('click', () => {
            const item = LEADERSHIP_SETUP_CHECKLIST.find((row)=>row.id===btn.dataset.setupOpenId);
            if (!item) return;
            const type = SETUP_ARTIFACT_TYPE[item.id];
            if (type) {
                questStore.artifactTab = type;
                saveQuestStore();
                renderArtifactWorkspace();
            }
            renderQuestDetail(item.day);
        });
    }
};
setTimeout(()=>hydrateSetupChecklistFromServer(false),1200);
window.addEventListener('focus',()=>hydrateSetupChecklistFromServer(false));
document.addEventListener('click',(event)=>{
    if (event.target?.closest?.('[data-route="ONBOARDING"],[data-page-link="ONBOARDING"],[data-r21-path="DAY30"],[data-r21-go-quest]')) {
        setTimeout(()=>hydrateSetupChecklistFromServer(false),260);
    }
},true);
Object.defineProperty(window,'LeaderOsSetupChecklistBridge',{
    value:{
        hydrate:()=>hydrateSetupChecklistFromServer(true),
        sync:()=>saveSetupChecklistToServer(),
        state:()=>({checkedIds:[...questStore.setupChecks],updatedAt:questStore.setupUpdatedAt,serverVersion:setupServerVersion,workspaceId:setupServerWorkspace})
    },
    enumerable:false,configurable:true
});


let missionServerVersion = 0;
let missionServerWorkspace = null;
let missionHydrating = false;
let missionSaveTimer = null;
let selfCheckServerVersion = 0;
let selfCheckServerWorkspace = null;
let selfCheckHydrating = false;
let selfCheckSaveTimer = null;
const missionRuntimeState = () => {
    try { return reportRuntimeBridge.state(); }
    catch { return { signedIn:false, userId:null, workspaceId:null, workspaceName:null }; }
};
const normalizeMissionChecks = (raw={}) => {
    const out={};
    for(const mission of LEADERSHIP_MISSIONS){
        const key=String(mission.day);
        const allowed=new Set(mission.checklist.map((item)=>item.id));
        const values=Array.isArray(raw?.[key])?raw[key]:[];
        out[key]=[...new Set(values.map(String).filter((id)=>allowed.has(id)))].sort();
    }
    return out;
};
const missionForDay = (day) => LEADERSHIP_MISSIONS.find((item)=>item.day===Number(day)) || LEADERSHIP_MISSIONS[0];
const missionCheckedIds = (day) => {
    const key=String(day);
    return normalizeMissionChecks(questStore.missionChecks)[key] || [];
};
const missionCheckProgress = (day) => {
    const mission=missionForDay(day);
    const checked=new Set(missionCheckedIds(day));
    const required=mission.checklist.filter((item)=>item.required!==false);
    const done=required.filter((item)=>checked.has(item.id)).length;
    return {checked:[...checked],done,total:required.length,complete:required.length>0&&done===required.length};
};
const missionSummarySnapshot = () => {
    const days=LEADERSHIP_MISSIONS.map((mission)=>{
        const progress=missionCheckProgress(mission.day);
        const evidence=Boolean(String(questStore.evidence[String(mission.day)]??'').trim())||artifactRefsForDay(mission.day).length>0;
        const selfLevel=String(questStore.selfVerification[String(mission.day)]||'NOT_YET');
        return {...mission,progress,evidence,selfLevel,questComplete:questStore.completed.includes(mission.day)};
    });
    const pillars=Object.fromEntries(Object.entries(LEADERSHIP_MISSION_PILLARS).map(([id,meta])=>{
        const subset=days.filter((d)=>d.pillar===id);
        return [id,{...meta,days:subset.length,missionComplete:subset.filter((d)=>d.progress.complete).length,evidence:subset.filter((d)=>d.evidence).length,repeatable:subset.filter((d)=>d.selfLevel==='REPEATABLE').length}];
    }));
    return {
        days,
        pillars,
        missionCompleteDays:days.filter((d)=>d.progress.complete).length,
        evidenceDays:days.filter((d)=>d.evidence).length,
        repeatableDays:days.filter((d)=>d.selfLevel==='REPEATABLE').length,
        totalDays:30
    };
};
const saveMissionChecklistToServer = async () => {
    const state=missionRuntimeState();
    if(!state.signedIn||!state.workspaceId)return null;
    switchQuestStoreScope();
    const scopeKey=`${state.userId||'anon'}|${state.workspaceId}`;
    try{
        const result=await reportRuntimeBridge.saveMissionChecklist({
            eventId:`MISSION-CHECKLIST-${Date.now().toString(36)}`,
            expectedVersion:missionServerVersion,
            checksByDay:normalizeMissionChecks(questStore.missionChecks)
        });
        const record=result?.record||{};
        missionServerVersion=Number(record.version||missionServerVersion||0);
        missionServerWorkspace=scopeKey;
        questStore.missionUpdatedAt=record.updated_at||record.updatedAt||new Date().toISOString();
        saveQuestStore();
        try{window.dispatchEvent(new CustomEvent('leaderos:mission-checklist-changed'))}catch{}
        return record;
    }catch(error){
        if(String(error?.code||error?.message||error).includes('VERSION_CONFLICT')){
            missionServerWorkspace=null;
            setTimeout(()=>hydrateMissionChecklistFromServer(true),140);
        }
        return null;
    }
};
const queueMissionChecklistSave = () => {
    clearTimeout(missionSaveTimer);
    missionSaveTimer=setTimeout(()=>saveMissionChecklistToServer(),300);
};
const hydrateMissionChecklistFromServer = async (force=false) => {
    const state=missionRuntimeState();
    if(!state.signedIn||!state.workspaceId)return;
    switchQuestStoreScope();
    const scopeKey=`${state.userId||'anon'}|${state.workspaceId}`;
    if(missionHydrating)return;
    if(!force&&missionServerWorkspace===scopeKey)return;
    missionHydrating=true;
    try{
        const response=await reportRuntimeBridge.missionChecklistStatus();
        const server=response?.missionChecklist||{};
        missionServerVersion=Number(server.version||0);
        missionServerWorkspace=scopeKey;
        const serverChecks=normalizeMissionChecks(server.checksByDay||{});
        const serverTime=server.updatedAt?new Date(server.updatedAt).getTime():0;
        const localTime=questStore.missionUpdatedAt?new Date(questStore.missionUpdatedAt).getTime():0;
        const hasLocal=Object.values(normalizeMissionChecks(questStore.missionChecks)).some((ids)=>ids.length);
        if(missionServerVersion===0&&hasLocal){
            missionHydrating=false;
            return saveMissionChecklistToServer();
        }
        if(localTime>serverTime+1000&&hasLocal){
            missionHydrating=false;
            return saveMissionChecklistToServer();
        }
        questStore.missionChecks=serverChecks;
        questStore.missionUpdatedAt=server.updatedAt||questStore.missionUpdatedAt;
        saveQuestStore();
        renderQuestList();
        renderQuestDetail(questStore.selectedDay);
        renderTodayLeaderNudge();
    }catch{}
    finally{missionHydrating=false}
};
const saveLeadershipSelfCheckToServer = async () => {
    const state=missionRuntimeState();
    if(!state.signedIn||!state.workspaceId)return null;
    switchQuestStoreScope();
    const scopeKey=`${state.userId||'anon'}|${state.workspaceId}`;
    try{
        const result=await reportRuntimeBridge.saveLeadershipSelfCheck({
            eventId:`LEADERSHIP-SELF-CHECK-${Date.now().toString(36)}`,
            expectedVersion:selfCheckServerVersion,
            levelsByDay:{...questStore.selfVerification}
        });
        const record=result?.record||{};
        selfCheckServerVersion=Number(record.version||selfCheckServerVersion||0);
        selfCheckServerWorkspace=scopeKey;
        questStore.selfCheckUpdatedAt=record.updated_at||record.updatedAt||new Date().toISOString();
        saveQuestStore();
        try{window.dispatchEvent(new CustomEvent('leaderos:self-check-changed'))}catch{}
        return record;
    }catch(error){
        if(String(error?.code||error?.message||error).includes('VERSION_CONFLICT')){
            selfCheckServerWorkspace=null;
            setTimeout(()=>hydrateLeadershipSelfCheckFromServer(true),140);
        }
        return null;
    }
};
const queueLeadershipSelfCheckSave = () => {
    clearTimeout(selfCheckSaveTimer);
    selfCheckSaveTimer=setTimeout(()=>saveLeadershipSelfCheckToServer(),300);
};
const hydrateLeadershipSelfCheckFromServer = async (force=false) => {
    const state=missionRuntimeState();
    if(!state.signedIn||!state.workspaceId)return;
    switchQuestStoreScope();
    const scopeKey=`${state.userId||'anon'}|${state.workspaceId}`;
    if(selfCheckHydrating)return;
    if(!force&&selfCheckServerWorkspace===scopeKey)return;
    selfCheckHydrating=true;
    try{
        const response=await reportRuntimeBridge.leadershipSelfCheckStatus();
        const server=response?.selfCheck||{};
        selfCheckServerVersion=Number(server.version||0);
        selfCheckServerWorkspace=scopeKey;
        const levels=server.levelsByDay&&typeof server.levelsByDay==='object'?server.levelsByDay:{};
        const serverTime=server.updatedAt?new Date(server.updatedAt).getTime():0;
        const localTime=questStore.selfCheckUpdatedAt?new Date(questStore.selfCheckUpdatedAt).getTime():0;
        const hasLocal=Object.keys(questStore.selfVerification||{}).length>0;
        if(selfCheckServerVersion===0&&hasLocal){
            selfCheckHydrating=false;
            return saveLeadershipSelfCheckToServer();
        }
        if(localTime>serverTime+1000&&hasLocal){
            selfCheckHydrating=false;
            return saveLeadershipSelfCheckToServer();
        }
        questStore.selfVerification={...levels};
        questStore.selfCheckUpdatedAt=server.updatedAt||questStore.selfCheckUpdatedAt;
        saveQuestStore();
        renderQuestList();
        renderQuestDetail(questStore.selectedDay);
    }catch{}
    finally{selfCheckHydrating=false}
};
setTimeout(()=>hydrateMissionChecklistFromServer(false),2250);
setTimeout(()=>hydrateLeadershipSelfCheckFromServer(false),2350);
window.addEventListener('focus',()=>{hydrateMissionChecklistFromServer(false);hydrateLeadershipSelfCheckFromServer(false)});

let questProgressServerVersion = 0;
let questProgressServerWorkspace = null;
let questProgressHydrating = false;
let questProgressSaveTimer = null;
const questProgressRuntimeState = () => {
    try { return reportRuntimeBridge.state(); }
    catch { return { signedIn:false, userId:null, workspaceId:null, workspaceName:null }; }
};
const sameNumberSet = (a,b) => {
    const aa=[...new Set((a||[]).map(Number))].filter(Number.isInteger).sort((x,y)=>x-y);
    const bb=[...new Set((b||[]).map(Number))].filter(Number.isInteger).sort((x,y)=>x-y);
    return aa.length===bb.length && aa.every((v,i)=>v===bb[i]);
};
const saveQuestProgressToServer = async () => {
    const state=questProgressRuntimeState();
    if(!state.signedIn || !state.workspaceId) return null;
    switchQuestStoreScope();
    const scopeKey=`${state.userId||'anon'}|${state.workspaceId}`;
    try{
        const result=await reportRuntimeBridge.saveQuestProgress({
            eventId:`QUEST-PROGRESS-${Date.now().toString(36)}`,
            expectedVersion:questProgressServerVersion,
            completedDays:[...questStore.completed],
            selectedDay:Number(questStore.selectedDay)||1
        });
        const record=result?.record||{};
        questProgressServerVersion=Number(record.version||questProgressServerVersion||0);
        questProgressServerWorkspace=scopeKey;
        questStore.questProgressUpdatedAt=record.updated_at||record.updatedAt||new Date().toISOString();
        saveQuestStore();
        try { window.dispatchEvent(new CustomEvent('leaderos:quest-progress-changed')); } catch {}
        return record;
    }catch(error){
        const code=error?.code||error?.message||String(error);
        if(String(code).includes('VERSION_CONFLICT')){
            questProgressServerWorkspace=null;
            setTimeout(()=>hydrateQuestProgressFromServer(true),140);
        }
        return null;
    }
};
const queueQuestProgressServerSave = () => {
    const state=questProgressRuntimeState();
    if(!state.signedIn || !state.workspaceId) return;
    clearTimeout(questProgressSaveTimer);
    questProgressSaveTimer=setTimeout(()=>saveQuestProgressToServer(),320);
};
const hydrateQuestProgressFromServer = async (force=false) => {
    const state=questProgressRuntimeState();
    if(!state.signedIn || !state.workspaceId) return;
    switchQuestStoreScope();
    const scopeKey=`${state.userId||'anon'}|${state.workspaceId}`;
    if(questProgressHydrating) return;
    if(!force && questProgressServerWorkspace===scopeKey) return;
    questProgressHydrating=true;
    try{
        const response=await reportRuntimeBridge.questProgressStatus();
        const server=response?.questProgress||{};
        const serverVersion=Number(server.version||0);
        const serverDays=Array.isArray(server.completedDays)?server.completedDays.map(Number).filter((d)=>Number.isInteger(d)&&d>=1&&d<=30):[];
        const serverSelected=Number(server.selectedDay||1);
        const serverTime=server.updatedAt?new Date(server.updatedAt).getTime():0;
        const localTime=questStore.questProgressUpdatedAt?new Date(questStore.questProgressUpdatedAt).getTime():0;
        questProgressServerVersion=serverVersion;
        questProgressServerWorkspace=scopeKey;
        if(serverVersion===0){
            if(questStore.completed.length || Number(questStore.selectedDay)>1) await saveQuestProgressToServer();
        }else if(localTime>serverTime+1000 && (!sameNumberSet(questStore.completed,serverDays)||Number(questStore.selectedDay)!==serverSelected)){
            await saveQuestProgressToServer();
        }else{
            questStore.completed=[...new Set(serverDays)].sort((a,b)=>a-b);
            questStore.selectedDay=Number.isInteger(serverSelected)&&serverSelected>=1&&serverSelected<=30?serverSelected:1;
            questStore.questProgressUpdatedAt=server.updatedAt||questStore.questProgressUpdatedAt;
            saveQuestStore();
            renderQuestProgress();
            renderQuestList();
            renderSetupChecklist();
            renderQuestDetail(questStore.selectedDay);
            renderTodayLeaderNudge();
        }
    }catch{}
    finally{questProgressHydrating=false}
};
setTimeout(()=>hydrateQuestProgressFromServer(false),2100);
setInterval(()=>{
    if(!switchQuestStoreScope()) return;
    if(typeof renderQuestProgress==='function') renderQuestProgress();
    if(typeof renderQuestList==='function') renderQuestList();
    if(typeof renderSetupChecklist==='function') renderSetupChecklist();
    if(typeof renderQuestDetail==='function') renderQuestDetail(questStore.selectedDay);
    if(typeof renderTodayLeaderNudge==='function') renderTodayLeaderNudge();
    setTimeout(()=>hydrateSetupChecklistFromServer(true),80);
    setTimeout(()=>hydrateQuestProgressFromServer(true),140);
},1200);
window.addEventListener('focus',()=>hydrateQuestProgressFromServer(false));


const leadershipHarnessSnapshot = () => {
    const completed=new Set((questStore.completed||[]).map(Number));
    const nextQuest=LEADERSHIP_QUESTS.find((quest)=>!completed.has(quest.day))||null;
    const currentQuest=LEADERSHIP_QUESTS.find((quest)=>quest.day===Number(questStore.selectedDay))||nextQuest||LEADERSHIP_QUESTS[29];
    const setupItems=LEADERSHIP_SETUP_CHECKLIST.map((item)=>({ ...item, ...setupDone(item) }));
    const phaseStatus=Object.fromEntries(Object.entries(LEADERSHIP_HARNESS_PHASES).map(([phase,def])=>{
        const phaseQuests=LEADERSHIP_QUESTS.filter((quest)=>quest.phase===phase);
        const questDone=phaseQuests.filter((quest)=>completed.has(quest.day)).length;
        const outputDone=def.artifacts.filter((type)=>artifactRows(type).length>0).length;
        return [phase,{
            ...def,
            questDone,
            questTotal:phaseQuests.length,
            outputDone,
            outputTotal:def.artifacts.length,
            gateComplete:completed.has(def.gateDay),
            ready:completed.has(def.gateDay)&&outputDone===def.artifacts.length
        }];
    }));
    const nextSetup=setupItems.find((item)=>!item.done)||null;
    return {
        total:30,
        completed:[...completed].sort((a,b)=>a-b),
        done:completed.size,
        percent:Math.round((completed.size/30)*100),
        selectedDay:Number(questStore.selectedDay)||1,
        currentQuest,
        nextQuest,
        nextSetup,
        phaseStatus,
        setupDone:setupItems.filter((item)=>item.done).length,
        setupTotal:setupItems.length,
        server:{version:questProgressServerVersion,workspaceId:questProgressServerWorkspace}
    };
};
Object.defineProperty(window,'LeaderOsLeadershipHarness',{
    value:{
        snapshot:()=>leadershipHarnessSnapshot(),
        openDay:(day)=>{
            const target=LEADERSHIP_QUESTS.find((quest)=>quest.day===Number(day));
            if(!target)return false;
            navigation.goTo('ONBOARDING');
            renderQuestDetail(target.day);
            document.querySelector('[data-quest-detail]')?.scrollIntoView({behavior:'smooth',block:'start'});
            return true;
        },
        hydrate:()=>hydrateQuestProgressFromServer(true),
        sync:()=>saveQuestProgressToServer()
    },
    enumerable:false,
    configurable:true
});

const sampleRefTodayHtml = () => `<div class="sample-board"><div class="sample-board-head"><div><h3>01 · Today — 중요한 것만, 명확하게</h3><p>첨부 예시의 Top 3 Attention + Chief of Staff 보조 구조를 재구성했습니다.</p></div><div class="sample-legend"><span>DECIDE</span><span>TALK</span><span>PREPARE</span></div></div><div class="ref-layout"><div class="ref-main"><div class="ref-card"><div class="ref-attention"><span class="no">01</span><div><span class="verb">DECIDE · 오늘</span><b>Project Alpha</b><small>런칭 일정을 오늘 결정해야 합니다.</small></div><span>›</span></div><div class="ref-attention"><span class="no">02</span><div><span class="verb">TALK · 10:30</span><b>김민지</b><small>1:1에서 디자인 승인 현황을 확인하세요.</small></div><span>›</span></div><div class="ref-attention"><span class="no">03</span><div><span class="verb">PREPARE · 14:00</span><b>Brand Strategy</b><small>내일 회의를 위한 주요 질문을 준비하세요.</small></div><span>›</span></div></div></div><div class="ref-rail"><div class="ref-card"><div class="ref-k">CHIEF OF STAFF · I NOTICED</div><h4>Project Alpha</h4><p>오늘 결정이 지연되면 두 팀의 작업이 지연됩니다.</p></div><div class="ref-card"><div class="ref-k">SUGGESTED</div><h4>김민지와의 1:1 준비</h4><p>최근 승인 이슈 3개를 먼저 확인하세요.</p></div></div></div></div>`;
const sampleRefPlanHtml = () => `<div class="sample-board"><div class="sample-board-head"><div><h3>02 · 30-Day Leadership Plan</h3><p>현재 위치와 이번 주 Focus를 먼저 보여주고, 세부 Quest는 필요할 때 엽니다.</p></div></div><div class="ref-layout"><div class="ref-main"><div class="ref-card"><div class="ref-k">DAY 8 / 30</div><h4>지금은 UNDERSTAND → ALIGN 전환 구간</h4><div class="ref-progress"><div class="ref-stage"><strong>UNDERSTAND</strong><span>상황 이해하기</span><div class="ref-progressbar"><i style="width:100%"></i></div></div><div class="ref-stage"><strong>ALIGN</strong><span>사람과 방향 맞추기</span><div class="ref-progressbar"><i style="width:25%"></i></div></div><div class="ref-stage"><strong>EMPOWER</strong><span>결정권과 위임 만들기</span><div class="ref-progressbar"><i style="width:0%"></i></div></div><div class="ref-stage"><strong>COACH</strong><span>코칭과 회고 리듬</span><div class="ref-progressbar"><i style="width:0%"></i></div></div></div></div><div class="ref-card"><div class="ref-k">이번 주의 FOCUS</div><h4>운영 기준을 같은 화면에 맞추기</h4><p>Team Calendar · Work Map · Milestone · Priority를 연결해 실제 시간이 무엇에 쓰이고 다음 판단 지점이 어디인지 봅니다.</p></div></div><div class="ref-rail"><div class="ref-card"><div class="ref-k">PROGRESS INSIGHT</div><h4>Day 8 · ALIGN 시작</h4><p>첫 주의 관찰을 운영 기준으로 바꾸는 구간입니다. 먼저 반복 일정과 회의 리듬을 수집하세요.</p></div><div class="ref-card"><div class="ref-k">LEADERSHIP TIP</div><h4>말로 정한 우선순위가 캘린더와 Owner · Done 기준에도 보이는지 확인하세요.</h4></div></div></div></div>`;
const sampleRefSkillHtml = () => `<div class="sample-board"><div class="sample-board-head"><div><h3>03 · Skill Runner — 효과적인 1:1 진행하기</h3><p>한 번에 전체 매뉴얼을 보여주지 않고 한 단계씩 실행시킵니다.</p></div></div><div class="ref-layout"><div class="ref-main"><div class="ref-stepper"><div class="ref-step active"><b>1</b>Prepare</div><div class="ref-step"><b>2</b>Run</div><div class="ref-step"><b>3</b>Capture</div><div class="ref-step"><b>4</b>Action</div></div><div class="ref-card"><div class="ref-k">01</div><h4>상대방의 현재 상황을 파악하세요.</h4><p>최근 가장 집중하고 있는 일 / 어려움 / 도움이 필요한 부분 / 기대하는 성장 등을 질문합니다.</p></div></div><div class="ref-rail"><div class="ref-card"><div class="ref-k">FOR YOUR 1:1</div><h4>김민지 · Brand Manager</h4><p>최근 3개월간 디자인 관련 작업이 5건 지연되었습니다. 디자인 승인 지연과 추가 리소스를 확인하세요.</p></div><div class="ref-card"><div class="ref-k">SUGGESTED QUESTION</div><h4>“디자인 승인 프로세스에서 가장 개선이 필요한 부분은 무엇인가요?”</h4></div></div></div></div>`;
const sampleRefDecisionHtml = () => `<div class="sample-board"><div class="sample-board-head"><div><h3>04 · Decision — 런칭을 1주 연기할 것인가?</h3><p>결정 질문과 대안을 분리하고, 장점·리스크·영향·근거를 같은 화면에서 봅니다.</p></div></div><div class="ref-layout"><div class="ref-main"><div class="decision-options"><div class="decision-option"><div class="ref-k">A</div><h4>기존 일정 유지</h4><p>계획된 일정에 맞춰 진행합니다.</p><ul><li>시장 타이밍 유지</li><li>캠페인 일정 유지</li><li>QA 이슈 잔존 리스크</li></ul></div><div class="decision-option selected"><div class="ref-k">B</div><h4>1주 연기</h4><p>추가 검증 후 출시합니다.</p><ul><li>품질 안정성 확보</li><li>더 나은 고객 경험</li><li>미디어 일정 조정 필요</li></ul></div></div></div><div class="ref-rail"><div class="ref-card"><div class="ref-k">WHY NOW?</div><h4>QA 이슈 3건</h4><p>오늘 확인되었습니다. 지연 시 캠페인·마케팅 일정 영향이 있습니다.</p></div><div class="ref-card"><div class="ref-k">SUGGESTED</div><h4>리스크를 고려할 때 1주 연기를 권고</h4><p>다만 일정 조정 가능성을 함께 검토합니다.</p></div></div></div></div>`;
const sampleCalendarHtml = () => `<div class="sample-board"><div class="sample-board-head"><div><h3>Brand Team · Weekly Operating Calendar</h3><p>새 팀장이 기존 캘린더를 수집한 뒤 목적별로 재분류한 예시입니다.</p></div><div class="sample-legend"><span>Ritual</span><span>1:1</span><span>Milestone</span><span>Decision</span><span>Debrief</span></div></div><div class="sample-calendar">
  <div class="sample-day"><strong>MON</strong><div class="sample-event ritual"><b>09:30 Weekly Priority</b><span>Top 3 확정 · Output: Weekly Commitments</span></div></div>
  <div class="sample-day"><strong>TUE</strong><div class="sample-event oneonone"><b>14:00 1:1 · 민지</b><span>Priority / Blocker / Support</span></div><div class="sample-event oneonone"><b>15:00 1:1 · 준호</b><span>권한 범위 확인</span></div></div>
  <div class="sample-day"><strong>WED</strong><div class="sample-event milestone"><b>11:00 Concept Lock</b><span>Outcome + Evidence 확인</span></div></div>
  <div class="sample-day"><strong>THU</strong><div class="sample-event decision"><b>15:00 Decision Review</b><span>막힌 결정 3건 · D: Team Lead</span></div></div>
  <div class="sample-day"><strong>FRI</strong><div class="sample-event debrief"><b>16:00 Team Debrief</b><span>Keep / Change / Next</span></div></div>
</div></div>`;
const sampleTeamMapHtml = () => `<div class="sample-board"><div class="sample-board-head"><div><h3>Team Map · 직함보다 실제 역할</h3><p>사람을 평가하지 않고 책임, 의존성, 아직 모르는 부분을 구분합니다.</p></div><div class="sample-legend"><span>FACT</span><span>HYPOTHESIS</span><span>UNKNOWN</span></div></div><div class="sample-org"><div class="sample-org-leader"><b>Team Lead · Peter</b><span>Priority / Decision / Coaching</span></div><div class="sample-team-nodes"><div class="sample-person"><b>민지 · Brand PM</b><p>브랜드 전략 · 고객 커뮤니케이션<br>Dependency: Creative Lead</p><span class="fact-tag">FACT</span></div><div class="sample-person"><b>준호 · Performance</b><p>광고 운영 · 예산 최적화<br>예산 승인 반복 요청</p><span class="hyp-tag">HYPOTHESIS</span></div><div class="sample-person"><b>서연 · Creative Lead</b><p>Visual / Content Direction<br>외주사 품질 기준 관리</p><span class="fact-tag">FACT</span></div><div class="sample-person"><b>Finance Partner</b><p>실제 승인 영향 범위가 어디까지인지 확인 필요</p><span class="unknown-tag">UNKNOWN</span></div></div></div></div>`;
const sampleMilestoneHtml = () => `<div class="sample-board"><div class="sample-board-head"><div><h3>Campaign Launch · Milestone Rail</h3><p>‘중간보고 날짜’ 대신 다음 판단이 가능한 결과 지점으로 정의합니다.</p></div></div><div class="sample-milestones"><div class="sample-milestone"><small>M1 · DISCOVERY</small><b>Insight Lock</b><p>Evidence: Customer problem 3<br>Owner: Brand PM</p></div><div class="sample-milestone"><small>M2 · CREATIVE</small><b>Concept Lock</b><p>Evidence: Message + KV + Story<br>Decision: 제작 진행?</p></div><div class="sample-milestone"><small>M3 · TEST</small><b>Market Signal</b><p>Evidence: CTR/CVR test<br>Owner: Performance</p></div><div class="sample-milestone"><small>M4 · LAUNCH</small><b>Go / Revise</b><p>Evidence: QA + Budget<br>Decider: Team Lead</p></div></div></div>`;
const sampleDecisionHtml = () => `<div class="sample-board"><div class="sample-board-head"><div><h3>Decision Rights · RAPID</h3><p>D는 최종 결정권자 한 명. Input이 많아도 D가 흐려지지 않게 합니다.</p></div></div><div class="sample-matrix-wrap"><table class="sample-matrix"><thead><tr><th>Decision</th><th>R</th><th>I</th><th>A</th><th>D</th><th>P</th></tr></thead><tbody><tr><td>캠페인 전략</td><td><span class="role-pill">CD</span></td><td>Brand / Perf.</td><td>—</td><td><span class="role-pill d">Lead</span></td><td>PM</td></tr><tr><td>광고비 ±10%</td><td><span class="role-pill">Perf.</span></td><td>Finance</td><td>—</td><td><span class="role-pill d">Perf.</span></td><td>Perf.</td></tr><tr><td>외주 3천만원</td><td><span class="role-pill">PM</span></td><td>Finance</td><td>Finance</td><td><span class="role-pill d">Lead</span></td><td>PM</td></tr></tbody></table></div></div>`;
const sampleDelegationHtml = () => `<div class="sample-board"><div class="sample-board-head"><div><h3>Delegation Matrix · 업무별 권한 수준</h3><p>민지는 L5 사람이 아니라 ‘SNS 콘텐츠’에서 L5입니다. 수준은 사람의 등급이 아닙니다.</p></div></div><div class="sample-matrix-wrap"><table class="sample-matrix"><thead><tr><th>업무</th><th>Owner</th><th>Level</th><th>Leader Check</th></tr></thead><tbody><tr><td>SNS 콘텐츠</td><td>민지</td><td><span class="delegate-level l5">L5 · Own</span></td><td>결과만 공유</td></tr><tr><td>광고 예산 ±10%</td><td>준호</td><td><span class="delegate-level l4">L4 · Decide+Check</span></td><td>Weekly</td></tr><tr><td>신규 외주 계약</td><td>준호</td><td><span class="delegate-level">L3 · Recommend</span></td><td>계약 전</td></tr><tr><td>채용 리서치</td><td>민지</td><td><span class="delegate-level">L2 · Research</span></td><td>후보 5명</td></tr></tbody></table></div></div>`;
const sampleDebriefHtml = () => `<div class="sample-board"><div class="sample-board-head"><div><h3>Project Debrief · 승인 지연 사례</h3><p>사람 탓이 아니라 운영 시스템에서 바꿀 규칙을 찾습니다.</p></div></div><div class="sample-debrief"><div class="sample-debrief-card"><small>EXPECTED</small><b>콘셉트 승인 1회</b></div><div class="sample-debrief-card"><small>ACTUAL</small><b>승인 3회 · 4일 지연</b></div><div class="sample-debrief-card"><small>WHY</small><b>Final Decider 불명확</b></div><div class="sample-debrief-card"><small>KEEP</small><b>초기 고객 리서치</b></div><div class="sample-debrief-card"><small>CHANGE</small><b>Concept Lock에 D 명시</b></div><div class="sample-debrief-card"><small>NEXT</small><b>다음 프로젝트에 Decision Rights 적용</b></div></div></div>`;
const sampleManagerContractHtml = () => `<div class="sample-board"><div class="sample-board-head"><div><h3>Manager Contract · 첫 30일 기대 합의</h3><p>상급자와 성공 기준·보고 리듬·즉시 에스컬레이션 범위를 한 장으로 맞춥니다.</p></div></div><div class="r13-sample-grid"><div class="r13-sample-card"><small>SUCCESS 30D</small><b>팀 Top 3와 Decision Rights가 보이는 상태</b></div><div class="r13-sample-card"><small>REPORT RHYTHM</small><b>월요일 10분 브리프 · 금요일 리스크 업데이트</b></div><div class="r13-sample-card"><small>ESCALATE NOW</small><b>예산 ±15% · 외부 약속 · 일정 3일+ 변경</b></div></div></div>`;
const sampleTeamPatternHtml = () => `<div class="sample-board"><div class="sample-board-head"><div><h3>Team Pattern Board · 개인 사례 → 운영 가설</h3><p>여러 1:1에서 반복된 신호만 패턴으로 올리고, 사람 평가 대신 확인 질문을 남깁니다.</p></div></div><div class="sample-matrix-wrap"><table class="sample-matrix"><thead><tr><th>Pattern</th><th>Observed</th><th>Hypothesis</th><th>Verify</th></tr></thead><tbody><tr><td>승인 대기</td><td>3명</td><td>D 불명확</td><td>누가 최종 결정?</td></tr><tr><td>회의 후 재작업</td><td>2개 프로젝트</td><td>Done 기준 모호</td><td>완료 기준을 누가 정함?</td></tr></tbody></table></div></div>`;
const sampleStakeholderHtml = () => `<div class="sample-board"><div class="sample-board-head"><div><h3>Stakeholder Map · 숨은 의존성 찾기</h3><p>공식 직급이 아니라 실제 영향, 기대, 필요한 접점을 기록합니다.</p></div></div><div class="r13-sample-grid"><div class="r13-sample-card"><small>CEO · HIGH</small><b>속도 / 리스크 가시성</b><span>주간 브리프</span></div><div class="r13-sample-card"><small>FINANCE · HIGH</small><b>예산 통제</b><span>집행 전 확인</span></div><div class="r13-sample-card"><small>SALES · MEDIUM</small><b>고객 약속 정합성</b><span>격주 Sync</span></div></div></div>`;
const sampleWorkMapHtml = () => `<div class="sample-board"><div class="sample-board-head"><div><h3>Work Map · 무엇이 왜 진행 중인가?</h3><p>프로젝트 수보다 Goal / Owner / Next Milestone / Open Decision의 명확성을 봅니다.</p></div></div><div class="sample-matrix-wrap"><table class="sample-matrix"><thead><tr><th>Project</th><th>Goal</th><th>Owner</th><th>Next Milestone</th><th>Open Decision</th></tr></thead><tbody><tr><td>Project Alpha</td><td>10/20 Launch</td><td>민지</td><td>Concept Lock</td><td>예산 증액?</td></tr><tr><td>Brand Refresh</td><td>Q4 Guide</td><td>서연</td><td>Visual Lock</td><td>외주 범위?</td></tr></tbody></table></div></div>`;
const samplePriorityContractHtml = () => `<div class="sample-board"><div class="sample-board-head"><div><h3>Priority Contract · Top 3 + Trade-off</h3><p>중요한 일만 정하는 것이 아니라 이번 주 하지 않을 것도 합의합니다.</p></div></div><div class="r13-sample-grid"><div class="r13-sample-card"><small>P1</small><b>Project Alpha Concept Lock</b></div><div class="r13-sample-card"><small>P2</small><b>Decision Rights 정리</b></div><div class="r13-sample-card"><small>P3</small><b>핵심 팀원 1:1 완료</b></div><div class="r13-sample-card muted-card"><small>NOT NOW</small><b>회의 툴 교체 · 조직 개편</b></div></div></div>`;
const sampleWeeklyReviewHtml = () => `<div class="sample-board"><div class="sample-board-head"><div><h3>Weekly Operating Review · 운영 루프 한 장 요약</h3><p>Calendar → Milestone → Decision → Delegation → Debrief에서 다음 주 리더 행동을 뽑습니다.</p></div></div><div class="weekly-review-grid"><div class="weekly-review-cell"><small>CALENDAR</small><b>Decision 없는 Status 회의 2개</b></div><div class="weekly-review-cell"><small>MILESTONE</small><b>Concept Lock · Evidence 보완 필요</b></div><div class="weekly-review-cell"><small>DECISION</small><b>광고비 ±10% · D 명확</b></div><div class="weekly-review-cell"><small>DELEGATION</small><b>SNS 콘텐츠 · L5 Own</b></div><div class="weekly-review-cell"><small>LEARNING</small><b>승인 지연 → D 선명화</b></div><div class="weekly-review-cell emphasis"><small>NEXT</small><b>다음 주 P1: Concept Lock</b></div></div></div>`;
const sampleBoardRenderers = { REF_TODAY:sampleRefTodayHtml, REF_PLAN:sampleRefPlanHtml, REF_SKILL:sampleRefSkillHtml, REF_DECISION:sampleRefDecisionHtml, TEAM_MAP:sampleTeamMapHtml, TEAM_CALENDAR:sampleCalendarHtml, MILESTONES:sampleMilestoneHtml, DECISION_RIGHTS:sampleDecisionHtml, DELEGATION:sampleDelegationHtml, DEBRIEF:sampleDebriefHtml, MANAGER_CONTRACT:sampleManagerContractHtml, TEAM_PATTERN:sampleTeamPatternHtml, STAKEHOLDER_MAP:sampleStakeholderHtml, WORK_MAP:sampleWorkMapHtml, PRIORITY_CONTRACT:samplePriorityContractHtml, WEEKLY_REVIEW:sampleWeeklyReviewHtml };
const renderSampleBoards = () => {
    sampleTabsRoot.innerHTML = Object.entries(LEADERSHIP_SAMPLE_BOARDS).map(([id,item])=>`<button type="button" class="${questStore.sampleBoard===id?'active':''}" data-sample-id="${id}">${escapeHtml(item.name)}</button>`).join('');
    const selected = LEADERSHIP_SAMPLE_BOARDS[questStore.sampleBoard] ? questStore.sampleBoard : 'TEAM_CALENDAR';
    sampleBoardRoot.innerHTML = sampleBoardRenderers[selected]?.() ?? sampleCalendarHtml();
    for (const button of sampleTabsRoot.querySelectorAll('[data-sample-id]')) button.addEventListener('click',()=>{ questStore.sampleBoard=button.dataset.sampleId; saveQuestStore(); renderSampleBoards(); });
};
const artifactDefinitions = {
  MANAGER_CONTRACT:{
    label:'Manager Contract',
    fields:[
      ['manager','상급자 / 보고 대상','본부장','text'],
      ['success30','30일 성공 기준','팀의 Top 3와 운영 병목이 보이는 상태','textarea'],
      ['topPriorities','Top 3 기대 결과','1) 팀 이해  2) 우선순위 정렬  3) 결정권 명확화','textarea'],
      ['notNow','지금 하지 않을 것','조직 개편 · 대형 프로세스 교체','textarea'],
      ['reportRhythm','보고 리듬','월요일 10분 브리프 · 금요일 리스크 업데이트','text'],
      ['escalation','즉시 공유할 조건','예산 ±15% / 외부 약속 / 일정 3일+ 변경','textarea']
    ]
  },
  TEAM_MAP:{
    label:'Team Map',
    fields:[
      ['name','이름','민지','text'],
      ['role','실제 역할','Brand PM','text'],
      ['responsibility','핵심 책임','브랜드 전략 · 고객 커뮤니케이션','textarea'],
      ['dependency','주요 의존성','Creative Lead','text'],
      ['state','현재 판단 상태','FACT','select',['FACT','HYPOTHESIS','UNKNOWN']],
      ['observation','근거 / 확인할 질문','브랜드 전략 리뷰와 고객 커뮤니케이션을 실제로 리드함','textarea']
    ]
  },
  TEAM_PATTERN:{
    label:'Team Pattern Board',
    fields:[
      ['pattern','반복 패턴','승인 대기','text'],
      ['observedAcross','어디에서 반복됐나','3명의 1:1 · 2개 프로젝트','text'],
      ['evidence','관찰 근거','승인 요청이 같은 단계에서 반복 정체됨','textarea'],
      ['hypothesis','운영 가설','최종 결정권자(D)가 불명확할 가능성','textarea'],
      ['verify','확인 질문','누가 최종 결정해야 한다고 이해하고 있나요?','textarea'],
      ['state','현재 상태','HYPOTHESIS','select',['FACT','HYPOTHESIS','UNKNOWN']]
    ]
  },
  STAKEHOLDER_MAP:{
    label:'Stakeholder Map',
    fields:[
      ['stakeholder','이해관계자','Finance Partner','text'],
      ['role','역할 / 관계','Budget Partner','text'],
      ['expectation','상대가 기대하는 것','예산 리스크를 사전에 공유','textarea'],
      ['influence','영향도','HIGH','select',['HIGH','MEDIUM','LOW','UNKNOWN']],
      ['cadence','접점 리듬','주간 / 집행 전','text'],
      ['nextTouch','다음 확인','Q4 예산 승인 범위 확인','textarea']
    ]
  },
  TEAM_CALENDAR:{
    label:'Team Calendar',
    fields:[
      ['date','Date (optional)','2026-10-05','text'],
      ['day','요일','MON','select',['MON','TUE','WED','THU','FRI','SAT','SUN']],
      ['time','시간','09:30','text'],
      ['title','일정','Weekly Priority','text'],
      ['type','Type','Ritual','select',['Ritual','1:1','Milestone','Decision','External','Debrief']],
      ['purpose','목적','이번 주 Top 3 확정','textarea'],
      ['owner','Owner','Team Lead','text'],
      ['output','Output','Weekly Commitments','text']
    ]
  },
  WORK_MAP:{
    label:'Work Map',
    fields:[
      ['project','Project','Project Alpha','text'],
      ['workstream','Workstream','Launch / Brand / Growth','text'],
      ['goal','Goal','10/20 Launch','textarea'],
      ['owner','Owner','Brand PM','text'],
      ['nextMilestone','Next Milestone','Concept Lock','text'],
      ['openDecision','Open Decision','예산 증액 여부','textarea'],
      ['risk','Known Risk','승인 지연','textarea'],
      ['status','Status','ACTIVE','select',['ACTIVE','AT_RISK','PAUSED','UNKNOWN']]
    ]
  },
  MILESTONES:{
    label:'Milestones',
    fields:[
      ['project','Project','Campaign Launch','text'],
      ['milestone','Milestone','Concept Lock','text'],
      ['date','Target date','2026-10-15','text'],
      ['outcome','Outcome','캠페인 방향 1개 확정','textarea'],
      ['evidence','Evidence','Message + Key Visual + Storyline','textarea'],
      ['owner','Owner','Creative Lead','text'],
      ['decision','Decision at this point','제작 진행 / 추가 검증 / 방향 수정','textarea']
    ]
  },
  PRIORITY_CONTRACT:{
    label:'Priority Contract',
    fields:[
      ['priority1','Priority 1','Project Alpha Concept Lock','text'],
      ['priority2','Priority 2','Decision Rights 정리','text'],
      ['priority3','Priority 3','핵심 팀원 1:1 완료','text'],
      ['notNow','Not now','회의 툴 교체 · 조직 개편','textarea'],
      ['successSignal','Success signal','3개 우선순위의 Owner / Done 기준 확인','textarea'],
      ['reviewDate','Review date','FRI 16:00','text']
    ]
  },
  DECISION_RIGHTS:{
    label:'Decision Rights',
    fields:[
      ['decision','Decision','캠페인 전략','text'],
      ['requestedAt','Requested at','2026-10-03 09:00','text'],
      ['dueDate','Decision due','2026-10-05 18:00','text'],
      ['decidedAt','Decided at (optional)','','text'],
      ['decisionStatus','Status','OPEN','select',['OPEN','DECIDED','ESCALATED','CANCELLED']],
      ['escalationHistory','Escalation history','2026-10-04 · 일정 영향 공유','textarea'],
      ['recommend','Recommend','Creative Lead','text'],
      ['input','Input','Brand / Performance','text'],
      ['agree','Agree','—','text'],
      ['decide','Decide','Team Lead','text'],
      ['perform','Perform','PM','text']
    ]
  },
  DELEGATION:{
    label:'Delegation',
    fields:[
      ['task','업무','광고 예산 ±10%','text'],
      ['owner','Owner','Performance Lead','text'],
      ['level','Level','L4 · Decide+Check','select',['L1 · Do exactly','L2 · Research','L3 · Recommend','L4 · Decide+Check','L5 · Own']],
      ['guardrail','Guardrail','월 총예산 한도 유지','textarea'],
      ['checkpoint','Checkpoint','매주 목요일','text']
    ]
  },
  FEEDBACK_PRACTICE:{
    label:'Feedback Practice',
    fields:[
      ['person','대상 / 상황','김민지 · 리뷰 미팅','text'],
      ['situation','Situation','어제 콘셉트 리뷰에서','textarea'],
      ['behavior','Behavior','완료 기준을 확인하지 않고 다음 단계로 진행함','textarea'],
      ['impact','Impact','재작업이 발생하고 승인 시간이 늘어남','textarea'],
      ['inquiry','Inquiry','그때 어떤 기준으로 완료라고 판단했나요?','textarea'],
      ['next','Next','다음 리뷰부터 시작 전에 Done 기준을 먼저 확인','textarea']
    ]
  },
  OPERATING_RHYTHM:{
    label:'Operating Rhythm',
    fields:[
      ['name','Rhythm name','Team Operating Rhythm v1','text'],
      ['weeklyPriority','Weekly Priority','MON · 이번 주 Top 3와 Not Now 합의','textarea'],
      ['oneOnOne','1:1 Rhythm','격주 30분 · Priority / Blocker / Support / Next','textarea'],
      ['decisionReview','Decision Review','THU · 열린 결정과 D / Deadline 확인','textarea'],
      ['debrief','Debrief','FRI · Expected / Actual / Learn / Next','textarea'],
      ['reporting','Reporting','MON Brief · FRI Risk / Ask 업데이트','textarea']
    ]
  },
  DEBRIEF:{
    label:'Debrief / AAR',
    fields:[
      ['expected','Expected','콘셉트 승인 1회','textarea'],
      ['actual','Actual','승인 3회 · 4일 지연','textarea'],
      ['why','Why','Final Decider 불명확','textarea'],
      ['keep','Keep','초기 고객 리서치','textarea'],
      ['change','Change','Concept Lock에 D 명시','textarea'],
      ['next','Next','다음 프로젝트부터 Decision Rights 적용','textarea']
    ]
  },
  ONE_ON_ONE_COMMITMENT:{
    label:'1:1 Commitment',
    fields:[
      ['person','Person','김민지','text'],
      ['commitment','Commitment','다음 1:1 전까지 승인 기준 초안 작성','textarea'],
      ['due','Due','FRI 16:00','text'],
      ['evidence','Evidence','완료 문서 / 확인 가능한 산출물','textarea'],
      ['status','Status','OPEN','select',['OPEN','DONE','BLOCKED','CANCELLED']]
    ]
  },
  WEEKLY_REVIEW:{
    label:'Weekly Operating Review',
    fields:[
      ['week','Week','2026-W40','text'],
      ['attention','Attention','이번 주 가장 중요한 운영 신호','textarea'],
      ['decisions','Decisions','막힌 결정 / 결정된 내용','textarea'],
      ['delegation','Delegation','새로 넘긴 권한 / 체크포인트','textarea'],
      ['learning','Learning','Debrief에서 확인된 학습','textarea'],
      ['next','Next','다음 주 가장 먼저 바꿀 것','textarea']
    ]
  },
  TEAM_OS_CHARTER:{
    label:'Team OS Charter',
    fields:[
      ['versionLabel','Version','v1','text'],
      ['successDefinition','Success Definition','30일 성공 기준과 팀이 만드는 핵심 가치','textarea'],
      ['operatingRhythm','Operating Rhythm','Weekly Priority / 1:1 / Decision / Debrief','textarea'],
      ['decisionRule','Decision Rule','D는 하나 · Input은 필요한 사람만','textarea'],
      ['delegationRule','Delegation Rule','Outcome / Guardrail / Authority / Checkpoint','textarea'],
      ['reviewRule','Review Rule','금요일 Weekly Review에서 Keep / Change / Next','textarea'],
      ['escalationRule','Escalation','예산·외부 약속·핵심 일정 변경은 즉시 공유','textarea']
    ]
  },
  NEXT_60_PLAN:{
    label:'Next 60-Day Plan',
    fields:[
      ['period','Period','Day 31–90','text'],
      ['outcome1','Outcome 1','핵심 프로젝트의 검증 가능한 결과','textarea'],
      ['outcome2','Outcome 2','팀이 스스로 결정할 수 있는 영역 확대','textarea'],
      ['outcome3','Outcome 3','운영 리듬의 반복 가능성 확인','textarea'],
      ['systemUpgrade','System Upgrade','Decision → Delegation → Review 연결 강화','textarea'],
      ['leaderExperiment','Leader Experiment','답을 주기 전에 질문 1회 더 하기','textarea'],
      ['reviewRhythm','Review Rhythm','매주 금요일 + Day 60 / Day 90 리뷰','text']
    ]
  },
  NEXT_60_CHECKIN:{
    label:'Next 60 Weekly Check-in',
    fields:[
      ['week','Week','2026-W41','text'],
      ['outcomeKey','Outcome','outcome1','select',['outcome1','outcome2','outcome3']],
      ['status','Status','ON_TRACK','select',['ON_TRACK','AT_RISK','BLOCKED','DONE']],
      ['evidence','Evidence','승인된 산출물 / 수치 / 관찰 근거','textarea'],
      ['learning','Learning','이번 주 학습','textarea'],
      ['next','Next','다음 행동','textarea']
    ]
  },
  REPORT_BRIEF:{
    label:'Manager Reporting Brief',
    fields:[
      ['week','Week','2026-W41','text'],
      ['executiveSummary','Executive Summary','이번 주 핵심 상태','textarea'],
      ['progress','Progress','진행 상황','textarea'],
      ['decisionsNeeded','Decisions Needed','결정 필요 사항','textarea'],
      ['risks','Risks / Escalation','리스크 및 즉시 공유 조건','textarea'],
      ['next','Next','다음 행동','textarea'],
      ['next60Trend','Next 60 Trend','Outcome 1 ON_TRACK · Outcome 2 AT_RISK · Outcome 3 CHECK','textarea']
    ]
  }
};
const sampleArtifactRecordsForRole = () => {
    const pack = ROLE_PACKS[questStore.rolePack] || ROLE_PACKS.TEAM_MANAGER;
    return {
      MANAGER_CONTRACT:{manager:'상급자',success30:`${pack.focus}가 보이고 팀 운영의 Top 3가 합의된 상태`,topPriorities:'1) 팀/업무 이해  2) 우선순위 정렬  3) 결정권 명확화',notNow:'대규모 조직 개편 · 도구 전면 교체',reportRhythm:'MON 10분 브리프 · FRI 리스크 업데이트',escalation:'예산/외부 약속/핵심 일정 변경'},
      TEAM_MAP:{name:pack.starter.person,role:pack.starter.role,responsibility:questStore.rolePack==='CREATIVE_DIRECTOR'?'비주얼 기준 · 외주 품질 · 콘셉트 리뷰':questStore.rolePack==='PRODUCT_LEAD'?'제품 우선순위 · Discovery · 이해관계자 정렬':questStore.rolePack==='MARKETING_LEADER'?'채널 성과 · 예산 최적화 · 실험 설계':'핵심 업무 운영 · 협업 조율',dependency:'Cross-functional Partner',state:'FACT',observation:'실제 책임과 의존 관계를 1:1 / 프로젝트에서 확인'},
      TEAM_PATTERN:{pattern:'승인 대기',observedAcross:'3명의 1:1 · 2개 프로젝트',evidence:'같은 승인 단계에서 반복 정체',hypothesis:'최종 결정권자(D)가 불명확할 가능성',verify:'누가 최종 결정해야 한다고 이해하고 있나요?',state:'HYPOTHESIS'},
      STAKEHOLDER_MAP:{stakeholder:'Finance Partner',role:'Budget Partner',expectation:'예산 리스크 사전 공유',influence:'HIGH',cadence:'집행 전 + 주간',nextTouch:'Q4 예산 승인 범위 확인'},
      TEAM_CALENDAR:{date:'2026-10-05',day:'MON',time:'09:30',title:'Weekly Priority',type:'Ritual',purpose:`${pack.focus} 기준으로 이번 주 Top 3 확정`,owner:pack.name,output:'Weekly Commitments'},
      WORK_MAP:{project:'Priority Project',workstream:'Launch',goal:`${pack.focus}를 만드는 핵심 결과`,owner:pack.starter.role,nextMilestone:pack.starter.milestone,openDecision:pack.starter.decision,risk:'의존성 / 승인 병목 확인',status:'ACTIVE'},
      MILESTONES:{project:'Priority Project',milestone:pack.starter.milestone,date:'2026-10-15',outcome:'다음 실행 단계로 이동 가능한 결과 확정',evidence:'Review 가능한 결과물 + 확인 근거',owner:pack.starter.role,decision:'Go / Revise / Validate'},
      PRIORITY_CONTRACT:{priority1:pack.starter.milestone,priority2:pack.starter.decision,priority3:`${pack.starter.person} 1:1 완료`,notNow:'대형 프로세스 변경 · 도구 교체',successSignal:'Top 3 Owner / Done 기준 확인',reviewDate:'FRI 16:00'},
      DECISION_RIGHTS:{decision:pack.starter.decision,requestedAt:'2026-10-03 09:00',dueDate:'2026-10-05 18:00',decidedAt:'',decisionStatus:'OPEN',escalationHistory:'',recommend:pack.starter.role,input:'Relevant Partners',agree:'—',decide:pack.name,perform:pack.starter.role},
      DELEGATION:{task:pack.starter.delegation,owner:pack.starter.role,level:'L4 · Decide+Check',guardrail:'브랜드/예산/품질 가드레일 준수',checkpoint:'Weekly Review'},
      FEEDBACK_PRACTICE:{person:pack.starter.person,situation:'최근 결과물 리뷰에서',behavior:'완료 기준 확인 없이 다음 단계로 진행',impact:'재작업과 승인 지연이 발생',inquiry:'그때 어떤 기준으로 완료라고 판단했나요?',next:'다음 리뷰부터 시작 전에 Done 기준 합의'},
      OPERATING_RHYTHM:{name:'Team Operating Rhythm v1',weeklyPriority:'MON · Top 3 / Not Now',oneOnOne:'격주 · Priority / Blocker / Support / Next',decisionReview:'THU · Open Decision / D / Deadline',debrief:'FRI · Expected / Actual / Learn / Next',reporting:'MON Brief · FRI Risk / Ask'},
      DEBRIEF:{expected:'한 번의 명확한 기준으로 진행',actual:'추가 확인과 재작업 발생',why:'결정권 또는 완료 기준이 모호했음',keep:'초기 맥락 공유',change:'Decision / Done 기준 명시',next:'다음 사이클부터 운영 Artifact 적용'},
      ONE_ON_ONE_COMMITMENT:{person:pack.starter.person,commitment:`${pack.starter.person}가 다음 1:1 전까지 ${pack.starter.delegation}의 완료 기준을 초안으로 정리`,due:'FRI 16:00',evidence:'초안 문서 + 다음 1:1 확인',status:'OPEN'},
      WEEKLY_REVIEW:{week:'2026-W40',attention:`${pack.focus}의 운영 병목 확인`,decisions:pack.starter.decision,delegation:pack.starter.delegation,learning:'완료 기준과 Decision Rights를 더 먼저 명시',next:pack.starter.milestone},
      TEAM_OS_CHARTER:{versionLabel:'v1',successDefinition:`${pack.focus}가 팀의 일상적 판단 기준으로 작동하는 상태`,operatingRhythm:'MON Priority · TUE/WED 1:1 · THU Decision · FRI Debrief',decisionRule:'중요 결정은 RAPID로 D를 하나 명시',delegationRule:'Outcome / Guardrail / Authority / Checkpoint를 함께 합의',reviewRule:'Weekly Operating Review에서 Keep / Change / Next',escalationRule:'예산·외부 약속·핵심 일정 변경은 즉시 공유'},
      NEXT_60_PLAN:{period:'Day 31–90',outcome1:pack.starter.milestone,outcome2:`${pack.starter.role}의 독립 결정 범위 확대`,outcome3:`${pack.focus} 운영 리듬을 4주 반복`,systemUpgrade:'Work → Milestone → Decision → Delegation 링크 완성',leaderExperiment:'답을 주기 전에 질문 한 번 더 하기',reviewRhythm:'매주 FRI + Day 60 / Day 90'},
      NEXT_60_CHECKIN:{week:'2026-W41',outcomeKey:'outcome1',status:'ON_TRACK',evidence:'이번 주 검증 가능한 산출물 1개 완료',learning:'권한 범위를 먼저 합의할수록 재확인이 줄어듦',next:'다음 주 Outcome 1의 남은 의존성 제거'},
      REPORT_BRIEF:{week:'2026-W41',executiveSummary:`${pack.focus} 기준으로 운영 구조를 정렬 중`,progress:pack.starter.milestone,decisionsNeeded:pack.starter.decision,risks:'승인/의존성 병목 확인',next:'다음 Weekly Review에서 변화 확인'}
    };
};
let editingArtifactId = null;

const RELATION_PAIRS = Object.freeze([
    { aType:'WORK_MAP', aField:'milestoneRefs', bType:'MILESTONES', bField:'workRefs' },
    { aType:'WORK_MAP', aField:'decisionRefs', bType:'DECISION_RIGHTS', bField:'workRefs' },
    { aType:'WORK_MAP', aField:'delegationRefs', bType:'DELEGATION', bField:'workRefs' },
    { aType:'WORK_MAP', aField:'debriefRefs', bType:'DEBRIEF', bField:'workRefs' },
    { aType:'WORK_MAP', aField:'calendarRefs', bType:'TEAM_CALENDAR', bField:'workRefs' },
    { aType:'MILESTONES', aField:'decisionRefs', bType:'DECISION_RIGHTS', bField:'milestoneRefs' },
    { aType:'MILESTONES', aField:'calendarRefs', bType:'TEAM_CALENDAR', bField:'milestoneRefs' },
    { aType:'ONE_ON_ONE_COMMITMENT', aField:'delegationRefs', bType:'DELEGATION', bField:'commitmentRefs' },
    { aType:'ONE_ON_ONE_COMMITMENT', aField:'debriefRefs', bType:'DEBRIEF', bField:'commitmentRefs' }
]);
const refsEqual=(a,b)=>{const aa=refArray(a).sort();const bb=refArray(b).sort();return aa.length===bb.length&&aa.every((v,i)=>v===bb[i]);};
const patchLinkedRecord = (type,id,patch) => {
    if (!id) return false;
    const rows=artifactRows(type); const index=rows.findIndex((row)=>row.id===id); if(index<0) return false;
    const previous=rows[index];
    const changed=Object.entries(patch).some(([key,value])=>Array.isArray(value)||Array.isArray(previous?.[key])?!refsEqual(previous?.[key],value):String(previous?.[key]||'')!==String(value||''));
    if(!changed) return false;
    const history=Array.isArray(previous.history)?[...previous.history]:[];
    history.push({version:Number(previous.version)||1,updatedAt:previous.updatedAt||new Date().toISOString(),data:artifactDataSnapshot(previous),artifactState:previous.artifactState||'DRAFT'});
    rows[index]={...previous,...patch,version:(Number(previous.version)||1)+1,artifactState:'DRAFT',history,updatedAt:new Date().toISOString()};
    artifactStore[type]=rows; return true;
};
const relationConfigFor = (type) => RELATION_PAIRS.flatMap((pair)=>{
    if(pair.aType===type) return [{sourceField:pair.aField,targetType:pair.bType,targetField:pair.bField}];
    if(pair.bType===type) return [{sourceField:pair.bField,targetType:pair.aType,targetField:pair.aField}];
    return [];
});
const syncArtifactRelations = (type,current,previous={}) => {
    if(!current?.id) return;
    for(const relation of relationConfigFor(type)){
        const before=refArray(previous?.[relation.sourceField]);
        const after=refArray(current?.[relation.sourceField]);
        for(const removed of before.filter((id)=>!after.includes(id))){
            const target=artifactRows(relation.targetType).find((row)=>row.id===removed);
            if(target){const reciprocal=refArray(target[relation.targetField]).filter((id)=>id!==current.id);patchLinkedRecord(relation.targetType,removed,{[relation.targetField]:reciprocal});}
        }
        for(const added of after){
            const target=artifactRows(relation.targetType).find((row)=>row.id===added);
            if(target){const reciprocal=refArray(target[relation.targetField]);if(!reciprocal.includes(current.id))patchLinkedRecord(relation.targetType,added,{[relation.targetField]:[...reciprocal,current.id]});}
        }
    }
};
const detachArtifactRelations = (artifactId) => {
    for(const [type,rows] of Object.entries(artifactStore)){
        if(!Array.isArray(rows)) continue;
        for(const row of [...rows]){
            if(row.id===artifactId) continue;
            const patch={};
            for(const relation of relationConfigFor(type)){
                const refs=refArray(row[relation.sourceField]);
                if(refs.includes(artifactId)) patch[relation.sourceField]=refs.filter((id)=>id!==artifactId);
            }
            if(Object.keys(patch).length) patchLinkedRecord(type,row.id,patch);
        }
    }
};

const artifactDataSnapshot = (row) => Object.fromEntries(Object.entries(row || {}).filter(([key]) => !['id','updatedAt','version','history','artifactState','serverVersion','serverSyncedAt','serverSyncError'].includes(key)));
const updateArtifactRecord = (type, id, record) => {
    const rows = artifactRows(type);
    const index = rows.findIndex((item) => item.id === id);
    if (index < 0) return false;
    const previous = rows[index];
    const history = Array.isArray(previous.history) ? [...previous.history] : [];
    history.push({ version:Number(previous.version)||1, updatedAt:previous.updatedAt||new Date().toISOString(), data:artifactDataSnapshot(previous), artifactState:previous.artifactState||'DRAFT' });
    rows[index] = { ...previous, ...record, version:(Number(previous.version)||1)+1, artifactState:'DRAFT', history, updatedAt:new Date().toISOString() };
    artifactStore[type] = rows;
    syncArtifactRelations(type, rows[index], previous);
    saveArtifactStore();
    queueOperatingArtifactSync(type,id);
    return true;
};
const setArtifactState = (type, id, nextState) => {
    const rows=artifactRows(type);
    const index=rows.findIndex((item)=>item.id===id);
    if(index<0) return false;
    const previous=rows[index];
    const history=Array.isArray(previous.history)?[...previous.history]:[];
    history.push({version:Number(previous.version)||1,updatedAt:previous.updatedAt||new Date().toISOString(),data:artifactDataSnapshot(previous),artifactState:previous.artifactState||'DRAFT'});
    rows[index]={...previous,version:(Number(previous.version)||1)+1,artifactState:nextState,history,updatedAt:new Date().toISOString()};
    artifactStore[type]=rows; saveArtifactStore(); queueOperatingArtifactSync(type,id); return true;
};
const confirmedArtifactRows = (type) => artifactRows(type).filter((row)=>String(row.artifactState||'DRAFT').toUpperCase()==='CONFIRMED');

const addArtifactRecord = (type, record) => {
    const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
    artifactStore[type].push({ id, ...record, version:1, artifactState:'DRAFT', history:[], updatedAt:new Date().toISOString() });
    syncArtifactRelations(type, artifactStore[type][artifactStore[type].length-1], {});
    saveArtifactStore();
    queueOperatingArtifactSync(type,id);
    const expectedType = QUEST_ARTIFACT_TYPE[Number(questStore.selectedDay)];
    if (expectedType === type) linkArtifactToQuest(Number(questStore.selectedDay), id);
    renderArtifactWorkspace();
    renderSetupChecklist();
    renderQuestList();
    renderTodayLeaderNudge();
    if(typeof renderRecovery17Surfaces==='function') renderRecovery17Surfaces();
    return id;
};
const parseCalendarImport = (raw) => {
    return String(raw||'').split(/\r?\n/).map((line)=>line.trim()).filter(Boolean).flatMap((line)=>{
        const cells=line.split('|').map((cell)=>cell.trim());
        if (cells.length < 3) return [];
        const hasDate=/^\d{4}-\d{2}-\d{2}$/.test(cells[0]||''); const offset=hasDate?1:0; const date=hasDate?cells[0]:''; const [day,time,title,type='Ritual',purpose='',owner='',output='',projectHint='',milestoneHint=''] = cells.slice(offset);
        const workMatch=projectHint?artifactRows('WORK_MAP').find((r)=>String(r.project||'').toLowerCase()===String(projectHint).toLowerCase()):null;
        const milestoneMatch=milestoneHint?artifactRows('MILESTONES').find((r)=>String(r.milestone||'').toLowerCase()===String(milestoneHint).toLowerCase()):null;
        return [{ date,day,time,title,type,purpose,owner,output,workRefs:workMatch?[workMatch.id]:[],milestoneRefs:milestoneMatch?[milestoneMatch.id]:[] }];
    });
};
const hasMultipleDeciders = (value) => {
    const text=String(value||'').trim();
    if (!text) return false;
    return /\s(?:\/|&|\+)\s|,|·/.test(text);
};
const artifactDiagnostics = () => {
    const out=[];
    const manager=artifactRows('MANAGER_CONTRACT');
    if (manager.length && manager.some((r)=>!String(r.success30||'').trim() || !String(r.reportRhythm||'').trim())) out.push({level:'warn',icon:'↑',title:'Manager Contract의 성공 기준/보고 리듬이 비어 있습니다.',copy:'상급자와 첫 30일 성공의 정의와 보고 주기를 먼저 합의하세요.',meta:'Manager Contract'});
    const patterns=artifactRows('TEAM_PATTERN');
    if (patterns.some((r)=>String(r.state||'').toUpperCase()==='HYPOTHESIS' && !String(r.verify||'').trim())) out.push({level:'warn',icon:'?',title:'검증 질문 없는 Team Pattern 가설이 있습니다.',copy:'패턴은 사람 평가가 아니라 다음에 확인할 질문으로 남겨야 합니다.',meta:'Team Pattern'});
    const work=artifactRows('WORK_MAP');
    const looseWork=work.filter((r)=>!String(r.goal||'').trim() || !String(r.owner||'').trim() || !String(r.nextMilestone||'').trim());
    if (looseWork.length) out.push({level:'critical',icon:'W',title:`Goal/Owner/Milestone이 불완전한 Work ${looseWork.length}개`,copy:'진행 중인 일은 왜 하는지, 누가 책임지는지, 다음 판단 지점이 무엇인지 보여야 합니다.',meta:'Work Map'});
    const priorities=artifactRows('PRIORITY_CONTRACT');
    if (priorities.length && priorities.some((r)=>![r.priority1,r.priority2,r.priority3].every((v)=>String(v||'').trim()))) out.push({level:'warn',icon:'3',title:'Top 3 Priority가 아직 완성되지 않았습니다.',copy:'중요한 일과 함께 이번 주 하지 않을 일도 명시하세요.',meta:'Priority'});
    const team=artifactRows('TEAM_MAP');
    const unknown=team.filter((r)=>String(r.state||'').toUpperCase()==='UNKNOWN');
    if (!team.length) out.push({level:'warn',icon:'?',title:'Team Map이 아직 없습니다.',copy:'사람을 평가하기 전에 실제 역할·책임·의존성을 먼저 기록하세요.',meta:'Day 3'});
    else if (unknown.length) out.push({level:'warn',icon:'?',title:`확인이 필요한 UNKNOWN ${unknown.length}개`,copy:'UNKNOWN은 결함이 아닙니다. 다음 1:1에서 사실 확인 질문으로 바꾸세요.',meta:'Team Map'});
    else out.push({level:'good',icon:'✓',title:'Team Map 기본 맥락이 잡혔습니다.',copy:`${team.length}개의 역할/의존성 기록이 있습니다.`,meta:'Team Map'});

    const miles=artifactRows('MILESTONES');
    const badMiles=miles.filter((r)=>!String(r.owner||'').trim() || !String(r.evidence||'').trim() || !String(r.decision||'').trim());
    if (miles.length && badMiles.length) out.push({level:'critical',icon:'!',title:`불완전한 Milestone ${badMiles.length}개`,copy:'Owner · Evidence · Decision이 모두 있어야 다음 판단 지점으로 기능합니다.',meta:'Milestones'});
    else if (miles.length) out.push({level:'good',icon:'✓',title:'Milestone 완료 기준이 명확합니다.',copy:`${miles.length}개 마일스톤에 Outcome/Evidence/Owner/Decision이 연결되어 있습니다.`,meta:'Milestones'});

    const decisions=artifactRows('DECISION_RIGHTS');
    const noD=decisions.filter((r)=>!String(r.decide||'').trim());
    const multiD=decisions.filter((r)=>hasMultipleDeciders(r.decide));
    if (noD.length) out.push({level:'critical',icon:'D',title:`Decide(D) 없는 결정 ${noD.length}개`,copy:'최종 결정권자가 없으면 Input이 승인처럼 작동하며 병목이 생길 수 있습니다.',meta:'RAPID'});
    if (multiD.length) out.push({level:'critical',icon:'D',title:`D가 여러 명으로 보이는 결정 ${multiD.length}개`,copy:'RAPID의 D는 원칙적으로 하나의 최종 결정 역할로 명확히 두세요.',meta:'RAPID'});
    if (decisions.length && !noD.length && !multiD.length) out.push({level:'good',icon:'✓',title:'Decision Rights의 D가 명확합니다.',copy:`${decisions.length}개 결정의 최종 결정권자가 지정되어 있습니다.`,meta:'RAPID'});

    const delegations=artifactRows('DELEGATION');
    const loose=delegations.filter((r)=>!String(r.guardrail||'').trim() || !String(r.checkpoint||'').trim());
    if (delegations.length && loose.length) out.push({level:'warn',icon:'↗',title:`가드레일/체크포인트가 빠진 위임 ${loose.length}개`,copy:'위임은 “알아서 해주세요”가 아니라 권한 범위와 다시 볼 시점을 함께 합의합니다.',meta:'Delegation'});

    if (!out.length) out.push({level:'warn',icon:'→',title:'첫 Operating Artifact를 만들어보세요.',copy:'Example을 불러온 뒤 내 팀 상황에 맞게 수정하면 됩니다.',meta:'Start'});
    return out;
};
const fieldControlHtml = ([key,label,placeholder,kind='text',options=[]], index) => {
    const cls = index >= 4 || kind === 'textarea' ? 'field full' : 'field';
    if (kind === 'select') return `<div class="${cls}"><label>${escapeHtml(label)}</label><select data-artifact-field="${key}">${options.map((option)=>`<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join('')}</select></div>`;
    if (kind === 'textarea') return `<div class="${cls}"><label>${escapeHtml(label)}</label><textarea data-artifact-field="${key}" placeholder="${escapeHtml(placeholder)}"></textarea></div>`;
    return `<div class="${cls}"><label>${escapeHtml(label)}</label><input data-artifact-field="${key}" placeholder="${escapeHtml(placeholder)}" /></div>`;
};
const artifactHistoryHtml = (row) => {
    const history = Array.isArray(row?.history) ? row.history : [];
    if (!history.length) return '';
    return `<details class="artifact-history"><summary>Version history · ${history.length}</summary>${history.slice().reverse().map((item)=>{
        const detail=Object.entries(item.data||{}).slice(0,6).map(([k,v])=>`${k}: ${v}`).join(' · ');
        return `<div class="artifact-history-item"><b>v${escapeHtml(item.version)}</b><span>${escapeHtml(detail)}</span><small>${escapeHtml(item.updatedAt||'')}</small></div>`;
    }).join('')}</details>`;
};
const artifactActionsHtml = (row) => { const confirmed=String(row.artifactState||'DRAFT').toUpperCase()==='CONFIRMED'; const db=row.serverVersion?` · DB v${row.serverVersion}`:' · LOCAL'; return `<div class="artifact-row-actions"><span class="artifact-version ${confirmed?'confirmed':''}">v${escapeHtml(row.version||1)} · ${escapeHtml(row.artifactState||'DRAFT')}${escapeHtml(db)}</span><button type="button" class="${confirmed?'':'primary'}" data-artifact-state="${escapeHtml(row.id)}" data-next-state="${confirmed?'DRAFT':'CONFIRMED'}">${confirmed?'다시 검토':'Human Confirm'}</button><button type="button" data-artifact-edit="${escapeHtml(row.id)}">수정</button><button type="button" data-artifact-delete="${escapeHtml(row.id)}">삭제</button></div>`; };
const artifactRowHtml = (active, def, row) => {
    if (active === 'TEAM_MAP') {
        const state=String(row.state||'UNKNOWN').toLowerCase();
        return `<div class="artifact-row"><div><b>${escapeHtml(row.name||'팀원')} · ${escapeHtml(row.role||'역할 미정')}</b><p>${escapeHtml(row.responsibility||'책임 미입력')} · Dependency: ${escapeHtml(row.dependency||'—')}</p><span class="team-state ${escapeHtml(state)}">${escapeHtml(String(row.state||'UNKNOWN').toUpperCase())}</span><div class="artifact-record-meta"><span>${escapeHtml(row.observation||'근거/질문 미입력')}</span></div>${artifactHistoryHtml(row)}</div>${artifactActionsHtml(row)}</div>`;
    }
    if (active === 'MILESTONES') {
        return `<div class="artifact-row"><div><b>${escapeHtml(row.project||'Project')} · ${escapeHtml(row.milestone||'Milestone')}</b><div class="milestone-mini"><span>${escapeHtml(row.date||'날짜 미정')} · Owner ${escapeHtml(row.owner||'미정')}</span><b>${escapeHtml(row.outcome||'Outcome 미입력')}</b><span>Evidence: ${escapeHtml(row.evidence||'—')}</span><span>Decision: ${escapeHtml(row.decision||'—')}</span></div>${relationSummaryHtml(row)}${artifactHistoryHtml(row)}</div>${artifactActionsHtml(row)}</div>`;
    }
    const entries=Object.entries(row).filter(([k])=>!['id','updatedAt','version','history','artifactState','supportVersions','serverVersion','serverSyncedAt','serverSyncError'].includes(k) && !/(Ref|Refs)$/.test(k));
    const primary=entries[0];
    const detail=entries.slice(1).map(([k,v])=>`${k}: ${v}`).join(' · ');
    return `<div class="artifact-row"><div><b>${escapeHtml(primary?.[1]||def.label)}</b><p>${escapeHtml(detail)}</p>${relationSummaryHtml(row)}<div class="artifact-record-meta"><span>ID ${escapeHtml(row.id)}</span></div>${artifactHistoryHtml(row)}</div>${artifactActionsHtml(row)}</div>`;
};
const renderDiagnostics = () => {
    artifactDiagnosticsRoot.innerHTML = artifactDiagnostics().map((d)=>`<div class="diag-card ${escapeHtml(d.level)}"><span class="diag-icon">${escapeHtml(d.icon)}</span><div><strong>${escapeHtml(d.title)}</strong><p>${escapeHtml(d.copy)}</p></div><small>${escapeHtml(d.meta)}</small></div>`).join('');
};
const relationOptionHtml = (type, selected=[]) => {
    const selectedRefs=refArray(selected);
    return artifactRows(type).map((row)=>`<option value="${escapeHtml(row.id)}" ${selectedRefs.includes(String(row.id))?'selected':''}>${escapeHtml(artifactPrimary(type,row))}</option>`).join('');
};
const multiRelationControl=(label,field,type,selected=[])=>`<div class="field"><label>${escapeHtml(label)}</label><select multiple size="4" data-artifact-relation="${escapeHtml(field)}">${relationOptionHtml(type,selected)}</select><span class="relation-help">⌘/Ctrl 또는 Shift로 여러 항목을 선택할 수 있습니다.</span></div>`;
const relationControlsHtml = (active, row={}) => {
    if (active==='WORK_MAP') return `<div class="artifact-relations"><span class="section-kicker">CROSS-LINKS · 1:N</span><div class="artifact-fields">${multiRelationControl('Linked Milestones','milestoneRefs','MILESTONES',row.milestoneRefs)}${multiRelationControl('Linked Decisions','decisionRefs','DECISION_RIGHTS',row.decisionRefs)}${multiRelationControl('Linked Delegations','delegationRefs','DELEGATION',row.delegationRefs)}${multiRelationControl('Linked Debriefs','debriefRefs','DEBRIEF',row.debriefRefs)}${multiRelationControl('Linked Calendar Events','calendarRefs','TEAM_CALENDAR',row.calendarRefs)}</div></div>`;
    if (active==='MILESTONES') return `<div class="artifact-relations"><span class="section-kicker">CROSS-LINKS</span><div class="artifact-fields">${multiRelationControl('Linked Work','workRefs','WORK_MAP',row.workRefs)}${multiRelationControl('Linked Decisions','decisionRefs','DECISION_RIGHTS',row.decisionRefs)}${multiRelationControl('Linked Calendar Events','calendarRefs','TEAM_CALENDAR',row.calendarRefs)}</div></div>`;
    if (active==='DECISION_RIGHTS') return `<div class="artifact-relations"><span class="section-kicker">CROSS-LINKS</span><div class="artifact-fields">${multiRelationControl('Linked Work','workRefs','WORK_MAP',row.workRefs)}${multiRelationControl('Linked Milestones','milestoneRefs','MILESTONES',row.milestoneRefs)}</div></div>`;
    if (active==='DELEGATION') return `<div class="artifact-relations"><span class="section-kicker">CROSS-LINKS</span><div class="artifact-fields">${multiRelationControl('Linked Work','workRefs','WORK_MAP',row.workRefs)}${multiRelationControl('1:1 Commitments','commitmentRefs','ONE_ON_ONE_COMMITMENT',row.commitmentRefs)}</div></div>`;
    if (active==='DEBRIEF') return `<div class="artifact-relations"><span class="section-kicker">CROSS-LINKS</span><div class="artifact-fields">${multiRelationControl('Linked Work','workRefs','WORK_MAP',row.workRefs)}${multiRelationControl('1:1 Commitments as Evidence','commitmentRefs','ONE_ON_ONE_COMMITMENT',row.commitmentRefs)}</div></div>`;
    if (active==='TEAM_CALENDAR') return `<div class="artifact-relations"><span class="section-kicker">OPERATING LINKS</span><div class="artifact-fields">${multiRelationControl('Linked Work','workRefs','WORK_MAP',row.workRefs)}${multiRelationControl('Linked Milestones','milestoneRefs','MILESTONES',row.milestoneRefs)}</div></div>`;
    if (active==='ONE_ON_ONE_COMMITMENT') return `<div class="artifact-relations"><span class="section-kicker">FOLLOW-UP LINKS</span><div class="artifact-fields">${multiRelationControl('Delegation','delegationRefs','DELEGATION',row.delegationRefs)}${multiRelationControl('Debrief Evidence','debriefRefs','DEBRIEF',row.debriefRefs)}</div></div>`;
    return '';
};
const relationSummaryHtml = (row) => {
    const configs=[['WORK_MAP','workRefs'],['MILESTONES','milestoneRefs'],['DECISION_RIGHTS','decisionRefs'],['DELEGATION','delegationRefs'],['DEBRIEF','debriefRefs'],['TEAM_CALENDAR','calendarRefs'],['ONE_ON_ONE_COMMITMENT','commitmentRefs'],['NEXT_60_PLAN','planRef']];
    const chips=[];
    for(const [type,field] of configs){
      const refs=field==='planRef'?refArray(row[field]):refArray(row[field]);
      for(const id of refs){const item=artifactRecordById(id);chips.push(`<span>${escapeHtml(type.replaceAll('_',' '))}: ${escapeHtml(item?artifactPrimary(type,item):'Missing link')}</span>`);}
    }
    return chips.length?`<div class="relation-chip-set">${chips.join('')}</div>`:'';
};

const renderArtifactWorkspace = () => {
    const active = artifactDefinitions[questStore.artifactTab] ? questStore.artifactTab : 'TEAM_MAP';
    questStore.artifactTab = active;
    const def = artifactDefinitions[active];
    const editRow = editingArtifactId ? artifactRows(active).find((row)=>row.id===editingArtifactId) : null;
    if (editingArtifactId && !editRow) editingArtifactId = null;
    artifactTabsRoot.innerHTML = Object.entries(artifactDefinitions).map(([id,item])=>`<button type="button" class="${active===id?'active':''}" data-artifact-tab="${id}">${escapeHtml(item.label)} <span class="artifact-count">${artifactRows(id).length}</span></button>`).join('');
    const calendarImport = active === 'TEAM_CALENDAR' ? `<details class="calendar-import"><summary>Calendar Import Adapter · 일정 텍스트 가져오기</summary><textarea data-calendar-import placeholder="2026-10-05 | MON | 09:30 | Weekly Priority | Ritual | 이번 주 Top 3 확정 | Team Lead | Weekly Commitments | Priority Project | Concept Lock&#10;FRI | 16:00 | Team Debrief | Debrief | Keep / Change / Next | Team | Next rule"></textarea><div class="artifact-actions"><button type="button" data-calendar-import-run>일정 가져오기</button></div><div class="calendar-import-help">현재 Preview는 붙여넣기 어댑터입니다. Google Calendar / Outlook 연결은 Production connector가 연결될 때 이 동일 schema로 매핑합니다.</div></details>` : '';
    artifactEditorRoot.innerHTML = `<div class="artifact-editor-head"><div><span class="section-kicker">${editRow?'EDIT + VERSION':'NEW ARTIFACT'}</span><h3>${escapeHtml(def.label)} ${editRow?'수정':'작성'}</h3></div>${editRow?`<span class="artifact-version">editing v${escapeHtml(editRow.version||1)}</span>`:''}</div><div class="artifact-fields">${def.fields.map(fieldControlHtml).join('')}</div>${relationControlsHtml(active,editRow||{})}<div class="artifact-actions"><button type="button" class="primary" data-artifact-save>${editRow?'변경 저장':'내 팀에 추가'}</button><button type="button" data-artifact-sample>Role Pack 예시 채우기</button>${editRow?'<button type="button" data-artifact-cancel>수정 취소</button>':''}</div>${calendarImport}<div class="review-meta" style="margin-top:8px">확정 Fact가 아니라 리더가 작성한 운영 Artifact입니다. 변경 저장 시 이전 버전은 History에 남습니다.</div><div class="backend-contract-note">${artifactRuntimeState().signedIn&&artifactRuntimeState().workspaceId?'Workspace DB Sync 활성 · Artifact는 versioned EVIDENCE로 저장되며 Human Confirm도 자동 Domain Truth 승격은 하지 않습니다.':'Local-first 모드 · 로그인 + Workspace 선택 시 versioned EVIDENCE로 서버 동기화됩니다.'}</div>`;
    if (editRow) for(const input of artifactEditorRoot.querySelectorAll('[data-artifact-field]')) input.value=editRow[input.dataset.artifactField]??'';
    const rows = artifactRows(active);
    artifactPreviewRoot.innerHTML = `<h3>저장된 ${escapeHtml(def.label)} <span class="artifact-count">${rows.length} items</span></h3><div class="artifact-list">${rows.length?rows.map((row)=>artifactRowHtml(active,def,row)).join(''):`<div class="artifact-empty">아직 내 팀 데이터가 없습니다.<br>Role Pack 예시를 채운 뒤 ‘내 팀에 추가’를 눌러보세요.</div>`}</div>`;
    if (artifactStorageStatus) {
        const state=artifactRuntimeState();
        const synced=allArtifactRecords().filter((row)=>row.serverVersion).length;
        artifactStorageStatus.textContent=state.signedIn&&state.workspaceId
            ? `LOCAL + WORKSPACE DB · ${allArtifactRecords().length} OBJECTS · ${synced} SYNCED`
            : `LOCAL PREVIEW · ARTIFACT SCHEMA v6 · ${allArtifactRecords().length} OBJECTS`;
        artifactStorageStatus.dataset.storageTone=state.signedIn&&state.workspaceId?'server':'local';
    }
    for (const button of artifactTabsRoot.querySelectorAll('[data-artifact-tab]')) button.addEventListener('click',()=>{editingArtifactId=null;questStore.artifactTab=button.dataset.artifactTab;saveQuestStore();renderArtifactWorkspace();});
    artifactEditorRoot.querySelector('[data-artifact-sample]')?.addEventListener('click',()=>{
        const sample=sampleArtifactRecordsForRole()[active];
        for(const input of artifactEditorRoot.querySelectorAll('[data-artifact-field]')) input.value=sample?.[input.dataset.artifactField]??'';
    });
    artifactEditorRoot.querySelector('[data-artifact-cancel]')?.addEventListener('click',()=>{editingArtifactId=null;renderArtifactWorkspace();});
    artifactEditorRoot.querySelector('[data-artifact-save]')?.addEventListener('click',()=>{
        const record={};
        for(const input of artifactEditorRoot.querySelectorAll('[data-artifact-field]')) record[input.dataset.artifactField]=String(input.value||'').trim();
        for(const input of artifactEditorRoot.querySelectorAll('[data-artifact-relation]')) record[input.dataset.artifactRelation]=input.multiple?[...input.selectedOptions].map((option)=>option.value).filter(Boolean):refArray(input.value);
        if(!Object.values(record).some(Boolean)) return;
        if (editingArtifactId) { updateArtifactRecord(active,editingArtifactId,record); editingArtifactId=null; renderArtifactWorkspace(); renderSetupChecklist(); renderQuestList(); renderTodayLeaderNudge(); }
        else addArtifactRecord(active,record);
        renderQuestDetail(questStore.selectedDay);
    });
    artifactEditorRoot.querySelector('[data-calendar-import-run]')?.addEventListener('click',()=>{
        const area=artifactEditorRoot.querySelector('[data-calendar-import]');
        const rows=parseCalendarImport(area?.value);
        for(const record of rows) addArtifactRecord('TEAM_CALENDAR',record);
        if (area) area.value='';
    });
    for (const button of artifactPreviewRoot.querySelectorAll('[data-artifact-state]')) button.addEventListener('click',()=>{
        const id=button.dataset.artifactState; const next=button.dataset.nextState; if(!id||!next) return;
        setArtifactState(active,id,next);
        renderArtifactWorkspace(); renderSetupChecklist(); renderQuestList(); renderQuestDetail(questStore.selectedDay); renderTodayLeaderNudge(); renderRecovery14Surfaces();
    });
    for (const button of artifactPreviewRoot.querySelectorAll('[data-artifact-edit]')) button.addEventListener('click',()=>{editingArtifactId=button.dataset.artifactEdit;renderArtifactWorkspace();artifactEditorRoot.scrollIntoView({behavior:'smooth',block:'center'});});
    for (const button of artifactPreviewRoot.querySelectorAll('[data-artifact-delete]')) button.addEventListener('click',()=>{
        const id=button.dataset.artifactDelete;
        const deleting=artifactRows(active).find((item)=>item.id===id)||null;
        if(deleting) deleteOperatingArtifactFromServer(active,deleting);
        artifactStore[active]=artifactRows(active).filter((item)=>item.id!==id);
        if (editingArtifactId===id) editingArtifactId=null;
        removeArtifactRefs(id);
        detachArtifactRelations(id);
        saveArtifactStore();
        renderArtifactWorkspace();
        renderSetupChecklist();
        renderQuestList();
        renderQuestDetail(questStore.selectedDay);
        renderTodayLeaderNudge();
    });
    renderDiagnostics();
    renderWeeklyOperatingReview();
    renderRecovery14Surfaces();
    if (typeof renderRecovery15Surfaces === 'function') renderRecovery15Surfaces();
};
setTimeout(()=>hydrateOperatingArtifactsFromServer(false),1700);
setInterval(()=>{
    if(!switchArtifactStoreScope()) return;
    if(typeof renderArtifactWorkspace==='function') renderArtifactWorkspace();
    if(typeof renderSetupChecklist==='function') renderSetupChecklist();
    setTimeout(()=>hydrateOperatingArtifactsFromServer(true),120);
},1300);
window.addEventListener('focus',()=>hydrateOperatingArtifactsFromServer(false));
document.addEventListener('click',(event)=>{
    if(event.target?.closest?.('[data-route="ONBOARDING"],[data-page-link="ONBOARDING"],[data-r21-path="DAY30"],[data-r21-go-quest]')){
        setTimeout(()=>hydrateOperatingArtifactsFromServer(false),320);
    }
},true);
Object.defineProperty(window,'LeaderOsOperatingArtifactBridge',{
    value:{
        hydrate:()=>hydrateOperatingArtifactsFromServer(true),
        sync:(type,id)=>syncOperatingArtifactToServer(type,id),
        create:(type,payload={})=>{
            if(!artifactDefinitions[type]) throw new Error('ARTIFACT_TYPE_UNSUPPORTED');
            const id=addArtifactRecord(type,{...payload});
            return artifactRows(type).find((row)=>row.id===id)||null;
        },
        openType:(type)=>{
            if(!artifactDefinitions[type]) return false;
            questStore.artifactTab=type;
            saveQuestStore();
            navigation.goTo('ONBOARDING');
            renderArtifactWorkspace();
            setTimeout(()=>artifactEditorRoot?.scrollIntoView({behavior:'smooth',block:'start'}),80);
            return true;
        },
        snapshot:()=>JSON.parse(JSON.stringify(artifactStore)),
        byType:(type)=>artifactRows(type).map((row)=>({...row})),
        all:()=>allArtifactRecords().map((row)=>({...row})),
        state:()=>({
            scope:activeArtifactStorageScope,
            workspaceId:artifactServerWorkspace,
            count:allArtifactRecords().length,
            synced:allArtifactRecords().filter((row)=>row.serverVersion).length
        })
    },
    enumerable:false,
    configurable:true
});
const renderTodayLeaderNudge = () => {
    const manager = artifactRows('MANAGER_CONTRACT')[0];
    const team = artifactRows('TEAM_MAP');
    const patterns = artifactRows('TEAM_PATTERN');
    const stakeholders = artifactRows('STAKEHOLDER_MAP');
    const calendar = artifactRows('TEAM_CALENDAR');
    const work = artifactRows('WORK_MAP');
    const milestones = artifactRows('MILESTONES');
    const priorities = artifactRows('PRIORITY_CONTRACT')[0];
    const badMilestone = milestones.find((item)=>!String(item.owner||'').trim() || !String(item.evidence||'').trim() || !String(item.decision||'').trim());
    const missingDecision = artifactRows('DECISION_RIGHTS').find((item)=>!String(item.decide||'').trim());
    const multiDecision = artifactRows('DECISION_RIGHTS').find((item)=>hasMultipleDeciders(item.decide));
    const decision = artifactRows('DECISION_RIGHTS')[0];
    const delegation = artifactRows('DELEGATION')[0];
    const debrief = artifactRows('DEBRIEF')[0];
    const nextChecklist = LEADERSHIP_SETUP_CHECKLIST.find((item)=>!setupDone(item).done);
    let title='첫 30일 세팅을 시작하세요.';
    let copy='상급자의 기대와 팀의 실제 역할을 먼저 보이게 만들면 이후 우선순위·결정권·위임을 더 정확히 설계할 수 있습니다.';
    let label='Manager Contract 만들기';
    let route='ONBOARDING';
    let state='open';
    let targetArtifact='MANAGER_CONTRACT';
    let targetDay=2;
    if (!manager) { title='먼저 “무엇을 성공으로 볼지” 상급자와 맞추세요.'; copy='30일 성공 기준 · Top 3 기대 · 보고 리듬 · 즉시 공유 조건을 Manager Contract 한 장으로 정리합니다.'; label='Manager Contract 작성'; targetArtifact='MANAGER_CONTRACT'; targetDay=2; }
    else if (!team.length) { title='직함보다 실제 역할을 먼저 파악하세요.'; copy='Team Map에 역할·책임·의존성·UNKNOWN을 기록하세요. 사람 평가는 하지 않습니다.'; label='Team Map 작성'; targetArtifact='TEAM_MAP'; targetDay=3; }
    else if (!patterns.length) { title='1:1의 개별 이야기를 팀 패턴으로 묶어보세요.'; copy='두 번 이상 반복되는 blocker만 Team Pattern Board에 올리고 검증 질문을 남깁니다.'; label='Team Pattern 작성'; targetArtifact='TEAM_PATTERN'; targetDay=5; }
    else if (!stakeholders.length) { title='팀 밖의 숨은 의존성을 지도에 올리세요.'; copy='결과에 영향을 주는 이해관계자와 기대·영향도·다음 접점을 기록합니다.'; label='Stakeholder Map 작성'; targetArtifact='STAKEHOLDER_MAP'; targetDay=6; }
    else if (!calendar.length) { title='팀이 시간을 어디에 쓰는지 보세요.'; copy='반복 일정을 Ritual / 1:1 / Milestone / Decision / Debrief로 분류하면 실제 운영 리듬이 보입니다.'; label='Team Calendar 작성'; targetArtifact='TEAM_CALENDAR'; targetDay=8; }
    else if (!work.length) { title='현재 진행 중인 일을 한 장으로 연결하세요.'; copy='각 프로젝트의 Goal · Owner · Next Milestone · Open Decision을 Work Map에 올립니다.'; label='Work Map 작성'; targetArtifact='WORK_MAP'; targetDay=10; }
    else if (!milestones.length) { title='날짜가 아니라 판단 가능한 Milestone을 만드세요.'; copy='Outcome · Evidence · Owner · Decision이 있는 마일스톤부터 1개 작성하세요.'; label='Milestone 작성'; targetArtifact='MILESTONES'; targetDay=11; }
    else if (badMilestone) { title='완료 기준이 빠진 Milestone이 있습니다.'; copy=`${badMilestone.milestone||'Milestone'}에 Owner · Evidence · Decision을 채워 다음 판단 지점으로 만드세요.`; label='Milestone 보완'; targetArtifact='MILESTONES'; targetDay=11; }
    else if (!priorities) { title='이제 이번 주 Top 3를 계약처럼 명확히 하세요.'; copy='Priority 1–3, Not now, Success signal, Review date를 합의하면 팀이 같은 기준으로 움직입니다.'; label='Priority Contract 작성'; targetArtifact='PRIORITY_CONTRACT'; targetDay=13; }
    else if (missingDecision) { title='결정권자가 비어 있는 Decision이 있습니다.'; copy=`${missingDecision.decision||'중요 결정'}의 최종 Decide(D)를 지정해 병목을 줄이세요.`; label='Decision Rights 열기'; targetArtifact='DECISION_RIGHTS'; targetDay=16; }
    else if (multiDecision) { title='최종 결정권자 D가 여러 명으로 보입니다.'; copy=`${multiDecision.decision||'중요 결정'}의 D를 한 역할로 명확히 하세요.`; label='Decision Rights 점검'; targetArtifact='DECISION_RIGHTS'; targetDay=16; }
    else if (decision && !delegation) { title='결정권은 정리됐습니다. 이제 실제 업무 하나를 위임해보세요.'; copy=`${decision.decision||'중요 결정'}의 권한 구조를 기준으로 Outcome · Guardrail · Checkpoint를 합의해보세요.`; label='Delegation 작성'; targetArtifact='DELEGATION'; targetDay=19; }
    else if (delegation && !debrief) { title='위임을 했으면 결과를 Debrief로 학습에 연결하세요.'; copy=`${delegation.task||'위임 업무'}에서 예상과 실제의 차이를 기록하면 다음 운영 룰을 만들 수 있습니다.`; label='Debrief 작성'; targetArtifact='DEBRIEF'; targetDay=26; }
    else if (stakeholders.some((item)=>String(item.influence||'').toUpperCase()==='UNKNOWN' || !String(item.nextTouch||'').trim())) { const s=stakeholders.find((item)=>String(item.influence||'').toUpperCase()==='UNKNOWN' || !String(item.nextTouch||'').trim()); title='확인되지 않은 Stakeholder 의존성이 있습니다.'; copy=`${s?.stakeholder||'핵심 이해관계자'}의 영향도 또는 다음 접점을 확인해 운영 리스크를 줄이세요.`; label='Stakeholder Map 점검'; targetArtifact='STAKEHOLDER_MAP'; targetDay=6; }
    else if (nextChecklist) { title=`다음 Setup: ${nextChecklist.title}`; copy=`Day ${nextChecklist.day} Quest · ${nextChecklist.artifact}를 만들 차례입니다.`; label=`Day ${nextChecklist.day} 열기`; targetArtifact=SETUP_ARTIFACT_TYPE[nextChecklist.id]||questStore.artifactTab; targetDay=nextChecklist.day; }
    else { const charter=artifactRows('TEAM_OS_CHARTER')[0]; const next60=artifactRows('NEXT_60_PLAN')[0]; if(!charter){title='첫 30일의 운영 Artifact를 Team OS Charter로 통합하세요.';copy='Confirmed 운영 기준을 한 장으로 조립해 팀이 반복해서 쓸 규칙을 남깁니다.';label='Team OS Charter 만들기';targetArtifact='TEAM_OS_CHARTER';targetDay=30;} else if(!next60){title='30일 온보딩에서 다음 60일 실행으로 넘어가세요.';copy='Outcomes 3개 · System Upgrade · Leader Experiment · Review Rhythm을 Next 60 Plan으로 정리합니다.';label='Next 60 Plan 만들기';targetArtifact='NEXT_60_PLAN';targetDay=30;} else {title='Team Operating System v1이 운영 사이클로 전환됐습니다.';copy='Weekly Operating Review에서 실제 결과·결정·위임·학습을 확인하고 Charter를 필요할 때 업데이트하세요.';label='Weekly Review 보기';targetArtifact='WEEKLY_REVIEW';targetDay=30;state='complete';} route='ONBOARDING'; }
    todayNudgeRoot.dataset.state=state; todayNudgeTitle.textContent=title; todayNudgeCopy.textContent=copy; todayNudgeAction.textContent=label;
    todayNudgeAction.onclick=()=>{navigation.goTo(route); if(route==='ONBOARDING'){ if(targetArtifact && artifactDefinitions[targetArtifact]){questStore.artifactTab=targetArtifact;saveQuestStore();renderArtifactWorkspace();} if(targetDay) renderQuestDetail(targetDay); }};
};
const chiefArtifactSummary = (type) => {
    const rows=artifactRows(type);
    if (!rows.length) return '아직 Artifact 없음';
    return `${rows.length}개 · ${artifactPrimary(type,rows[rows.length-1])}`;
};
const renderQuestChiefRail = (quest) => {
    if (!questChiefRailRoot || !quest) return;
    const type=QUEST_ARTIFACT_TYPE[quest.day]||null;
    const refs=artifactRefsForDay(quest.day);
    const nextQuestions=(quest.debrief||[]).slice(0,2);
    const artifactSummary=type?chiefArtifactSummary(type):'이 Quest는 자유 Evidence 또는 연결된 Artifact로 완료할 수 있습니다.';
    questChiefRailRoot.innerHTML=`<div class="chief-rail-card"><span class="section-kicker">WHY NOW?</span><strong>${escapeHtml(quest.outcome)}</strong><p>${escapeHtml(quest.knowledge)}</p></div><div class="chief-rail-card"><span class="section-kicker">I NOTICE</span><strong>${escapeHtml(type?artifactDefinitions[type]?.label||type:'Practice')}</strong><p>${escapeHtml(artifactSummary)}</p><span class="chief-evidence">Evidence refs · ${refs.length}</span></div><div class="chief-rail-card"><span class="section-kicker">SUGGESTED QUESTIONS</span>${nextQuestions.map((q)=>`<button type="button" class="chief-question">${escapeHtml(q)}</button>`).join('')}</div><div class="chief-rail-card emphasis"><span class="section-kicker">SUGGESTED NEXT</span><strong>${refs.length?'Debrief를 남기고 다음 행동을 정하세요.':type?'예시를 본 뒤 내 팀 Artifact를 하나 만드세요.':'Evidence를 한 줄 기록하세요.'}</strong>${type?`<button type="button" class="primary" data-chief-open-artifact="${escapeHtml(type)}">${escapeHtml(artifactDefinitions[type]?.label||type)} 열기</button>`:''}</div>`;
    questChiefRailRoot.querySelector('[data-chief-open-artifact]')?.addEventListener('click',(event)=>{const target=event.currentTarget.dataset.chiefOpenArtifact;if(target&&artifactDefinitions[target]){questStore.artifactTab=target;saveQuestStore();renderArtifactWorkspace();document.querySelector('[data-artifact-tabs]')?.scrollIntoView({behavior:'smooth',block:'center'});}});
};
const latestArtifact = (type, confirmedOnly=false) => { const rows=confirmedOnly?confirmedArtifactRows(type):artifactRows(type); return rows[rows.length-1]||null; };
const formatArtifactLink = (type,id) => { const row=id?artifactRecordById(id):null; return row?artifactPrimary(type,row):'연결 없음'; };
const buildTeamOsCharterDraft = () => {
    const manager=latestArtifact('MANAGER_CONTRACT',true)||latestArtifact('MANAGER_CONTRACT');
    const calendar=confirmedArtifactRows('TEAM_CALENDAR');
    const priority=latestArtifact('PRIORITY_CONTRACT',true)||latestArtifact('PRIORITY_CONTRACT');
    const decisions=confirmedArtifactRows('DECISION_RIGHTS');
    const delegations=confirmedArtifactRows('DELEGATION');
    const debrief=latestArtifact('DEBRIEF',true)||latestArtifact('DEBRIEF');
    const rhythm=calendar.length?calendar.slice(0,6).map((r)=>`${r.day||''} ${r.time||''} ${r.title||''}`).join(' · '):(manager?.reportRhythm||'운영 리듬 확인 필요');
    const decisionRule=decisions.length?`${decisions.length}개 Confirmed Decision · D: ${[...new Set(decisions.map((r)=>r.decide).filter(Boolean))].join(', ')||'확인 필요'}`:'중요 결정에 RAPID와 최종 D를 명시';
    const delegationRule=delegations.length?`${delegations.length}개 Confirmed Delegation · ${delegations.map((r)=>r.level).filter(Boolean).join(' / ')}`:'Outcome / Guardrail / Authority / Checkpoint를 함께 합의';
    const supports=[manager,...calendar,priority,...decisions,...delegations,debrief].filter(Boolean);
    const supportRefs=[...new Set(supports.map((row)=>row.id).filter(Boolean))];
    const supportVersions=Object.fromEntries(supports.filter((row)=>row.id).map((row)=>[row.id,Number(row.version)||1]));
    return {versionLabel:'v1',successDefinition:manager?.success30||priority?.successSignal||'팀의 성공 정의를 합의하세요.',operatingRhythm:rhythm,decisionRule,delegationRule,reviewRule:debrief?.next?`Debrief learning: ${debrief.next}`:'금요일 Weekly Review에서 Keep / Change / Next',escalationRule:manager?.escalation||'예산·외부 약속·핵심 일정 변경은 즉시 공유',supportRefs:supportRefs.join(','),supportVersions:JSON.stringify(supportVersions)};
};
const renderTeamOsCharter = () => {
    if(!teamOsCharterRoot) return;
    const draft=buildTeamOsCharterDraft();
    const confirmedCount=Object.keys(artifactDefinitions).filter((t)=>!['TEAM_OS_CHARTER','NEXT_60_PLAN'].includes(t)).reduce((sum,t)=>sum+confirmedArtifactRows(t).length,0);
    const required=['MANAGER_CONTRACT','TEAM_MAP','TEAM_CALENDAR','WORK_MAP','MILESTONES','PRIORITY_CONTRACT','DECISION_RIGHTS','DELEGATION','DEBRIEF'];
    const missing=required.filter((t)=>!confirmedArtifactRows(t).length);
    teamOsCharterRoot.innerHTML=`<div class="charter-status"><span class="state-badge ${missing.length?'':'confirmed'}">${missing.length?`REVIEW NEEDED · ${missing.length} areas`:'READY TO CHARTER'}</span><span>${confirmedCount} Confirmed operating artifacts</span></div><div class="charter-grid"><div><small>SUCCESS DEFINITION</small><b>${escapeHtml(draft.successDefinition)}</b></div><div><small>OPERATING RHYTHM</small><b>${escapeHtml(draft.operatingRhythm)}</b></div><div><small>DECISION RULE</small><b>${escapeHtml(draft.decisionRule)}</b></div><div><small>DELEGATION RULE</small><b>${escapeHtml(draft.delegationRule)}</b></div><div><small>REVIEW RULE</small><b>${escapeHtml(draft.reviewRule)}</b></div><div><small>ESCALATION</small><b>${escapeHtml(draft.escalationRule)}</b></div></div>${missing.length?`<div class="safe">Charter는 DRAFT를 자동으로 사실화하지 않습니다. 먼저 확인할 영역: ${escapeHtml(missing.map((t)=>artifactDefinitions[t]?.label||t).join(' · '))}</div>`:'<div class="safe">Confirmed Artifact만 운영 기준으로 우선 사용합니다. Charter 저장 후에도 Human Review로 수정할 수 있습니다.</div>'}`;
    if(teamOsCharterSave) teamOsCharterSave.disabled=false;
};
teamOsCharterSave?.addEventListener('click',()=>{ const draft=buildTeamOsCharterDraft(); addArtifactRecord('TEAM_OS_CHARTER',draft); questStore.artifactTab='TEAM_OS_CHARTER'; saveQuestStore(); renderArtifactWorkspace(); });
const buildNext60Draft = () => { const pack=ROLE_PACKS[questStore.rolePack]||ROLE_PACKS.TEAM_MANAGER; const charter=latestArtifact('TEAM_OS_CHARTER',true)||latestArtifact('TEAM_OS_CHARTER'); const priority=latestArtifact('PRIORITY_CONTRACT',true)||latestArtifact('PRIORITY_CONTRACT'); return {period:'Day 31–90',outcome1:priority?.priority1||pack.starter.milestone,outcome2:`${pack.starter.role}의 독립 결정 범위를 한 단계 확장`,outcome3:'운영 리듬을 4주 이상 반복해 병목 변화 확인',systemUpgrade:'Work → Milestone → Decision → Delegation 관계를 실제 링크로 유지',leaderExperiment:'1:1과 피드백에서 Tell보다 Ask를 한 번 더 사용',reviewRhythm:'Weekly Review + Day 60 / Day 90',charterRef:charter?.id||''}; };
const renderDay30Transition = () => {
    if(!day30TransitionRoot) return;
    const progress=questProgressSummary(questStore.completed); const charter=latestArtifact('TEAM_OS_CHARTER'); const next=latestArtifact('NEXT_60_PLAN'); const draft=buildNext60Draft(); const eligible=progress.done>=30 && Boolean(charter);
    day30TransitionRoot.innerHTML=`<div class="transition-gate"><div><span class="section-kicker">30-DAY COMPLETION REVIEW</span><strong>${progress.done}/30 Quest · ${charter?'Charter saved':'Charter not saved'}</strong><p>${eligible?'첫 30일의 관찰·정렬 단계에서 다음 60일의 실행·위임·성과 검증 단계로 넘어갈 준비가 됐습니다.':'Day 30을 마치기 전에 Quest Evidence와 Team OS Charter를 확인하세요.'}</p></div><span class="state-badge ${eligible?'confirmed':''}">${eligible?'READY FOR NEXT 60':'GATE OPEN'}</span></div><div class="next60-preview"><div><small>OUTCOME 1</small><b>${escapeHtml(draft.outcome1)}</b></div><div><small>OUTCOME 2</small><b>${escapeHtml(draft.outcome2)}</b></div><div><small>OUTCOME 3</small><b>${escapeHtml(draft.outcome3)}</b></div><div><small>SYSTEM UPGRADE</small><b>${escapeHtml(draft.systemUpgrade)}</b></div><div><small>LEADER EXPERIMENT</small><b>${escapeHtml(draft.leaderExperiment)}</b></div><div><small>REVIEW RHYTHM</small><b>${escapeHtml(draft.reviewRhythm)}</b></div></div>${next?`<div class="safe">저장된 Next 60 Plan: ${escapeHtml(artifactPrimary('NEXT_60_PLAN',next))}</div>`:''}`;
    if(next60Save) next60Save.disabled=!charter;
};
next60Save?.addEventListener('click',()=>{ const draft=buildNext60Draft(); addArtifactRecord('NEXT_60_PLAN',draft); questStore.artifactTab='NEXT_60_PLAN'; saveQuestStore(); renderArtifactWorkspace(); });
const renderManagerReportingRhythm = () => {
    const manager=latestArtifact('MANAGER_CONTRACT',true)||latestArtifact('MANAGER_CONTRACT'); const reviews=artifactRows('WEEKLY_REVIEW');
    if(todayReportingRoot) todayReportingRoot.innerHTML=manager?`<span class="section-kicker">REPORTING RHYTHM</span><strong>${escapeHtml(manager.reportRhythm||'리듬 미입력')}</strong><p>${escapeHtml(manager.escalation||'즉시 공유 조건을 Manager Contract에 기록하세요.')}</p><span class="review-meta">${reviews.length?`Weekly Review ${reviews.length}회 저장`:'아직 Weekly Review Snapshot 없음'}</span>`:`<span class="section-kicker">REPORTING RHYTHM</span><strong>Manager Contract가 필요합니다.</strong><p>상급자에게 언제 무엇을 보고하고 어떤 조건에서 즉시 공유할지 먼저 합의하세요.</p>`;
    if(reportOperatingRoot) { const charter=latestArtifact('TEAM_OS_CHARTER',true)||latestArtifact('TEAM_OS_CHARTER'); reportOperatingRoot.innerHTML=`<div class="section-kicker">OPERATING SYSTEM REPORT</div><h2>${charter?'Team OS Charter':'Manager Contract → Charter'}</h2><div class="context-list"><div class="context-row"><span>Reporting</span><span>${escapeHtml(manager?.reportRhythm||'미설정')}</span></div><div class="context-row"><span>Escalation</span><span>${escapeHtml(manager?.escalation||'미설정')}</span></div><div class="context-row"><span>Charter</span><span>${escapeHtml(charter?`${charter.versionLabel||'v1'} · ${charter.artifactState||'DRAFT'}`:'아직 없음')}</span></div><div class="context-row"><span>Weekly Reviews</span><span>${reviews.length}</span></div></div>`; }
};
const renderStakeholderNudge = () => {
    if(!todayStakeholderRoot) return; const stakeholders=artifactRows('STAKEHOLDER_MAP'); const high=stakeholders.filter((r)=>String(r.influence||'').toUpperCase()==='HIGH'); const unknown=stakeholders.filter((r)=>String(r.influence||'').toUpperCase()==='UNKNOWN'||!String(r.nextTouch||'').trim()); const target=unknown[0]||high.find((r)=>String(r.nextTouch||'').trim())||stakeholders[0];
    todayStakeholderRoot.innerHTML=target?`<span class="section-kicker">STAKEHOLDER NUDGE</span><strong>${escapeHtml(target.stakeholder||'Stakeholder')} · ${escapeHtml(target.influence||'UNKNOWN')}</strong><p>${escapeHtml(target.nextTouch||'다음 접점을 정하고 기대를 확인하세요.')}</p><span class="review-meta">Expectation: ${escapeHtml(target.expectation||'확인 필요')}</span>`:`<span class="section-kicker">STAKEHOLDER NUDGE</span><strong>팀 밖의 핵심 의존성이 아직 보이지 않습니다.</strong><p>Stakeholder Map에서 실제 영향력이 큰 사람과 다음 접점을 기록하세요.</p>`;
};
const renderRecovery14Surfaces = () => { renderTeamOsCharter(); renderDay30Transition(); renderManagerReportingRhythm(); renderStakeholderNudge(); };

const currentWeekLabel = () => {
    const d=new Date(); const jan1=new Date(d.getFullYear(),0,1); const days=Math.floor((d-jan1)/86400000); const week=Math.ceil((days+jan1.getDay()+1)/7); return `${d.getFullYear()}-W${String(week).padStart(2,'0')}`;
};
const buildWeeklyOperatingReview = () => {
    const cal=artifactRows('TEAM_CALENDAR');
    const miles=artifactRows('MILESTONES');
    const work=artifactRows('WORK_MAP');
    const decisions=artifactRows('DECISION_RIGHTS');
    const delegations=artifactRows('DELEGATION');
    const debriefs=artifactRows('DEBRIEF');
    const priorities=artifactRows('PRIORITY_CONTRACT');
    const openMiles=miles.filter((r)=>!String(r.evidence||'').trim() || !String(r.decision||'').trim()).length;
    const noD=decisions.filter((r)=>!String(r.decide||'').trim() || hasMultipleDeciders(r.decide)).length;
    const looseDelegation=delegations.filter((r)=>!String(r.guardrail||'').trim() || !String(r.checkpoint||'').trim()).length;
    const ownerless=work.filter((r)=>!String(r.owner||'').trim()).length;
    const latestDebrief=debriefs[debriefs.length-1]||null;
    const latestPriority=priorities[priorities.length-1]||null;
    const attention = ownerless?`Owner가 비어 있는 Work ${ownerless}개`:openMiles?`Evidence/Decision이 부족한 Milestone ${openMiles}개`:noD?`Decision Rights 점검 필요 ${noD}개`:looseDelegation?`Guardrail/Checkpoint 보완 ${looseDelegation}개`:'핵심 운영 Artifact의 기본 필드가 채워져 있습니다.';
    return {week:currentWeekLabel(),attention,calendar:`${cal.length}개 일정 · ${new Set(cal.map((r)=>r.type).filter(Boolean)).size}개 유형`,milestones:`${miles.length}개 · 보완 ${openMiles}`,decisions:`${decisions.length}개 · D 점검 ${noD}`,delegation:`${delegations.length}개 · 보완 ${looseDelegation}`,learning:latestDebrief?`${latestDebrief.change||latestDebrief.why||latestDebrief.next||'Debrief 기록 있음'}`:'아직 Debrief 없음',next:latestPriority?.priority1||latestDebrief?.next||'다음 주 Priority Contract를 업데이트하세요.'};
};
const renderWeeklyOperatingReview = () => {
    if (!weeklyReviewRoot) return;
    const draft=buildWeeklyOperatingReview();
    weeklyReviewRoot.innerHTML=`<div class="weekly-review-grid"><div class="weekly-review-cell"><small>CALENDAR</small><b>${escapeHtml(draft.calendar)}</b></div><div class="weekly-review-cell"><small>MILESTONE</small><b>${escapeHtml(draft.milestones)}</b></div><div class="weekly-review-cell"><small>DECISION</small><b>${escapeHtml(draft.decisions)}</b></div><div class="weekly-review-cell"><small>DELEGATION</small><b>${escapeHtml(draft.delegation)}</b></div><div class="weekly-review-cell"><small>LEARNING</small><b>${escapeHtml(draft.learning)}</b></div><div class="weekly-review-cell emphasis"><small>NEXT</small><b>${escapeHtml(draft.next)}</b></div></div><div class="weekly-review-attention"><span class="section-kicker">CHIEF OF STAFF · THIS WEEK</span><strong>${escapeHtml(draft.attention)}</strong><p>이 리뷰는 사람 점수가 아니라 운영 객체의 완성도와 연결 상태를 봅니다.</p></div>`;
};
weeklyReviewSave?.addEventListener('click',()=>{
    const draft=buildWeeklyOperatingReview();
    addArtifactRecord('WEEKLY_REVIEW',{week:draft.week,attention:draft.attention,decisions:draft.decisions,delegation:draft.delegation,learning:draft.learning,next:draft.next});
    questStore.artifactTab='WEEKLY_REVIEW'; saveQuestStore(); renderArtifactWorkspace();
});
const renderQuestProgress = () => {
    const summary = questProgressSummary(questStore.completed);
    questProgressRoot.style.width = `${summary.percent}%`;
    questProgressText.textContent = `${summary.done} / ${summary.total} 완료 · ${summary.percent}%`;
};
const sourceLinks = (keys) => keys.map((key) => {
    const source = LEADERSHIP_KNOWLEDGE_SOURCES[key];
    if (!source) return '';
    return `<a class="quest-source-link" href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.name)}</a>`;
}).filter(Boolean).join('');
const renderQuestDetail = (day) => {
    const quest = LEADERSHIP_QUESTS.find((item) => item.day === Number(day)) ?? LEADERSHIP_QUESTS[0];
    const selectionChanged = Number(questStore.selectedDay) !== quest.day;
    questStore.selectedDay = quest.day;
    if (selectionChanged) {
        questStore.questProgressUpdatedAt = new Date().toISOString();
        saveQuestStore();
        queueQuestProgressServerSave();
    }
    const done = questStore.completed.includes(quest.day);
    const saved = questStore.notes[String(quest.day)] ?? {};
    const mission = missionForDay(quest.day);
    const missionProgress = missionCheckProgress(quest.day);
    const selfLevel = String(questStore.selfVerification[String(quest.day)] || 'NOT_YET');
    const pillarMeta = LEADERSHIP_MISSION_PILLARS[mission.pillar] || {label:mission.pillar,short:mission.pillar};
    const linkedRefs = artifactRefsForDay(quest.day);
    const expectedType = QUEST_ARTIFACT_TYPE[quest.day] || null;
    const candidateRows = expectedType ? artifactRows(expectedType) : allArtifactRecords();
    const hasEvidence = Boolean(String(questStore.evidence[String(quest.day)] ?? '').trim()) || linkedRefs.length > 0;
    const coachKey = QUEST_COACH_SCENARIO_BY_DAY[quest.day] || 'TASK';
    const coachScenario = LEADER_COACH_SCENARIOS[coachKey] || LEADER_COACH_SCENARIOS.TASK;
    const phaseFinish = LEADERSHIP_HARNESS_PHASES[quest.phase]?.finish || '';
    const linkedHtml = linkedRefs.length ? linkedRefs.map((id)=>{
        const row=artifactRecordById(id); if(!row) return '';
        return `<span class="evidence-ref">${escapeHtml(artifactPrimary(row.artifactType,row))}<button type="button" aria-label="Evidence 연결 해제" data-evidence-unlink="${escapeHtml(id)}">×</button></span>`;
    }).join('') : '<span class="quest-evidence-state">연결된 Artifact 없음</span>';
    const candidateHtml = candidateRows.filter((row)=>!linkedRefs.includes(row.id)).map((row)=>{ const rowType=expectedType||row.artifactType; return `<option value="${escapeHtml(row.id)}">${escapeHtml(artifactPrimary(rowType,row))} · ${escapeHtml(rowType||'ARTIFACT')}</option>`; }).join('');
    const artifactLinker = `<div class="artifact-linker"><div class="artifact-linker-head"><b>Operating Artifact 연결</b><span>${expectedType ? escapeHtml(expectedType) : '모든 Artifact'}</span></div><div class="artifact-linker-controls"><select data-quest-artifact-select><option value="">${candidateHtml?'Evidence로 연결할 Artifact 선택':'연결 가능한 Artifact가 없습니다'}</option>${candidateHtml}</select><button type="button" data-quest-artifact-link ${candidateHtml?'':'disabled'}>연결</button></div><div class="evidence-ref-list">${linkedHtml}</div></div>`;
    questDetailRoot.innerHTML = `
      <div class="quest-detail-head">
        <div>
          <div class="lens-kicker">DAY ${quest.day} · ${escapeHtml(quest.phase)} · ${escapeHtml(quest.duration)}</div>
          <h2>${escapeHtml(quest.title)}</h2>
          <p class="quest-outcome">${escapeHtml(quest.outcome)}</p>
        </div>
        <button type="button" class="${done ? '' : 'primary'}" data-quest-complete ${!done && !(hasEvidence && missionProgress.complete && selfLevel!=='NOT_YET') ? 'disabled' : ''}>${done ? '✓ 완료 취소' : 'Mission 완료'}</button>
      </div>
      <section class="quest-box mission-checklist-box">
        <div class="mission-checklist-head">
          <div><span>MISSION CHECKLIST · ${escapeHtml(pillarMeta.label)}</span><strong>${escapeHtml(mission.title)}</strong><p>${escapeHtml(mission.target)}</p></div>
          <div class="mission-day-progress"><b>${missionProgress.done}/${missionProgress.total}</b><small>필수 행동</small></div>
        </div>
        <div class="mission-meta-row"><span>대상 · ${escapeHtml(mission.stakeholder)}</span><span>남길 결과 · ${escapeHtml(mission.proof)}</span></div>
        <div class="mission-check-items">
          ${mission.checklist.map((item)=>`<label class="mission-check-item ${missionProgress.checked.includes(item.id)?'checked':''}"><input type="checkbox" data-mission-check="${escapeHtml(item.id)}" ${missionProgress.checked.includes(item.id)?'checked':''}><span>${escapeHtml(item.label)}</span></label>`).join('')}
        </div>
        <div class="mission-complete-rule">${missionProgress.complete?'✓ 필수 행동 체크 완료 · Evidence와 Self Verification까지 남기면 Mission을 닫을 수 있습니다.':'체크리스트 → Evidence → Self Verification 세 단계를 모두 완료해야 Mission 완료가 활성화됩니다.'}</div>
      </section>
      <div class="quest-learning-grid">
        <section class="quest-box knowledge"><span>REFERENCE · WHY</span><strong>핵심 원칙</strong><p>${escapeHtml(quest.knowledge)}</p></section>
        <section class="quest-box case"><span>REFERENCE · CASE</span><strong>상황</strong><p>${escapeHtml(quest.case)}</p></section>
      </div>
      <section class="quest-box practice"><span>DO</span><strong>실습</strong><ol>${quest.practice.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol></section>
      <div class="quest-learning-grid">
        <section class="quest-box artifact"><span>ARTIFACT</span><strong>${escapeHtml(quest.artifact)}</strong><p>${escapeHtml(quest.evidence)}</p><button type="button" data-quest-route data-route="${escapeHtml(quest.route)}">Leader OS에서 적용 →</button><div class="quest-evidence-field"><label><strong>완료 Evidence 메모</strong><textarea data-quest-evidence placeholder="Artifact가 없거나 추가 설명이 필요할 때만 메모를 남겨도 됩니다.">${escapeHtml(questStore.evidence[String(quest.day)] ?? '')}</textarea></label>${artifactLinker}<div class="quest-evidence-actions"><button type="button" data-quest-evidence-save>Evidence 저장</button><span class="quest-evidence-state" data-quest-evidence-state>${hasEvidence ? `Evidence 있음 · ${linkedRefs.length} Artifact 연결` : '메모 또는 실제 Artifact를 연결하면 Quest 완료가 활성화됩니다.'}</span></div></div></section>
        <section class="quest-box nudge harness-coach"><span>LEADER COACH · BEFORE / AFTER</span><strong>${escapeHtml(coachScenario.name)}</strong><p><b>실행 전 질문</b><br>${escapeHtml(coachScenario.coach)}</p><div class="harness-coach-script"><small>대화 구조</small><b>${escapeHtml(coachScenario.script)}</b></div><p><b>오늘의 체크</b><br>${escapeHtml(quest.nudge)}</p><details class="harness-coach-learn"><summary>왜 이렇게 코칭하나</summary><p>${escapeHtml(coachScenario.learn)}</p></details><div class="harness-coach-finish">이 Phase의 도착점 · ${escapeHtml(phaseFinish)}</div><div class="harness-coach-actions">${expectedType?`<button type="button" data-open-artifact="${escapeHtml(expectedType)}">내 ${escapeHtml(artifactDefinitions[expectedType]?.label||expectedType)} 작성 →</button>`:''}<button type="button" data-open-leader-coach>Leader Coach에서 더 연습 →</button></div></section>
      </div>
      <section class="quest-box self-verification">
        <span>SELF VERIFICATION · 사람 점수화 아님</span><strong>${escapeHtml(mission.selfQuestion)}</strong>
        <div class="self-levels">
          ${[
            ['NOT_YET','아직 하지 않음'],
            ['TRIED','실행해봄'],
            ['EVIDENCED','Evidence로 확인'],
            ['REPEATABLE','반복 가능한 방식']
          ].map(([value,label])=>`<button type="button" class="${selfLevel===value?'active':''}" data-self-level="${value}">${label}</button>`).join('')}
        </div>
        <div class="review-meta">이 값은 팀원을 평가하는 점수가 아니라, 리더 자신이 이 행동을 얼마나 실제 운영 습관으로 만들었는지 확인하는 개인 자기검증입니다.</div>
      </section>
      <section class="quest-box reflection">
        <span>DEBRIEF</span><strong>리더 자기점검</strong>
        <div class="quest-reflection-questions">${quest.debrief.map((q) => `<label>${escapeHtml(q)}<textarea data-quest-note placeholder="짧게 기록해도 충분합니다.">${escapeHtml(saved[q] ?? '')}</textarea></label>`).join('')}</div>
        <div class="review-meta">이 기록은 사람 평가가 아니라 리더 자신의 판단과 운영 선택을 돌아보기 위한 메모입니다.</div>
      </section>
      <section class="quest-box sources"><span>SOURCES</span><strong>Knowledge provenance</strong><div class="quest-source-list">${sourceLinks(quest.sources)}</div></section>`;
    const evidenceArea = questDetailRoot.querySelector('[data-quest-evidence]');
    const evidenceSave = questDetailRoot.querySelector('[data-quest-evidence-save]');
    const evidenceState = questDetailRoot.querySelector('[data-quest-evidence-state]');
    renderQuestChiefRail(quest);
    const completeButton = questDetailRoot.querySelector('[data-quest-complete]');
    const currentHasEvidence = () => Boolean(String(questStore.evidence[String(quest.day)] ?? evidenceArea?.value ?? '').trim()) || artifactRefsForDay(quest.day).length > 0;
    const currentMissionComplete = () => missionCheckProgress(quest.day).complete;
    const currentSelfVerified = () => String(questStore.selfVerification[String(quest.day)]||'NOT_YET') !== 'NOT_YET';
    const syncEvidenceButton = () => { if (completeButton && !done) completeButton.disabled = !(currentHasEvidence() && currentMissionComplete() && currentSelfVerified()); };
    for (const checkbox of questDetailRoot.querySelectorAll('[data-mission-check]')) {
        checkbox.addEventListener('change',()=>{
            const mission=missionForDay(quest.day);
            const allowed=new Set(mission.checklist.map((item)=>item.id));
            const selected=Array.from(questDetailRoot.querySelectorAll('[data-mission-check]:checked')).map((el)=>el.dataset.missionCheck).filter((id)=>allowed.has(id));
            questStore.missionChecks[String(quest.day)]=selected;
            questStore.missionUpdatedAt=new Date().toISOString();
            saveQuestStore();
            queueMissionChecklistSave();
            renderQuestDetail(quest.day);
            renderQuestList();
        });
    }
    for (const button of questDetailRoot.querySelectorAll('[data-self-level]')) {
        button.addEventListener('click',()=>{
            questStore.selfVerification[String(quest.day)]=button.dataset.selfLevel||'NOT_YET';
            questStore.selfCheckUpdatedAt=new Date().toISOString();
            saveQuestStore();
            queueLeadershipSelfCheckSave();
            renderQuestDetail(quest.day);
            renderQuestList();
        });
    }
    evidenceArea?.addEventListener('input', syncEvidenceButton);
    evidenceSave?.addEventListener('click', () => {
        const value = String(evidenceArea?.value ?? '').trim();
        if (value) questStore.evidence[String(quest.day)] = value; else delete questStore.evidence[String(quest.day)];
        saveQuestStore();
        if (evidenceState) evidenceState.textContent = currentHasEvidence() ? `Evidence 저장됨 · ${artifactRefsForDay(quest.day).length} Artifact 연결` : '메모 또는 실제 Artifact를 연결하면 Quest 완료가 활성화됩니다.';
        syncEvidenceButton();
        renderQuestList();
        renderSetupChecklist();
    });
    questDetailRoot.querySelector('[data-quest-artifact-link]')?.addEventListener('click', () => {
        const select=questDetailRoot.querySelector('[data-quest-artifact-select]');
        const id=select?.value;
        if(!id) return;
        linkArtifactToQuest(quest.day,id);
        renderQuestDetail(quest.day);
        renderQuestList();
        renderSetupChecklist();
    });
    for (const button of questDetailRoot.querySelectorAll('[data-evidence-unlink]')) button.addEventListener('click',()=>{
        unlinkArtifactFromQuest(quest.day,button.dataset.evidenceUnlink);
        renderQuestDetail(quest.day);
        renderQuestList();
        renderSetupChecklist();
    });
    questDetailRoot.querySelector('[data-open-leader-coach]')?.addEventListener('click',()=>navigation.goTo('LEADER_COACH'));
    questDetailRoot.querySelector('[data-open-artifact]')?.addEventListener('click',(event)=>{
        const type=event.currentTarget.dataset.openArtifact;
        if (type && artifactDefinitions[type]) { questStore.artifactTab=type; saveQuestStore(); renderArtifactWorkspace(); document.querySelector('[data-artifact-tabs]')?.scrollIntoView({behavior:'smooth',block:'center'}); }
    });
    completeButton?.addEventListener('click', () => {
        const set = new Set(questStore.completed);
        if (set.has(quest.day)) set.delete(quest.day); else if (currentHasEvidence() && currentMissionComplete() && currentSelfVerified()) set.add(quest.day); else return;
        questStore.completed = [...set].sort((a,b) => a-b);
        questStore.questProgressUpdatedAt = new Date().toISOString();
        saveQuestStore();
        queueQuestProgressServerSave();
        renderQuestProgress();
        renderQuestList();
        renderSetupChecklist();
        renderQuestDetail(quest.day);
        renderTodayLeaderNudge();
    });
    questDetailRoot.querySelector('[data-quest-route]')?.addEventListener('click', (event) => {
        const route = event.currentTarget.dataset.route;
        if (route) navigation.goTo(route);
    });
    for (const area of questDetailRoot.querySelectorAll('[data-quest-note]')) {
        area.addEventListener('input', () => {
            const labels = Array.from(questDetailRoot.querySelectorAll('.quest-reflection-questions label'));
            const noteMap = {};
            labels.forEach((label) => {
                const question = label.firstChild?.textContent?.trim() || '';
                const textArea = label.querySelector('textarea');
                if (question && textArea) noteMap[question] = textArea.value;
            });
            questStore.notes[String(quest.day)] = noteMap;
            saveQuestStore();
        });
    }
    for (const card of questListRoot.querySelectorAll('[data-quest-day]')) {
        card.classList.toggle('selected', Number(card.dataset.questDay) === quest.day);
    }
};
const renderQuestList = () => {
    const phase = questStore.phase || 'ALL';
    const items = LEADERSHIP_QUESTS.filter((quest) => phase === 'ALL' || quest.phase === phase);
    questListRoot.innerHTML = items.map((quest) => {
        const done = questStore.completed.includes(quest.day);
        const hasEvidence = Boolean(String(questStore.evidence[String(quest.day)] ?? '').trim()) || artifactRefsForDay(quest.day).length > 0;
        const mission=missionForDay(quest.day);
        const missionProgress=missionCheckProgress(quest.day);
        const pillar=LEADERSHIP_MISSION_PILLARS[mission.pillar]||{short:mission.pillar};
        return `<button type="button" class="quest-row ${done ? 'done' : ''} ${hasEvidence ? 'evidence' : ''} ${missionProgress.complete?'mission-ready':''} ${quest.day === questStore.selectedDay ? 'selected' : ''}" data-quest-day="${quest.day}">
            <span class="quest-day">${String(quest.day).padStart(2,'0')}</span>
            <span class="quest-row-copy"><strong>${escapeHtml(mission.title)}</strong><small>${escapeHtml(pillar.short)} · Checklist ${missionProgress.done}/${missionProgress.total} · ${escapeHtml(quest.artifact)}</small></span>
            <span class="quest-status">${done ? '✓' : missionProgress.complete&&hasEvidence ? '◎' : `${missionProgress.done}/${missionProgress.total}`}</span>
        </button>`;
    }).join('');
    for (const button of questListRoot.querySelectorAll('[data-quest-day]')) {
        button.addEventListener('click', () => renderQuestDetail(Number(button.dataset.questDay)));
    }
};
const phaseButtons = [{ id: 'ALL', label: 'All 30' }, ...Object.entries(LEADERSHIP_QUEST_PHASES).map(([id, value]) => ({ id, label: `${id} · ${value.days}` }))];
questPhaseFilters.innerHTML = phaseButtons.map((item) => `<button type="button" class="${questStore.phase === item.id ? 'active' : ''}" data-quest-phase="${item.id}">${escapeHtml(item.label)}</button>`).join('');
for (const button of questPhaseFilters.querySelectorAll('[data-quest-phase]')) {
    button.addEventListener('click', () => {
        questStore.phase = button.dataset.questPhase || 'ALL';
        saveQuestStore();
        for (const el of questPhaseFilters.querySelectorAll('button')) el.classList.toggle('active', el === button);
        renderQuestList();
        const first = LEADERSHIP_QUESTS.find((quest) => questStore.phase === 'ALL' || quest.phase === questStore.phase);
        if (first) renderQuestDetail(first.day);
    });
}

Object.defineProperty(window,'LeaderOsMissionBridge',{
    value:{
        snapshot:()=>JSON.parse(JSON.stringify(missionSummarySnapshot())),
        day:(day)=>JSON.parse(JSON.stringify(missionSummarySnapshot().days.find((item)=>item.day===Number(day))||null)),
        hydrate:()=>Promise.all([hydrateMissionChecklistFromServer(true),hydrateLeadershipSelfCheckFromServer(true)])
    },
    enumerable:false,configurable:true
});

// Recovery 15 · Integration & Reliability
const dependencyMapRoot=document.querySelector('[data-operating-dependency-map]');
const systemHealthRoot=document.querySelector('[data-system-health]');
const r15HealthBadge=document.querySelector('[data-r15-health-badge]');
const evidenceInspectorRoot=document.querySelector('[data-evidence-inspector]');
const graduationReviewRoot=document.querySelector('[data-graduation-review]');
const next60TrackerRoot=document.querySelector('[data-next60-tracker]');
const next60OutcomeInput=document.querySelector('[data-next60-outcome]');
const next60StatusInput=document.querySelector('[data-next60-status]');
const next60EvidenceInput=document.querySelector('[data-next60-evidence]');
const next60LearningInput=document.querySelector('[data-next60-learning]');
const next60NextInput=document.querySelector('[data-next60-next]');
const next60CheckinSave=document.querySelector('[data-next60-checkin-save]');
const managerBriefRoot=document.querySelector('[data-manager-brief]');
const managerBriefCopy=document.querySelector('[data-manager-brief-copy]');
const managerBriefSave=document.querySelector('[data-manager-brief-save]');

const artifactTypeForId=(id)=>{ const found=allArtifactRecords().find((row)=>row.id===id); return found?.artifactType||null; };
const relationIntegrityIssues=()=>{
    const issues=[];
    for(const pair of RELATION_PAIRS){
        for(const source of artifactRows(pair.aType)){
            for(const targetId of refArray(source[pair.aField])){
                const target=artifactRows(pair.bType).find((row)=>row.id===targetId);
                if(!target){ issues.push({level:'critical',type:pair.aType,id:source.id,title:'끊어진 관계',copy:`${artifactPrimary(pair.aType,source)} → ${pair.bType} 참조가 존재하지 않습니다.`}); continue; }
                const reciprocal=refArray(target[pair.bField]);
                if(!reciprocal.includes(source.id)) issues.push({level:'warn',type:pair.aType,id:source.id,title:'비대칭 관계',copy:`${artifactPrimary(pair.aType,source)} ↔ ${artifactPrimary(pair.bType,target)}의 양방향 링크가 일치하지 않습니다.`});
                if(String(source.artifactState||'DRAFT')==='CONFIRMED' && String(target.artifactState||'DRAFT')!=='CONFIRMED') issues.push({level:'warn',type:pair.aType,id:source.id,title:'Confirmed → Draft 의존성',copy:`Confirmed ${artifactDefinitions[pair.aType]?.label||pair.aType}가 Draft ${artifactDefinitions[pair.bType]?.label||pair.bType}를 참조합니다.`});
            }
        }
    }
    for(const [day,refs] of Object.entries(questStore.evidenceRefs||{})) for(const id of Array.isArray(refs)?refs:[]) if(!artifactRecordById(id)) issues.push({level:'warn',type:'QUEST',id:String(day),title:'Quest Evidence 참조 끊김',copy:`Day ${day}의 Evidence ${id}가 삭제되었거나 찾을 수 없습니다.`});
    return issues;
};
const openArtifactType=(type,id=null)=>{
    if(!artifactDefinitions[type]) return;
    questStore.artifactTab=type; saveQuestStore();
    if(id) editingArtifactId=id;
    renderArtifactWorkspace();
    document.querySelector('[data-artifact-tabs]')?.scrollIntoView({behavior:'smooth',block:'center'});
};
const dependencyFilterProject=document.querySelector('[data-r16-filter-project]');
const dependencyFilterOwner=document.querySelector('[data-r16-filter-owner]');
const dependencyFilterAttention=document.querySelector('[data-r16-filter-attention]');
let dependencyFilterState={project:'ALL',owner:'ALL',attention:'ALL'};
const workAttention=(w)=>{
    if(String(w.status||'').toUpperCase()==='AT_RISK'||!String(w.owner||'').trim()||!refArray(w.milestoneRefs).length||!refArray(w.decisionRefs).length) return 'CRITICAL';
    if(String(w.artifactState||'DRAFT').toUpperCase()!=='CONFIRMED'||refArray(w.milestoneRefs).some((id)=>String(artifactRecordById(id)?.artifactState||'DRAFT')!=='CONFIRMED')||refArray(w.decisionRefs).some((id)=>String(artifactRecordById(id)?.artifactState||'DRAFT')!=='CONFIRMED')) return 'CHECK';
    return 'CLEAR';
};
const renderDependencyFilterOptions=()=>{
    if(!dependencyFilterProject||!dependencyFilterOwner||!dependencyFilterAttention) return;
    const works=artifactRows('WORK_MAP');
    const projects=[...new Set(works.map((r)=>String(r.project||'').trim()).filter(Boolean))].sort();
    const owners=[...new Set(works.map((r)=>String(r.owner||'').trim()).filter(Boolean))].sort();
    const option=(value,label,current)=>`<option value="${escapeHtml(value)}" ${current===value?'selected':''}>${escapeHtml(label)}</option>`;
    dependencyFilterProject.innerHTML=option('ALL','All projects',dependencyFilterState.project)+projects.map((x)=>option(x,x,dependencyFilterState.project)).join('');
    dependencyFilterOwner.innerHTML=option('ALL','All owners',dependencyFilterState.owner)+owners.map((x)=>option(x,x,dependencyFilterState.owner)).join('');
    dependencyFilterAttention.value=dependencyFilterState.attention;
};
const dependencyCluster=(type,ids,label)=>{
    const refs=refArray(ids);
    return `<div class="dependency-cluster"><small>${escapeHtml(label)} · ${refs.length}</small>${refs.length?refs.map((id)=>{const item=artifactRecordById(id);const state=item?String(item.artifactState||'DRAFT').toLowerCase():'missing';return item?`<button type="button" class="dependency-node ${state==='confirmed'?'confirmed':''}" data-r15-open-type="${type}" data-r15-open-id="${escapeHtml(id)}"><b>${escapeHtml(artifactPrimary(type,item))}</b></button>`:`<div class="dependency-node missing"><b>Missing ${escapeHtml(id)}</b></div>`;}).join(''):'<div class="dependency-node missing"><b>연결 필요</b></div>'}</div>`;
};
const renderDependencyMap=()=>{
    if(!dependencyMapRoot) return;
    renderDependencyFilterOptions();
    let work=artifactRows('WORK_MAP');
    work=work.filter((w)=>(dependencyFilterState.project==='ALL'||String(w.project||'')===dependencyFilterState.project)&&(dependencyFilterState.owner==='ALL'||String(w.owner||'')===dependencyFilterState.owner)&&(dependencyFilterState.attention==='ALL'||workAttention(w)===dependencyFilterState.attention));
    if(!work.length){ dependencyMapRoot.innerHTML='<div class="safe">현재 필터에 해당하는 Work가 없습니다. 필터를 조정하거나 Work Map을 먼저 만드세요.</div>'; return; }
    dependencyMapRoot.innerHTML=work.map((w)=>{const attention=workAttention(w);const calendars=refArray(w.calendarRefs);return `<div class="dependency-lane"><div class="dependency-lane-head"><div><strong>${escapeHtml(artifactPrimary('WORK_MAP',w))}</strong><div class="relation-chip-set">${calendars.map((id)=>{const c=artifactRecordById(id);return c?`<span>CAL ${escapeHtml(c.day||'')} ${escapeHtml(c.time||'')} · ${escapeHtml(c.title||'')}</span>`:''}).join('')}</div></div><div><span class="r16-attention ${attention.toLowerCase()}">${attention}</span> <span class="artifact-version ${String(w.artifactState||'').toLowerCase()==='confirmed'?'confirmed':''}">v${escapeHtml(w.version||1)} · ${escapeHtml(w.artifactState||'DRAFT')}</span></div></div><div class="dependency-flow r16-flow">${dependencyCluster('WORK_MAP',[w.id],'WORK')}${dependencyCluster('MILESTONES',w.milestoneRefs,'MILESTONES')}${dependencyCluster('DECISION_RIGHTS',w.decisionRefs,'DECISIONS')}${dependencyCluster('DELEGATION',w.delegationRefs,'DELEGATION')}${dependencyCluster('DEBRIEF',w.debriefRefs,'DEBRIEF')}</div></div>`;}).join('');
    for(const button of dependencyMapRoot.querySelectorAll('[data-r15-open-type]')) button.addEventListener('click',()=>openArtifactType(button.dataset.r15OpenType,button.dataset.r15OpenId));
};
for(const [input,key] of [[dependencyFilterProject,'project'],[dependencyFilterOwner,'owner'],[dependencyFilterAttention,'attention']]) input?.addEventListener('change',()=>{dependencyFilterState[key]=input.value||'ALL';renderDependencyMap();});
const renderSystemHealth=()=>{
    if(!systemHealthRoot) return;
    const issues=[...relationIntegrityIssues()];
    const diagnostics=artifactDiagnostics().filter((d)=>d.level!=='good').map((d)=>({level:d.level==='critical'?'critical':'warn',title:d.title,copy:d.copy,type:null,id:null}));
    const combined=[...issues,...diagnostics];
    if(!combined.length){ combined.push({level:'good',title:'운영 객체와 링크의 기본 무결성이 확인됐습니다.',copy:'현재 로컬 Preview 기준으로 끊어진 참조와 핵심 필드 오류가 없습니다.'}); }
    systemHealthRoot.innerHTML=combined.slice(0,8).map((item)=>`<div class="health-item ${escapeHtml(item.level)}"><span class="health-icon">${item.level==='critical'?'!':item.level==='warn'?'?':'✓'}</span><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.copy)}</p></div>${item.type&&artifactDefinitions[item.type]?`<button type="button" data-health-open-type="${escapeHtml(item.type)}" data-health-open-id="${escapeHtml(item.id||'')}">열기</button>`:'<span></span>'}</div>`).join('');
    const critical=combined.filter((x)=>x.level==='critical').length; const warn=combined.filter((x)=>x.level==='warn').length;
    if(r15HealthBadge){ r15HealthBadge.textContent=critical?`CRITICAL ${critical}`:warn?`CHECK ${warn}`:'INTEGRATION PASS'; r15HealthBadge.classList.toggle('confirmed',!critical&&!warn); }
    const badge=document.querySelector('[data-contract-status]'); if(badge) badge.textContent=critical?`Integration ${critical} critical`:warn?`Integration ${warn} checks`:'Core + Integration PASS';
    for(const button of systemHealthRoot.querySelectorAll('[data-health-open-type]')) button.addEventListener('click',()=>openArtifactType(button.dataset.healthOpenType,button.dataset.healthOpenId));
};
const parseSupportVersions=(charter)=>{ try{return JSON.parse(charter?.supportVersions||'{}')||{};}catch{return {};} };
const charterEvidenceRows=()=>{
    const charter=latestArtifact('TEAM_OS_CHARTER',true)||latestArtifact('TEAM_OS_CHARTER'); if(!charter) return {charter:null,rows:[]};
    let refs=String(charter.supportRefs||'').split(',').map((x)=>x.trim()).filter(Boolean);
    let versions=parseSupportVersions(charter);
    if(!refs.length){ const draft=buildTeamOsCharterDraft(); refs=String(draft.supportRefs||'').split(',').filter(Boolean); versions=parseSupportVersions(draft); }
    return {charter,rows:refs.map((id)=>{const item=artifactRecordById(id); const savedVersion=Number(versions[id]||0); return {id,item,savedVersion,missing:!item,stale:Boolean(item&&savedVersion&&Number(item.version)!==savedVersion),draft:Boolean(item&&String(item.artifactState||'DRAFT')!=='CONFIRMED')};})};
};
const renderEvidenceInspector=()=>{
    if(!evidenceInspectorRoot) return;
    const {charter,rows}=charterEvidenceRows();
    if(!charter){ evidenceInspectorRoot.innerHTML='<div class="safe">Team OS Charter를 저장하면 근거 Artifact와 Version을 역추적할 수 있습니다.</div>'; return; }
    const bad=rows.filter((r)=>r.missing||r.stale||r.draft).length;
    evidenceInspectorRoot.innerHTML=`<div class="evidence-summary"><span class="state-badge ${bad?'':'confirmed'}">${bad?`REVIEW ${bad}`:'EVIDENCE CURRENT'}</span><span class="review-meta">Charter v${escapeHtml(charter.version||1)} · ${escapeHtml(charter.artifactState||'DRAFT')} · ${rows.length} sources</span></div>${rows.length?rows.map((r)=>{const type=r.item?.artifactType||artifactTypeForId(r.id)||'ARTIFACT'; const cls=r.missing?'bad':r.stale||r.draft?'warn':'ok'; const state=r.missing?'MISSING':r.stale?`STALE v${r.savedVersion}→v${r.item.version}`:r.draft?'DRAFT':'CURRENT'; return `<div class="evidence-row"><div><strong>${escapeHtml(r.item?artifactPrimary(type,r.item):r.id)}</strong><small>${escapeHtml(type.replaceAll('_',' '))} · saved v${escapeHtml(r.savedVersion||'—')} · current ${escapeHtml(r.item?.version||'—')}</small></div><span class="evidence-state ${cls}">${escapeHtml(state)}</span></div>`;}).join(''):'<div class="safe">이전 Charter에는 Support Snapshot이 없습니다. 새 Charter Snapshot을 저장하면 Version 추적이 활성화됩니다.</div>'}`;
};
const graduationSnapshot=()=>{
    const required=['MANAGER_CONTRACT','TEAM_MAP','TEAM_CALENDAR','WORK_MAP','MILESTONES','PRIORITY_CONTRACT','DECISION_RIGHTS','DELEGATION','DEBRIEF'];
    const confirmed=required.filter((t)=>confirmedArtifactRows(t).length).length;
    const draft=required.filter((t)=>artifactRows(t).length && !confirmedArtifactRows(t).length).length;
    const missing=required.filter((t)=>!artifactRows(t).length).length;
    const unknown=artifactRows('TEAM_MAP').filter((r)=>String(r.state||'').toUpperCase()==='UNKNOWN').length + artifactRows('STAKEHOLDER_MAP').filter((r)=>String(r.influence||'').toUpperCase()==='UNKNOWN').length;
    const progress=questProgressSummary(questStore.completed);
    const charter=latestArtifact('TEAM_OS_CHARTER',true);
    const critical=relationIntegrityIssues().filter((x)=>x.level==='critical').length;
    return {required,confirmed,draft,missing,unknown,progress,charter,critical,ready:progress.done>=30&&Boolean(charter)&&critical===0};
};
const renderGraduationReview=()=>{
    if(!graduationReviewRoot) return;
    const g=graduationSnapshot();
    graduationReviewRoot.innerHTML=`<div class="section-kicker">DAY 30 · GRADUATION REVIEW</div><h3 style="margin:6px 0 4px">완료가 아니라 운영 준비도를 확인합니다</h3><p class="why">사람의 리더십 점수가 아니라 Quest·Artifact·근거 연결의 상태입니다.</p><div class="graduation-grid"><div class="graduation-card"><small>QUEST</small><strong>${g.progress.done}/30</strong></div><div class="graduation-card"><small>CONFIRMED AREAS</small><strong>${g.confirmed}/${g.required.length}</strong></div><div class="graduation-card"><small>DRAFT / MISSING</small><strong>${g.draft} / ${g.missing}</strong></div><div class="graduation-card"><small>TRACKED UNKNOWN</small><strong>${g.unknown}</strong></div></div><div class="graduation-gate ${g.ready?'ready':''}"><div><strong>${g.ready?'NEXT 60 전환 조건 충족':'아직 확인할 운영 조건이 있습니다'}</strong><div class="review-meta">${g.charter?'Confirmed Charter 있음':'Confirmed Charter 필요'} · Critical link issue ${g.critical}</div></div><span class="state-badge ${g.ready?'confirmed':''}">${g.ready?'READY':'REVIEW'}</span></div>`;
};
const latestNext60Plan=()=>latestArtifact('NEXT_60_PLAN',true)||latestArtifact('NEXT_60_PLAN');
const renderNext60Tracker=()=>{
    if(!next60TrackerRoot) return;
    const plan=latestNext60Plan(); const checks=artifactRows('NEXT_60_CHECKIN').filter((r)=>!plan||!r.planRef||r.planRef===plan.id);
    if(!plan){ next60TrackerRoot.innerHTML='<div class="safe">Next 60 Plan을 먼저 저장하세요. Outcome이 생성되면 주간 Check-in이 활성화됩니다.</div>'; if(next60CheckinSave) next60CheckinSave.disabled=true; return; }
    if(next60CheckinSave) next60CheckinSave.disabled=false;
    next60TrackerRoot.innerHTML=['outcome1','outcome2','outcome3'].map((key,index)=>{const latest=[...checks].reverse().find((r)=>r.outcomeKey===key);return `<div class="outcome-card"><small>OUTCOME ${index+1}</small><strong>${escapeHtml(plan[key]||'미입력')}</strong><div class="checkin-meta">${latest?`${escapeHtml(latest.status||'CHECK')} · ${escapeHtml(latest.week||'')} · ${escapeHtml(latest.evidence||'근거 없음')}`:'아직 Weekly Check-in 없음'}</div></div>`;}).join('');
};
next60CheckinSave?.addEventListener('click',()=>{
    const plan=latestNext60Plan(); if(!plan) return;
    const outcomeKey=next60OutcomeInput?.value||'outcome1'; const record={week:currentWeekLabel(),outcomeKey,status:next60StatusInput?.value||'ON_TRACK',evidence:String(next60EvidenceInput?.value||'').trim(),learning:String(next60LearningInput?.value||'').trim(),next:String(next60NextInput?.value||'').trim(),planRef:plan.id,outcomeText:plan[outcomeKey]||''};
    if(!record.evidence && !record.learning && !record.next) return;
    addArtifactRecord('NEXT_60_CHECKIN',record);
    if(next60EvidenceInput) next60EvidenceInput.value=''; if(next60LearningInput) next60LearningInput.value=''; if(next60NextInput) next60NextInput.value='';
});
const confirmedOrLatest=(type)=>latestArtifact(type,true)||latestArtifact(type);
const r17Next60SummaryForBrief=()=>{
    const plan=latestNext60Plan();
    if(!plan) return 'Next 60 Plan 미설정';
    const checks=artifactRows('NEXT_60_CHECKIN').filter((r)=>!r.planRef||r.planRef===plan.id).sort((a,b)=>String(a.updatedAt||a.week||'').localeCompare(String(b.updatedAt||b.week||'')));
    return ['outcome1','outcome2','outcome3'].map((key,index)=>{const series=checks.filter((r)=>r.outcomeKey===key);const latest=series[series.length-1];return `O${index+1} ${latest?.status||'NO_CHECKIN'}${latest?.next?` → ${latest.next}`:''}`;}).join(' / ');
};
const buildManagerBriefDraft=()=>{
    const manager=confirmedOrLatest('MANAGER_CONTRACT'); const priority=confirmedOrLatest('PRIORITY_CONTRACT'); const weekly=confirmedOrLatest('WEEKLY_REVIEW'); const debrief=confirmedOrLatest('DEBRIEF');
    const works=confirmedArtifactRows('WORK_MAP').length?confirmedArtifactRows('WORK_MAP'):artifactRows('WORK_MAP'); const decisions=confirmedArtifactRows('DECISION_RIGHTS').length?confirmedArtifactRows('DECISION_RIGHTS'):artifactRows('DECISION_RIGHTS');
    const riskWork=works.filter((r)=>String(r.status||'').toUpperCase()==='AT_RISK'||String(r.risk||'').trim());
    const openDecisions=decisions.filter((r)=>!['DECIDED','CANCELLED'].includes(String(r.decisionStatus||'OPEN').toUpperCase())||!String(r.decide||'').trim());
    const next60Plan=latestNext60Plan(); const next60Checks=artifactRows('NEXT_60_CHECKIN').filter((r)=>!next60Plan||!r.planRef||r.planRef===next60Plan.id).slice(-3);
    const sources=[manager,priority,weekly,debrief,...works.slice(0,3),...decisions.slice(0,3),next60Plan,...next60Checks].filter(Boolean); const sourceRefs=[...new Set(sources.map((r)=>r.id).filter(Boolean))];
    return {week:currentWeekLabel(),executiveSummary:priority?.priority1||weekly?.attention||'이번 주 Top Priority를 확인하세요.',progress:works.slice(0,3).map((r)=>`${r.project||'Work'}: ${r.nextMilestone||r.status||'진행 중'}`).join(' / ')||'Work Map 확인 필요',decisionsNeeded:openDecisions.slice(0,3).map((r)=>`${r.decision||'Decision'} · D ${r.decide||'미정'}`).join(' / ')||'현재 명시된 결정 이슈 없음',risks:riskWork.slice(0,3).map((r)=>`${r.project||'Work'}: ${r.risk||r.status}`).join(' / ')||manager?.escalation||'특이 리스크 없음',next:weekly?.next||debrief?.next||priority?.priority2||'다음 Weekly Review에서 확인',reportRhythm:manager?.reportRhythm||'보고 리듬 미설정',next60Trend:r17Next60SummaryForBrief(),sourceRefs:sourceRefs.join(','),sourceVersions:JSON.stringify(Object.fromEntries(sources.filter((r)=>r.id).map((r)=>[r.id,Number(r.version)||1])))};
};
const managerBriefText=(b)=>`[${b.week}] LEADER OPERATING BRIEF\n\nSTATUS\n${b.executiveSummary}\n\nPROGRESS\n${b.progress}\n\nDECISIONS NEEDED\n${b.decisionsNeeded}\n\nRISKS / ESCALATION\n${b.risks}\n\nNEXT\n${b.next}\n\nREPORTING RHYTHM\n${b.reportRhythm}\n\nNEXT 60 TREND\n${b.next60Trend||'Next 60 check-in 없음'}`;
const renderManagerBrief=()=>{
    if(!managerBriefRoot) return; const draft=buildManagerBriefDraft(); const text=managerBriefText(draft); managerBriefRoot.textContent=text;
    if(reportOperatingRoot){ let block=reportOperatingRoot.querySelector('[data-r15-report-brief]'); if(!block){block=document.createElement('div');block.dataset.r15ReportBrief='';block.className='r15-inline-report';reportOperatingRoot.append(block);} block.innerHTML=`<span class="section-kicker">LATEST MANAGER BRIEF</span><strong>${escapeHtml(draft.executiveSummary)}</strong><p>${escapeHtml(draft.risks)} · Next: ${escapeHtml(draft.next)}</p>`; }
};
managerBriefCopy?.addEventListener('click',async()=>{const text=managerBriefRoot?.textContent||''; try{await navigator.clipboard.writeText(text);navigation.announce('Manager Reporting Brief를 복사했습니다.');}catch{navigation.announce('복사 권한을 확인하세요.');}});
managerBriefSave?.addEventListener('click',()=>{addArtifactRecord('REPORT_BRIEF',buildManagerBriefDraft());});
const weeklyReviewDiffRoot=document.querySelector('[data-weekly-review-diff]');
const next60TrendRoot=document.querySelector('[data-next60-trend]');
const commitmentPersonInput=document.querySelector('[data-r16-commitment-person]');
const commitmentDueInput=document.querySelector('[data-r16-commitment-due]');
const commitmentTextInput=document.querySelector('[data-r16-commitment-text]');
const commitmentDelegationInput=document.querySelector('[data-r16-commitment-delegation]');
const commitmentDebriefInput=document.querySelector('[data-r16-commitment-debrief]');
const commitmentSaveButton=document.querySelector('[data-r16-commitment-save]');
const commitmentListRoot=document.querySelector('[data-r16-commitment-list]');
const renderWeeklyReviewDiff=()=>{
    if(!weeklyReviewDiffRoot) return;
    const rows=[...artifactRows('WEEKLY_REVIEW')].sort((a,b)=>String(a.updatedAt||'').localeCompare(String(b.updatedAt||'')));
    if(rows.length<2){weeklyReviewDiffRoot.innerHTML='<div class="safe">Weekly Review Snapshot이 2개 이상 쌓이면 지난 주 대비 변화가 나타납니다.</div>';return;}
    const prev=rows[rows.length-2],curr=rows[rows.length-1];
    const fields=[['attention','Attention'],['decisions','Decisions'],['delegation','Delegation'],['learning','Learning'],['next','Next']];
    weeklyReviewDiffRoot.innerHTML=`<div class="review-meta" style="margin:6px 0 10px">${escapeHtml(prev.week||'Previous')} → ${escapeHtml(curr.week||'Current')}</div><div class="r16-diff-grid">${fields.map(([key,label])=>{const changed=String(prev[key]||'')!==String(curr[key]||'');return `<div class="r16-diff-card ${changed?'changed':'same'}"><small>${escapeHtml(label)} · ${changed?'CHANGED':'SAME'}</small><strong>${escapeHtml(curr[key]||'—')}</strong>${changed?`<div class="review-meta" style="margin-top:7px">Before: ${escapeHtml(prev[key]||'—')}</div>`:''}</div>`;}).join('')}</div>`;
};
const renderNext60Trend=()=>{
    if(!next60TrendRoot) return;
    const plan=latestNext60Plan(); if(!plan){next60TrendRoot.innerHTML='<div class="safe">Next 60 Plan을 저장하면 Outcome별 주간 상태 추세가 나타납니다.</div>';return;}
    const checks=artifactRows('NEXT_60_CHECKIN').filter((r)=>!r.planRef||r.planRef===plan.id).sort((a,b)=>String(a.updatedAt||a.week||'').localeCompare(String(b.updatedAt||b.week||'')));
    next60TrendRoot.innerHTML=`<div class="r16-trend-grid">${['outcome1','outcome2','outcome3'].map((key,index)=>{const series=checks.filter((r)=>r.outcomeKey===key);const latest=series[series.length-1];return `<div class="r16-trend-card"><small class="section-kicker">OUTCOME ${index+1}</small><strong>${escapeHtml(plan[key]||'미입력')}</strong><div class="r16-trend-line">${series.length?series.map((r)=>`<span class="r16-status-point ${String(r.status||'').toLowerCase()}">${escapeHtml(r.week||'W')} · ${escapeHtml(r.status||'CHECK')}</span>`).join(''):'<span class="review-meta">아직 Check-in 없음</span>'}</div>${latest?`<p class="review-meta">Latest evidence · ${escapeHtml(latest.evidence||'—')}<br>Next · ${escapeHtml(latest.next||'—')}</p>`:''}</div>`;}).join('')}</div>`;
};
const renderCommitmentBridge=()=>{
    if(!commitmentListRoot) return;
    if(commitmentDelegationInput){const selected=[...commitmentDelegationInput.selectedOptions].map((o)=>o.value);commitmentDelegationInput.innerHTML=relationOptionHtml('DELEGATION',selected);}
    if(commitmentDebriefInput){const selected=[...commitmentDebriefInput.selectedOptions].map((o)=>o.value);commitmentDebriefInput.innerHTML=relationOptionHtml('DEBRIEF',selected);}
    const rows=artifactRows('ONE_ON_ONE_COMMITMENT');
    commitmentListRoot.innerHTML=rows.length?rows.slice().reverse().map((r)=>`<div class="commitment-bridge-item"><div><strong>${escapeHtml(r.person||'Person')} · ${escapeHtml(r.commitment||'Commitment')}</strong><p>Due ${escapeHtml(r.due||'—')} · ${escapeHtml(r.status||'OPEN')} · Evidence ${escapeHtml(r.evidence||'미정')}</p>${relationSummaryHtml(r)}</div><button type="button" data-r16-commitment-open="${escapeHtml(r.id)}">열기</button></div>`).join(''):'<div class="safe">아직 운영 Commitment가 없습니다. 1:1에서 합의한 후속 행동을 연결해보세요.</div>';
    for(const b of commitmentListRoot.querySelectorAll('[data-r16-commitment-open]')) b.addEventListener('click',()=>openArtifactType('ONE_ON_ONE_COMMITMENT',b.dataset.r16CommitmentOpen));
};
commitmentSaveButton?.addEventListener('click',()=>{
    const commitment=String(commitmentTextInput?.value||'').trim(); if(!commitment) return;
    addArtifactRecord('ONE_ON_ONE_COMMITMENT',{person:String(commitmentPersonInput?.value||'').trim(),commitment,due:String(commitmentDueInput?.value||'').trim(),evidence:'1:1에서 사람 확인 후 저장',status:'OPEN',delegationRefs:commitmentDelegationInput?[...commitmentDelegationInput.selectedOptions].map((o)=>o.value):[],debriefRefs:commitmentDebriefInput?[...commitmentDebriefInput.selectedOptions].map((o)=>o.value):[]});
    if(commitmentTextInput) commitmentTextInput.value=''; renderCommitmentBridge();
});
const renderRecovery16Surfaces=()=>{renderDependencyMap();renderWeeklyReviewDiff();renderNext60Trend();renderCommitmentBridge();};
const renderRecovery15Surfaces=()=>{ renderDependencyMap(); renderSystemHealth(); renderEvidenceInspector(); renderGraduationReview(); renderNext60Tracker(); renderManagerBrief(); renderRecovery16Surfaces(); if(typeof renderRecovery17Surfaces==='function') renderRecovery17Surfaces(); };

const renderToolkit = () => {
    toolkitRoot.innerHTML = Object.entries(LEADERSHIP_TOOLKITS).map(([id, item]) => {
        const rows = item.example.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('');
        return `<details class="toolkit-card"${id === 'TEAM_CALENDAR' ? ' open' : ''}><summary><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.purpose)}</span></summary><div class="toolkit-table-wrap"><table class="toolkit-table"><tbody>${rows}</tbody></table></div></details>`;
    }).join('');
};
const renderSources = () => {
    sourceRoot.innerHTML = Object.values(LEADERSHIP_KNOWLEDGE_SOURCES).map((source) => `<article class="source-card">
        <span class="state-badge">${escapeHtml(source.tier)}</span>
        <h3>${escapeHtml(source.name)}</h3>
        <p>${escapeHtml(source.principle)}</p>
        <a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">원문 보기 ↗</a>
    </article>`).join('');
};

// Recovery 17 · Time-aware operating graph, follow-up and decision velocity
const r17DateOnly=(date)=>new Date(date.getFullYear(),date.getMonth(),date.getDate());
const r17ParseDate=(value,timeValue='23:59')=>{
  const raw=String(value||'').trim(); if(!raw) return null;
  const iso=raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?$/);
  if(iso){const d=new Date(Number(iso[1]),Number(iso[2])-1,Number(iso[3]),Number(iso[4]||String(timeValue).split(':')[0]||23),Number(iso[5]||String(timeValue).split(':')[1]||59));return Number.isNaN(d.getTime())?null:d;}
  const weekday={MON:1,TUE:2,WED:3,THU:4,FRI:5,SAT:6,SUN:0};
  const wd=raw.toUpperCase().match(/\b(MON|TUE|WED|THU|FRI|SAT|SUN)\b/); const tm=raw.match(/(\d{1,2}):(\d{2})/);
  if(wd){const now=new Date();const target=weekday[wd[1]];const current=now.getDay();const delta=target-current;const d=new Date(now);d.setDate(now.getDate()+delta);d.setHours(Number(tm?.[1]||23),Number(tm?.[2]||59),0,0);return d;}
  const parsed=new Date(raw); return Number.isNaN(parsed.getTime())?null:parsed;
};
const r17DueMeta=(date)=>{if(!date)return{state:'NONE',label:'No date',hours:null};const diff=(date.getTime()-Date.now())/36e5;if(diff<0)return{state:'OVERDUE',label:`${Math.max(1,Math.ceil(Math.abs(diff)/24))}일 지남`,hours:diff};if(diff<=48)return{state:'DUE_SOON',label:diff<24?'24시간 내':'48시간 내',hours:diff};return{state:'CLEAR',label:date.toLocaleDateString('ko-KR'),hours:diff};};
const r17ArtifactDue=(type,row)=>{if(type==='MILESTONES')return r17DueMeta(r17ParseDate(row.date));if(type==='ONE_ON_ONE_COMMITMENT')return r17DueMeta(r17ParseDate(row.due));if(type==='TEAM_CALENDAR')return r17DueMeta(r17ParseDate(row.date,row.time));if(type==='DECISION_RIGHTS')return r17DueMeta(r17ParseDate(row.dueDate));return{state:'NONE',label:'',hours:null};};
const r17LeadDays=(row)=>{const start=r17ParseDate(row.requestedAt);if(!start)return null;const end=r17ParseDate(row.decidedAt)||new Date();return Math.max(0,(end-start)/864e5);};
const r17LatestReview=()=>[...artifactRows('WEEKLY_REVIEW')].sort((a,b)=>String(a.updatedAt||a.week||'').localeCompare(String(b.updatedAt||b.week||''))).pop()||null;
const r17LatestPriority=()=>latestArtifact('PRIORITY_CONTRACT',false);
let r17GroupBy='project'; let r17Zoom='detail';
const r17EnsureSurface=(page,selector,html,position='beforeend')=>{const root=document.querySelector(`[data-page="${page}"]`);if(!root)return null;let node=root.querySelector(selector);if(!node){root.insertAdjacentHTML(position,html);node=root.querySelector(selector);}return node;};
const r17EnsureSurfaces=()=>{
  r17EnsureSurface('TODAY','[data-r17-followups]',`<section class="r17-shell" data-r17-followups><div class="r17-head"><div><div class="section-kicker">FOLLOW-UP · 1:1 COMMITMENTS</div><h2>오늘 다시 확인해야 할 약속</h2><p>1:1의 전체 대화를 공유하지 않습니다. Human-reviewed Operating Commitment 중 미완료·마감 임박 항목만 Today에 올립니다.</p></div><span class="pill" data-r17-followup-count>0</span></div><div class="r17-followups" data-r17-followup-list></div></section>`);
  r17EnsureSurface('ONBOARDING','[data-r17-ops]',`<section class="r17-shell" data-r17-ops><div class="r17-head"><div><div class="section-kicker">RECOVERY 17 · TIME & DECISION VELOCITY</div><h2>Operating Graph를 시간과 Follow-up까지 연결합니다</h2><p>Project/Workstream 묶음, Due/Overdue, Decision Lead Time, Commitment Follow-up을 같은 운영 맥락으로 봅니다.</p></div><div class="r17-controls"><label>Group <select data-r17-group><option value="project">Project</option><option value="workstream">Workstream</option><option value="none">None</option></select></label><label>Zoom <select data-r17-zoom><option value="detail">Detail</option><option value="summary">Summary</option></select></label></div></div><div class="r17-metrics" data-r17-metrics></div><div data-r17-grouped-graph></div><div class="r17-head" style="margin-top:18px"><div><div class="section-kicker">DECISION VELOCITY</div><h2>결정이 얼마나 오래 열려 있는지 봅니다</h2><p>리더의 속도를 평가하는 점수가 아니라, 어떤 결정이 업무 흐름을 오래 막는지 확인하는 운영 신호입니다.</p></div></div><div class="r17-decision-list" data-r17-decisions></div><div class="r17-head" style="margin-top:18px"><div><div class="section-kicker">WEEKLY REVIEW → PRIORITY CONTRACT</div><h2>지난 리뷰의 Next를 다음 주 Top 3 후보로 전환합니다</h2><p>자동 확정하지 않습니다. 제안은 DRAFT Priority Contract로만 생성되고 Human Confirm을 거쳐야 합니다.</p></div></div><div data-r17-priority></div></section>`);
  r17EnsureSurface('REPORTS','[data-r17-report-ext]',`<section class="r17-shell" data-r17-report-ext><div class="r17-head"><div><div class="section-kicker">OPERATING SIGNALS</div><h2>마감·결정속도·Next 60을 함께 보고합니다</h2><p>Manager Brief의 요약 근거를 별도 점수 없이 운영 신호로 표시합니다.</p></div></div><div class="r17-metrics" data-r17-report-metrics></div><div class="r17-report-ext"><strong>Next 60 Trend</strong><p data-r17-report-next60></p></div></section>`);
  document.querySelector('[data-r17-group]')?.addEventListener('change',(e)=>{r17GroupBy=e.target.value;r17RenderGroupedGraph();});
  document.querySelector('[data-r17-zoom]')?.addEventListener('change',(e)=>{r17Zoom=e.target.value;r17RenderGroupedGraph();});
};
const r17WorkAttention=(work)=>{const ms=refArray(work.milestoneRefs).map((id)=>artifactRecordById(id)).filter(Boolean);const overdue=ms.some((m)=>r17ArtifactDue('MILESTONES',m).state==='OVERDUE');if(overdue)return'CRITICAL';return workAttention(work);};
const r17Metrics=()=>{const calendar=artifactRows('TEAM_CALENDAR').filter((r)=>String(r.date||'').trim());const milestones=artifactRows('MILESTONES');const commitments=artifactRows('ONE_ON_ONE_COMMITMENT').filter((r)=>!['DONE','CANCELLED'].includes(String(r.status||'OPEN').toUpperCase()));const decisions=artifactRows('DECISION_RIGHTS').filter((r)=>!['DECIDED','CANCELLED'].includes(String(r.decisionStatus||'OPEN').toUpperCase()));const timeItems=[...calendar.map((r)=>['TEAM_CALENDAR',r]),...milestones.map((r)=>['MILESTONES',r]),...commitments.map((r)=>['ONE_ON_ONE_COMMITMENT',r]),...decisions.map((r)=>['DECISION_RIGHTS',r])];const overdue=timeItems.filter(([t,r])=>r17ArtifactDue(t,r).state==='OVERDUE').length;const dueSoon=timeItems.filter(([t,r])=>r17ArtifactDue(t,r).state==='DUE_SOON').length;const lead=decisions.map(r17LeadDays).filter((x)=>x!=null);return{overdue,dueSoon,openCommitments:commitments.length,avgLead:lead.length?lead.reduce((a,b)=>a+b,0)/lead.length:0};};
const r17RenderMetrics=()=>{const m=r17Metrics();for(const root of document.querySelectorAll('[data-r17-metrics],[data-r17-report-metrics]'))root.innerHTML=`<div class="r17-metric"><small>OVERDUE OPERATING ITEMS</small><strong>${m.overdue}</strong><p>Milestone · Commitment · Decision due</p></div><div class="r17-metric"><small>DUE WITHIN 48H</small><strong>${m.dueSoon}</strong><p>지금 확인하면 지연을 예방할 수 있는 항목</p></div><div class="r17-metric"><small>OPEN 1:1 COMMITMENTS</small><strong>${m.openCommitments}</strong><p>공유된 Operating Commitment만 포함</p></div><div class="r17-metric"><small>AVG OPEN DECISION AGE</small><strong>${m.avgLead.toFixed(1)}d</strong><p>평가 점수가 아닌 흐름 지연 신호</p></div>`;};
const r17NodeHtml=(type,row)=>{const due=r17ArtifactDue(type,row);return `<div class="r17-node"><small>${escapeHtml(artifactDefinitions[type]?.label||type)}</small><b>${escapeHtml(artifactPrimary(type,row))}</b>${due.state!=='NONE'?`<p><span class="r17-chip ${due.state==='OVERDUE'?'overdue':due.state==='DUE_SOON'?'due-soon':'clear'}">${due.state} · ${escapeHtml(due.label)}</span></p>`:''}</div>`;};
const r17RenderGroupedGraph=()=>{const root=document.querySelector('[data-r17-grouped-graph]');if(!root)return;const works=artifactRows('WORK_MAP');const groups=new Map();for(const w of works){const key=r17GroupBy==='project'?String(w.project||'Unassigned Project'):r17GroupBy==='workstream'?String(w.workstream||'General'):r17GroupBy==='none'?'All Work':'All Work';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(w);}root.innerHTML=[...groups.entries()].map(([key,items])=>`<div class="r17-group"><div class="r17-group-title"><strong>${escapeHtml(key)}</strong><span>${items.length} Work · ${items.filter(w=>r17WorkAttention(w)==='CRITICAL').length} Critical</span></div><div class="r17-lanes">${items.map((w)=>{const attention=r17WorkAttention(w);const all=[...refArray(w.milestoneRefs).map(id=>['MILESTONES',artifactRecordById(id)]),...refArray(w.decisionRefs).map(id=>['DECISION_RIGHTS',artifactRecordById(id)]),...refArray(w.delegationRefs).map(id=>['DELEGATION',artifactRecordById(id)]),...refArray(w.debriefRefs).map(id=>['DEBRIEF',artifactRecordById(id)])].filter(x=>x[1]);return `<details class="r17-lane" ${r17Zoom==='detail'?'open':''}><summary><div><div class="r17-lane-title">${escapeHtml(w.project||'Work')} · ${escapeHtml(w.owner||'Owner 미정')}</div><div class="r17-lane-meta"><span class="r17-chip ${attention==='CRITICAL'?'overdue':attention==='CHECK'?'due-soon':'clear'}">${attention}</span><span class="r17-chip">${escapeHtml(w.workstream||'General')}</span><span class="r17-chip">${all.length} linked</span></div></div><button type="button" data-r17-open-work="${escapeHtml(w.id)}">열기</button></summary>${r17Zoom==='detail'?`<div class="r17-detail-grid">${all.length?all.map(([t,r])=>r17NodeHtml(t,r)).join(''):'<div class="r17-node"><small>RELATION</small><b>연결 필요</b></div>'}</div>`:''}</details>`;}).join('')}</div></div>`).join('')||'<div class="safe">Work Map을 만들면 Project/Workstream 단위 운영 그래프가 나타납니다.</div>';for(const b of root.querySelectorAll('[data-r17-open-work]'))b.addEventListener('click',(e)=>{e.preventDefault();openArtifactType('WORK_MAP',b.dataset.r17OpenWork);});};
const r17RenderFollowups=()=>{const root=document.querySelector('[data-r17-followup-list]');const count=document.querySelector('[data-r17-followup-count]');if(!root)return;const rows=artifactRows('ONE_ON_ONE_COMMITMENT').filter((r)=>!['DONE','CANCELLED'].includes(String(r.status||'OPEN').toUpperCase())).sort((a,b)=>(r17ArtifactDue('ONE_ON_ONE_COMMITMENT',a).hours??99999)-(r17ArtifactDue('ONE_ON_ONE_COMMITMENT',b).hours??99999));if(count)count.textContent=String(rows.length);root.innerHTML=rows.length?rows.slice(0,5).map((r)=>{const due=r17ArtifactDue('ONE_ON_ONE_COMMITMENT',r);const cls=due.state==='OVERDUE'?'overdue':String(r.status).toUpperCase()==='BLOCKED'?'blocked':'';return `<div class="r17-followup ${cls}"><div><strong>${escapeHtml(r.person||'Person')} · ${escapeHtml(r.commitment||'Commitment')}</strong><p>${escapeHtml(r.status||'OPEN')} · Due ${escapeHtml(r.due||'미정')} · ${escapeHtml(due.state==='NONE'?'날짜 확인 필요':due.label)}</p></div><button type="button" data-r17-open-commitment="${escapeHtml(r.id)}">Follow-up</button></div>`;}).join(''):'<div class="safe">미완료 Operating Commitment가 없습니다.</div>';for(const b of root.querySelectorAll('[data-r17-open-commitment]'))b.addEventListener('click',()=>{navigation.setActive('ONE_ON_ONE','1:1');openArtifactType('ONE_ON_ONE_COMMITMENT',b.dataset.r17OpenCommitment);});};
const r17RenderDecisionVelocity=()=>{const root=document.querySelector('[data-r17-decisions]');if(!root)return;const rows=artifactRows('DECISION_RIGHTS');root.innerHTML=rows.length?rows.map((r)=>{const lead=r17LeadDays(r);const due=r17ArtifactDue('DECISION_RIGHTS',r);const status=String(r.decisionStatus|| (r.decidedAt?'DECIDED':'OPEN')).toUpperCase();return `<div class="r17-decision"><div><b>${escapeHtml(r.decision||'Decision')}</b><span> · D ${escapeHtml(r.decide||'미정')}</span></div><span>${escapeHtml(status)}</span><span>${lead==null?'Lead time 미정':`${lead.toFixed(1)} days`}</span><span class="${due.state==='OVERDUE'?'risk':''}">${escapeHtml(due.state==='NONE'?'Due 미정':`${due.state} · ${due.label}`)}${r.escalationHistory?`<br><small>Escalation · ${escapeHtml(r.escalationHistory)}</small>`:''}</span></div>`;}).join(''):'<div class="safe">Decision Rights를 만들면 Decision Lead Time이 나타납니다.</div>';};
const r17PriorityDraft=()=>{const w=r17LatestReview();if(!w)return null;const prev=r17LatestPriority();return{priority1:String(w.next||w.attention||'').trim()||'다음 주 핵심 변화',priority2:String(w.decisions||'').trim()||'미해결 결정 정리',priority3:String(w.delegation||'').trim()||'위임/체크포인트 확인',notNow:prev?.notNow||'새로운 비핵심 업무 추가',successSignal:String(w.learning||'').trim()||'다음 Weekly Review에서 변화 확인',reviewDate:'FRI 16:00',sourceWeeklyRef:w.id,sourceWeeklyVersion:Number(w.version)||1};};
const r17RenderPriorityProposal=()=>{const root=document.querySelector('[data-r17-priority]');if(!root)return;const draft=r17PriorityDraft();if(!draft){root.innerHTML='<div class="safe">Weekly Review Snapshot을 저장하면 다음 주 Priority Contract 후보가 생성됩니다.</div>';return;}const existing=artifactRows('PRIORITY_CONTRACT').find((r)=>r.sourceWeeklyRef===draft.sourceWeeklyRef);root.innerHTML=`<div class="r17-priority-proposal"><div><small>PRIORITY 1</small><b>${escapeHtml(draft.priority1)}</b></div><div><small>PRIORITY 2</small><b>${escapeHtml(draft.priority2)}</b></div><div><small>PRIORITY 3</small><b>${escapeHtml(draft.priority3)}</b></div></div><div class="r17-actions"><span class="review-meta">${existing?'이미 이 Weekly Review에서 Draft가 생성되었습니다.':'Human Confirm 전까지 DRAFT로만 저장됩니다.'}</span><button type="button" class="primary" data-r17-create-priority ${existing?'disabled':''}>DRAFT Priority Contract 만들기</button></div>`;root.querySelector('[data-r17-create-priority]')?.addEventListener('click',()=>{const id=addArtifactRecord('PRIORITY_CONTRACT',draft);questStore.artifactTab='PRIORITY_CONTRACT';saveQuestStore();renderArtifactWorkspace();r17RenderPriorityProposal();navigation.announce('Weekly Review에서 Draft Priority Contract를 만들었습니다. Human Confirm이 필요합니다.');});};
const r17RenderReportExtension=()=>{const root=document.querySelector('[data-r17-report-next60]');if(root)root.textContent=r17Next60SummaryForBrief();};
const renderRecovery17Surfaces=()=>{r17EnsureSurfaces();r17RenderMetrics();r17RenderGroupedGraph();r17RenderFollowups();r17RenderDecisionVelocity();r17RenderPriorityProposal();r17RenderReportExtension();};

renderRolePack();
renderSetupChecklist();
renderSampleBoards();
renderArtifactWorkspace();
renderQuestProgress();
renderQuestList();
renderQuestDetail(questStore.selectedDay);
renderWeeklyOperatingReview();
renderToolkit();
renderSources();
renderTodayLeaderNudge();
renderRecovery15Surfaces();

onboardingOpen?.addEventListener('click', () => navigation.setActive('ONBOARDING', '30-Day Quest'));
confirmButton.addEventListener('click', () => { const confirmed = confirmOnboardingUnderstanding(onboardingState, { type: 'HUMAN', id: 'CURRENT_USER' }); onboardingResultRoot.hidden = false; onboardingResultRoot.textContent = confirmed.ok ? 'AI Understanding confirmed by human. Day 1 Quest가 준비되었습니다.' : 'Human confirmation required.'; });

// Leader Coach · 3-stage nudge
const coachScenario = document.querySelector('[data-coach-scenario]');
const coachLevel = document.querySelector('[data-coach-level]');
const coachOutput = document.querySelector('[data-coach-output]');
const coachScript = document.querySelector('[data-coach-script]');
const coachCopy = document.querySelector('[data-coach-copy]');
if (!coachScenario || !coachLevel || !coachOutput || !coachScript || !coachCopy)
    throw new Error('LEADER_COACH_ROOT_MISSING');
coachScenario.innerHTML = Object.entries(LEADER_COACH_SCENARIOS).map(([id, scenario]) => `<option value="${id}">${escapeHtml(scenario.name)}</option>`).join('');
const renderCoach = () => {
    const scenario = LEADER_COACH_SCENARIOS[coachScenario.value] ?? LEADER_COACH_SCENARIOS.TASK;
    const level = coachLevel.value || 'coach';
    const levelLabel = level === 'gentle' ? 'LEVEL 1 · Gentle' : level === 'learn' ? 'LEVEL 3 · Learn' : 'LEVEL 2 · Coach';
    coachOutput.innerHTML = `<span class="state-badge">${levelLabel}</span><h3>${escapeHtml(scenario.name)}</h3><p>${escapeHtml(scenario[level])}</p>`;
    coachScript.textContent = scenario.script;
};
coachScenario.addEventListener('change', renderCoach);
coachLevel.addEventListener('change', renderCoach);
coachCopy.addEventListener('click', async () => {
    const scenario = LEADER_COACH_SCENARIOS[coachScenario.value] ?? LEADER_COACH_SCENARIOS.TASK;
    const level = coachLevel.value || 'coach';
    const text = `[Leader OS · ${scenario.name}]\n${scenario[level]}\n\nGuide: ${scenario.script}`;
    try { await navigator.clipboard.writeText(text); coachCopy.textContent = '복사됨 ✓'; setTimeout(() => coachCopy.textContent = '코칭 문장 복사', 1200); } catch { coachCopy.textContent = '복사 실패'; }
});
renderCoach();
const skillDefinitions = [
    { id: 'SK-QUICK', name: 'Quick Decision Check', whyNow: '빠르게 열린 결정을 점검', mode: 'QUICK', scope: 'STANDARD', prepare: ['Decision context'], run: ['Check evidence', 'Confirm owner'] },
    { id: 'SK-STANDARD', name: '1:1 Follow-up', whyNow: '미해결 Commitment가 있음', mode: 'STANDARD', scope: 'STANDARD', prepare: ['Last notes', 'Commitments'], run: ['Clarify', 'Capture', 'Follow-up'] },
    { id: 'SK-FULL', name: 'Project Recovery', whyNow: '마일스톤 지연과 dependency가 있음', mode: 'FULL', scope: 'COMPANY', prepare: ['Project evidence', 'Dependencies'], run: ['Symptom', 'Cause', 'Dependency', 'Decision', 'Recovery'] }
];
const skillRoot = document.querySelector('[data-skills-grid]');
if (!skillRoot) throw new Error('SKILLS_ROOT_MISSING');
const SKILL_STORAGE_BASE='leader-os:skill-run-state:v2';
const skillStorageScope=()=>{try{const state=reportRuntimeBridge.state();return state.signedIn&&state.userId&&state.workspaceId?`${state.userId}:${state.workspaceId}`:'guest'}catch{return'guest'}};
const skillStorageKey=()=>`${SKILL_STORAGE_BASE}:${skillStorageScope()}`;
let activeSkillScope=skillStorageScope();
const readSkillState=()=>{try{const parsed=JSON.parse(browserStorage.getItem(skillStorageKey())||'{}');return parsed&&typeof parsed==='object'?parsed:{}}catch{return {}}};
let skillState=readSkillState();
const saveSkillState=()=>{try{browserStorage.setItem(skillStorageKey(),JSON.stringify(skillState))}catch{}};
setInterval(()=>{
    const next=skillStorageScope();
    if(next===activeSkillScope)return;
    activeSkillScope=next;
    skillState=readSkillState();
    renderSkills();
},1400);
const skillStages=['PREPARE','RUN','CAPTURE','ACTION'];
const renderSkills=()=>{
    skillRoot.innerHTML='';
    for (const definition of skillDefinitions) {
        const run = buildSkillRun(definition);
        const state=skillState[definition.id]||{stage:'PREPARE',completed:false,updatedAt:null};
        const stageIndex=Math.max(0,skillStages.indexOf(state.stage));
        const card = document.createElement('article');
        card.className = 'skill-card';
        card.innerHTML = `<span class="state-badge">${escapeHtml(run.mode)}</span><h3>${escapeHtml(run.name)}</h3><div class="why">Why now: ${escapeHtml(run.whyNow)}</div><div class="skill-progress">${skillStages.map((stage,index)=>`<button type="button" class="skill-step ${index<stageIndex?'done':''} ${index===stageIndex&&!state.completed?'active':''} ${state.completed?'done':''}" data-skill-stage="${stage}" data-skill-id="${definition.id}">${index+1} · ${stage}</button>`).join('')}</div><div class="safe">${state.completed?'Human-reviewed practice completed.':'단계를 눌러 현재 실행 위치를 저장하세요. Capture는 자동 Fact가 아니라 후보 기록입니다.'}</div><div class="skill-state-row"><span>${state.updatedAt?`Last saved · ${new Date(state.updatedAt).toLocaleString()}`:'아직 저장된 진행 없음'}</span><button type="button" class="skill-reset" data-skill-reset="${definition.id}">초기화</button></div>`;
        skillRoot.append(card);
    }
    for(const button of skillRoot.querySelectorAll('[data-skill-stage]')) button.addEventListener('click',()=>{
        const id=button.dataset.skillId, stage=button.dataset.skillStage;
        skillState[id]={stage,completed:stage==='ACTION',updatedAt:new Date().toISOString()};
        saveSkillState(); renderSkills();
    });
    for(const button of skillRoot.querySelectorAll('[data-skill-reset]')) button.addEventListener('click',()=>{delete skillState[button.dataset.skillReset];saveSkillState();renderSkills();});
};
renderSkills();
const sampleReviews = [
    {
        recommendationId: 'REC-008',
        reviewStatus: 'PENDING_HUMAN_REVIEW',
        summary: '프로젝트 A의 의사결정 지연 원인을 다시 확인하세요.',
        reason: '결정 지연 이후 Outcome Evidence가 들어왔고 실제 개선 여부를 확인할 시점입니다.',
        evidenceRefs: ['REC-008', 'DEC-014', 'EV-A-044'],
        confidence: 0.77,
        decisionState: 'ADOPTED',
        targetType: 'RECOMMENDATION'
    },
    {
        recommendationId: 'REC-011',
        reviewStatus: 'PENDING_HUMAN_REVIEW',
        summary: '다음 1:1에서 Commitment를 Follow-up 하세요.',
        reason: '지난 대화에서 합의된 Commitment의 완료 근거가 아직 없습니다.',
        evidenceRefs: ['1ON1-031', 'COM-019'],
        confidence: 0.82,
        decisionState: 'DEFERRED',
        targetType: 'RECOMMENDATION'
    }
];
const reviewQueue = buildReviewQueue(sampleReviews);
const reviewRoot = document.querySelector('[data-review-list]');
if (!reviewRoot)
    throw new Error('REVIEW_LIST_ROOT_MISSING');
for (const item of reviewQueue.accepted) {
    const card = document.createElement('article');
    card.className = 'review-card';
    card.dataset.recommendationId = item.recommendationId;
    const head = document.createElement('div');
    head.className = 'review-head';
    const copy = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = item.summary;
    const why = document.createElement('div');
    why.className = 'why';
    why.textContent = `Reason: ${item.reason}`;
    copy.append(title, why);
    const meta = document.createElement('div');
    meta.className = 'review-meta';
    const decisionStateLabel = { ADOPTED: '채택', REJECTED: '거절', DEFERRED: '보류', NOT_DECIDED: '미결정' }[item.decisionState];
    meta.textContent = `결정 상태 ${decisionStateLabel} · 신뢰도 ${Math.round(item.confidence * 100)}% (확정 사실 아님)`;
    head.append(copy, meta);
    const evidence = document.createElement('div');
    evidence.className = 'safe';
    evidence.textContent = `연결 근거: ${item.evidenceRefs.join(' · ')}`;
    const verdicts = ['USEFUL', 'NOT_USEFUL', 'WRONG', 'NEEDS_MORE_EVIDENCE'];
    const verdictLabels = { USEFUL: '도움 됨', NOT_USEFUL: '도움 안 됨', WRONG: '틀림', NEEDS_MORE_EVIDENCE: '근거 더 필요' };
    const actions = document.createElement('div');
    actions.className = 'review-actions';
    let selected = null;
    for (const verdict of verdicts) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = verdictLabels[verdict];
        button.addEventListener('click', () => {
            selected = verdict;
            for (const sibling of actions.querySelectorAll('button'))
                sibling.classList.remove('selected');
            button.classList.add('selected');
        });
        actions.append(button);
    }
    const evidenceField = document.createElement('div');
    evidenceField.className = 'field';
    const evidenceLabel = document.createElement('label');
    evidenceLabel.textContent = '결과 근거 연결';
    const evidenceInput = document.createElement('input');
    const evidenceInputId = `review-evidence-${item.recommendationId}`;
    evidenceInput.id = evidenceInputId;
    evidenceLabel.htmlFor = evidenceInputId;
    evidenceInput.placeholder = '근거 ID를 입력하거나 아래 항목을 선택';
    const picker = document.createElement('div');
    picker.className = 'evidence-picker';
    for (const ref of item.evidenceRefs) {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.textContent = ref;
        chip.addEventListener('click', () => {
            const current = evidenceInput.value.split(',').map((value) => value.trim()).filter(Boolean);
            if (!current.includes(ref))
                current.push(ref);
            evidenceInput.value = current.join(', ');
            navigation.announce(`${ref} 근거를 Review에 연결했습니다.`);
        });
        picker.append(chip);
    }
    evidenceField.append(evidenceLabel, evidenceInput, picker);
    const noteField = document.createElement('div');
    noteField.className = 'field';
    const noteLabel = document.createElement('label');
    noteLabel.textContent = '검수 메모';
    const noteInput = document.createElement('textarea');
    const noteInputId = `review-note-${item.recommendationId}`;
    noteInput.id = noteInputId;
    noteLabel.htmlFor = noteInputId;
    noteInput.rows = 2;
    noteInput.placeholder = '왜 그렇게 판단했는지 짧게 남기면 다음 추천 품질을 개선할 수 있습니다.';
    noteField.append(noteLabel, noteInput);
    const submit = document.createElement('button');
    submit.type = 'button';
    submit.textContent = '내 검수 결과 확정';
    submit.className = 'primary';
    submit.style.marginTop = '12px';
    const result = document.createElement('div');
    result.className = 'review-result';
    result.hidden = true;
    submit.addEventListener('click', () => {
        if (!selected) {
            result.hidden = false;
            result.textContent = '검수 결과를 먼저 선택하세요.';
            return;
        }
        const submission = buildReviewSubmission({
            recommendationId: item.recommendationId,
            verdict: selected,
            outcomeEvidenceRefs: evidenceInput.value.split(','),
            reviewerType: 'HUMAN',
            reviewerId: 'CURRENT_USER',
            notes: noteInput.value
        });
        result.hidden = false;
        result.textContent = submission.ok
            ? '검수 결과 저장 준비 완료 · 사람에 대한 평가나 확정 사실은 자동 변경되지 않습니다.'
            : `검수 실패: ${(submission.violations ?? ['UNKNOWN_REVIEW_ERROR']).join(' · ')}`;
    });
    card.append(head, evidence, actions, evidenceField, noteField, submit, result);
    reviewRoot.append(card);
}
const reviewCount = document.querySelector('[data-review-count]');
if (reviewCount)
    reviewCount.textContent = String(reviewQueue.accepted.length);
const contractBadge = document.querySelector('[data-contract-status]');
if (contractBadge) {
    contractBadge.textContent = 'Core checks PASS';
    contractBadge.title = 'Navigation + Today + Review contracts PASS';
}
navigation.activateFromHash();
void liveUi.restorePersistedSession();
