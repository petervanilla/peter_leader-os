import { buildTodayView } from './today.js';
const verbs = new Set(['DECIDE', 'TALK', 'PREPARE', 'UNBLOCK', 'FOLLOW_UP', 'ALIGN', 'REVIEW']);
function stringValue(data, ...keys) {
    for (const key of keys) {
        const value = data[key];
        if (typeof value === 'string' && value.trim())
            return value.trim();
    }
    return null;
}
function numberValue(data, key, fallback) {
    const value = Number(data[key]);
    return Number.isFinite(value) ? value : fallback;
}
function refs(item) {
    const raw = item.data.evidenceRefs;
    const values = Array.isArray(raw) ? raw.map(String).map((x) => x.trim()).filter(Boolean) : [];
    return [...new Set([item.objectId, ...values])];
}
function explicitAttention(item) {
    if (item.objectType !== 'ATTENTION')
        return null;
    const verb = stringValue(item.data, 'verb');
    const title = stringValue(item.data, 'title');
    const reason = stringValue(item.data, 'reason', 'why');
    if (!verb || !verbs.has(verb) || !title || !reason)
        return null;
    return {
        id: item.objectId,
        verb,
        title,
        reason,
        evidenceRefs: refs(item),
        confidence: Math.min(1, Math.max(0, numberValue(item.data, 'confidence', 0.8))),
        attentionPriority: numberValue(item.data, 'attentionPriority', 80),
        criticality: ['P0', 'P1', 'P2', 'P3'].includes(String(item.data.criticality)) ? item.data.criticality : undefined,
        humanPinned: item.data.humanPinned === true
    };
}
function derivedAttention(item) {
    const d = item.data;
    if (item.objectType === 'RECOMMENDATION') {
        return {
            id: `LIVE-${item.objectId}`,
            verb: 'REVIEW',
            title: stringValue(d, 'title', 'recommendation', 'summary') ?? `추천 검수 · ${item.objectId}`,
            reason: stringValue(d, 'reason', 'why') ?? 'Human Review가 필요한 Recommendation입니다.',
            evidenceRefs: refs(item),
            confidence: Math.min(1, Math.max(0, numberValue(d, 'confidence', 0.7))),
            attentionPriority: 75
        };
    }
    if (item.objectType === 'ACTION' || item.objectType === 'COMMITMENT') {
        return {
            id: `LIVE-${item.objectId}`,
            verb: 'FOLLOW_UP',
            title: stringValue(d, 'title', 'text', 'what', 'summary') ?? `${item.objectType} 후속 확인`,
            reason: stringValue(d, 'reason', 'why', 'status') ?? `열린 ${item.objectType}의 진행 상태를 확인합니다.`,
            evidenceRefs: refs(item),
            confidence: 0.85,
            attentionPriority: numberValue(d, 'attentionPriority', item.objectType === 'COMMITMENT' ? 72 : 68)
        };
    }
    if (item.objectType === 'PROJECT') {
        const name = stringValue(d, 'name', 'title') ?? item.objectId;
        const blocker = stringValue(d, 'blocker', 'knownRisk');
        const openDecision = stringValue(d, 'openDecision');
        if (blocker)
            return {
                id: `LIVE-${item.objectId}-BLOCKER`, verb: 'UNBLOCK', title: `${name} 막힘 확인`, reason: blocker,
                evidenceRefs: refs(item), confidence: 0.9, attentionPriority: 82, criticality: 'P1',
                subject: { type: 'PROJECT', id: item.objectId, label: name }
            };
        if (openDecision)
            return {
                id: `LIVE-${item.objectId}-DECISION`, verb: 'DECIDE', title: `${name} 결정 필요`, reason: openDecision,
                evidenceRefs: refs(item), confidence: 0.9, attentionPriority: 78, criticality: 'P2',
                subject: { type: 'PROJECT', id: item.objectId, label: name }
            };
        return null;
    }
    if (item.objectType === 'DECISION') {
        const reviewDate = stringValue(d, 'reviewDate');
        if (!reviewDate)
            return null;
        return {
            id: `LIVE-${item.objectId}-REVIEW`, verb: 'REVIEW',
            title: `결정 리뷰 · ${stringValue(d, 'what', 'title') ?? item.objectId}`,
            reason: `Review date ${reviewDate} · 결정의 결과와 전제를 다시 확인합니다.`,
            evidenceRefs: refs(item), confidence: 0.95, attentionPriority: 64,
            subject: { type: 'DECISION', id: item.objectId, label: stringValue(d, 'what', 'title') ?? item.objectId }
        };
    }
    return null;
}
export function buildLiveTodayProjection(pack) {
    const all = [...pack.truth, ...pack.evidence, ...pack.recommendations, ...pack.operational, ...pack.candidates];
    const explicit = all.map(explicitAttention).filter((x) => Boolean(x));
    const candidates = explicit.length > 0
        ? explicit
        : all.map(derivedAttention).filter((x) => Boolean(x));
    return {
        today: buildTodayView(candidates),
        counts: pack.counts,
        viewerRole: pack.viewerRole,
        generatedAt: pack.generatedAt,
        workspaceId: pack.workspaceId,
        source: 'RUNTIME_CONTEXT'
    };
}
