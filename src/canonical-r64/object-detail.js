const routeConfig = {
    PERSON: { prefix: 'people', parentRouteId: 'PEOPLE' },
    PROJECT: { prefix: 'work', parentRouteId: 'WORK' },
    MEETING: { prefix: 'meetings', parentRouteId: 'MEETINGS' },
    DECISION: { prefix: 'decisions', parentRouteId: 'DECISIONS' }
};
export function objectRoute(objectType, objectId) {
    if (!(objectType in routeConfig) || !objectId.trim())
        return null;
    const config = routeConfig[objectType];
    return `/${config.prefix}/${encodeURIComponent(objectId.trim())}`;
}
export function parseObjectRoute(hashOrPath) {
    const raw = hashOrPath.replace(/^#/, '').replace(/^\//, '');
    const [prefix, encodedId, ...rest] = raw.split('/');
    if (!prefix || !encodedId || rest.length > 0)
        return null;
    const entry = Object.entries(routeConfig).find(([, config]) => config.prefix === prefix);
    if (!entry)
        return null;
    const [objectType, config] = entry;
    try {
        const objectId = decodeURIComponent(encodedId).trim();
        if (!objectId)
            return null;
        return { objectType, objectId, parentRouteId: config.parentRouteId, path: `/${prefix}/${encodeURIComponent(objectId)}` };
    }
    catch {
        return null;
    }
}
export function buildSharePolicy(accessScope) {
    if (accessScope === 'PRIVATE') {
        return {
            accessScope,
            canPrepareShare: false,
            canCopyLink: false,
            requiresRecipientCheck: false,
            label: '나만',
            reason: 'PRIVATE Context는 공유 초안과 링크 복사를 차단합니다.'
        };
    }
    if (accessScope === 'RESTRICTED') {
        return {
            accessScope,
            canPrepareShare: true,
            canCopyLink: true,
            requiresRecipientCheck: true,
            label: '특정 멤버',
            reason: 'RESTRICTED Context는 수신자의 접근 권한을 확인한 뒤에만 공유합니다.'
        };
    }
    return {
        accessScope,
        canPrepareShare: true,
        canCopyLink: true,
        requiresRecipientCheck: false,
        label: 'Workspace',
        reason: 'Workspace 멤버에게 공유할 수 있습니다. 외부 전송은 사람이 최종 실행합니다.'
    };
}
function stringValue(data, ...keys) {
    for (const key of keys) {
        const value = data[key];
        if (typeof value === 'string' && value.trim())
            return value.trim();
    }
    return null;
}
export function objectTitle(item) {
    return stringValue(item.data, 'name', 'title', 'what', 'summary', 'text') ?? item.objectId;
}
export function objectSummary(item) {
    return stringValue(item.data, 'reason', 'why', 'goal', 'currentPriority', 'status', 'summary')
        ?? `${item.objectType} Context`;
}
export function objectDetailRows(item) {
    const rows = [
        ['ID', item.objectId],
        ['Version', String(item.version)],
        ['Confirmed', item.confirmed ? 'YES' : 'NO'],
        ['Scope', item.accessScope],
        ['Updated', item.updatedAt],
        ['Owner', stringValue(item.data, 'owner')],
        ['Role', stringValue(item.data, 'role')],
        ['Goal', stringValue(item.data, 'goal')],
        ['Priority', stringValue(item.data, 'currentPriority')],
        ['Project', stringValue(item.data, 'currentProject')],
        ['Blocker', stringValue(item.data, 'blocker', 'knownRisk')],
        ['Open decision', stringValue(item.data, 'openDecision')],
        ['Why', stringValue(item.data, 'why', 'reason')],
        ['Review date', stringValue(item.data, 'reviewDate')]
    ];
    return rows.filter((row) => Boolean(row[1]));
}
export function findContextItem(pack, objectType, objectId) {
    const all = [
        ...pack.truth,
        ...pack.evidence,
        ...pack.recommendations,
        ...pack.operational,
        ...pack.candidates
    ];
    return all.find((item) => item.objectType === objectType && item.objectId === objectId) ?? null;
}
export function buildShareDraft(item, url, recipientChecked = false) {
    const policy = buildSharePolicy(item.accessScope);
    if (!policy.canPrepareShare)
        return { ok: false, error: 'PRIVATE_SHARE_BLOCKED', policy };
    if (policy.requiresRecipientCheck && !recipientChecked) {
        return { ok: false, error: 'RECIPIENT_PERMISSION_CHECK_REQUIRED', policy };
    }
    return {
        ok: true,
        policy,
        text: [
            `Leader OS · ${item.objectType}`,
            objectTitle(item),
            objectSummary(item),
            `상태: ${item.confirmed ? 'Confirmed' : 'Needs review'} · 범위: ${policy.label}`,
            `링크: ${url}`,
            '',
            'Human preview required before external send.'
        ].join('\n')
    };
}
