const assertPositiveInteger = (value, code) => {
    if (!Number.isInteger(value) || value <= 0)
        throw new Error(code);
};
export function buildBillingSnapshot(state) {
    const totalCreditsAdded = state.ledger.filter((entry) => entry.creditDelta > 0).reduce((sum, entry) => sum + entry.creditDelta, 0);
    const totalCreditsUsed = Math.abs(state.ledger.filter((entry) => entry.creditDelta < 0).reduce((sum, entry) => sum + entry.creditDelta, 0));
    return { ...state, availableCredits: state.ledger.reduce((sum, entry) => sum + entry.creditDelta, 0), totalCreditsAdded, totalCreditsUsed };
}
export function createManualTopUpRequest(input) {
    assertPositiveInteger(input.amountKrw, 'TOPUP_AMOUNT_REQUIRED');
    assertPositiveInteger(input.requestedCredits, 'TOPUP_CREDITS_REQUIRED');
    const payerReference = input.payerReference.trim();
    if (!payerReference)
        throw new Error('PAYER_REFERENCE_REQUIRED');
    return { ...input, payerReference, status: 'PENDING' };
}
export function approveManualTopUpRequest(state, requestId, reviewedAt, ledgerId) {
    const request = state.topUpRequests.find((item) => item.id === requestId);
    if (!request)
        throw new Error('TOPUP_REQUEST_NOT_FOUND');
    if (request.status !== 'PENDING')
        throw new Error('TOPUP_REQUEST_NOT_PENDING');
    const updatedRequests = state.topUpRequests.map((item) => item.id === requestId ? { ...item, status: 'APPROVED', reviewedAt } : item);
    const entry = { id: ledgerId, kind: 'TOPUP_APPROVED', creditDelta: request.requestedCredits, createdAt: reviewedAt, description: `Manual top-up approved · ₩${request.amountKrw.toLocaleString('ko-KR')}`, referenceId: request.id };
    return { ...state, topUpRequests: updatedRequests, ledger: [entry, ...state.ledger] };
}
export function recordPlatformUsage(state, input) {
    assertPositiveInteger(input.credits, 'USAGE_CREDITS_REQUIRED');
    const snapshot = buildBillingSnapshot(state);
    if (snapshot.availableCredits < input.credits)
        throw new Error('INSUFFICIENT_PLATFORM_CREDITS');
    const entry = { id: input.id, kind: 'USAGE_DEBIT', creditDelta: -input.credits, createdAt: input.createdAt, description: input.description, provider: input.provider, model: input.model };
    return { ...state, ledger: [entry, ...state.ledger] };
}
export function usageFundingDecision(state, hasUsableByok) {
    if (state.mode === 'BYOK')
        return { source: hasUsableByok ? 'BYOK' : 'BLOCKED', reason: hasUsableByok ? 'USER_PROVIDER_KEY' : 'BYOK_KEY_REQUIRED' };
    if (state.mode === 'PLATFORM_CREDITS') {
        const ok = buildBillingSnapshot(state).availableCredits > 0;
        return { source: ok ? 'PLATFORM_CREDITS' : 'BLOCKED', reason: ok ? 'PLATFORM_BALANCE' : 'INSUFFICIENT_PLATFORM_CREDITS' };
    }
    if (hasUsableByok)
        return { source: 'BYOK', reason: 'BYOK_FIRST' };
    const ok = buildBillingSnapshot(state).availableCredits > 0;
    return { source: ok ? 'PLATFORM_CREDITS' : 'BLOCKED', reason: ok ? 'EXPLICIT_FALLBACK' : 'NO_FUNDING_SOURCE' };
}
export function maskApiKey(rawKey) {
    const key = rawKey.trim();
    if (key.length < 10)
        throw new Error('API_KEY_TOO_SHORT');
    const prefix = key.slice(0, Math.min(6, Math.max(3, Math.floor(key.length / 4))));
    const suffix = key.slice(-4);
    return `${prefix}${'•'.repeat(8)}${suffix}`;
}
export function createProviderCredentialMetadata(input) {
    return { id: input.id, provider: input.provider, label: input.label.trim() || input.provider, maskedKey: maskApiKey(input.rawKey), status: 'READY_FOR_SECURE_SAVE', createdAt: input.createdAt };
}
export function validateBillingState(state) {
    const violations = [];
    const seen = new Set();
    for (const entry of state.ledger) {
        if (seen.has(entry.id))
            violations.push('LEDGER_ID_DUPLICATED');
        seen.add(entry.id);
        if (entry.creditDelta === 0)
            violations.push('ZERO_LEDGER_ENTRY');
    }
    for (const request of state.topUpRequests) {
        if (request.status === 'PENDING' && state.ledger.some((entry) => entry.referenceId === request.id && entry.kind === 'TOPUP_APPROVED'))
            violations.push('PENDING_TOPUP_MUST_NOT_CREDIT_BALANCE');
    }
    return { ok: violations.length === 0, violations };
}
export function createDemoBillingState() {
    return {
        mode: 'AUTO_FALLBACK',
        ledger: [
            { id: 'LED-003', kind: 'USAGE_DEBIT', creditDelta: -860, createdAt: '2026-09-29T08:30:00+09:00', description: 'Executive weekly brief', provider: 'GOOGLE_GEMINI', model: 'flash' },
            { id: 'LED-002', kind: 'USAGE_DEBIT', creditDelta: -340, createdAt: '2026-09-28T14:20:00+09:00', description: 'Meeting evidence extraction', provider: 'OPENROUTER', model: 'auto' },
            { id: 'LED-001', kind: 'TOPUP_APPROVED', creditDelta: 30000, createdAt: '2026-09-27T11:00:00+09:00', description: 'Manual top-up approved · ₩30,000', referenceId: 'TOP-001' }
        ],
        topUpRequests: [{ id: 'TOP-001', amountKrw: 30000, requestedCredits: 30000, paymentMethod: 'BANK_TRANSFER', payerReference: 'PETER VANILLA', status: 'APPROVED', createdAt: '2026-09-27T10:10:00+09:00', reviewedAt: '2026-09-27T11:00:00+09:00' }],
        providerKeys: [{ id: 'KEY-001', provider: 'OPENROUTER', label: 'OpenRouter personal', maskedKey: 'sk-or-••••••••A7x9', status: 'CONNECTED', createdAt: '2026-09-27T09:00:00+09:00' }]
    };
}
