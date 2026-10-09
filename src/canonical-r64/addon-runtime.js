export const OPICKER_ADDON_ID = 'opicker-web-intelligence';
export const OPICKER_PRODUCT_SKU = 'opicker.pro';
const CAPABILITIES = new Set([
    'SEO_AUDIT',
    'GEO_AUDIT',
    'DESIGN_EXTRACT'
]);
function required(value, name) {
    const trimmed = value?.trim();
    if (!trimmed)
        throw new Error(`${name}_REQUIRED`);
    return trimmed;
}
export function validateOpickerAnalyzeInput(input) {
    required(input.requestId, 'REQUEST_ID');
    if (!Array.isArray(input.capabilities) || input.capabilities.length === 0) {
        throw new Error('ADDON_CAPABILITY_REQUIRED');
    }
    if (input.capabilities.some((capability) => !CAPABILITIES.has(capability))) {
        throw new Error('UNSUPPORTED_ADDON_CAPABILITY');
    }
    const rawUrl = required(input.input?.url, 'TARGET_URL');
    let url;
    try {
        url = new URL(rawUrl);
    }
    catch {
        throw new Error('INVALID_TARGET_URL');
    }
    if (!['http:', 'https:'].includes(url.protocol))
        throw new Error('INVALID_TARGET_URL');
    return {
        requestId: input.requestId.trim(),
        capabilities: [...new Set(input.capabilities)],
        input: {
            url: url.toString(),
            forceRefresh: input.input.forceRefresh === true
        },
        routeContext: {
            projectId: input.routeContext?.projectId?.trim() || null,
            companyId: input.routeContext?.companyId?.trim() || null
        }
    };
}
export function isOpickerEvidence(item) {
    return item.objectType === 'EVIDENCE'
        && item.confirmed === false
        && item.data?.sourceType === 'ADDON'
        && item.data?.sourceModuleId === OPICKER_ADDON_ID
        && item.data?.truthStatus === 'UNCONFIRMED_EVIDENCE'
        && item.data?.confirmedFact === false;
}
