export function buildLeadershipReport(input) {
    const metrics = (input.metrics ?? []).map((metric) => ({
        ...metric,
        delta: Number.isFinite(metric.previousValue)
            ? metric.value - Number(metric.previousValue)
            : null
    }));
    return {
        view: 'LEADERSHIP_REPORT',
        periodLabel: input.periodLabel,
        peopleRanking: false,
        personScores: [],
        metrics,
        unresolvedAttention: (input.unresolvedAttention ?? []).slice(0, 10),
        reviewVerdicts: {
            USEFUL: input.reviewVerdicts?.USEFUL ?? 0,
            NOT_USEFUL: input.reviewVerdicts?.NOT_USEFUL ?? 0,
            WRONG: input.reviewVerdicts?.WRONG ?? 0,
            NEEDS_MORE_EVIDENCE: input.reviewVerdicts?.NEEDS_MORE_EVIDENCE ?? 0
        },
        addonEvidencePending: input.addonEvidencePending ?? 0,
        interpretation: 'OPERATING_SYSTEM_ONLY'
    };
}
export function validateLeadershipReport(report) {
    const violations = [];
    if (report.peopleRanking !== false)
        violations.push('PEOPLE_RANKING_PROHIBITED');
    if (report.personScores.length > 0)
        violations.push('PERSON_SCORES_PROHIBITED');
    if (report.interpretation !== 'OPERATING_SYSTEM_ONLY')
        violations.push('REPORT_SCOPE_BROKEN');
    if (report.metrics.some((m) => m.value < 0 || m.value > 100))
        violations.push('OPERATING_METRIC_RANGE');
    return { ok: violations.length === 0, violations };
}
