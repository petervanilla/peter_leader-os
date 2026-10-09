const DELTA = {
    USEFUL: 1,
    NOT_USEFUL: -1,
    WRONG: -2,
    NEEDS_MORE_EVIDENCE: 0
};
const PROHIBITED_DIMENSIONS = new Set([
    'personId', 'employeeId', 'email', 'personality', 'performanceRating',
    'motivation', 'potential', 'promotionReadiness', 'loyalty', 'cultureFit'
]);
export function aggregateLearning(observations, minimumSamples = 3) {
    const accepted = [];
    const rejected = [];
    for (const observation of observations ?? []) {
        if (observation.reviewedBy?.type !== 'HUMAN') {
            rejected.push({ reason: 'HUMAN_FINAL_REVIEW_REQUIRED' });
            continue;
        }
        if (Object.keys(observation.dimensions ?? {}).some((key) => PROHIBITED_DIMENSIONS.has(key))) {
            rejected.push({ reason: 'PEOPLE_LEARNING_DIMENSION_PROHIBITED' });
            continue;
        }
        accepted.push(observation);
    }
    const grouped = new Map();
    for (const observation of accepted) {
        const rows = grouped.get(observation.recommendationType) ?? [];
        rows.push(observation);
        grouped.set(observation.recommendationType, rows);
    }
    const profiles = [...grouped.entries()].map(([recommendationType, rows]) => {
        const raw = rows.reduce((sum, row) => sum + DELTA[row.verdict], 0);
        const sufficientEvidence = rows.length >= minimumSamples;
        return {
            recommendationType,
            sampleCount: rows.length,
            sufficientEvidence,
            appliedWeight: sufficientEvidence ? Math.max(-3, Math.min(3, raw)) : 0,
            truthMutationAllowed: false,
            personRatingAllowed: false,
            autoPriorityChangeAllowed: false
        };
    });
    return { acceptedCount: accepted.length, rejected, profiles };
}
