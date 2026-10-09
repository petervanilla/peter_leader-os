import { objectRoute } from '../object-detail.js';
import { copyTextToClipboard } from './helpers.js';
const attentionDestination = {
    DECIDE: 'DECISIONS', TALK: 'ONE_ON_ONE', PREPARE: 'MEETINGS', UNBLOCK: 'WORK',
    FOLLOW_UP: 'PEOPLE', ALIGN: 'WORK', REVIEW: 'REVIEW'
};
const attentionActionLabel = {
    DECIDE: '결정 보기', TALK: '1:1 준비', PREPARE: '회의 준비', UNBLOCK: '막힘 풀기',
    FOLLOW_UP: '후속 확인', ALIGN: '업무 정렬', REVIEW: '지금 검수'
};
export function createTodayUi(initialView, callbacks) {
    const attentionRoot = document.querySelector('[data-today-attention]');
    if (!attentionRoot)
        throw new Error('TODAY_ATTENTION_ROOT_MISSING');
    let activeView = initialView;
    const render = (view) => {
        activeView = view;
        attentionRoot.replaceChildren();
        if (view.attention.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'empty-state';
            empty.innerHTML = '<strong>지금 표시할 Top 3가 없습니다.</strong><div class="why" style="margin-top:6px">Context는 연결됐지만 Attention으로 전환할 열린 Decision, Action, Commitment, Recommendation 또는 Project blocker가 없습니다.</div>';
            attentionRoot.append(empty);
            return;
        }
        for (const item of view.attention) {
            const article = document.createElement('article');
            article.className = 'attention-item';
            const verb = document.createElement('div');
            verb.className = 'verb';
            verb.textContent = item.verb;
            const body = document.createElement('div');
            const title = document.createElement('strong');
            title.textContent = item.title;
            const why = document.createElement('div');
            why.className = 'why';
            why.textContent = `Why: ${item.reason}`;
            const details = document.createElement('details');
            const summary = document.createElement('summary');
            summary.textContent = '근거와 신뢰도 보기';
            const evidence = document.createElement('div');
            evidence.className = 'evidence-list';
            evidence.textContent = `Evidence: ${item.evidenceRefs.join(' · ')} · Confidence: ${Math.round(item.confidence * 100)}% (not truth)`;
            details.append(summary, evidence);
            body.append(title, why, details);
            const controls = document.createElement('div');
            controls.className = 'attention-actions';
            const status = document.createElement('div');
            status.className = 'status';
            status.textContent = item.humanPinned ? 'Human pinned' : item.criticality ?? 'Attention';
            const action = document.createElement('button');
            action.type = 'button';
            action.textContent = attentionActionLabel[item.verb] ?? '열기';
            action.addEventListener('click', () => {
                const subjectType = item.subject?.type;
                const subjectId = item.subject?.id;
                if (subjectType && subjectId && objectRoute(subjectType, subjectId)) {
                    callbacks.openObject(subjectType, subjectId);
                    return;
                }
                callbacks.goTo(attentionDestination[item.verb] ?? 'TODAY');
            });
            controls.append(status, action);
            article.append(verb, body, controls);
            attentionRoot.append(article);
        }
    };
    const copyBrief = async () => {
        const brief = [
            'Leader OS · Today Brief',
            ...activeView.attention.map((item, index) => `${index + 1}. [${item.verb}] ${item.title}\n   ${item.reason}`),
            '', `화면: ${window.location.href}`, 'AI recommends. Human decides.'
        ].join('\n');
        await copyTextToClipboard(brief);
        callbacks.announce('오늘 브리프를 클립보드에 복사했습니다.');
    };
    document.querySelector('[data-copy-today]')?.addEventListener('click', copyBrief);
    render(initialView);
    return { render, copyBrief, get currentView() { return activeView; } };
}
