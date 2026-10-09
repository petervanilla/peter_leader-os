export function buildMeetingView(input) {
    const captures = (input.captures ?? [])
        .filter((item) => item?.id && item?.text?.trim())
        .map((item) => ({
        ...item,
        text: item.text.trim(),
        evidenceRefs: [...new Set((item.evidenceRefs ?? []).filter(Boolean))],
        status: 'CANDIDATE',
        humanReviewRequired: ['DECISION', 'COMMITMENT', 'MEMORY_CANDIDATE', 'ACTION'].includes(item.type),
        confirmed: false
    }));
    return {
        view: 'MEETING',
        meetingId: input.id,
        title: input.title,
        before: {
            objective: input.objective ?? null,
            prepQuestions: input.prepQuestions ?? []
        },
        during: {
            participants: input.participants ?? [],
            liveCaptureAllowed: true
        },
        after: {
            captures
        },
        directFactWrite: false,
        directMemoryWrite: false
    };
}
export function validateMeetingView(view) {
    const violations = [];
    if (view.directFactWrite !== false)
        violations.push('DIRECT_FACT_WRITE_PROHIBITED');
    if (view.directMemoryWrite !== false)
        violations.push('DIRECT_MEMORY_WRITE_PROHIBITED');
    for (const item of view.after.captures) {
        if (item.confirmed !== false)
            violations.push('CAPTURE_MUST_START_UNCONFIRMED');
        if (['DECISION', 'COMMITMENT', 'MEMORY_CANDIDATE', 'ACTION'].includes(item.type)
            && item.humanReviewRequired !== true) {
            violations.push('HUMAN_REVIEW_REQUIRED');
        }
    }
    return { ok: violations.length === 0, violations };
}
