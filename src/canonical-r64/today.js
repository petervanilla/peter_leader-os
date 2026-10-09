const ALLOWED_VERBS = new Set([
    'DECIDE',
    'TALK',
    'PREPARE',
    'UNBLOCK',
    'FOLLOW_UP',
    'ALIGN',
    'REVIEW'
]);
const criticalityWeight = {
    P0: 1000,
    P1: 500,
    P2: 100,
    P3: 0
};
function uniqueRefs(values) {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
function validateCandidate(candidate) {
    if (!candidate?.id)
        return 'ATTENTION_ID_REQUIRED';
    if (!ALLOWED_VERBS.has(candidate.verb))
        return 'INVALID_ATTENTION_VERB';
    if (!candidate.title?.trim())
        return 'ATTENTION_TITLE_REQUIRED';
    if (!candidate.reason?.trim())
        return 'ATTENTION_REASON_REQUIRED';
    if (!Array.isArray(candidate.evidenceRefs) || uniqueRefs(candidate.evidenceRefs).length === 0) {
        return 'ATTENTION_EVIDENCE_REQUIRED';
    }
    if (!Number.isFinite(candidate.confidence) || candidate.confidence < 0 || candidate.confidence > 1) {
        return 'INVALID_ATTENTION_CONFIDENCE';
    }
    if (!Number.isFinite(candidate.attentionPriority))
        return 'ATTENTION_PRIORITY_REQUIRED';
    return null;
}
function rankingValue(candidate) {
    const pinWeight = candidate.humanPinned === true ? 10000 : 0;
    const criticalWeight = candidate.criticality
        ? criticalityWeight[candidate.criticality]
        : 0;
    return pinWeight + criticalWeight + candidate.attentionPriority;
}
export function buildTodayView(candidates) {
    const accepted = [];
    const rejected = [];
    for (const candidate of Array.isArray(candidates) ? candidates : []) {
        const error = validateCandidate(candidate);
        if (error) {
            rejected.push({ id: candidate?.id ?? null, reason: error });
            continue;
        }
        accepted.push({
            ...candidate,
            title: candidate.title.trim(),
            reason: candidate.reason.trim(),
            evidenceRefs: uniqueRefs(candidate.evidenceRefs),
            confidenceIsNotTruth: true,
            peopleScore: null
        });
    }
    accepted.sort((a, b) => {
        const diff = rankingValue(b) - rankingValue(a);
        return diff !== 0 ? diff : a.id.localeCompare(b.id);
    });
    return {
        view: 'TODAY',
        maxAttention: 3,
        attention: accepted.slice(0, 3),
        rejected
    };
}
export function validateTodayView(view) {
    const violations = [];
    if (view.view !== 'TODAY')
        violations.push('TODAY_VIEW_REQUIRED');
    if (view.maxAttention !== 3)
        violations.push('TODAY_TOP3_CONTRACT_BROKEN');
    if (!Array.isArray(view.attention) || view.attention.length > 3) {
        violations.push('TODAY_ATTENTION_LIMIT_BROKEN');
    }
    for (const item of view.attention ?? []) {
        if (item.peopleScore !== null)
            violations.push('PEOPLE_SCORE_PROHIBITED');
        if (item.confidenceIsNotTruth !== true)
            violations.push('CONFIDENCE_TRUTH_BOUNDARY_REQUIRED');
        if (item.evidenceRefs.length === 0)
            violations.push('ATTENTION_EVIDENCE_REQUIRED');
    }
    return { ok: violations.length === 0, violations };
}
