const SAFE_WRITES = new Set(['evidence', 'artifact', 'draft', 'candidate']);
const PROHIBITED_WRITES = new Set(['fact', 'decision', 'commitment', 'action', 'attention', 'memory']);
export function validateAddonDescriptor(addon) {
    const violations = [];
    if (!addon?.id || !addon?.name)
        violations.push('ADDON_ID_NAME_REQUIRED');
    if (addon.truthWriteAllowed !== false)
        violations.push('ADDON_TRUTH_WRITE_PROHIBITED');
    if (addon.privateOneOnOneRead === true)
        violations.push('PRIVATE_1ON1_DEFAULT_DENY');
    for (const write of addon.contextWrites ?? []) {
        const normalized = write.toLowerCase();
        if (PROHIBITED_WRITES.has(normalized))
            violations.push(`PROHIBITED_WRITE:${normalized}`);
        else if (!SAFE_WRITES.has(normalized))
            violations.push(`UNKNOWN_WRITE:${normalized}`);
    }
    if (addon.execute === true && addon.executeApprovalRequired !== true) {
        violations.push('EXECUTE_REQUIRES_EXPLICIT_APPROVAL');
    }
    return { ok: violations.length === 0, violations };
}
export function buildAddonHub(addons) {
    const accepted = [];
    const rejected = [];
    for (const addon of Array.isArray(addons) ? addons : []) {
        const result = validateAddonDescriptor(addon);
        if (!result.ok) {
            rejected.push({ id: addon?.id ?? null, violations: result.violations });
            continue;
        }
        accepted.push({
            ...addon,
            capabilities: [...new Set(addon.capabilities ?? [])],
            roadmapCapabilities: [...new Set(addon.roadmapCapabilities ?? [])],
            contextReads: [...new Set(addon.contextReads ?? [])],
            contextWrites: [...new Set(addon.contextWrites ?? [])]
        });
    }
    return {
        view: 'ADD_ON_HUB',
        trustPath: ['ADD_ON', 'EVIDENCE_OR_CANDIDATE', 'HUMAN_REVIEW', 'CORE_CONTEXT', 'DECISION'],
        accepted,
        rejected,
        directTruthWriteAllowed: false
    };
}
export function opickerDescriptor() {
    return {
        id: 'opicker-web-intelligence',
        name: 'O!Picker Web Intelligence',
        specialistRole: 'Web Intelligence Specialist',
        status: 'DEGRADED',
        capabilities: ['SEO_AUDIT', 'GEO_AUDIT', 'DESIGN_EXTRACT'],
        roadmapCapabilities: ['AEO_AUDIT'],
        contextReads: ['project', 'company', 'evidence'],
        contextWrites: ['evidence', 'artifact'],
        suggest: false,
        execute: false,
        truthWriteAllowed: false,
        privateOneOnOneRead: false
    };
}
