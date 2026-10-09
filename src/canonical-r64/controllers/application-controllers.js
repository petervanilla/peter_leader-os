export class AuthController {
    session;
    constructor(session) {
        this.session = session;
    }
    signIn(email, password) { return this.session.signInWithPassword(email, password); }
    restore() { return this.session.restoreSession(); }
    signOut() { return this.session.signOut(); }
    get identity() { return this.session.currentIdentity; }
    get isSignedIn() { return this.session.isSignedIn; }
}
export class WorkspaceController {
    session;
    constructor(session) {
        this.session = session;
    }
    list() { return this.session.currentWorkspaces; }
    byId(workspaceId) { return this.session.workspaceById(workspaceId); }
    select(workspaceId) { return this.session.selectWorkspace(workspaceId); }
    create(workspaceName) { return this.session.createWorkspaceExplicitly(workspaceName); }
    get active() { return this.session.currentWorkspace; }
}
export class PreferencesController {
    session;
    constructor(session) {
        this.session = session;
    }
    get current() { return this.session.currentPreferences; }
    save(patch) { return this.session.savePreferences(patch); }
    reload() { return this.session.reloadPreferences(); }
}
export class ContextController {
    session;
    constructor(session) {
        this.session = session;
    }
    get current() { return this.session.currentContextPack; }
    refresh() { return this.session.refreshContext(); }
}
export class DomainActionController {
    session;
    constructor(session) {
        this.session = session;
    }
    confirmDecision(input) {
        return this.session.confirmDecision(input);
    }
    completeFirstUse(input) {
        return this.session.saveFirstUseSetup(input);
    }
}
export const createLeaderOsControllers = (session) => ({
    auth: new AuthController(session),
    workspaces: new WorkspaceController(session),
    preferences: new PreferencesController(session),
    context: new ContextController(session),
    domainActions: new DomainActionController(session)
});
