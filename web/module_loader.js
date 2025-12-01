// module_loader.js - 動態加載模組，解決時序問題

export async function loadModule(url, suppressError = false) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch module from ${url}: ${response.statusText}`);
        }
        const code = await response.text();
        const blob = new Blob([code], { type: 'text/javascript' });
        const moduleUrl = URL.createObjectURL(blob);
        try {
            const module = await import(moduleUrl);
            return { module };
        } finally {
            URL.revokeObjectURL(moduleUrl);
        }
    } catch (e) {
        if (!suppressError) {
            console.error('Error loading module:', url, e);
        }
        return { error: e };
    }
}
