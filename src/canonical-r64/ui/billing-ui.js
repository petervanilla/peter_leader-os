import { buildBillingSnapshot, createDemoBillingState, createManualTopUpRequest, createProviderCredentialMetadata, usageFundingDecision, validateBillingState } from '../billing.js';
import { escapeHtml } from './helpers.js';
const formatCredits = (value) => `${value.toLocaleString('ko-KR')} cr`;
const formatKrw = (value) => `₩${value.toLocaleString('ko-KR')}`;
const formatDate = (value) => new Intl.DateTimeFormat('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
const statusLabel = { PENDING: '확인 대기', APPROVED: '승인', REJECTED: '거절', CANCELLED: '취소' };
export function createBillingUi() {
    const root = document.querySelector('[data-billing-root]');
    if (!root)
        throw new Error('BILLING_ROOT_MISSING');
    let state = createDemoBillingState();
    const validation = validateBillingState(state);
    if (!validation.ok)
        throw new Error(`BILLING_CONTRACT_FAILED:${validation.violations.join(',')}`);
    const balance = root.querySelector('[data-billing-balance]');
    const added = root.querySelector('[data-billing-added]');
    const used = root.querySelector('[data-billing-used]');
    const funding = root.querySelector('[data-billing-funding]');
    const modeRoot = root.querySelector('[data-billing-mode]');
    const history = root.querySelector('[data-billing-history]');
    const requests = root.querySelector('[data-billing-requests]');
    const keys = root.querySelector('[data-billing-keys]');
    const topUpForm = root.querySelector('[data-topup-form]');
    const topUpAmount = root.querySelector('[data-topup-amount]');
    const topUpMethod = root.querySelector('[data-topup-method]');
    const topUpReference = root.querySelector('[data-topup-reference]');
    const topUpStatus = root.querySelector('[data-topup-status]');
    const keyForm = root.querySelector('[data-key-form]');
    const keyProvider = root.querySelector('[data-key-provider]');
    const keyLabel = root.querySelector('[data-key-label]');
    const keyValue = root.querySelector('[data-key-value]');
    const keyStatus = root.querySelector('[data-key-status]');
    if (!balance || !added || !used || !funding || !modeRoot || !history || !requests || !keys || !topUpForm || !topUpAmount || !topUpMethod || !topUpReference || !topUpStatus || !keyForm || !keyProvider || !keyLabel || !keyValue || !keyStatus)
        throw new Error('BILLING_UI_CONTRACT_MISSING');
    const render = () => { const snapshot = buildBillingSnapshot(state); balance.textContent = formatCredits(snapshot.availableCredits); added.textContent = formatCredits(snapshot.totalCreditsAdded); used.textContent = formatCredits(snapshot.totalCreditsUsed); const decision = usageFundingDecision(state, state.providerKeys.some((item) => item.status === 'CONNECTED')); funding.textContent = decision.source === 'BYOK' ? 'BYOK' : decision.source === 'PLATFORM_CREDITS' ? 'Platform credits' : '사용 불가'; for (const button of modeRoot.querySelectorAll('button[data-mode]')) {
        const active = button.dataset.mode === state.mode;
        button.classList.toggle('selected', active);
        button.setAttribute('aria-pressed', String(active));
    } history.innerHTML = ''; for (const entry of snapshot.ledger) {
        const row = document.createElement('tr');
        const sign = entry.creditDelta > 0 ? '+' : '';
        row.innerHTML = `<td>${escapeHtml(formatDate(entry.createdAt))}</td><td>${escapeHtml(entry.description)}</td><td>${escapeHtml(entry.provider ?? '—')}</td><td class="billing-amount ${entry.creditDelta < 0 ? 'debit' : 'credit'}">${sign}${escapeHtml(formatCredits(entry.creditDelta))}</td>`;
        history.append(row);
    } requests.innerHTML = ''; for (const request of snapshot.topUpRequests) {
        const row = document.createElement('div');
        row.className = 'billing-request';
        row.innerHTML = `<div><strong>${escapeHtml(formatKrw(request.amountKrw))}</strong><div class="review-meta">${escapeHtml(request.paymentMethod.replaceAll('_', ' '))} · ${escapeHtml(request.payerReference)}</div></div><div><span class="state-badge">${escapeHtml(statusLabel[request.status])}</span><div class="review-meta">${escapeHtml(formatCredits(request.requestedCredits))}</div></div>`;
        requests.append(row);
    } keys.innerHTML = ''; if (!snapshot.providerKeys.length) {
        keys.innerHTML = '<div class="safe">등록된 BYOK 연결이 없습니다.</div>';
    }
    else {
        for (const key of snapshot.providerKeys) {
            const card = document.createElement('div');
            card.className = 'billing-key';
            card.innerHTML = `<div><strong>${escapeHtml(key.label)}</strong><div class="review-meta">${escapeHtml(key.provider)} · ${escapeHtml(key.maskedKey)}</div></div><span class="state-badge">${escapeHtml(key.status.replaceAll('_', ' '))}</span>`;
            keys.append(card);
        }
    } };
    modeRoot.addEventListener('click', (event) => { const target = event.target; const button = target?.closest('button[data-mode]'); if (!button)
        return; state = { ...state, mode: button.dataset.mode }; render(); });
    topUpForm.addEventListener('submit', (event) => { event.preventDefault(); try {
        const amountKrw = Number(topUpAmount.value);
        const request = createManualTopUpRequest({ id: `TOP-${Date.now()}`, amountKrw, requestedCredits: amountKrw, paymentMethod: topUpMethod.value, payerReference: topUpReference.value, createdAt: new Date().toISOString() });
        state = { ...state, topUpRequests: [request, ...state.topUpRequests] };
        topUpReference.value = '';
        topUpStatus.textContent = '충전 요청을 만들었습니다. 입금/증빙 확인 전에는 크레딧 잔액이 증가하지 않습니다.';
        render();
    }
    catch (error) {
        topUpStatus.textContent = error instanceof Error ? error.message : '충전 요청을 만들 수 없습니다.';
    } });
    keyForm.addEventListener('submit', (event) => { event.preventDefault(); try {
        const metadata = createProviderCredentialMetadata({ id: `KEY-${Date.now()}`, provider: keyProvider.value, label: keyLabel.value, rawKey: keyValue.value, createdAt: new Date().toISOString() });
        state = { ...state, providerKeys: [metadata, ...state.providerKeys] };
        keyValue.value = '';
        keyStatus.textContent = '원문 키를 브라우저에 저장하지 않았습니다. Production에서는 서버 Vault 저장/검증 후 CONNECTED로 전환합니다.';
        render();
    }
    catch (error) {
        keyStatus.textContent = error instanceof Error ? error.message : 'API 키 형식을 확인하세요.';
    } });
    render();
    return { getSnapshot: () => buildBillingSnapshot(state) };
}
