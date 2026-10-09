const DEFAULT_WORKING_HOURS = {
    start: '09:00',
    end: '18:00',
    weekdays: [1, 2, 3, 4, 5]
};
const DEFAULT_NOTIFICATIONS = {
    browser: false,
    email: false,
    dailyDigest: false
};
function required(value, name) {
    const trimmed = value?.trim();
    if (!trimmed)
        throw new Error(`${name}_REQUIRED`);
    return trimmed;
}
function asNullableString(value) {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
}
function asRoleMode(value) {
    const role = String(value ?? '');
    return ['EXECUTIVE', 'TEAM_LEADER', 'PROJECT_LEAD', 'INDIVIDUAL'].includes(role)
        ? role
        : null;
}
function asDefaultTodayView(value) {
    const view = String(value ?? 'ATTENTION');
    return ['ATTENTION', 'MY_PROJECTS', 'REVIEWS'].includes(view)
        ? view
        : 'ATTENTION';
}
function asWorkingHours(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return { ...DEFAULT_WORKING_HOURS, weekdays: [...DEFAULT_WORKING_HOURS.weekdays] };
    const row = value;
    const start = typeof row.start === 'string' ? row.start : DEFAULT_WORKING_HOURS.start;
    const end = typeof row.end === 'string' ? row.end : DEFAULT_WORKING_HOURS.end;
    const weekdays = Array.isArray(row.weekdays)
        ? [...new Set(row.weekdays.filter((item) => Number.isInteger(item) && Number(item) >= 1 && Number(item) <= 7).map(Number))].sort((a, b) => a - b)
        : [...DEFAULT_WORKING_HOURS.weekdays];
    return { start, end, weekdays: weekdays.length ? weekdays : [...DEFAULT_WORKING_HOURS.weekdays] };
}
function asNotifications(value) {
    const row = value && typeof value === 'object' && !Array.isArray(value)
        ? value
        : {};
    return {
        browser: row.browser === true,
        email: row.email === true,
        dailyDigest: row.dailyDigest === true
    };
}
function parseEnvelope(payload) {
    const rawPreferences = payload.preferences && typeof payload.preferences === 'object' && !Array.isArray(payload.preferences)
        ? payload.preferences
        : {};
    const userId = typeof rawPreferences.userId === 'string'
        ? rawPreferences.userId
        : typeof payload.viewerUserId === 'string' ? payload.viewerUserId : '';
    return {
        schemaVersion: typeof payload.schemaVersion === 'string' ? payload.schemaVersion : '1',
        viewerUserId: typeof payload.viewerUserId === 'string' ? payload.viewerUserId : userId,
        persisted: payload.persisted === true,
        preferences: {
            userId,
            version: Number.isInteger(Number(rawPreferences.version)) ? Number(rawPreferences.version) : 0,
            displayName: asNullableString(rawPreferences.displayName),
            defaultWorkspaceId: asNullableString(rawPreferences.defaultWorkspaceId),
            roleMode: asRoleMode(rawPreferences.roleMode),
            timezone: asNullableString(rawPreferences.timezone),
            workingHours: asWorkingHours(rawPreferences.workingHours),
            notificationPreferences: asNotifications(rawPreferences.notificationPreferences),
            defaultTodayView: asDefaultTodayView(rawPreferences.defaultTodayView),
            updatedAt: typeof rawPreferences.updatedAt === 'string' ? rawPreferences.updatedAt : null
        }
    };
}
export class UserPreferencesHttpError extends Error {
    code;
    status;
    constructor(code, status) {
        super(code);
        this.code = code;
        this.status = status;
        this.name = 'UserPreferencesHttpError';
    }
}
export class UserPreferencesClient {
    config;
    transport;
    endpoint;
    constructor(config, transport = fetch) {
        this.config = config;
        this.transport = transport;
        const base = required(config.supabaseUrl, 'SUPABASE_URL').replace(/\/+$/, '');
        required(config.publishableKey, 'SUPABASE_PUBLISHABLE_KEY');
        this.endpoint = `${base}/functions/v1/leader-os-preferences`;
    }
    async invoke(body) {
        const accessToken = required(await this.config.accessTokenProvider(), 'SUPABASE_ACCESS_TOKEN');
        const response = await this.transport(this.endpoint, {
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
            payload = await response.json();
        }
        catch { }
        if (!response.ok) {
            throw new UserPreferencesHttpError(typeof payload.error === 'string' ? payload.error : 'PREFERENCE_REQUEST_FAILED', response.status);
        }
        return parseEnvelope(payload);
    }
    get() {
        return this.invoke({ action: 'get' });
    }
    save(expectedVersion, patch) {
        if (!Number.isInteger(expectedVersion) || expectedVersion < 0)
            throw new Error('INVALID_EXPECTED_VERSION');
        return this.invoke({ action: 'save', expectedVersion, patch });
    }
}
export function browserTimezone() {
    try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        return timezone && timezone.trim() ? timezone : 'UTC';
    }
    catch {
        return 'UTC';
    }
}
export function preferenceTodayRoute(view) {
    if (view === 'MY_PROJECTS')
        return 'WORK';
    if (view === 'REVIEWS')
        return 'REVIEW';
    return 'TODAY';
}
