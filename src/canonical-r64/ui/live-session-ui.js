import { buildLiveTodayProjection } from '../live-today.js';
import { objectTitle, parseObjectRoute } from '../object-detail.js';
import { buildPersonalHome } from '../personalization.js';
import { buildTodayView } from '../today.js';
import { browserTimezone, preferenceTodayRoute } from '../user-preferences.js';
import { isRealFirstUse } from '../onboarding.js';
import { createFirstUseUi } from './first-use-ui.js';
export function createLiveSessionUi(options) {
    const { session, controllers } = options;
    const liveOpen = document.querySelector('[data-live-open]');
    const liveDisconnect = document.querySelector('[data-live-disconnect]');
    const liveCancel = document.querySelector('[data-live-cancel]');
    const liveForm = document.querySelector('[data-live-form]');
    const liveEmail = document.querySelector('[data-live-email]');
    const livePassword = document.querySelector('[data-live-password]');
    const workspacePicker = document.querySelector('[data-workspace-picker]');
    const workspaceChoiceCopy = document.querySelector('[data-workspace-choice-copy]');
    const workspaceSelect = document.querySelector('[data-live-workspace-select]');
    const workspaceOpen = document.querySelector('[data-live-workspace-open]');
    const liveConnect = document.querySelector('[data-live-connect]');
    const liveMessage = document.querySelector('[data-live-connect-message]');
    const todayMode = document.querySelector('[data-today-mode]');
    const workspaceBadge = document.querySelector('.workspace-badge');
    const metricsTitle = document.querySelector('[data-today-metrics-title]');
    const metricLabels = Array.from(document.querySelectorAll('[data-today-metric-label]'));
    const metricValues = Array.from(document.querySelectorAll('[data-today-metric-value]'));
    const metricsNote = document.querySelector('[data-today-metrics-note]');
    const userBadge = document.querySelector('[data-user-badge]');
    const personalHome = document.querySelector('[data-personal-home]');
    const personalName = document.querySelector('[data-personal-name]');
    const personalMeta = document.querySelector('[data-personal-meta]');
    const personalSummary = document.querySelector('[data-personal-summary]');
    const myProjects = document.querySelector('[data-my-projects]');
    const workspaceSwitcherWrap = document.querySelector('[data-workspace-switcher-wrap]');
    const workspaceSwitcher = document.querySelector('[data-workspace-switcher]');
    const workspaceRole = document.querySelector('[data-workspace-role]');
    const preferenceForm = document.querySelector('[data-preference-form]');
    const preferenceVersion = document.querySelector('[data-preference-version]');
    const preferenceDisplayName = document.querySelector('[data-pref-display-name]');
    const preferenceRoleMode = document.querySelector('[data-pref-role-mode]');
    const preferenceDefaultWorkspace = document.querySelector('[data-pref-default-workspace]');
    const preferenceTimezone = document.querySelector('[data-pref-timezone]');
    const preferenceTodayView = document.querySelector('[data-pref-today-view]');
    const preferenceWorkStart = document.querySelector('[data-pref-work-start]');
    const preferenceWorkEnd = document.querySelector('[data-pref-work-end]');
    const preferenceWeekdays = Array.from(document.querySelectorAll('[data-pref-weekdays] input[type=checkbox]'));
    const preferenceNotifyBrowser = document.querySelector('[data-pref-notify-browser]');
    const preferenceNotifyEmail = document.querySelector('[data-pref-notify-email]');
    const preferenceNotifyDigest = document.querySelector('[data-pref-notify-digest]');
    const preferenceSave = document.querySelector('[data-pref-save]');
    const preferenceStatus = document.querySelector('[data-pref-status]');
    const todayWelcome = document.querySelector('[data-today-welcome]');
    const todayGreeting = document.querySelector('[data-today-greeting]');
    const todayWelcomeTitle = document.querySelector('[data-today-welcome-title]');
    const todayWelcomeCopy = document.querySelector('[data-today-welcome-copy]');
    let firstUseUi;
    let defaultViewApplied = false;
    const workspaces = () => controllers.workspaces.list();
    const preferences = () => controllers.preferences.current;
    const setLiveMessage = (message, error = false) => {
        if (!liveMessage)
            return;
        liveMessage.hidden = !message;
        liveMessage.textContent = message;
        liveMessage.classList.toggle('error', error);
    };
    const setMode = (mode) => {
        if (!todayMode)
            return;
        todayMode.textContent = mode;
        todayMode.classList.toggle('live', mode === 'LIVE');
        todayMode.classList.toggle('connecting', mode === 'CONNECTING');
        todayMode.classList.toggle('signed-in', mode === 'SIGNED IN');
    };
    const renderDemoMetrics = () => {
        if (metricsTitle)
            metricsTitle.textContent = 'Operating Quality';
        const labels = ['Decision clarity', 'Follow-up', 'Evidence traceability'];
        const values = ['82', '74', '91'];
        metricLabels.forEach((node, index) => node.textContent = labels[index] ?? '');
        metricValues.forEach((node, index) => node.textContent = values[index] ?? '');
        if (metricsNote)
            metricsNote.innerHTML = '<span class="pill">SYSTEM SCORE</span><br><br>사람을 점수화하지 않습니다. 이 점수는 리더십 운영 시스템의 상태만 설명합니다.';
    };
    const renderLiveMetrics = (counts) => {
        if (metricsTitle)
            metricsTitle.textContent = 'Live Context';
        const labels = ['Confirmed Truth', 'Evidence', 'Needs review'];
        const values = [String(counts.truth), String(counts.evidence), String(counts.candidates + counts.recommendations)];
        metricLabels.forEach((node, index) => node.textContent = labels[index] ?? '');
        metricValues.forEach((node, index) => node.textContent = values[index] ?? '');
        if (metricsNote)
            metricsNote.innerHTML = `<span class="pill">RUNTIME CONTEXT</span><br><br>총 ${counts.total}개 Context · 사람 점수 없음 · 읽기 전용 Today 연결`;
    };
    const identityDisplayName = () => {
        const identity = controllers.auth.identity;
        const pref = preferences();
        const raw = (pref?.displayName ?? identity?.label ?? identity?.email ?? '리더').trim();
        return raw.includes('@') ? (raw.split('@')[0] || '리더') : raw;
    };
    const greetingForNow = () => {
        const timezone = preferences()?.timezone ?? browserTimezone();
        let hour = new Date().getHours();
        try {
            const value = new Intl.DateTimeFormat('en-US', { hour: '2-digit', hour12: false, timeZone: timezone }).format(new Date());
            hour = Number(value.split(':')[0]);
        }
        catch { }
        if (hour < 12)
            return '좋은 아침이에요';
        if (hour < 18)
            return '좋은 오후예요';
        return '좋은 저녁이에요';
    };
    const renderTodayWelcome = (pack, noWorkspace = false) => {
        if (!todayWelcome || !todayGreeting || !todayWelcomeTitle || !todayWelcomeCopy)
            return;
        todayWelcome.hidden = false;
        const name = identityDisplayName();
        todayGreeting.textContent = `${greetingForNow()}, ${name}님.`;
        if (noWorkspace) {
            todayWelcomeTitle.textContent = '오늘은 내 팀의 첫 업무 공간을 만드는 것부터 시작하면 됩니다.';
            todayWelcomeCopy.textContent = '아직 데이터가 없어도 괜찮습니다. 팀 이름, 팀원, 내가 맡은 첫 과제만 등록하면 Leader OS가 첫 30일을 정리합니다.';
            return;
        }
        if (isRealFirstUse(pack)) {
            todayWelcomeTitle.textContent = '첫 30일을 위한 기본 정보를 조금만 알려주세요.';
            todayWelcomeCopy.textContent = '팀원과 내 과제를 등록하면 Today가 오늘 확인할 일 3가지를 실제 Context에서 만들어 보여줍니다.';
            return;
        }
        const live = pack ? buildLiveTodayProjection(pack) : null;
        const count = live?.today.attention.length ?? 0;
        todayWelcomeTitle.textContent = count > 0 ? `오늘은 ${count}가지만 먼저 보면 됩니다.` : '오늘의 업무 Context를 확인했습니다.';
        todayWelcomeCopy.textContent = count > 0 ? '결정·대화·후속 확인 중 지금 주의가 필요한 것부터 가볍게 확인해보세요.' : '급하게 확인할 Attention은 없습니다. 필요한 프로젝트나 사람 Context를 열어보세요.';
    };
    const roleModeLabel = (roleMode) => {
        if (roleMode === 'EXECUTIVE')
            return 'Executive';
        if (roleMode === 'TEAM_LEADER')
            return 'Team Leader';
        if (roleMode === 'PROJECT_LEAD')
            return 'Project Lead';
        if (roleMode === 'INDIVIDUAL')
            return 'Individual';
        return '기본 보기';
    };
    const setPreferenceStatus = (message, error = false) => {
        if (!preferenceStatus)
            return;
        preferenceStatus.textContent = message;
        preferenceStatus.classList.toggle('error', error);
    };
    const renderWorkspaceOptions = (select, list, selectedId) => {
        if (!select)
            return;
        select.replaceChildren();
        for (const workspace of list) {
            const option = document.createElement('option');
            option.value = workspace.workspaceId;
            option.textContent = `${workspace.name} · ${workspace.role}`;
            option.selected = workspace.workspaceId === selectedId;
            select.append(option);
        }
    };
    const renderPreferenceWorkspaceOptions = (selectedId) => {
        if (!preferenceDefaultWorkspace)
            return;
        preferenceDefaultWorkspace.replaceChildren();
        const none = document.createElement('option');
        none.value = '';
        none.textContent = '기본 Workspace 지정 안 함';
        preferenceDefaultWorkspace.append(none);
        for (const workspace of workspaces()) {
            const option = document.createElement('option');
            option.value = workspace.workspaceId;
            option.textContent = `${workspace.name} · ${workspace.role}`;
            option.selected = workspace.workspaceId === selectedId;
            preferenceDefaultWorkspace.append(option);
        }
        preferenceDefaultWorkspace.value = selectedId && workspaces().some((workspace) => workspace.workspaceId === selectedId) ? selectedId : '';
    };
    const renderPreferences = (value) => {
        if (preferenceVersion)
            preferenceVersion.textContent = value.version > 0 ? `v${value.version} · 서버 저장됨` : '서버 저장 전';
        if (preferenceDisplayName)
            preferenceDisplayName.value = value.displayName ?? '';
        if (preferenceRoleMode)
            preferenceRoleMode.value = value.roleMode ?? '';
        renderPreferenceWorkspaceOptions(value.defaultWorkspaceId);
        if (preferenceTimezone)
            preferenceTimezone.value = value.timezone ?? browserTimezone();
        if (preferenceTodayView)
            preferenceTodayView.value = value.defaultTodayView;
        if (preferenceWorkStart)
            preferenceWorkStart.value = value.workingHours.start;
        if (preferenceWorkEnd)
            preferenceWorkEnd.value = value.workingHours.end;
        const days = new Set(value.workingHours.weekdays);
        preferenceWeekdays.forEach((input) => { input.checked = days.has(Number(input.value)); });
        if (preferenceNotifyBrowser)
            preferenceNotifyBrowser.checked = value.notificationPreferences.browser;
        if (preferenceNotifyEmail)
            preferenceNotifyEmail.checked = value.notificationPreferences.email;
        if (preferenceNotifyDigest)
            preferenceNotifyDigest.checked = value.notificationPreferences.dailyDigest;
        setPreferenceStatus(value.version > 0 ? '서버에 저장된 개인 설정입니다. 권한에는 영향을 주지 않습니다.' : '아직 서버에 저장하지 않았습니다. 저장 전에는 기본값만 사용합니다.');
    };
    const formatLiveTime = (value) => {
        const timezone = preferences()?.timezone ?? undefined;
        try {
            return new Date(value).toLocaleString('ko-KR', timezone ? { timeZone: timezone } : undefined);
        }
        catch {
            return new Date(value).toLocaleString('ko-KR');
        }
    };
    const applyDefaultTodayView = () => {
        const pref = preferences();
        if (defaultViewApplied || !pref)
            return;
        defaultViewApplied = true;
        const current = window.location.hash;
        if (current && current !== '#today')
            return;
        const route = preferenceTodayRoute(pref.defaultTodayView);
        if (route !== 'TODAY')
            options.goTo(route);
    };
    const renderPersonalHome = (pack, identityLabel) => {
        const pref = preferences();
        const personal = buildPersonalHome(pack, pref ?? {});
        if (personalHome)
            personalHome.hidden = false;
        const visibleName = pref?.displayName ?? (identityLabel || `User ${personal.userId.slice(0, 8)}`);
        if (personalName)
            personalName.textContent = visibleName;
        if (personalMeta)
            personalMeta.textContent = `${roleModeLabel(pref?.roleMode ?? null)} · 권한 ${personal.viewerRole} · ${personal.workspaceId}`;
        if (personalSummary)
            personalSummary.textContent = `내 프로젝트 ${personal.myProjects.length} · 접근 가능한 프로젝트 ${personal.accessibleProjects.length} · ${pref?.timezone ?? '브라우저 시간대'} · 개인화 EXPLICIT ONLY`;
        if (pref)
            renderPreferences(pref);
        if (myProjects) {
            myProjects.replaceChildren();
            if (personal.myProjects.length === 0) {
                const empty = document.createElement('span');
                empty.className = 'why';
                empty.textContent = 'ownerUserId/memberUserIds로 명시된 내 프로젝트가 아직 없습니다.';
                myProjects.append(empty);
            }
            else {
                for (const project of personal.myProjects) {
                    const button = document.createElement('button');
                    button.type = 'button';
                    button.textContent = objectTitle(project);
                    button.addEventListener('click', () => options.openObject('PROJECT', project.objectId));
                    myProjects.append(button);
                }
            }
        }
    };
    const selectedWorkspaceById = (workspaceId) => controllers.workspaces.byId(workspaceId);
    const showWorkspaceChoice = (message, selectedId) => {
        if (workspacePicker)
            workspacePicker.hidden = false;
        if (workspaceChoiceCopy)
            workspaceChoiceCopy.textContent = message;
        renderWorkspaceOptions(workspaceSelect, workspaces(), selectedId);
        if (workspaceOpen)
            workspaceOpen.disabled = workspaces().length === 0;
    };
    const hideWorkspaceChoice = () => { if (workspacePicker)
        workspacePicker.hidden = true; };
    const renderWorkspaceSwitcher = (active) => {
        if (workspaceSwitcherWrap)
            workspaceSwitcherWrap.hidden = false;
        renderWorkspaceOptions(workspaceSwitcher, workspaces(), active.workspaceId);
        if (workspaceSwitcher) {
            workspaceSwitcher.value = active.workspaceId;
            workspaceSwitcher.disabled = workspaces().length <= 1;
        }
        if (workspaceRole)
            workspaceRole.textContent = `${active.role} · ACTIVE`;
    };
    const renderContext = (pack, statusPrefix = 'Live Context') => {
        const live = buildLiveTodayProjection(pack);
        const active = controllers.workspaces.active;
        const identity = controllers.auth.identity;
        options.renderToday(live.today);
        renderLiveMetrics(live.counts);
        setMode('LIVE');
        if (workspaceBadge && active)
            workspaceBadge.textContent = `${active.name} · ${live.viewerRole}`;
        renderPersonalHome(pack, identity?.label ?? '');
        renderTodayWelcome(pack);
        if (isRealFirstUse(pack))
            firstUseUi.renderEmptyWorkspace(pack);
        else
            firstUseUi.hide();
        if (active)
            renderWorkspaceSwitcher(active);
        hideWorkspaceChoice();
        if (liveForm)
            liveForm.hidden = true;
        if (liveOpen)
            liveOpen.hidden = true;
        if (liveDisconnect)
            liveDisconnect.hidden = false;
        setLiveMessage(`${statusPrefix}${active ? ` · ${active.name}` : ''} · ${live.counts.total} records · ${formatLiveTime(live.generatedAt)}`);
        return live;
    };
    const activateWorkspace = async (workspace) => {
        setMode('CONNECTING');
        setLiveMessage(`${workspace.name} Context를 읽는 중입니다…`);
        const hydrated = await controllers.workspaces.select(workspace.workspaceId);
        renderContext(hydrated.contextPack, 'Live Context');
        options.announce(`${workspace.name} Workspace를 열었습니다.`);
        applyDefaultTodayView();
        if (parseObjectRoute(window.location.hash))
            options.activateFromHash();
    };
    const renderSignedInWithoutWorkspace = (message) => {
        options.renderToday(buildTodayView([]));
        renderLiveMetrics({ truth: 0, evidence: 0, candidates: 0, recommendations: 0, total: 0 });
        setMode('SIGNED IN');
        if (workspaceBadge)
            workspaceBadge.textContent = 'Workspace 선택 필요';
        if (personalHome)
            personalHome.hidden = true;
        if (workspaceSwitcherWrap)
            workspaceSwitcherWrap.hidden = true;
        renderTodayWelcome(null, true);
        if (workspaces().length === 0)
            firstUseUi.renderNoWorkspace();
        else
            firstUseUi.hide();
        setLiveMessage(message);
    };
    const renderDemoState = (announceChange = true) => {
        defaultViewApplied = false;
        if (personalHome)
            personalHome.hidden = true;
        if (myProjects)
            myProjects.replaceChildren();
        if (workspaceSwitcherWrap)
            workspaceSwitcherWrap.hidden = true;
        if (todayWelcome)
            todayWelcome.hidden = true;
        if (firstUseUi)
            firstUseUi.hide();
        hideWorkspaceChoice();
        if (userBadge) {
            userBadge.hidden = true;
            userBadge.textContent = 'Guest';
        }
        options.renderToday(options.demoTodayView);
        renderDemoMetrics();
        setMode('DEMO');
        setLiveMessage('');
        if (workspaceBadge)
            workspaceBadge.textContent = 'Team Alpha · Core';
        if (liveDisconnect)
            liveDisconnect.hidden = true;
        if (liveOpen)
            liveOpen.hidden = false;
        if (liveForm)
            liveForm.hidden = true;
        if (livePassword)
            livePassword.value = '';
        if (announceChange)
            options.announce('Demo 데이터로 돌아왔습니다.');
    };
    const renderAuthenticatedSession = (selection, restored = false) => {
        const identity = controllers.auth.identity;
        defaultViewApplied = false;
        if (userBadge) {
            userBadge.hidden = false;
            userBadge.textContent = identity?.label ?? identity?.email ?? 'Signed in';
        }
        if (livePassword)
            livePassword.value = '';
        const active = controllers.workspaces.active;
        const pack = controllers.context.current;
        if (active && pack) {
            renderContext(pack, restored ? '세션 복원' : 'Live Context');
            applyDefaultTodayView();
            if (parseObjectRoute(window.location.hash))
                options.activateFromHash();
            return;
        }
        if (selection.source === 'NO_WORKSPACE') {
            renderSignedInWithoutWorkspace(restored ? '로그인 세션을 복원했습니다. 아직 Workspace가 없습니다. 첫 업무 공간을 만들어 시작하세요.' : '로그인이 완료됐습니다. 샘플 데이터 없이 실제 첫 Workspace부터 시작합니다.');
            hideWorkspaceChoice();
        }
        else {
            renderSignedInWithoutWorkspace(restored ? '로그인 세션을 복원했습니다. 이번에 사용할 Workspace를 선택하세요.' : '가입된 Workspace가 여러 개입니다. 이번에 사용할 Workspace를 선택하세요.');
            showWorkspaceChoice('Workspace를 선택하면 My Projects와 Today가 해당 Context로 다시 계산됩니다.');
        }
        if (liveForm)
            liveForm.hidden = true;
        if (liveOpen)
            liveOpen.hidden = true;
        if (liveDisconnect)
            liveDisconnect.hidden = false;
    };
    firstUseUi = createFirstUseUi({
        controllers,
        announce: options.announce,
        onContextChanged: (pack) => {
            renderContext(pack, 'First 30 Days');
            applyDefaultTodayView();
        }
    });
    liveOpen?.addEventListener('click', () => { if (liveForm)
        liveForm.hidden = false; setLiveMessage('로그인 후 내가 가입된 ACTIVE Workspace를 자동으로 찾습니다. Workspace ID를 입력할 필요가 없습니다.'); liveEmail?.focus(); });
    liveCancel?.addEventListener('click', () => { if (liveForm)
        liveForm.hidden = true; setLiveMessage(''); if (livePassword)
        livePassword.value = ''; });
    liveDisconnect?.addEventListener('click', async () => {
        if (liveDisconnect)
            liveDisconnect.disabled = true;
        setLiveMessage('로그아웃하는 중입니다…');
        try {
            await controllers.auth.signOut();
        }
        catch (error) {
            setLiveMessage(`서버 로그아웃 확인 실패 · ${error instanceof Error ? error.message : String(error)}`, true);
        }
        finally {
            renderDemoState(true);
            if (liveDisconnect)
                liveDisconnect.disabled = false;
        }
    });
    liveForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const email = liveEmail?.value.trim() ?? '';
        const password = livePassword?.value ?? '';
        if (!email || !password) {
            setLiveMessage('이메일과 비밀번호를 입력하세요.', true);
            return;
        }
        setMode('CONNECTING');
        setLiveMessage('로그인하고 내 Workspace를 찾는 중입니다…');
        if (liveConnect)
            liveConnect.disabled = true;
        try {
            renderAuthenticatedSession(await controllers.auth.signIn(email, password), false);
        }
        catch (error) {
            const code = error instanceof Error ? error.message : String(error);
            defaultViewApplied = false;
            setMode('DEMO');
            const friendly = code.includes('invalid_credentials') || code.includes('Invalid login') ? '로그인 정보가 맞지 않습니다.' : code.includes('WORKSPACE_DISCOVERY') ? 'Workspace 목록을 불러오지 못했습니다. 잠시 후 다시 시도하세요.' : `Live 연결 실패 · ${code}`;
            setLiveMessage(friendly, true);
            options.announce('Leader OS 로그인 또는 Workspace 조회에 실패했습니다.');
        }
        finally {
            if (liveConnect)
                liveConnect.disabled = false;
            if (livePassword)
                livePassword.value = '';
        }
    });
    const restorePersistedSession = async () => {
        setMode('CONNECTING');
        setLiveMessage('저장된 로그인 세션을 확인하는 중입니다…');
        try {
            const selection = await controllers.auth.restore();
            if (!selection) {
                renderDemoState(false);
                return;
            }
            renderAuthenticatedSession(selection, true);
        }
        catch (error) {
            renderDemoState(false);
            const code = error instanceof Error ? error.message : String(error);
            setLiveMessage(`로그인 세션은 보존됐지만 Workspace/Context 복원에 실패했습니다 · ${code}`, true);
            options.announce('저장된 Leader OS 세션의 업무 Context 복원에 실패했습니다.');
        }
    };
    workspaceOpen?.addEventListener('click', async () => {
        const workspace = selectedWorkspaceById(workspaceSelect?.value ?? '');
        if (!workspace) {
            setLiveMessage('열 Workspace를 선택하세요.', true);
            return;
        }
        if (workspaceOpen)
            workspaceOpen.disabled = true;
        try {
            await activateWorkspace(workspace);
        }
        catch (error) {
            renderSignedInWithoutWorkspace(`Workspace 연결 실패 · ${error instanceof Error ? error.message : String(error)}`);
            showWorkspaceChoice('다른 Workspace를 선택하거나 다시 시도하세요.', workspace.workspaceId);
        }
        finally {
            if (workspaceOpen)
                workspaceOpen.disabled = false;
        }
    });
    workspaceSwitcher?.addEventListener('change', async () => {
        const workspace = selectedWorkspaceById(workspaceSwitcher.value);
        const current = controllers.context.current;
        if (!workspace || workspace.workspaceId === current?.workspaceId)
            return;
        workspaceSwitcher.disabled = true;
        try {
            await activateWorkspace(workspace);
        }
        catch (error) {
            setLiveMessage(`Workspace 전환 실패 · ${error instanceof Error ? error.message : String(error)}`, true);
            const retained = controllers.workspaces.active;
            if (retained)
                renderWorkspaceSwitcher(retained);
        }
        finally {
            workspaceSwitcher.disabled = workspaces().length <= 1;
        }
    });
    preferenceForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const current = preferences();
        if (!controllers.auth.isSignedIn || !current) {
            setPreferenceStatus('로그인 후 저장할 수 있습니다.', true);
            return;
        }
        const weekdays = preferenceWeekdays.filter((input) => input.checked).map((input) => Number(input.value));
        if (weekdays.length === 0) {
            setPreferenceStatus('근무 요일을 하나 이상 선택하세요.', true);
            return;
        }
        const start = preferenceWorkStart?.value || '09:00';
        const end = preferenceWorkEnd?.value || '18:00';
        if (start >= end) {
            setPreferenceStatus('근무 종료 시간은 시작 시간보다 늦어야 합니다.', true);
            return;
        }
        const roleValue = preferenceRoleMode?.value ?? '';
        const patch = {
            displayName: preferenceDisplayName?.value.trim() || null,
            roleMode: roleValue ? roleValue : null,
            defaultWorkspaceId: preferenceDefaultWorkspace?.value || null,
            timezone: preferenceTimezone?.value.trim() || null,
            workingHours: { start, end, weekdays },
            notificationPreferences: { browser: preferenceNotifyBrowser?.checked === true, email: preferenceNotifyEmail?.checked === true, dailyDigest: preferenceNotifyDigest?.checked === true },
            defaultTodayView: (preferenceTodayView?.value || 'ATTENTION')
        };
        if (preferenceSave)
            preferenceSave.disabled = true;
        setPreferenceStatus('개인 설정을 서버에 저장하는 중입니다…');
        try {
            const saved = await controllers.preferences.save(patch);
            const identity = controllers.auth.identity;
            const pack = controllers.context.current;
            if (userBadge)
                userBadge.textContent = identity?.label ?? 'User';
            if (pack)
                renderPersonalHome(pack, identity?.label ?? '');
            setPreferenceStatus(`v${saved.preferences.version}로 저장했습니다. 권한은 변경되지 않았습니다.`);
            options.announce('개인 설정을 저장했습니다.');
        }
        catch (error) {
            const code = error instanceof Error ? error.message : String(error);
            if (code === 'VERSION_CONFLICT') {
                try {
                    const latest = await controllers.preferences.reload();
                    renderPreferences(latest.preferences);
                    setPreferenceStatus('다른 기기에서 설정이 먼저 변경됐습니다. 최신 설정을 불러왔습니다. 다시 확인 후 저장하세요.', true);
                }
                catch {
                    setPreferenceStatus('설정 충돌이 발생했습니다. 다시 로그인해 주세요.', true);
                }
            }
            else if (code === 'DEFAULT_WORKSPACE_MEMBERSHIP_REQUIRED')
                setPreferenceStatus('현재 ACTIVE membership이 없는 Workspace는 기본값으로 저장할 수 없습니다.', true);
            else if (code === 'INVALID_TIMEZONE')
                setPreferenceStatus('유효한 시간대를 입력하세요. 예: Asia/Seoul', true);
            else
                setPreferenceStatus(`설정 저장 실패 · ${code}`, true);
        }
        finally {
            if (preferenceSave)
                preferenceSave.disabled = false;
        }
    });
    renderDemoState(false);
    return { restorePersistedSession, renderContext, renderDemoState, renderAuthenticatedSession };
}
