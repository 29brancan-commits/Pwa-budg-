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
      // Clean up legacy auto-set endpoints that point to static origin
      if (parsed.mode === 'worker_endpoint' && parsed.workerEndpoint && parsed.workerEndpoint.includes('/api/sync')) {
        parsed.mode = 'kv';
        parsed.enabled = Boolean(parsed.accountId && parsed.kvNamespaceId && parsed.apiToken);
      }
      return { ...DEFAULT_CLOUDFLARE_CONFIG, ...parsed };
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
    mode: config.mode || 'kv',
    accountId: config.accountId || '',
    kvNamespaceId: config.kvNamespaceId || '',
    apiToken: config.apiToken || '',
    workerEndpoint: config.workerEndpoint || '',
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
    m: config.mode || 'kv',
    a: config.accountId || '',
    k: config.kvNamespaceId || '',
    t: config.apiToken || '',
    e: config.workerEndpoint || '',
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
 * Test & validate Cloudflare KV API credentials
 */
export async function validateCloudflareCredentials(
  accountId: string,
  kvNamespaceId: string,
  apiToken: string
): Promise<{ valid: boolean; error?: string }> {
  const acc = (accountId || '').trim();
  const kv = (kvNamespaceId || '').trim();
  const token = (apiToken || '').trim();

  if (!acc || !kv || !token) {
    return { valid: false, error: 'Please enter your Account ID, KV Namespace ID, and API Token.' };
  }

  // Query Cloudflare KV keys list API endpoint to verify read access
  const url = `https://api.cloudflare.com/client/v4/accounts/${acc}/storage/kv/namespaces/${kv}/keys?limit=1&_t=${Date.now()}`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401 || res.status === 403) {
      return { 
        valid: false, 
        error: 'Invalid API Token or insufficient permissions. Ensure token has "Workers KV Storage: Edit" permissions.' 
      };
    }

    if (res.status === 404) {
      return { 
        valid: false, 
        error: 'Account ID or KV Namespace ID not found. Double check your Account ID and KV Namespace ID.' 
      };
    }

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const msg = errJson.errors?.[0]?.message || errJson.message || `HTTP ${res.status}`;
      return { valid: false, error: `Cloudflare Error: ${msg}` };
    }

    return { valid: true };
  } catch (err: any) {
    return { valid: false, error: err.message || 'Failed to connect to Cloudflare KV API.' };
  }
}

/**
 * Save BudgetState to Cloudflare KV or Worker Endpoint
 */
export async function saveDataToCloudflare(
  config: CloudflareConfig,
  state: BudgetState
): Promise<{ success: boolean; syncedAt?: string; error?: string }> {
  if (!config.enabled) {
    return { success: false, error: 'Cloudflare Sync is disabled. Please check "Enable Cloudflare Sync" above to activate.' };
  }

  const syncKey = (config.syncKey || 'flowledger_budget_data').trim();

  // Mode 1: Cloudflare KV REST API Direct (Recommended)
  if (config.mode === 'kv') {
    const accountId = (config.accountId || '').trim();
    const namespaceId = (config.kvNamespaceId || '').trim();
    const token = (config.apiToken || '').trim();

    if (!accountId || !namespaceId || !token) {
      return { 
        success: false, 
        error: 'Please enter your Cloudflare Account ID, KV Namespace ID, and API Token to save to Cloudflare KV.' 
      };
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

      if (res.status === 401 || res.status === 403) {
        return {
          success: false,
          error: `Authentication Error (${res.status}): Please verify your API Token has "Workers KV Storage: Edit" permissions.`,
        };
      }

      if (res.status === 404) {
        return {
          success: false,
          error: 'Cloudflare Account ID or KV Namespace ID not found. Please double check your IDs.',
        };
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const msg = errJson.errors?.[0]?.message || errJson.message || `HTTP ${res.status}: ${res.statusText}`;
        return { success: false, error: `Cloudflare KV API Error: ${msg}` };
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

    try {
      let res = await fetch(endpoint, {
        method: 'PUT',
        headers,
        body: payloadWrapped,
      });

      if (res.status === 405) {
        res = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: payloadWrapped,
        });
      }

      if (!res.ok) {
        if (res.status === 405) {
          return {
            success: false,
            error: `Static web app URL (${endpoint}) returned HTTP 405. Static file hosts reject POST/PUT requests. Please switch to 'Cloudflare KV (REST API)' mode below and enter your Cloudflare Account ID & KV Namespace ID.`,
          };
        }
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
    return { success: false, error: 'Cloudflare Sync is disabled. Please check "Enable Cloudflare Sync" above to activate.' };
  }

  const syncKey = (config.syncKey || 'flowledger_budget_data').trim();

  // Mode 1: Cloudflare KV REST API Direct
  if (config.mode === 'kv') {
    const accountId = (config.accountId || '').trim();
    const namespaceId = (config.kvNamespaceId || '').trim();
    const token = (config.apiToken || '').trim();

    if (!accountId || !namespaceId || !token) {
      return { success: false, error: 'Please enter your Cloudflare Account ID, KV Namespace ID, and API Token.' };
    }

    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${syncKey}?_t=${Date.now()}`;

    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 404) {
        return { 
          success: false, 
          error: `Key "${syncKey}" not found in Cloudflare KV yet. Click "Push & Save to Cloudflare" to save your budget data first.` 
        };
      }

      if (res.status === 401 || res.status === 403) {
        return {
          success: false,
          error: `Authentication Error (${res.status}): Please verify your API Token has "Workers KV Storage: Edit" permissions.`,
        };
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

      if (res.status === 405) {
        res = await fetch(endpoint, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'load', key: syncKey }),
        });
      }

      if (!res.ok) {
        if (res.status === 405) {
          return {
            success: false,
            error: `Static site (${endpoint}) returned HTTP 405. Please switch to 'Cloudflare KV (REST API)' mode below.`,
          };
        }
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
