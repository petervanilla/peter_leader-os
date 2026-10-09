import { PRIMARY_ROUTES, validateNavigationContract } from '../navigation.js';
import { parseObjectRoute } from '../object-detail.js';
export function createNavigationUi(bridge) {
    const validation = validateNavigationContract();
    if (!validation.ok)
        throw new Error(`Leader OS navigation contract failed: ${validation.violations.join(', ')}`);
    const nav = document.querySelector('[data-primary-nav]');
    if (!nav)
        throw new Error('PRIMARY_NAV_MISSING');
    nav.replaceChildren();
    const topbarTitle = document.querySelector('[data-topbar-title]');
    const pages = Array.from(document.querySelectorAll('[data-page]'));
    const liveStatus = document.querySelector('[data-live-status]');
    const announce = (message) => { if (liveStatus)
        liveStatus.textContent = message; };
    const showPage = (id, label) => {
        let matched = false;
        for (const page of pages) {
            const visible = page.dataset.page === id;
            page.hidden = !visible;
            matched ||= visible;
        }
        if (!matched) {
            const today = pages.find((page) => page.dataset.page === 'TODAY');
            if (today)
                today.hidden = false;
        }
        if (topbarTitle)
            topbarTitle.textContent = matched ? label : `${label} · queued`;
    };
    const setActive = (id, label, syncHash = true) => {
        for (const anchor of nav.querySelectorAll('a[data-route-id]')) {
            const active = anchor.dataset.routeId === id;
            anchor.classList.toggle('active', active);
            if (active)
                anchor.setAttribute('aria-current', 'page');
            else
                anchor.removeAttribute('aria-current');
        }
        showPage(id, label);
        if (syncHash) {
            const route = PRIMARY_ROUTES.find((candidate) => candidate.id === id);
            if (route)
                history.pushState(null, '', `#${route.path.slice(1)}`);
        }
    };
    const routeLabel = (id) => PRIMARY_ROUTES.find((route) => route.id === id)?.label ?? id;
    const goTo = (id) => setActive(id, routeLabel(id));
    const groupLabels = { FOCUS: 'Focus', PEOPLE: 'People', EXECUTION: 'Execution', SYSTEM: 'System' };
    const groupContainers = new Map();
    for (const route of PRIMARY_ROUTES) {
        let section = groupContainers.get(route.group);
        if (!section) {
            section = document.createElement('div');
            section.className = 'nav-section';
            section.dataset.navGroup = route.group;
            const label = document.createElement('div');
            label.className = 'nav-label';
            label.textContent = groupLabels[route.group];
            section.append(label);
            groupContainers.set(route.group, section);
            nav.append(section);
        }
        const anchor = document.createElement('a');
        anchor.href = `#${route.path.slice(1)}`;
        anchor.dataset.routeId = route.id;
        anchor.textContent = route.label;
        anchor.title = route.purpose;
        if (route.id === 'TODAY') {
            anchor.classList.add('active');
            anchor.setAttribute('aria-current', 'page');
        }
        if (route.id === 'REVIEW')
            anchor.classList.add('review');
        if (route.id === 'ADD_ONS')
            anchor.classList.add('addons');
        anchor.addEventListener('click', (event) => { event.preventDefault(); setActive(route.id, route.label); });
        section.append(anchor);
    }
    const activateFromHash = () => {
        const hash = window.location.hash.slice(1);
        if (!hash)
            return;
        const nested = parseObjectRoute(hash);
        if (nested) {
            const item = bridge.resolveObject(nested.objectType, nested.objectId);
            setActive(nested.parentRouteId, routeLabel(nested.parentRouteId), false);
            if (item)
                bridge.renderObject(item, nested);
            else
                bridge.openObject(nested.objectType, nested.objectId);
            return;
        }
        if (bridge.isObjectOpen())
            bridge.closeObject(false);
        const route = PRIMARY_ROUTES.find((candidate) => candidate.path === `/${hash}`);
        if (route)
            setActive(route.id, route.label, false);
    };
    window.addEventListener('hashchange', activateFromHash);
    document.querySelector('[data-go-review]')?.addEventListener('click', () => goTo('REVIEW'));
    return { setActive, goTo, routeLabel, activateFromHash, announce };
}
