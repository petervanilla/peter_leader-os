export class SupabaseAuthError extends Error {
    code;
    status;
    constructor(code, status) {
        super(code);
        this.code = code;
        this.status = status;
        this.name = 'SupabaseAuthError';
    }
}
const required = (v, n) => { const t = v?.trim(); if (!t)
    throw new Error(`${n}_REQUIRED`); return t; };
function authErrorCode(p, f) { for (const k of ['error_code', 'code', 'error', 'msg', 'message']) {
    const v = p[k];
    if (typeof v === 'string' && v.trim())
        return v.trim();
} return f; }
function parseSession(p, now = Date.now()) { const accessToken = typeof p.access_token === 'string' ? p.access_token : null; if (!accessToken)
    return null; const refreshToken = typeof p.refresh_token === 'string' ? p.refresh_token : null; const expiresIn = Number(p.expires_in ?? 3600); const u = p.user && typeof p.user === 'object' ? p.user : {}; const userId = typeof u.id === 'string' ? u.id : ''; const email = typeof u.email === 'string' && u.email.trim() ? u.email.trim() : null; if (!userId)
    throw new SupabaseAuthError('AUTH_USER_ID_REQUIRED', 500); return { accessToken, refreshToken, expiresAt: now + Math.max(1, Number.isFinite(expiresIn) ? expiresIn : 3600) * 1000, userId, email }; }
function isSession(v) { if (!v || typeof v !== 'object')
    return false; const s = v; return typeof s.accessToken === 'string' && s.accessToken.length > 0 && (typeof s.refreshToken === 'string' || s.refreshToken === null) && typeof s.expiresAt === 'number' && Number.isFinite(s.expiresAt) && typeof s.userId === 'string' && s.userId.length > 0 && (typeof s.email === 'string' || s.email === null); }
