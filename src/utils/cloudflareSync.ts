import { BudgetState } from '../types/expense';

export interface CloudflareConfig {
  enabled: boolean;
  mode: 'kv' | 'worker_endpoint';
  accountId: string;
  kvNamespaceId: string;
  apiToken: string;
  workerEndpoint: string;
  syncKey: string;
  autoSave: boolean;
  lastSyncedAt?: string;
}

const CLOUDFLARE_CONFIG_KEY = 'flowledger_cloudflare_config_v1';

export const DEFAULT_CLOUDFLARE_CONFIG: CloudflareConfig = {
  enabled: false,
  mode: 'kv',
  accountId: '',
  kvNamespaceId: '',
  apiToken: '',
  workerEndpoint: '',
  syncKey: 'flowledger_budget_data',
  autoSave: true,
};

/**
 * Parse Cloudflare sync configuration from URL query parameters (e.g., when clicking 1-Click Sync Link)
 */
export function parseCloudflareConfigFromUrl(): CloudflareConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const cfSyncParam = params.get('cf_sync') || params.get('cf_config');

    if (cfSyncParam) {
      try {
        const decodedStr = atob(decodeURIComponent(cfSyncParam));
        const parsed = JSON.parse(decodedStr);
        if (parsed && typeof parsed === 'object') {
          const cfg: CloudflareConfig = {
            ...DEFAULT_CLOUDFLARE_CONFIG,
            ...parsed,
            enabled: true,
          };
          saveCloudflareConfig(cfg);
          // Clean URL parameters without reloading page
          const cleanUrl = window.location.pathname + window.location.hash;
          window.history.replaceState({}, document.title, cleanUrl);
          return cfg;
        }
      } catch (e) {
        console.warn('Failed to parse encoded cf_sync parameter:', e);
      }
    }

    const cfMode = params.get('cf_mode') as 'kv' | 'worker_endpoint' | null;
    const cfEndpoint = params.get('cf_endpoint');
    const cfAccount = params.get('cf_account');
    const cfKv = params.get('cf_kv');
    const cfToken = params.get('cf_token');
    const cfKey = params.get('cf_key');

    if (cfEndpoint || (cfAccount && cfKv) || cfMode) {
      const cfg: CloudflareConfig = {
        enabled: true,
        mode: cfMode || (cfEndpoint ? 'worker_endpoint' : 'kv'),
        accountId: cfAccount || '',
        kvNamespaceId: cfKv || '',
        apiToken: cfToken || '',
        workerEndpoint: cfEndpoint || '',
        syncKey: cfKey || 'flowledger_budget_data',
        autoSave: true,
      };
      saveCloudflareConfig(cfg);
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, cleanUrl);
      return cfg;
    }
  } catch (e) {
    console.error('Error checking URL for Cloudflare config:', e);
  }
  return null;
}

export function loadCloudflareConfig(): CloudflareConfig {
  if (typeof window === 'undefined') return DEFAULT_CLOUDFLARE_CONFIG;
  try {
    // 1. Check if URL has sync parameters passed from another device
    const urlConfig = parseCloudflareConfigFromUrl();
    if (urlConfig) return urlConfig;

    // 2. Check localStorage
    const raw = localStorage.getItem(CLOUDFLARE_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_CLOUDFLARE_CONFIG, ...parsed };
    }

    // 3. Auto-detect if running on Cloudflare Workers / Cloudflare Pages domain (e.g. *.workers.dev)
    const hostname = window.location.hostname;
    if (hostname.endsWith('workers.dev') || hostname.endsWith('pages.dev')) {
      const autoConfig: CloudflareConfig = {
        ...DEFAULT_CLOUDFLARE_CONFIG,
        enabled: true,
        mode: 'worker_endpoint',
        workerEndpoint: `${window.location.origin}/api/sync`,
        syncKey: 'flowledger_budget_data',
        autoSave: true,
      };
      saveCloudflareConfig(autoConfig);
      return autoConfig;
    }

    return DEFAULT_CLOUDFLARE_CONFIG;
  } catch (e) {
    console.error('Failed to load Cloudflare config:', e);
    return DEFAULT_CLOUDFLARE_CONFIG;
  }
}

