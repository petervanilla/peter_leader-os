export function buildSkillRun(skill) {
    return {
        skillId: skill.id,
        name: skill.name,
        mode: skill.mode,
        scope: skill.scope,
        stages: ['ENTRY', 'WHY_NOW', 'PREPARE', 'RUN', 'CAPTURE', 'DECISION', 'ACTION', 'FOLLOW_UP', 'REVIEW'],
        currentStage: 'ENTRY',
        whyNow: skill.whyNow,
        prepare: skill.prepare,
        run: skill.run,
        captures: [],
        humanDecisionRequired: true,
        completed: false
    };
}
export function captureSkillOutput(run, input) {
    if (!input.text?.trim())
        return { ok: false, error: 'CAPTURE_TEXT_REQUIRED' };
    const allowed = new Set(['DECISION_CANDIDATE', 'ACTION_CANDIDATE', 'COMMITMENT_CANDIDATE', 'OPEN_QUESTION', 'FOLLOW_UP']);
    if (!allowed.has(input.type))
        return { ok: false, error: 'UNSAFE_SKILL_CAPTURE_TYPE' };
    return {
        ok: true,
        run: {
            ...run,
            currentStage: 'CAPTURE',
            captures: [...run.captures, { type: input.type, text: input.text.trim(), confirmed: false }]
        }
    };
}
export function finalizeSkillRun(run, reviewer) {
    if (reviewer.type !== 'HUMAN' || !reviewer.id)
        return { ok: false, error: 'HUMAN_REVIEW_REQUIRED' };
    return { ok: true, run: { ...run, currentStage: 'REVIEW', completed: true, reviewedBy: { type: 'HUMAN', id: reviewer.id } } };
}
