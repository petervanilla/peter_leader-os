export const PRIMARY_ROUTES = [
    { id: 'TODAY', label: 'Today', path: '/today', purpose: 'Top 3 leadership attention for today.', group: 'FOCUS' },
    { id: 'REVIEW', label: 'Review', path: '/review', purpose: 'Verify recommendation and decision outcomes.', group: 'FOCUS', firstClass: true },
    { id: 'ONBOARDING', label: '30-Day Quest', path: '/30-day-quest', purpose: 'Practice leadership through a 30-day experiential curriculum.', group: 'FOCUS' },
    { id: 'LEADER_COACH', label: 'Leader Coach', path: '/leader-coach', purpose: 'Contextual nudges for delegation, feedback, meetings and decisions.', group: 'FOCUS' },
    { id: 'TEAM', label: 'Team', path: '/team', purpose: 'Understand team operating flow without ranking people.', group: 'PEOPLE' },
    { id: 'PEOPLE', label: 'People', path: '/people', purpose: 'Understand people context without person scores.', group: 'PEOPLE' },
    { id: 'ONE_ON_ONE', label: '1:1', path: '/one-on-one', purpose: 'Prepare → Talk → Capture → Follow-up.', group: 'PEOPLE' },
    { id: 'WORK', label: 'Work', path: '/work', purpose: 'Projects, milestones, open decisions, blockers.', group: 'EXECUTION' },
    { id: 'MEETINGS', label: 'Meetings', path: '/meetings', purpose: 'Before → During → After.', group: 'EXECUTION' },
    { id: 'DECISIONS', label: 'Decisions', path: '/decisions', purpose: 'What + Why + Evidence + Owner + Review date.', group: 'EXECUTION' },
    { id: 'WAYS_OF_WORKING', label: 'Ways of Working', path: '/ways-of-working', purpose: 'Practice candid feedback, collaborative execution, meetings and learning loops.', group: 'EXECUTION' },
    { id: 'REPORTS', label: 'Reports', path: '/reports', purpose: 'Show operating change and unresolved flow.', group: 'SYSTEM' },
    { id: 'SKILLS', label: 'Skills', path: '/skills', purpose: 'Leadership playbooks: Quick / Standard / Full.', group: 'SYSTEM' },
    { id: 'ADD_ONS', label: 'Add-ons', path: '/add-ons', purpose: 'Connect specialist intermediary tools.', group: 'SYSTEM' },
    { id: 'BILLING', label: 'Billing & AI', path: '/billing', purpose: 'Credits, BYOK, AI usage and payment history.', group: 'SYSTEM' }
];
export const NESTED_ROUTES = [
    { id: 'PERSON', path: '/people/:personId', parent: 'PEOPLE' },
    { id: 'PROJECT', path: '/work/:projectId', parent: 'WORK' },
    { id: 'MEETING', path: '/meetings/:meetingId', parent: 'MEETINGS' },
    { id: 'DECISION', path: '/decisions/:decisionId', parent: 'DECISIONS' },
    { id: 'ADD_ON_DETAIL', path: '/add-ons/:addonId', parent: 'ADD_ONS' }
];
export function validateNavigationContract() {
    const ids = PRIMARY_ROUTES.map((route) => route.id);
    const violations = [];
    if (ids[0] !== 'TODAY')
        violations.push('TODAY_MUST_BE_FIRST');
    if (!ids.includes('REVIEW'))
        violations.push('REVIEW_REQUIRED');
    if (!ids.includes('ADD_ONS'))
        violations.push('ADD_ONS_REQUIRED');
    if (PRIMARY_ROUTES.filter((r) => r.id === 'TODAY').length !== 1)
        violations.push('TODAY_DUPLICATED');
    if (PRIMARY_ROUTES.find((r) => r.id === 'REVIEW')?.firstClass !== true)
        violations.push('REVIEW_MUST_BE_FIRST_CLASS');
    if (new Set(PRIMARY_ROUTES.map((r) => r.group)).size !== 4)
        violations.push('NAV_GROUPS_REQUIRED');
    return { ok: violations.length === 0, violations };
}