export function saveCloudflareConfig(config: CloudflareConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CLOUDFLARE_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save Cloudflare config:', e);
  }
}

/**
 * Generate a 1-Click shareable URL link containing encoded Cloudflare sync credentials
 */
export function generateCloudflareSyncShareLink(config: CloudflareConfig): string {
  if (typeof window === 'undefined') return '';
  const payload = {
    mode: config.mode,
    accountId: config.accountId,
    kvNamespaceId: config.kvNamespaceId,
    apiToken: config.apiToken,
    workerEndpoint: config.workerEndpoint,
    syncKey: config.syncKey || 'flowledger_budget_data',
  };

  const encoded = encodeURIComponent(btoa(JSON.stringify(payload)));
  const origin = window.location.origin + window.location.pathname;
  return `${origin}?cf_sync=${encoded}`;
}

/**
 * Export Cloudflare config as a compact 1-line Sync Code string (CFSYNC:...)
 */
export function generateCloudflareSyncToken(config: CloudflareConfig): string {
  const payload = {
    m: config.mode,
    a: config.accountId,
    k: config.kvNamespaceId,
    t: config.apiToken,
    e: config.workerEndpoint,
    s: config.syncKey || 'flowledger_budget_data',
  };
  return `CFSYNC:${btoa(JSON.stringify(payload))}`;
}

/**
 * Import Cloudflare config from a 1-line Sync Code string (CFSYNC:...)
 */
export function parseCloudflareSyncToken(tokenStr: string): CloudflareConfig | null {
  try {
    const clean = tokenStr.trim();
    const raw = clean.startsWith('CFSYNC:') ? clean.slice(7) : clean;
    const parsed = JSON.parse(atob(raw));
    if (parsed && typeof parsed === 'object') {
      return {
        ...DEFAULT_CLOUDFLARE_CONFIG,
        enabled: true,
        mode: parsed.m || (parsed.e ? 'worker_endpoint' : 'kv'),
        accountId: parsed.a || '',
        kvNamespaceId: parsed.k || '',
        apiToken: parsed.t || '',
        workerEndpoint: parsed.e || '',
        syncKey: parsed.s || 'flowledger_budget_data',
        autoSave: true,
      };
    }
  } catch (e) {
    console.error('Invalid Cloudflare sync token string:', e);
  }
  return null;
}

/**
 * Save BudgetState to Cloudflare KV or Worker Endpoint
 */
