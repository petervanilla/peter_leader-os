function refs(values) {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
export function validateDecisionDraft(input) {
    const violations = [];
    if (!input?.id)
        violations.push('DECISION_ID_REQUIRED');
    if (!input?.what?.trim())
        violations.push('DECISION_WHAT_REQUIRED');
    if (!input?.why?.trim())
        violations.push('DECISION_WHY_REQUIRED');
    if (refs(input?.evidenceRefs ?? []).length === 0)
        violations.push('DECISION_EVIDENCE_REQUIRED');
    if (!input?.owner?.trim())
        violations.push('DECISION_OWNER_REQUIRED');
    if (!input?.reviewDate?.trim())
        violations.push('DECISION_REVIEW_DATE_REQUIRED');
    return { ok: violations.length === 0, violations };
}
export function confirmDecision(input, reviewer) {
    const validation = validateDecisionDraft(input);
    if (!validation.ok)
        return { ok: false, error: 'INVALID_DECISION', violations: validation.violations };
    if (reviewer.type !== 'HUMAN' || !reviewer.id) {
        return { ok: false, error: 'HUMAN_CONFIRMATION_REQUIRED' };
    }
    return {
        ok: true,
        decision: {
            ...input,
            what: input.what.trim(),
            why: input.why.trim(),
            evidenceRefs: refs(input.evidenceRefs),
            owner: input.owner.trim(),
            reviewDate: input.reviewDate.trim(),
            status: 'CONFIRMED',
            confirmedBy: { type: 'HUMAN', id: reviewer.id }
        }
    };
}
export function proposeDecisionImpact(input) {
    return {
        decisionId: input.decisionId,
        affectedProjectIds: [...new Set(input.affectedProjectIds ?? [])],
        suggestedDateChanges: input.suggestedDateChanges ?? [],
        appliedAutomatically: false,
        humanReviewRequired: true
    };
}
export function decisionDraftFromContext(item) {
    if (item.objectType !== 'DECISION')
        return { ok: false, error: 'DECISION_CONTEXT_REQUIRED' };
    const data = item.data;
    const text = (key) => typeof data[key] === 'string' && String(data[key]).trim() ? String(data[key]).trim() : '';
    const evidenceRefs = Array.isArray(data.evidenceRefs)
        ? data.evidenceRefs.filter((value) => typeof value === 'string').map((value) => value.trim()).filter(Boolean)
        : [];
    const draft = {
        id: item.objectId,
        what: text('what') || text('title'),
        why: text('why') || text('reason'),
        evidenceRefs,
        owner: text('owner') || text('ownerUserId'),
        reviewDate: text('reviewDate'),
        status: item.confirmed ? 'CONFIRMED' : 'DRAFT'
    };
    const validation = validateDecisionDraft(draft);
    return validation.ok
        ? { ok: true, draft }
        : { ok: false, error: 'INVALID_DECISION', violations: validation.violations, draft };
}
