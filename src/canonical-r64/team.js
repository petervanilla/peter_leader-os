const PROHIBITED_PERSON_FIELDS = new Set([
    'score',
    'rank',
    'performanceRating',
    'potential',
    'motivation',
    'cultureFit',
    'personality',
    'highPotential',
    'lowPerformer'
]);
function hasProhibitedField(person) {
    for (const key of Object.keys(person)) {
        if (PROHIBITED_PERSON_FIELDS.has(key))
            return key;
    }
    return null;
}
export function buildTeamView(team) {
    const accepted = [];
    const rejected = [];
    for (const person of Array.isArray(team?.people) ? team.people : []) {
        if (!person?.id || !person?.name?.trim()) {
            rejected.push({ id: person?.id ?? null, reason: 'PERSON_ID_NAME_REQUIRED' });
            continue;
        }
        const prohibited = hasProhibitedField(person);
        if (prohibited) {
            rejected.push({ id: person.id, reason: `PROHIBITED_PERSON_FIELD:${prohibited}` });
            continue;
        }
        accepted.push({
            id: person.id,
            name: person.name.trim(),
            role: person.role?.trim() || undefined,
            currentPriority: person.currentPriority ?? null,
            currentProject: person.currentProject ?? null,
            blocker: person.blocker ?? null,
            openCommitments: [...new Set((person.openCommitments ?? []).filter(Boolean))],
            lastConversationAt: person.lastConversationAt ?? null,
            nextConversationAt: person.nextConversationAt ?? null
        });
    }
    return {
        view: 'TEAM',
        teamId: team?.id ?? null,
        teamName: team?.name?.trim() || '',
        peopleRanking: false,
        personScores: [],
        people: accepted,
        rejected,
        operatingSummary: {
            peopleCount: accepted.length,
            blockedCount: accepted.filter((person) => Boolean(person.blocker)).length,
            openCommitmentCount: accepted.reduce((sum, person) => sum + (person.openCommitments?.length ?? 0), 0),
            conversationsScheduled: accepted.filter((person) => Boolean(person.nextConversationAt)).length
        }
    };
}
export function validateTeamView(view) {
    const violations = [];
    if (view.peopleRanking !== false)
        violations.push('PEOPLE_RANKING_PROHIBITED');
    if (view.personScores.length > 0)
        violations.push('PERSON_SCORES_PROHIBITED');
    for (const person of view.people) {
        const prohibited = hasProhibitedField(person);
        if (prohibited)
            violations.push(`PROHIBITED_PERSON_FIELD:${prohibited}`);
    }
    return { ok: violations.length === 0, violations };
}
export function buildPersonView(person) {
    const team = buildTeamView({ id: 'single', name: 'single', people: [person] });
    if (team.people.length !== 1) {
        return { ok: false, error: team.rejected[0]?.reason ?? 'INVALID_PERSON_CONTEXT' };
    }
    const safe = team.people[0];
    return {
        ok: true,
        view: {
            view: 'PERSON',
            ...safe,
            rating: null,
            rank: null,
            interpretationStatus: 'CONTEXT_ONLY'
        }
    };
}