export async function saveDataToCloudflare(
  config: CloudflareConfig,
  state: BudgetState
): Promise<{ success: boolean; syncedAt?: string; error?: string }> {
  if (!config.enabled) {
    return { success: false, error: 'Cloudflare Sync is not enabled.' };
  }

  const syncKey = (config.syncKey || 'flowledger_budget_data').trim();

  // Mode 1: Cloudflare KV REST API Direct
  if (config.mode === 'kv') {
    const accountId = (config.accountId || '').trim();
    const namespaceId = (config.kvNamespaceId || '').trim();
    const token = (config.apiToken || '').trim();

    if (!accountId || !namespaceId || !token) {
      return { success: false, error: 'Cloudflare Account ID, KV Namespace ID, and API Token are required.' };
    }

    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${syncKey}`;

    try {
      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(state),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const msg = errJson.errors?.[0]?.message || errJson.message || `HTTP ${res.status}: ${res.statusText}`;
        return { success: false, error: `Cloudflare KV Error: ${msg}` };
      }

      const syncedAt = new Date().toISOString();
      const updatedConfig = { ...config, lastSyncedAt: syncedAt };
      saveCloudflareConfig(updatedConfig);

      return { success: true, syncedAt };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to connect to Cloudflare KV API.' };
    }
  }

  // Mode 2: Custom Cloudflare Worker Endpoint
  if (config.mode === 'worker_endpoint') {
    const endpoint = (config.workerEndpoint || '').trim();
    if (!endpoint) {
      return { success: false, error: 'Cloudflare Worker Endpoint URL is required.' };
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(config.apiToken ? { Authorization: `Bearer ${config.apiToken.trim()}` } : {}),
    };

    const payloadWrapped = JSON.stringify({ key: syncKey, data: state, state });
    const payloadRaw = JSON.stringify(state);

    try {
      // Attempt 1: PUT with wrapped payload (Standard REST / KV proxy)
      let res = await fetch(endpoint, {
        method: 'PUT',
        headers,
        body: payloadWrapped,
      });

      // Attempt 2: If 405 Method Not Allowed, try POST with wrapped payload
      if (res.status === 405) {
        res = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: payloadWrapped,
        });
      }

      // Attempt 3: If 400 or 422, try raw state payload with PUT
      if (res.status === 400 || res.status === 422) {
        res = await fetch(endpoint, {
          method: 'PUT',
          headers,
          body: payloadRaw,
        });
      }

      // Attempt 4: If still 405, try POST with raw state payload
      if (res.status === 405) {
        res = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: payloadRaw,
        });
      }

      if (!res.ok) {
        return { success: false, error: `Worker Endpoint HTTP ${res.status}: ${res.statusText}` };
      }

      const syncedAt = new Date().toISOString();
      const updatedConfig = { ...config, lastSyncedAt: syncedAt };
      saveCloudflareConfig(updatedConfig);

      return { success: true, syncedAt };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to reach Cloudflare Worker endpoint.' };
    }
  }

  return { success: false, error: 'Invalid Cloudflare sync mode selected.' };
}

/**
 * Load BudgetState from Cloudflare KV or Worker Endpoint
 */
export async function loadDataFromCloudflare(
  config: CloudflareConfig
): Promise<{ success: boolean; state?: BudgetState; error?: string }> {
  if (!config.enabled) {
    return { success: false, error: 'Cloudflare Sync is not enabled.' };
  }

  const syncKey = (config.syncKey || 'flowledger_budget_data').trim();

  // Mode 1: Cloudflare KV REST API Direct
  if (config.mode === 'kv') {
    const accountId = (config.accountId || '').trim();
    const namespaceId = (config.kvNamespaceId || '').trim();
    const token = (config.apiToken || '').trim();

    if (!accountId || !namespaceId || !token) {
      return { success: false, error: 'Cloudflare Account ID, KV Namespace ID, and API Token are required.' };
    }

    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${syncKey}?_t=${Date.now()}`;

    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 404) {
        return { success: false, error: `Key "${syncKey}" not found in Cloudflare KV. Save data to create it.` };
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const msg = errJson.errors?.[0]?.message || errJson.message || `HTTP ${res.status}`;
        return { success: false, error: `Cloudflare KV Error: ${msg}` };
      }

      const parsedState = await res.json();
      if (!parsedState || !parsedState.months || !parsedState.currentMonthId) {
        return { success: false, error: 'Cloudflare KV data does not match FlowLedger BudgetState format.' };
      }

      return { success: true, state: parsedState };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to fetch data from Cloudflare KV.' };
    }
  }

  // Mode 2: Worker Endpoint
  if (config.mode === 'worker_endpoint') {
    const endpoint = (config.workerEndpoint || '').trim();
    if (!endpoint) {
      return { success: false, error: 'Cloudflare Worker Endpoint URL is required.' };
    }

    const headers: Record<string, string> = {
      ...(config.apiToken ? { Authorization: `Bearer ${config.apiToken.trim()}` } : {}),
    };

    try {
      const url = endpoint.includes('?')
        ? `${endpoint}&key=${encodeURIComponent(syncKey)}&_t=${Date.now()}`
        : `${endpoint}?key=${encodeURIComponent(syncKey)}&_t=${Date.now()}`;

      let res = await fetch(url, { headers });

      // If GET returns 405 Method Not Allowed, try POST
      if (res.status === 405) {
        res = await fetch(endpoint, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'load', key: syncKey }),
        });
      }

      if (!res.ok) {
        return { success: false, error: `Worker Endpoint HTTP ${res.status}: ${res.statusText}` };
      }

      const parsedState = await res.json();
      const state = parsedState.data || parsedState.state || parsedState;
      if (!state || !state.months || !state.currentMonthId) {
        return { success: false, error: 'Worker endpoint returned invalid state format.' };
      }

      return { success: true, state };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to fetch from Cloudflare Worker.' };
    }
  }

  return { success: false, error: 'Invalid mode.' };
}
