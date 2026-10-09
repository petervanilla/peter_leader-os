import { confirmDecision, decisionDraftFromContext } from '../decisions.js';
import { buildShareDraft, buildSharePolicy, findContextItem, objectDetailRows, objectRoute, objectSummary, objectTitle, parseObjectRoute } from '../object-detail.js';
import { RuntimeHttpError } from '../runtime.js';
import { copyTextToClipboard, requiredElement } from './helpers.js';
export function createObjectDetailUi(options) {
    const { session, controllers, navigation } = options;
    const demoContextItems = new Map();
    const demoKey = (objectType, objectId) => `${objectType}:${objectId}`;
    const nowIso = () => new Date().toISOString();
    const makeDemoItem = (objectType, objectId, accessScope, data, confirmed = true) => ({
        objectType, objectId, version: 1, confirmed, accessScope, updatedAt: nowIso(), data,
        latestEvent: { eventId: null, eventType: null, source: 'DEMO', occurredAt: null }
    });
    const registerDemoItem = (item) => demoContextItems.set(demoKey(item.objectType, item.objectId), item);
    const detailBackdrop = requiredElement('[data-object-detail-backdrop]', 'OBJECT_DETAIL_BACKDROP');
    const detailPanel = requiredElement('[data-object-detail-panel]', 'OBJECT_DETAIL_PANEL');
    const detailClose = requiredElement('[data-object-detail-close]', 'OBJECT_DETAIL_CLOSE');
    const detailType = requiredElement('[data-object-detail-type]', 'OBJECT_DETAIL_TYPE');
    const detailTitle = requiredElement('[data-object-detail-title]', 'OBJECT_DETAIL_TITLE');
    const detailSummary = requiredElement('[data-object-detail-summary]', 'OBJECT_DETAIL_SUMMARY');
    const detailRows = requiredElement('[data-object-detail-rows]', 'OBJECT_DETAIL_ROWS');
    const detailScope = requiredElement('[data-object-detail-scope]', 'OBJECT_DETAIL_SCOPE');
    const detailPolicy = requiredElement('[data-object-detail-policy]', 'OBJECT_DETAIL_POLICY');
    const recipientCheckWrap = requiredElement('[data-object-recipient-wrap]', 'OBJECT_RECIPIENT_WRAP');
    const recipientCheck = requiredElement('[data-object-recipient-check]', 'OBJECT_RECIPIENT_CHECK');
    const copyObjectLink = requiredElement('[data-object-copy-link]', 'OBJECT_COPY_LINK');
    const copyShareDraft = requiredElement('[data-object-copy-share]', 'OBJECT_COPY_SHARE');
    const shareStatus = requiredElement('[data-object-share-status]', 'OBJECT_SHARE_STATUS');
    const decisionPersistWrap = requiredElement('[data-object-decision-persist]', 'OBJECT_DECISION_PERSIST');
    const decisionPersistButton = requiredElement('[data-object-decision-confirm]', 'OBJECT_DECISION_CONFIRM');
    const decisionPersistStatus = requiredElement('[data-object-decision-status]', 'OBJECT_DECISION_STATUS');
    let activeDetail = null;
    let activeDetailRoute = null;
    const resolveObject = (objectType, objectId) => {
        const pack = session.currentContextPack;
        if (pack) {
            const live = findContextItem(pack, objectType, objectId);
            if (live)
                return live;
        }
        return demoContextItems.get(demoKey(objectType, objectId)) ?? null;
    };
    const setShareStatus = (message, error = false) => {
        shareStatus.textContent = message;
        shareStatus.classList.toggle('error', error);
    };
    const configureDecisionPersistence = (item) => {
        const pack = session.currentContextPack;
        const isLiveDecision = Boolean(session.isSignedIn && pack && item.objectType === 'DECISION' && findContextItem(pack, 'DECISION', item.objectId));
        decisionPersistWrap.hidden = !isLiveDecision;
        decisionPersistStatus.classList.remove('error');
        if (!isLiveDecision)
            return;
        if (item.confirmed) {
            decisionPersistButton.disabled = true;
            decisionPersistButton.textContent = '확정됨';
            decisionPersistStatus.textContent = '서버 Context에서 Human-confirmed Decision으로 확인됐습니다.';
            return;
        }
        const prepared = decisionDraftFromContext(item);
        if (!prepared.ok) {
            decisionPersistButton.disabled = true;
            decisionPersistButton.textContent = '확정 정보 확인 필요';
            decisionPersistStatus.classList.add('error');
            decisionPersistStatus.textContent = `확정 전에 필요한 정보가 부족합니다 · ${(prepared.violations ?? [prepared.error]).join(' · ')}`;
            return;
        }
        decisionPersistButton.disabled = false;
        decisionPersistButton.textContent = '내 결정으로 확정';
        decisionPersistStatus.textContent = `Version ${item.version} 기준 · 성공 시 EventLog 기록 후 Context를 다시 읽습니다.`;
    };
    const renderObject = (item, route) => {
        activeDetail = item;
        activeDetailRoute = route;
        const policy = buildSharePolicy(item.accessScope);
        detailType.textContent = item.objectType;
        detailTitle.textContent = objectTitle(item);
        detailSummary.textContent = objectSummary(item);
        detailScope.textContent = `${policy.label} · ${item.confirmed ? 'Confirmed' : 'Needs review'}`;
        detailPolicy.textContent = policy.reason;
        detailRows.replaceChildren();
        for (const [label, value] of objectDetailRows(item)) {
            const row = document.createElement('div');
            row.className = 'context-row';
            const l = document.createElement('span');
            l.textContent = label;
            const v = document.createElement('span');
            v.textContent = value;
            row.append(l, v);
            detailRows.append(row);
        }
        configureDecisionPersistence(item);
        recipientCheck.checked = false;
        recipientCheckWrap.hidden = !policy.requiresRecipientCheck;
        copyObjectLink.disabled = !policy.canCopyLink;
        copyShareDraft.disabled = !policy.canPrepareShare || policy.requiresRecipientCheck;
        setShareStatus(policy.canPrepareShare ? '공유 초안을 만들 수 있습니다. 외부 전송은 사람이 최종 실행합니다.' : policy.reason, !policy.canPrepareShare);
        detailBackdrop.hidden = false;
        detailPanel.hidden = false;
        document.body.classList.add('detail-open');
        detailClose.focus();
    };
    const closeObject = (syncHash = true) => {
        detailBackdrop.hidden = true;
        detailPanel.hidden = true;
        document.body.classList.remove('detail-open');
        const parent = activeDetailRoute?.parentRouteId;
        activeDetail = null;
        activeDetailRoute = null;
        setShareStatus('');
        if (syncHash && parent)
            navigation.setActive(parent, navigation.routeLabel(parent));
    };
    const openObject = (objectType, objectId) => {
        const path = objectRoute(objectType, objectId);
        if (!path)
            return false;
        const route = parseObjectRoute(path);
        if (!route)
            return false;
        const item = resolveObject(route.objectType, route.objectId);
        navigation.setActive(route.parentRouteId, navigation.routeLabel(route.parentRouteId), false);
        history.pushState(null, '', `#${path.slice(1)}`);
        if (!item) {
            activeDetailRoute = route;
            activeDetail = null;
            detailType.textContent = route.objectType;
            detailTitle.textContent = route.objectId;
            detailSummary.textContent = '현재 Context Pack에서 이 객체를 찾을 수 없습니다.';
            detailRows.replaceChildren();
            detailScope.textContent = 'Unavailable';
            detailPolicy.textContent = '권한이 없거나, 오래된 링크이거나, 현재 Context 범위에 포함되지 않은 객체일 수 있습니다.';
            decisionPersistWrap.hidden = true;
            recipientCheckWrap.hidden = true;
            copyObjectLink.disabled = true;
            copyShareDraft.disabled = true;
            setShareStatus('공유할 수 없습니다. Context를 새로고침하거나 접근 권한을 확인하세요.', true);
            detailBackdrop.hidden = false;
            detailPanel.hidden = false;
            document.body.classList.add('detail-open');
            detailClose.focus();
            return true;
        }
        renderObject(item, route);
        return true;
    };
    detailClose.addEventListener('click', () => closeObject());
    detailBackdrop.addEventListener('click', () => closeObject());
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !detailPanel.hidden)
        closeObject(); });
    recipientCheck.addEventListener('change', () => {
        if (!activeDetail)
            return;
        const policy = buildSharePolicy(activeDetail.accessScope);
        copyShareDraft.disabled = !policy.canPrepareShare || (policy.requiresRecipientCheck && !recipientCheck.checked);
        setShareStatus(recipientCheck.checked ? '수신자가 이 RESTRICTED Context에 접근할 권한이 있음을 사람이 확인했습니다.' : policy.reason, !recipientCheck.checked);
    });
    copyObjectLink.addEventListener('click', async () => {
        if (!activeDetail || !activeDetailRoute)
            return;
        const policy = buildSharePolicy(activeDetail.accessScope);
        if (!policy.canCopyLink) {
            setShareStatus(policy.reason, true);
            return;
        }
        const url = `${location.origin}${location.pathname}#${activeDetailRoute.path.slice(1)}`;
        await copyTextToClipboard(url);
        navigation.announce('객체 링크를 복사했습니다.');
        setShareStatus('링크를 복사했습니다. 실제 열람 가능 여부는 로그인과 접근 권한으로 다시 확인됩니다.');
    });
    copyShareDraft.addEventListener('click', async () => {
        if (!activeDetail || !activeDetailRoute)
            return;
        const url = `${location.origin}${location.pathname}#${activeDetailRoute.path.slice(1)}`;
        const draft = buildShareDraft(activeDetail, url, recipientCheck.checked);
        if (!draft.ok) {
            setShareStatus(draft.policy.reason, true);
            return;
        }
        await copyTextToClipboard(draft.text);
        navigation.announce('공유 초안을 복사했습니다.');
        setShareStatus('공유 초안을 복사했습니다. 내용을 확인한 뒤 사람이 최종 전송하세요.');
    });
    decisionPersistButton.addEventListener('click', async () => {
        const pack = session.currentContextPack;
        if (!session.isSignedIn || !pack || !activeDetail || activeDetail.objectType !== 'DECISION')
            return;
        const current = findContextItem(pack, 'DECISION', activeDetail.objectId);
        if (!current) {
            decisionPersistStatus.classList.add('error');
            decisionPersistStatus.textContent = '현재 Live Context에서 이 Decision을 찾을 수 없습니다.';
            return;
        }
        const prepared = decisionDraftFromContext(current);
        if (!prepared.ok) {
            configureDecisionPersistence(current);
            return;
        }
        const human = confirmDecision(prepared.draft, { type: 'HUMAN', id: pack.viewerUserId });
        if (!human.ok) {
            decisionPersistStatus.classList.add('error');
            decisionPersistStatus.textContent = `확정 실패 · ${human.error}`;
            return;
        }
        decisionPersistButton.disabled = true;
        decisionPersistButton.textContent = '저장 중…';
        decisionPersistStatus.classList.remove('error');
        decisionPersistStatus.textContent = 'expectedVersion을 확인하고 Human Decision을 저장하는 중입니다…';
        try {
            const hydrated = await controllers.domainActions.confirmDecision({
                decisionId: current.objectId,
                expectedVersion: current.version,
                data: { ...current.data, status: 'CONFIRMED' },
                humanConfirmed: true
            });
            options.onContextChanged(hydrated.contextPack);
            const refreshed = findContextItem(hydrated.contextPack, 'DECISION', current.objectId);
            if (refreshed && activeDetailRoute) {
                renderObject(refreshed, activeDetailRoute);
                decisionPersistStatus.textContent = '저장 완료 · EventLog 기록 후 최신 Context에서 Confirmed 상태를 다시 확인했습니다. 일정/프로젝트는 자동 변경하지 않았습니다.';
            }
            navigation.announce('Decision을 서버에 Human-confirmed 상태로 저장했습니다.');
        }
        catch (error) {
            if (error instanceof RuntimeHttpError && error.code === 'VERSION_CONFLICT') {
                try {
                    const hydrated = await controllers.context.refresh();
                    options.onContextChanged(hydrated.contextPack);
                    const latest = findContextItem(hydrated.contextPack, 'DECISION', current.objectId);
                    if (latest && activeDetailRoute)
                        renderObject(latest, activeDetailRoute);
                }
                catch { }
                decisionPersistStatus.classList.add('error');
                decisionPersistStatus.textContent = '저장 충돌 · 다른 변경이 먼저 저장되었습니다. 최신 Context를 불러왔습니다. 내용을 다시 확인한 뒤 확정하세요.';
                navigation.announce('Decision 버전 충돌을 감지했습니다. 자동 덮어쓰기는 하지 않았습니다.');
                return;
            }
            const code = error instanceof Error ? error.message : String(error);
            decisionPersistButton.disabled = false;
            decisionPersistButton.textContent = '내 결정으로 확정';
            decisionPersistStatus.classList.add('error');
            decisionPersistStatus.textContent = `저장 실패 · ${code} · 자동 재시도하지 않았습니다.`;
        }
    });
    return {
        registerDemoItem,
        makeDemoItem,
        resolveObject,
        renderObject,
        openObject,
        closeObject,
        isOpen: () => !detailPanel.hidden,
        get activeItem() { return activeDetail; },
        get activeRoute() { return activeDetailRoute; }
    };
}
