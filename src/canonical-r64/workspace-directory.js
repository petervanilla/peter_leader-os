function required(value, name) {
    const trimmed = value?.trim();
    if (!trimmed)
        throw new Error(`${name}_REQUIRED`);
    return trimmed;
}
export class WorkspaceDirectoryHttpError extends Error {
    code;
    status;
    constructor(code, status) {
        super(code);
        this.code = code;
        this.status = status;
        this.name = 'WorkspaceDirectoryHttpError';
    }
}
export class WorkspaceDirectoryClient {
    config;
    transport;
    endpoint;
    constructor(config, transport = fetch) {
        this.config = config;
        this.transport = transport;
        const base = required(config.supabaseUrl, 'SUPABASE_URL').replace(/\/+$/, '');
        required(config.publishableKey, 'SUPABASE_PUBLISHABLE_KEY');
        this.endpoint = `${base}/functions/v1/leader-os-workspaces`;
    }
    async list() {
        const accessToken = required(await this.config.accessTokenProvider(), 'SUPABASE_ACCESS_TOKEN');
        const response = await this.transport(this.endpoint, {
            method: 'POST',
            headers: {
                apikey: this.config.publishableKey,
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: '{}'
        });
        let payload = {};
        try {
            payload = await response.json();
        }
        catch { }
        if (!response.ok) {
            throw new WorkspaceDirectoryHttpError(typeof payload.error === 'string' ? payload.error : 'WORKSPACE_DISCOVERY_FAILED', response.status);
        }
        const raw = Array.isArray(payload.workspaces) ? payload.workspaces : [];
        const workspaces = raw.flatMap((value) => {
            if (!value || typeof value !== 'object')
                return [];
            const row = value;
            const role = String(row.role ?? '');
            if (!['OWNER', 'ADMIN', 'LEADER', 'MEMBER', 'VIEWER'].includes(role))
                return [];
            if (row.status !== 'ACTIVE')
                return [];
            const workspaceId = typeof row.workspaceId === 'string' ? row.workspaceId.trim() : '';
            const name = typeof row.name === 'string' ? row.name.trim() : '';
            if (!workspaceId || !name)
                return [];
            return [{
                    workspaceId,
                    name,
                    role,
                    status: 'ACTIVE',
                    joinedAt: typeof row.joinedAt === 'string' ? row.joinedAt : '',
                    createdAt: typeof row.createdAt === 'string' ? row.createdAt : '',
                    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : ''
                }];
        });
        return {
            schemaVersion: typeof payload.schemaVersion === 'string' ? payload.schemaVersion : '1',
            viewerUserId: typeof payload.viewerUserId === 'string' ? payload.viewerUserId : '',
            workspaces
        };
    }
}
export function chooseInitialWorkspace(workspaces, lastWorkspaceId, defaultWorkspaceId) {
    const active = workspaces.filter((workspace) => workspace.status === 'ACTIVE');
    if (active.length === 0) {
        return { selected: null, source: 'NO_WORKSPACE', requiresChoice: false };
    }
    const preferred = defaultWorkspaceId?.trim();
    if (preferred) {
        const found = active.find((workspace) => workspace.workspaceId === preferred);
        if (found)
            return { selected: found, source: 'DEFAULT_PREFERENCE', requiresChoice: false };
    }
    const last = lastWorkspaceId?.trim();
    if (last) {
        const found = active.find((workspace) => workspace.workspaceId === last);
        if (found)
            return { selected: found, source: 'LAST_USED', requiresChoice: false };
    }
    if (active.length === 1) {
        return { selected: active[0], source: 'ONLY_WORKSPACE', requiresChoice: false };
    }
    return { selected: null, source: 'USER_CHOICE_REQUIRED', requiresChoice: true };
}
export function workspaceStorageKey(userId) {
    return `leader-os:last-workspace:${userId}`;
}