function defaultStorageKey(baseUrl) { try {
    return `leader-os:auth:v1:${new URL(baseUrl).hostname}`;
}
catch {
    return 'leader-os:auth:v1';
} }
export class SupabasePasswordAuthClient {
    config;
    transport;
    baseUrl;
    session = null;
    refreshSkewMs;
    storage;
    storageKey;
    refreshInFlight = null;
    constructor(config, transport = fetch) {
        this.config = config;
        this.transport = transport;
        this.baseUrl = required(config.supabaseUrl, 'SUPABASE_URL').replace(/\/+$/, '');
        required(config.publishableKey, 'SUPABASE_PUBLISHABLE_KEY');
        this.refreshSkewMs = Math.max(5, config.refreshSkewSeconds ?? 60) * 1000;
        this.storage = config.storage ?? null;
        this.storageKey = config.storageKey?.trim() || defaultStorageKey(this.baseUrl);
    }
    currentSession() { return this.session ? { ...this.session } : null; }
    get persistedSessionKey() { return this.storageKey; }
    readPersistedSession() { if (!this.storage)
        return null; try {
        const raw = this.storage.getItem(this.storageKey);
        if (!raw)
            return null;
        const parsed = JSON.parse(raw);
        if (parsed.schemaVersion !== '1' || !isSession(parsed.session)) {
            this.removePersistedSession();
            return null;
        }
        return { ...parsed.session };
    }
    catch {
        this.removePersistedSession();
        return null;
    } }
    persistSession(s) { if (!this.storage)
        return; try {
        this.storage.setItem(this.storageKey, JSON.stringify({ schemaVersion: '1', session: s }));
    }
    catch { } }
    removePersistedSession() { if (!this.storage)
        return; try {
        if (this.storage.removeItem)
            this.storage.removeItem(this.storageKey);
        else
            this.storage.setItem(this.storageKey, '');
    }
    catch { } }
    commitSession(s) { this.session = { ...s }; this.persistSession(this.session); return this.currentSession(); }
    async request(path, init, fallback = 'SUPABASE_AUTH_REQUEST_FAILED') { const r = await this.transport(`${this.baseUrl}${path}`, { ...init, headers: { apikey: this.config.publishableKey, ...(init.headers ?? {}) } }); let p = {}; try {
        p = await r.json();
    }
    catch { } if (!r.ok)
        throw new SupabaseAuthError(authErrorCode(p, fallback), r.status); return p; }
    async post(path, body, accessToken) { return this.request(path, { method: 'POST', headers: { ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
    async validateAccessToken(s) { const p = await this.request('/auth/v1/user', { method: 'GET', headers: { Authorization: `Bearer ${s.accessToken}` } }, 'AUTH_SESSION_INVALID'); const userId = typeof p.id === 'string' ? p.id : ''; if (!userId || userId !== s.userId)
        throw new SupabaseAuthError('AUTH_SESSION_USER_MISMATCH', 401); const email = typeof p.email === 'string' && p.email.trim() ? p.email.trim() : s.email; return { ...s, email }; }
    async signInWithPassword(email, password) { const p = await this.post('/auth/v1/token?grant_type=password', { email: required(email, 'EMAIL'), password: required(password, 'PASSWORD') }); const s = parseSession(p); if (!s)
        throw new SupabaseAuthError('AUTH_SESSION_REQUIRED', 401); return this.commitSession(s); }
    async signUp(email, password) { const p = await this.post('/auth/v1/signup', { email: required(email, 'EMAIL'), password: required(password, 'PASSWORD') }); const s = parseSession(p); if (!s)
        throw new SupabaseAuthError('EMAIL_CONFIRMATION_REQUIRED', 202); return this.commitSession(s); }
    async refreshOnce() { const cur = this.session; const rt = cur?.refreshToken; if (!rt)
        throw new SupabaseAuthError('REFRESH_TOKEN_REQUIRED', 401); const p = await this.post('/auth/v1/token?grant_type=refresh_token', { refresh_token: rt }); const s = parseSession(p); if (!s)
        throw new SupabaseAuthError('AUTH_SESSION_REQUIRED', 401); if (cur?.userId && s.userId !== cur.userId)
        throw new SupabaseAuthError('AUTH_SESSION_USER_MISMATCH', 401); return this.commitSession(s); }
    async refresh() { if (this.refreshInFlight)
        return this.refreshInFlight; const pending = this.refreshOnce(); this.refreshInFlight = pending; try {
        return await pending;
    }
    finally {
        if (this.refreshInFlight === pending)
            this.refreshInFlight = null;
    } }
    async restoreSession() { const persisted = this.readPersistedSession(); if (!persisted)
        return null; this.session = persisted; try {
        if (Date.now() >= persisted.expiresAt - this.refreshSkewMs)
            return await this.refresh();
        return this.commitSession(await this.validateAccessToken(persisted));
    }
    catch (error) {
        let refreshError = null;
        if (persisted.refreshToken) {
            try {
                this.session = persisted;
                return await this.refresh();
            }
            catch (e) {
                refreshError = e;
            }
        }
        const transient = [error, refreshError].some(x => x instanceof SupabaseAuthError && x.status >= 500);
        if (transient) {
            this.session = null;
            throw (refreshError instanceof SupabaseAuthError && refreshError.status >= 500 ? refreshError : error);
        }
        this.clearSession();
        return null;
    } }
    async getAccessToken() { if (!this.session)
        throw new SupabaseAuthError('AUTH_SESSION_REQUIRED', 401); if (Date.now() >= this.session.expiresAt - this.refreshSkewMs)
        await this.refresh(); return this.session.accessToken; }
    async signOut() { const s = this.session ?? this.readPersistedSession(); try {
        if (s?.accessToken)
            await this.request('/auth/v1/logout?scope=local', { method: 'POST', headers: { Authorization: `Bearer ${s.accessToken}`, 'Content-Type': 'application/json' }, body: '{}' }, 'AUTH_SIGN_OUT_FAILED');
    }
    finally {
        this.clearSession();
    } }
    clearSession() { this.session = null; this.removePersistedSession(); }
}
