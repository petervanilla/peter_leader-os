const STRONG_VERDICTS = new Set(['USEFUL', 'WRONG']);
function unique(values) {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}
export function buildReviewQueue(items) {
    const accepted = [];
    const rejected = [];
    for (const item of Array.isArray(items) ? items : []) {
        if (!item?.recommendationId) {
            rejected.push({ recommendationId: null, reason: 'RECOMMENDATION_ID_REQUIRED' });
            continue;
        }
        if (item.reviewStatus !== 'PENDING_HUMAN_REVIEW') {
            rejected.push({ recommendationId: item.recommendationId, reason: 'PENDING_REVIEW_REQUIRED' });
            continue;
        }
        if (!item.reason?.trim()) {
            rejected.push({ recommendationId: item.recommendationId, reason: 'REASON_REQUIRED' });
            continue;
        }
        if (!Array.isArray(item.evidenceRefs) || unique(item.evidenceRefs).length === 0) {
            rejected.push({ recommendationId: item.recommendationId, reason: 'EVIDENCE_REQUIRED' });
            continue;
        }
        if (!Number.isFinite(item.confidence) || item.confidence < 0 || item.confidence > 1) {
            rejected.push({ recommendationId: item.recommendationId, reason: 'INVALID_CONFIDENCE' });
            continue;
        }
        accepted.push({
            ...item,
            summary: item.summary.trim(),
            reason: item.reason.trim(),
            evidenceRefs: unique(item.evidenceRefs)
        });
    }
    return { accepted, rejected };
}
export function validateReviewSubmission(input) {
    const violations = [];
    const refs = unique(input.outcomeEvidenceRefs ?? []);
    if (!input.recommendationId)
        violations.push('RECOMMENDATION_ID_REQUIRED');
    if (!['USEFUL', 'NOT_USEFUL', 'WRONG', 'NEEDS_MORE_EVIDENCE'].includes(input.verdict)) {
        violations.push('INVALID_VERDICT');
    }
    if (input.reviewerType !== 'HUMAN' || !input.reviewerId) {
        violations.push('HUMAN_REVIEW_REQUIRED');
    }
    if (STRONG_VERDICTS.has(input.verdict) && refs.length === 0) {
        violations.push('OUTCOME_EVIDENCE_REQUIRED');
    }
    return {
        ok: violations.length === 0,
        violations,
        normalized: {
            recommendationId: input.recommendationId,
            verdict: input.verdict,
            outcomeEvidenceRefs: refs,
            reviewerType: input.reviewerType,
            reviewerId: input.reviewerId,
            notes: input.notes?.trim() ?? ''
        }
    };
}
export function buildReviewSubmission(input) {
    const validation = validateReviewSubmission(input);
    if (!validation.ok)
        return { ok: false, violations: validation.violations };
    return {
        ok: true,
        submission: {
            ...validation.normalized,
            reviewerType: 'HUMAN',
            reviewStatus: 'FINAL',
            truthMutationAllowed: false,
            personRatingAllowed: false
        }
    };
}
