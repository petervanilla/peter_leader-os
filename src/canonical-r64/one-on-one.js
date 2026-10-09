export function buildOneOnOnePrep(person, openQuestions = []) {
    const agenda = [];
    for (const commitment of person.openCommitments ?? []) {
        agenda.push({
            type: 'COMMITMENT',
            title: commitment,
            sourceRef: `PERSON:${person.id}:COMMITMENT`,
            humanConfirmationRequired: true
        });
    }
    if (person.blocker) {
        agenda.push({
            type: 'BLOCKER',
            title: person.blocker,
            sourceRef: `PERSON:${person.id}:BLOCKER`,
            humanConfirmationRequired: true
        });
    }
    if (person.currentPriority) {
        agenda.push({
            type: 'PRIORITY',
            title: person.currentPriority,
            sourceRef: `PERSON:${person.id}:PRIORITY`,
            humanConfirmationRequired: true
        });
    }
    if (person.currentProject) {
        agenda.push({
            type: 'PROJECT',
            title: person.currentProject,
            sourceRef: `PERSON:${person.id}:PROJECT`,
            humanConfirmationRequired: true
        });
    }
    for (const question of openQuestions) {
        if (!question?.id || !question.text?.trim())
            continue;
        agenda.push({
            type: 'OPEN_QUESTION',
            title: question.text.trim(),
            sourceRef: `QUESTION:${question.id}`,
            humanConfirmationRequired: true
        });
    }
    return {
        view: 'ONE_ON_ONE_PREP',
        person: {
            id: person.id,
            name: person.name,
            role: person.role ?? null
        },
        agenda,
        interpretation: {
            personalityInference: false,
            motivationInference: false,
            performanceRating: false
        },
        captureContract: {
            allowed: ['DECISION', 'ACTION', 'COMMITMENT', 'OPEN_QUESTION', 'MEMORY_CANDIDATE'],
            directLongTermMemoryWrite: false,
            humanReviewRequired: true
        }
    };
}
export function validateOneOnOnePrep(view) {
    const violations = [];
    if (view.interpretation.personalityInference !== false)
        violations.push('PERSONALITY_INFERENCE_PROHIBITED');
    if (view.interpretation.motivationInference !== false)
        violations.push('MOTIVATION_INFERENCE_PROHIBITED');
    if (view.interpretation.performanceRating !== false)
        violations.push('PERFORMANCE_RATING_PROHIBITED');
    if (view.captureContract.directLongTermMemoryWrite !== false)
        violations.push('DIRECT_MEMORY_WRITE_PROHIBITED');
    if (view.captureContract.humanReviewRequired !== true)
        violations.push('HUMAN_REVIEW_REQUIRED');
    if (view.agenda.some((item) => item.humanConfirmationRequired !== true))
        violations.push('AGENDA_CONFIRMATION_REQUIRED');
    return { ok: violations.length === 0, violations };
}
