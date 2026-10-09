import { LeaderOsRuntimeClient, allContextItems } from './runtime.js';
import { createRuntimeRepositories } from './runtime-repositories.js';
import { SupabasePasswordAuthClient } from './supabase-auth.js';
import { WorkspaceDirectoryClient } from './workspace-directory.js';
import { UserPreferencesClient } from './user-preferences.js';
export function projectGatewayContext(pack) { const items = allContextItems(pack); return { workspaceId: pack.workspaceId, viewerRole: pack.viewerRole, generatedAt: pack.generatedAt, counts: pack.counts, people: items.filter(x => x.objectType === 'PERSON'), projects: items.filter(x => x.objectType === 'PROJECT'), decisions: items.filter(x => x.objectType === 'DECISION'), evidence: pack.evidence }; }
const clean = (v) => typeof v === 'string' && v.trim() ? v.trim() : null;
export class LeaderOsGateway {
    config;
    auth;
    runtime;
    directory;
    preferences;
    activeWorkspaceId;
    activeWorkspaceName;
    repos;
    constructor(config, transport = fetch, storage = null) {
        this.config = config;
        this.auth = new SupabasePasswordAuthClient({ supabaseUrl: config.supabaseUrl, publishableKey: config.publishableKey, storage }, transport);
        const common = { supabaseUrl: config.supabaseUrl, publishableKey: config.publishableKey, accessTokenProvider: () => this.auth.getAccessToken() };
        this.runtime = new LeaderOsRuntimeClient(common, transport);
        this.directory = new WorkspaceDirectoryClient(common, transport);
        this.preferences = new UserPreferencesClient(common, transport);
        this.activeWorkspaceId = clean(config.workspaceId);
        this.activeWorkspaceName = config.workspaceName?.trim() || this.activeWorkspaceId;
        this.repos = this.activeWorkspaceId ? createRuntimeRepositories({ runtime: this.runtime, workspaceId: this.activeWorkspaceId, idFactory: config.idFactory }) : null;
    }
    get currentWorkspaceId() { return this.activeWorkspaceId; }
    get repositories() { if (!this.repos)
        throw new Error('ACTIVE_WORKSPACE_REQUIRED'); return this.repos; }
    commitWorkspace(id, name) { this.activeWorkspaceId = id; this.activeWorkspaceName = name?.trim() || id; this.repos = createRuntimeRepositories({ runtime: this.runtime, workspaceId: id, idFactory: this.config.idFactory }); }
    signInWithPassword(email, password) { return this.auth.signInWithPassword(email, password); }
    restoreSession() { return this.auth.restoreSession(); }
    signUp(email, password) { return this.auth.signUp(email, password); }
    signOut() { return this.auth.signOut(); }
    discoverWorkspaces() { return this.directory.list(); }
    getPreferences() { return this.preferences.get(); }
    savePreferences(v, p) { return this.preferences.save(v, p); }
    async createWorkspaceExplicitly(input) {
        const workspaceId = clean(input.workspaceId);
        const workspaceName = clean(input.workspaceName);
        if (!workspaceId)
            throw new Error('WORKSPACE_ID_REQUIRED');
        if (!workspaceName)
            throw new Error('WORKSPACE_NAME_REQUIRED');
        return this.runtime.bootstrapWorkspace({ workspaceId, workspaceName });
    }
    async switchWorkspace(id, name, expectedUserId) { const requested = clean(id); if (!requested)
        throw new Error('WORKSPACE_ID_REQUIRED'); const result = await this.runtime.getContext(requested); if (!result.contextPack)
        throw new Error('CONTEXT_PACK_REQUIRED'); if (result.contextPack.workspaceId !== requested)
        throw new Error('CONTEXT_WORKSPACE_ID_MISMATCH'); if (expectedUserId && result.contextPack.viewerUserId !== expectedUserId)
        throw new Error('CONTEXT_VIEWER_ID_MISMATCH'); this.commitWorkspace(requested, name); return { requestId: result.requestId, contextPack: result.contextPack, projection: projectGatewayContext(result.contextPack) }; }
    async hydrate() { if (!this.activeWorkspaceId)
        throw new Error('ACTIVE_WORKSPACE_REQUIRED'); const result = await this.runtime.getContext(this.activeWorkspaceId); if (!result.contextPack)
        throw new Error('CONTEXT_PACK_REQUIRED'); if (result.contextPack.workspaceId !== this.activeWorkspaceId)
        throw new Error('CONTEXT_WORKSPACE_ID_MISMATCH'); return { requestId: result.requestId, contextPack: result.contextPack, projection: projectGatewayContext(result.contextPack) }; }
    async connect() { if (!this.activeWorkspaceId)
        throw new Error('ACTIVE_WORKSPACE_REQUIRED'); await this.runtime.bootstrapWorkspace({ workspaceId: this.activeWorkspaceId, workspaceName: this.activeWorkspaceName || this.activeWorkspaceId }); return this.hydrate(); }
    setWorkspace(id, name) { const next = clean(id); if (!next)
        throw new Error('WORKSPACE_ID_REQUIRED'); this.commitWorkspace(next, name); return next; }
    savePerson(input) { return this.repositories.team.savePerson(input); }
    saveProject(input) { return this.repositories.projects.save(input); }
    saveAction(input) { return this.repositories.actions.save(input); }
    analyzeOpicker(input) { return this.repositories.addonEvidence.analyze(input); }
    reviewAddonEvidence(input) { return this.repositories.addonEvidence.review(input); }
    confirmDecision(input) { return this.repositories.decisions.confirm(input); }
}
export const createLeaderOsGateway = (config, transport = fetch, storage = null) => new LeaderOsGateway(config, transport, storage);
