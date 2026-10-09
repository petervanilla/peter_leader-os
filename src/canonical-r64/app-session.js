import { createLeaderOsGateway } from './gateway.js';
import { chooseInitialWorkspace, workspaceStorageKey } from './workspace-directory.js';
import { FIRST_USE_30_DAY_TASKS } from './onboarding.js';
const copyWorkspace = (w) => ({ ...w });
const copyPreferences = (p) => ({ ...p, workingHours: { ...p.workingHours, weekdays: [...p.workingHours.weekdays] }, notificationPreferences: { ...p.notificationPreferences } });
const safeIdToken = (value) => value.normalize('NFKC').toLocaleLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 36) || 'item';
export class LeaderOsAppSession {
    config;
    storage;
    transport;
    gateway = null;
    revision = 0;
    mode = 'DEMO';
    identity = null;
    workspaces = [];
    preferences = null;
    activeWorkspace = null;
    contextPack = null;
    constructor(config, storage = null, transport = fetch) {
        this.config = config;
        this.storage = storage;
        this.transport = transport;
    }
    snapshot() { return { revision: this.revision, mode: this.mode, identity: this.identity ? { ...this.identity } : null, workspaces: this.workspaces.map(copyWorkspace), preferences: this.preferences ? copyPreferences(this.preferences) : null, activeWorkspace: this.activeWorkspace ? copyWorkspace(this.activeWorkspace) : null, contextPack: this.contextPack }; }
    get currentMode() { return this.mode; }
    get currentIdentity() { return this.identity ? { ...this.identity } : null; }
    get currentWorkspaces() { return this.workspaces.map(copyWorkspace); }
    get currentPreferences() { return this.preferences ? copyPreferences(this.preferences) : null; }
    get currentWorkspace() { return this.activeWorkspace ? copyWorkspace(this.activeWorkspace) : null; }
    get currentContextPack() { return this.contextPack; }
    get isSignedIn() { return this.identity !== null && this.gateway !== null; }
    workspaceById(id) { const found = this.workspaces.find(w => w.workspaceId === id); return found ? copyWorkspace(found) : null; }
    bump() { this.revision++; }
    lastWorkspace(userId) { try {
        return this.storage?.getItem(workspaceStorageKey(userId)) ?? null;
    }
    catch {
        return null;
    } }
    rememberWorkspace(userId, workspaceId) { try {
        this.storage?.setItem(workspaceStorageKey(userId), workspaceId);
    }
    catch { } }
    requireGateway() { if (!this.gateway || !this.identity)
        throw new Error('APP_SESSION_SIGN_IN_REQUIRED'); return this.gateway; }
    assertContext(pack, w) { if (!this.identity)
        throw new Error('APP_SESSION_IDENTITY_REQUIRED'); if (pack.viewerUserId !== this.identity.userId)
        throw new Error('CONTEXT_VIEWER_ID_MISMATCH'); if (pack.workspaceId !== w.workspaceId)
        throw new Error('CONTEXT_WORKSPACE_ID_MISMATCH'); }
    commitWorkspace(w, pack) { this.assertContext(pack, w); this.activeWorkspace = copyWorkspace(w); this.contextPack = pack; this.mode = 'LIVE'; if (this.identity)
        this.rememberWorkspace(this.identity.userId, w.workspaceId); this.bump(); }
    identityFrom(s, p) { return { userId: s.userId, email: s.email, label: p.displayName ?? s.email ?? `User ${s.userId.slice(0, 8)}` }; }
    async initializeGateway(gateway, authSession) { const [directory, pref] = await Promise.all([gateway.discoverWorkspaces(), gateway.getPreferences()]); if (directory.viewerUserId && directory.viewerUserId !== authSession.userId)
        throw new Error('WORKSPACE_VIEWER_ID_MISMATCH'); if (pref.viewerUserId && pref.viewerUserId !== authSession.userId)
        throw new Error('PREFERENCE_VIEWER_ID_MISMATCH'); this.gateway = gateway; this.identity = this.identityFrom(authSession, pref.preferences); this.workspaces = directory.workspaces.map(copyWorkspace); this.preferences = copyPreferences(pref.preferences); this.activeWorkspace = null; this.contextPack = null; this.mode = 'SIGNED_IN'; this.bump(); const selection = chooseInitialWorkspace(this.workspaces, this.lastWorkspace(authSession.userId), this.preferences.defaultWorkspaceId); if (selection.selected)
        await this.selectWorkspace(selection.selected.workspaceId); return selection; }
    async signInWithPassword(email, password) { this.disconnect(); this.mode = 'CONNECTING'; this.bump(); const gateway = createLeaderOsGateway(this.config, this.transport, this.storage); try {
        return await this.initializeGateway(gateway, await gateway.signInWithPassword(email, password));
    }
    catch (e) {
        gateway.auth.clearSession();
        this.clearState();
        throw e;
    } }
    async restoreSession() { if (this.isSignedIn) {
        const selected = this.activeWorkspace ?? this.workspaces[0] ?? null;
        return { selected: selected ? copyWorkspace(selected) : null, source: selected ? 'LAST_USED' : 'NO_WORKSPACE', requiresChoice: !selected && this.workspaces.length > 1 };
    } this.clearState(); this.mode = 'CONNECTING'; this.bump(); const gateway = createLeaderOsGateway(this.config, this.transport, this.storage); try {
        const auth = await gateway.restoreSession();
        if (!auth) {
            this.clearState();
            return null;
        }
        return await this.initializeGateway(gateway, auth);
    }
    catch (e) {
        this.clearState();
        throw e;
    } }
    async selectWorkspace(id) { const g = this.requireGateway(); const w = this.workspaces.find(x => x.workspaceId === id); if (!w)
        throw new Error('ACTIVE_WORKSPACE_MEMBERSHIP_REQUIRED'); const hydrated = await g.switchWorkspace(w.workspaceId, w.name, this.identity?.userId); this.commitWorkspace(w, hydrated.contextPack); return hydrated; }
    async refreshContext() { const g = this.requireGateway(); const w = this.activeWorkspace; if (!w)
        throw new Error('ACTIVE_WORKSPACE_REQUIRED'); const hydrated = await g.hydrate(); this.commitWorkspace(w, hydrated.contextPack); return hydrated; }
    async createWorkspaceExplicitly(workspaceName) {
        const g = this.requireGateway();
        if (!this.identity)
            throw new Error('APP_SESSION_IDENTITY_REQUIRED');
        const name = workspaceName.trim();
        if (!name)
            throw new Error('WORKSPACE_NAME_REQUIRED');
        const workspaceId = `ws-${crypto.randomUUID()}`;
        await g.createWorkspaceExplicitly({ workspaceId, workspaceName: name });
        const directory = await g.discoverWorkspaces();
        if (directory.viewerUserId && directory.viewerUserId !== this.identity.userId)
            throw new Error('WORKSPACE_VIEWER_ID_MISMATCH');
        this.workspaces = directory.workspaces.map(copyWorkspace);
        const created = this.workspaces.find((workspace) => workspace.workspaceId === workspaceId);
        if (!created)
            throw new Error('CREATED_WORKSPACE_NOT_DISCOVERED');
        const hydrated = await g.switchWorkspace(created.workspaceId, created.name, this.identity.userId);
        this.commitWorkspace(created, hydrated.contextPack);
        return hydrated;
    }
    async saveFirstUseSetup(input) {
        const g = this.requireGateway();
        const w = this.activeWorkspace;
        const identity = this.identity;
        const pack = this.contextPack;
        if (!w || !identity || !pack)
            throw new Error('ACTIVE_WORKSPACE_REQUIRED');
        const all = [...pack.truth, ...pack.evidence, ...pack.recommendations, ...pack.operational, ...pack.candidates];
        const byId = new Map(all.map((item) => [`${item.objectType}:${item.objectId}`, item]));
        for (let index = 0; index < input.members.length; index++) {
            const member = input.members[index];
            const personId = `ONB-PERSON-${index + 1}-${safeIdToken(member.name)}`;
            const current = byId.get(`PERSON:${personId}`);
            await g.savePerson({ personId, expectedVersion: current?.version ?? 0, data: { name: member.name, role: member.role, source: 'FIRST_USE', relationship: 'TEAM_MEMBER', enteredByUserId: identity.userId } });
        }
        const projectId = `ONB-30D-${identity.userId.slice(0, 8)}`;
        const currentProject = byId.get(`PROJECT:${projectId}`);
        await g.saveProject({ projectId, expectedVersion: currentProject?.version ?? 0, confirmed: true, data: { name: '첫 30일 온보딩', title: '첫 30일 온보딩', goal: '팀과 업무를 이해하고 기대치를 정렬한 뒤 첫 실행과 회고까지 연결', ownerUserId: identity.userId, memberUserIds: [identity.userId], status: 'ACTIVE', source: 'FIRST_USE', onboarding: true } });
        for (let index = 0; index < input.myTasks.length; index++) {
            const task = input.myTasks[index];
            const actionId = `ONB-MY-${index + 1}-${safeIdToken(task.title)}`;
            const current = byId.get(`ACTION:${actionId}`);
            await g.saveAction({ actionId, expectedVersion: current?.version ?? 0, confirmed: true, accessScope: 'PRIVATE', granteeUserIds: [identity.userId], data: { title: task.title, reason: '팀장이 직접 등록한 첫 과제입니다.', status: 'OPEN', ownerUserId: identity.userId, projectId, source: 'FIRST_USE', humanEntered: true, attentionPriority: 100 - index } });
        }
        for (const template of FIRST_USE_30_DAY_TASKS) {
            const actionId = `ONB-30D-${template.id}`;
            const current = byId.get(`ACTION:${actionId}`);
            await g.saveAction({ actionId, expectedVersion: current?.version ?? 0, confirmed: true, accessScope: 'PRIVATE', granteeUserIds: [identity.userId], data: { title: template.title, reason: template.reason, status: 'OPEN', ownerUserId: identity.userId, projectId, source: 'ONBOARDING_TEMPLATE', onboarding: true, onboardingPhase: template.phase, onboardingDays: template.days, attentionPriority: template.attentionPriority } });
        }
        const hydrated = await g.hydrate();
        this.commitWorkspace(w, hydrated.contextPack);
        return hydrated;
    }
    async savePreferences(patch) { const g = this.requireGateway(); if (!this.preferences)
        throw new Error('PREFERENCES_REQUIRED'); const saved = await g.savePreferences(this.preferences.version, patch); if (this.identity && saved.viewerUserId && saved.viewerUserId !== this.identity.userId)
        throw new Error('PREFERENCE_VIEWER_ID_MISMATCH'); this.preferences = copyPreferences(saved.preferences); if (this.identity)
        this.identity = { ...this.identity, label: this.preferences.displayName ?? this.identity.email ?? `User ${this.identity.userId.slice(0, 8)}` }; this.bump(); return saved; }
    async reloadPreferences() { const g = this.requireGateway(); const latest = await g.getPreferences(); if (this.identity && latest.viewerUserId && latest.viewerUserId !== this.identity.userId)
        throw new Error('PREFERENCE_VIEWER_ID_MISMATCH'); this.preferences = copyPreferences(latest.preferences); if (this.identity)
        this.identity = { ...this.identity, label: this.preferences.displayName ?? this.identity.email ?? `User ${this.identity.userId.slice(0, 8)}` }; this.bump(); return latest; }
    async confirmDecision(input) { const g = this.requireGateway(); const w = this.activeWorkspace; if (!w || !this.contextPack)
        throw new Error('ACTIVE_WORKSPACE_REQUIRED'); await g.confirmDecision(input); const hydrated = await g.hydrate(); this.commitWorkspace(w, hydrated.contextPack); return hydrated; }
    async signOut() { const g = this.gateway; try {
        if (g)
            await g.signOut();
    }
    finally {
        if (!g)
            createLeaderOsGateway(this.config, this.transport, this.storage).auth.clearSession();
        this.clearState();
    } }
    disconnect() { this.gateway?.auth.clearSession(); if (!this.gateway)
        createLeaderOsGateway(this.config, this.transport, this.storage).auth.clearSession(); this.clearState(); }
    clearState() { this.gateway = null; this.identity = null; this.workspaces = []; this.preferences = null; this.activeWorkspace = null; this.contextPack = null; this.mode = 'DEMO'; this.bump(); }
}
