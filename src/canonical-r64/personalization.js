import { allContextItems } from './runtime.js';
const stringArray = (value) => Array.isArray(value)
    ? [...new Set(value.filter((item) => typeof item === 'string').map((item) => item.trim()).filter(Boolean))]
    : [];
function projectExplicitlyBelongsToUser(project, userId) {
    const data = project.data;
    const ownerUserId = typeof data.ownerUserId === 'string' ? data.ownerUserId.trim() : '';
    if (ownerUserId === userId)
        return true;
    const membershipKeys = ['memberUserIds', 'assigneeUserIds', 'leadUserIds'];
    return membershipKeys.some((key) => stringArray(data[key]).includes(userId));
}
export function normalizePersonalPreferences(input = {}) {
    const clean = (value) => typeof value === 'string' && value.trim() ? value.trim() : null;
    const roleMode = ['EXECUTIVE', 'TEAM_LEADER', 'PROJECT_LEAD', 'INDIVIDUAL'].includes(String(input.roleMode ?? ''))
        ? input.roleMode
        : null;
    return {
        displayName: clean(input.displayName),
        roleMode,
        defaultWorkspaceId: clean(input.defaultWorkspaceId),
        timezone: clean(input.timezone)
    };
}
export function buildPersonalHome(pack, preferences = {}) {
    const all = allContextItems(pack);
    const accessibleProjects = all.filter((item) => item.objectType === 'PROJECT');
    const myProjects = accessibleProjects.filter((project) => projectExplicitlyBelongsToUser(project, pack.viewerUserId));
    return {
        userId: pack.viewerUserId,
        workspaceId: pack.workspaceId,
        viewerRole: pack.viewerRole,
        accessibleProjects,
        myProjects,
        explicitOwnershipCount: myProjects.length,
        preferences: normalizePersonalPreferences(preferences),
        personalizationSource: 'EXPLICIT_ONLY'
    };
}
export function personalizationSafetyContract() {
    return {
        inferPersonality: false,
        inferPerformanceRating: false,
        inferPoliticalOrSensitiveTraits: false,
        inferProjectOwnershipFromNames: false,
        explicitPreferencesOnly: true,
        confirmedWorkspaceMembershipOnly: true,
        privateContextAutoShare: false
    };
}
