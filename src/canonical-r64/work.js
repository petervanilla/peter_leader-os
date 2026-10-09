export function buildProjectView(project) {
    const unknowns = [];
    if (!project.owner)
        unknowns.push('OWNER');
    if (!project.goal)
        unknowns.push('GOAL');
    if (!project.nextMilestone)
        unknowns.push('NEXT_MILESTONE');
    return {
        view: 'PROJECT',
        ...project,
        unknowns,
        blameInference: false,
        recoveryEligible: Boolean(project.knownRisk || project.needsAttention || project.openDecision)
    };
}
export function buildProjectRecovery(input) {
    if (!input?.projectId || !input.symptom?.trim()) {
        return { ok: false, error: 'PROJECT_AND_SYMPTOM_REQUIRED' };
    }
    return {
        ok: true,
        recovery: {
            projectId: input.projectId,
            symptom: input.symptom.trim(),
            cause: input.cause?.trim() || null,
            dependency: input.dependency?.trim() || null,
            decisionNeeded: input.decisionNeeded?.trim() || null,
            recovery: input.recovery?.trim() || null,
            owner: input.owner?.trim() || null,
            blameInference: false,
            unknowns: [
                ['CAUSE', input.cause],
                ['DEPENDENCY', input.dependency],
                ['DECISION', input.decisionNeeded],
                ['RECOVERY', input.recovery],
                ['OWNER', input.owner]
            ].filter(([, value]) => !value).map(([name]) => name)
        }
    };
}
