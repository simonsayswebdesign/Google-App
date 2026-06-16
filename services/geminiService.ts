import { GeneratedSection } from "../types";

/**
 * Gets the configured API Base URL. 
 * Prioritizes LocalStorage configuration (for live updates on static deploys),
 * then falls back to VITE_API_URL, and defaults to relative paths for normal fullstack runs.
 */
export const getApiBaseUrl = (): string => {
    if (typeof window !== 'undefined' && window.localStorage) {
        const custom = window.localStorage.getItem('custom_api_url');
        if (custom) return custom.endsWith('/') ? custom.slice(0, -1) : custom;
    }
    
    const envUrl = (import.meta as any).env?.VITE_API_URL || '';
    if (envUrl) {
        return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
    }

    // Auto-detect static hosting (Vercel, Netlify, GitHub Pages, custom domains) and route requests
    // to the active production Cloud Run backend so it works out-of-the-box.
    if (typeof window !== 'undefined') {
        const hn = window.location.hostname;
        const isRunApp = hn.endsWith('.run.app') || hn.includes('run.app');
        const isLocal = hn === 'localhost' || hn === '127.0.0.1' || hn.startsWith('192.168.') || hn.endsWith('.local');
        if (!isRunApp && !isLocal) {
            return 'https://ais-pre-kwolk7smnvsqrf6ls5kdxz-67721096825.europe-west2.run.app';
        }
    }
    
    return '';
};

/**
 * Sanitizes and cleans up API base URLs.
 * - Strips any leading/trailing whitespace.
 * - Ensures correct protocol (defaults to https://).
 * - Strips standard development ports (like :3000 or :5173) if pointing to Cloud Run (.run.app).
 * - Removes trailing slashes.
 */
export const sanitizeApiUrl = (url: string): string => {
    let clean = url.trim();
    if (!clean) return '';
    
    // Ensure it starts with https:// or http://
    if (!/^https?:\/\//i.test(clean)) {
        clean = 'https://' + clean;
    }
    
    try {
        const parsed = new URL(clean);
        // If it is a Cloud Run app (*.run.app) or similar and has a port, strip the port 
        // because Cloud Run endpoints are exposed on standard 443 externally.
        if ((parsed.hostname.endsWith('.run.app') || parsed.hostname.includes('europe-west2.run.app')) && parsed.port) {
            clean = `${parsed.protocol}//${parsed.hostname}${parsed.pathname === '/' ? '' : parsed.pathname}`;
        }
    } catch (e) {
        // Fallback to basic regex/string checks if URL construct fails
    }

    if (clean.endsWith('/')) {
        clean = clean.slice(0, -1);
    }
    return clean;
};

/**
 * Persists a custom API Base URL to LocalStorage
 */
export const setApiBaseUrl = (url: string) => {
    if (typeof window !== 'undefined' && window.localStorage) {
        if (!url) {
            window.localStorage.removeItem('custom_api_url');
        } else {
            const sanitized = sanitizeApiUrl(url);
            if (sanitized) {
                window.localStorage.setItem('custom_api_url', sanitized);
            } else {
                window.localStorage.removeItem('custom_api_url');
            }
        }
    }
};

/**
 * Gets the custom/subscriber Gemini API Key from LocalStorage
 */
export const getSubscriberApiKey = (): string => {
    if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem('subscriber_gemini_api_key') || '';
    }
    return '';
};

/**
 * Persists the custom/subscriber Gemini API Key to LocalStorage
 */
export const setSubscriberApiKey = (key: string) => {
    if (typeof window !== 'undefined' && window.localStorage) {
        if (!key) {
            window.localStorage.removeItem('subscriber_gemini_api_key');
        } else {
            window.localStorage.setItem('subscriber_gemini_api_key', key.trim());
        }
    }
};

/**
 * Helper to execute client side fetches with custom timeout limits and integration with abort controllers
 */
const fetchWithTimeout = async (url: string, options: RequestInit & { timeout?: number; signal?: AbortSignal }) => {
    const { timeout = 150000, signal, ...fetchOpts } = options;
    const controller = new AbortController();
    
    const timeoutId = setTimeout(() => {
        controller.abort();
    }, timeout);
    
    if (signal) {
        if (signal.aborted) {
            clearTimeout(timeoutId);
            throw new Error("Aborted");
        }
        signal.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            controller.abort();
        });
    }

    // Resolve full URL
    const baseUrl = getApiBaseUrl();
    const fullUrl = baseUrl ? `${baseUrl}${url}` : url;

    const subKey = getSubscriberApiKey();

    try {
        const response = await fetch(fullUrl, {
            ...fetchOpts,
            headers: {
                ...fetchOpts.headers,
                ...(subKey ? { 'X-Gemini-API-Key': subKey } : {})
            } as any,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (e: any) {
        clearTimeout(timeoutId);
        if (e.name === 'AbortError') {
            if (signal?.aborted) {
                throw new Error("Aborted");
            }
            throw new Error("Generation timed out. Designing complex layouts can take longer to complete. Please try again.");
        }
        throw e;
    }
};

export const generateSection = async (userPrompt: string, options?: { 
    style?: string; 
    image?: string; 
    referenceHtml?: string; 
    prevSectionHtml?: string; 
    isTransparent?: boolean;
    themePreference?: 'auto' | 'light' | 'dark' | 'accent';
    model?: string;
    signal?: AbortSignal;
    animationStyle?: string;
}): Promise<Omit<GeneratedSection, 'id' | 'timestamp'>> => {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    };

    const response = await fetchWithTimeout('/api/generate-section', {
        method: 'POST',
        headers,
        body: JSON.stringify({
            prompt: userPrompt,
            options: {
                style: options?.style,
                image: options?.image,
                referenceHtml: options?.referenceHtml,
                prevSectionHtml: options?.prevSectionHtml,
                isTransparent: options?.isTransparent,
                themePreference: options?.themePreference,
                model: options?.model,
                animationStyle: options?.animationStyle
            }
        }),
        timeout: 180000, // 3 minute timeout for pro model generation
        signal: options?.signal
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to generate section (HTTP ${response.status})`);
    }

    const result = await response.json();
    return {
        html: result.html,
        originalHtml: result.html,
        name: result.name || "Untitled Section",
        description: result.description || "No description provided.",
        style: options?.style,
        isTransparent: options?.isTransparent
    };
};

export const generateFullPage = async (
    userPrompt: string, 
    style?: string, 
    isTransparent?: boolean, 
    themePreference?: 'auto' | 'light' | 'dark' | 'accent',
    anchorHtml?: string,
    model?: string,
    signal?: AbortSignal,
    animationStyle?: string
): Promise<Omit<GeneratedSection, 'id' | 'timestamp'>[]> => {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    };

    const response = await fetchWithTimeout('/api/generate-full-page', {
        method: 'POST',
        headers,
        body: JSON.stringify({
            prompt: userPrompt,
            style,
            isTransparent,
            themePreference,
            anchorHtml,
            model,
            animationStyle
        }),
        timeout: 240000, // 4 minute timeout for full page designs
        signal
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to generate page stages (HTTP ${response.status})`);
    }

    const result = await response.json();
    if (!result.sections || !Array.isArray(result.sections)) {
        throw new Error("The AI failed to generate the page sections array.");
    }

    return result.sections.map((s: any) => ({ 
        ...s, 
        originalHtml: s.html, 
        style, 
        isTransparent,
        name: s.name || "Untitled Section",
        description: s.description || "No description provided."
    }));
};
