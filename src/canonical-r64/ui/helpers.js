export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char] ?? char));
export function requiredElement(selector, name) {
    const element = document.querySelector(selector);
    if (!element)
        throw new Error(`${name}_MISSING`);
    return element;
}
export async function copyTextToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
    }
    catch {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.append(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
    }
}
