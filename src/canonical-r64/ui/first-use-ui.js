import { FIRST_USE_30_DAY_TASKS, isRealFirstUse, parseFirstUseMembers, parseFirstUseTasks } from '../onboarding.js';
const displayLabel = (label, email) => {
    const raw = (label || email || '리더').trim();
    if (raw.includes('@'))
        return raw.split('@')[0] || '리더';
    return raw;
};
export function createFirstUseUi(options) {
    const { controllers } = options;
    const root = document.querySelector('[data-first-use]');
    const title = document.querySelector('[data-first-use-title]');
    const copy = document.querySelector('[data-first-use-copy]');
    const workspaceForm = document.querySelector('[data-first-workspace-form]');
    const workspaceName = document.querySelector('[data-first-workspace-name]');
    const workspaceCreate = document.querySelector('[data-first-workspace-create]');
    const setupForm = document.querySelector('[data-first-setup-form]');
    const members = document.querySelector('[data-first-members]');
    const tasks = document.querySelector('[data-first-tasks]');
    const setupSave = document.querySelector('[data-first-setup-save]');
    const status = document.querySelector('[data-first-use-status]');
    const plan = document.querySelector('[data-first-use-plan]');
    if (!root || !title || !copy || !workspaceForm || !workspaceName || !workspaceCreate || !setupForm || !members || !tasks || !setupSave || !status || !plan) {
        throw new Error('FIRST_USE_UI_ROOT_MISSING');
    }
    const setStatus = (message, error = false) => {
        status.textContent = message;
        status.classList.toggle('error', error);
    };
    const renderPlan = () => {
        plan.replaceChildren();
        for (const item of FIRST_USE_30_DAY_TASKS) {
            const card = document.createElement('div');
            card.className = 'first-use-plan-item';
            const days = document.createElement('span');
            days.className = 'state-badge';
            days.textContent = `Days ${item.days}`;
            const heading = document.createElement('strong');
            heading.textContent = item.title;
            const reason = document.createElement('div');
            reason.className = 'review-meta';
            reason.textContent = item.reason;
            card.append(days, heading, reason);
            plan.append(card);
        }
    };
    renderPlan();
    const renderNoWorkspace = () => {
        const identity = controllers.auth.identity;
        const label = displayLabel(identity?.label, identity?.email);
        root.hidden = false;
        workspaceForm.hidden = false;
        setupForm.hidden = true;
        title.textContent = `${label}님, 팀장으로 첫 업무 공간을 만들어볼까요?`;
        copy.textContent = '샘플 데이터는 넣지 않습니다. 실제 팀 이름부터 시작하고, 다음 단계에서 팀원과 내 과제를 등록합니다.';
        if (!workspaceName.value.trim())
            workspaceName.value = `${label} 팀`;
        setStatus('Workspace는 버튼을 눌렀을 때만 생성됩니다. 자동 생성하지 않습니다.');
    };
    const renderEmptyWorkspace = (pack) => {
        if (!isRealFirstUse(pack)) {
            hide();
            return;
        }
        const identity = controllers.auth.identity;
        const label = displayLabel(identity?.label, identity?.email);
        root.hidden = false;
        workspaceForm.hidden = true;
        setupForm.hidden = false;
        title.textContent = `${label}님, 이제 팀을 Leader OS에 알려주세요.`;
        copy.textContent = '팀원 이름과 내가 맡은 첫 과제만 적으면 됩니다. 역할을 모르면 비워두세요. Leader OS가 임의로 추측하지 않습니다.';
        setStatus('등록한 내용은 실제 Workspace Context에 저장됩니다. 30일 계획은 확인 후 함께 생성합니다.');
    };
    const hide = () => { root.hidden = true; };
    workspaceForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const name = workspaceName.value.trim();
        if (!name) {
            setStatus('팀 또는 Workspace 이름을 입력하세요.', true);
            workspaceName.focus();
            return;
        }
        workspaceCreate.disabled = true;
        setStatus('내 Workspace를 만들고 있습니다…');
        try {
            const hydrated = await controllers.workspaces.create(name);
            renderEmptyWorkspace(hydrated.contextPack);
            options.onContextChanged(hydrated.contextPack);
            options.announce(`${name} Workspace를 만들었습니다. 이제 팀원과 첫 과제를 등록하세요.`);
        }
        catch (error) {
            setStatus(`Workspace 생성 실패 · ${error instanceof Error ? error.message : String(error)}`, true);
        }
        finally {
            workspaceCreate.disabled = false;
        }
    });
    setupForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const parsedMembers = parseFirstUseMembers(members.value);
        const parsedTasks = parseFirstUseTasks(tasks.value);
        if (parsedMembers.length === 0) {
            setStatus('팀원 이름을 한 명 이상 입력하세요.', true);
            members.focus();
            return;
        }
        if (parsedTasks.length === 0) {
            setStatus('내가 맡은 첫 과제를 한 개 이상 입력하세요.', true);
            tasks.focus();
            return;
        }
        setupSave.disabled = true;
        setStatus('팀과 첫 30일 계획을 저장하고 Today를 준비하는 중입니다…');
        try {
            const hydrated = await controllers.domainActions.completeFirstUse({ members: parsedMembers, myTasks: parsedTasks });
            hide();
            options.onContextChanged(hydrated.contextPack);
            options.announce('첫 팀 정보와 30일 온보딩 계획을 저장했습니다. Today에서 오늘 할 일을 확인하세요.');
        }
        catch (error) {
            setStatus(`첫 설정 저장 실패 · ${error instanceof Error ? error.message : String(error)}`, true);
        }
        finally {
            setupSave.disabled = false;
        }
    });
    return { renderNoWorkspace, renderEmptyWorkspace, hide };
}
