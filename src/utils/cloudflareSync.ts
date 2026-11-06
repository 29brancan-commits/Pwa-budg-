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
 * Helper to execute Cloudflare KV API operations via local backend proxy (/api/cloudflare-kv)
 * or fall back to direct api.cloudflare.com fetch with CORS error handling.
 */
async function executeCloudflareKVFetch(params: {
  method: 'GET' | 'PUT';
  action: 'validate' | 'load' | 'save';
  accountId: string;
  kvNamespaceId: string;
  apiToken: string;
  key?: string;
  body?: any;
}): Promise<{ resStatus: number; data?: any; rawText?: string; isNetworkError?: boolean; error?: string }> {
  const acc = params.accountId.trim();
  const kv = params.kvNamespaceId.trim();
  const token = params.apiToken.trim();
  const key = (params.key || 'flowledger_budget_data').trim();

  // 1. Try local Express / Worker proxy endpoint (/api/cloudflare-kv)
  try {
    const proxyUrl = params.action === 'load' 
      ? `/api/cloudflare-kv?action=load&_t=${Date.now()}`
      : `/api/cloudflare-kv?action=${params.action}`;

    const proxyRes = await fetch(proxyUrl, {
      method: params.method === 'PUT' ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-CF-Account-ID': acc,
        'X-CF-KV-ID': kv,
        'X-CF-Key': key,
      },
      ...(params.method === 'PUT' && params.body ? { body: JSON.stringify({ action: params.action, data: params.body }) } : {}),
    });

    const contentType = proxyRes.headers.get('content-type') || '';

    if (!contentType.includes('text/html') && (proxyRes.ok || proxyRes.status === 401 || proxyRes.status === 403 || proxyRes.status === 404)) {
      const data = await proxyRes.json().catch(() => null);
      if (data) {
        return { resStatus: proxyRes.status, data };
      }
    }
  } catch (proxyErr) {
    // Relative proxy route unavailable, fall through
  }

  // 2. Direct fetch to Cloudflare API endpoint
  const directUrl = `https://api.cloudflare.com/client/v4/accounts/${acc}/storage/kv/namespaces/${kv}/values/${key}?_t=${Date.now()}`;

  try {
    const directRes = await fetch(directUrl, {
      method: params.action === 'save' ? 'PUT' : 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(params.action === 'save' ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(params.action === 'save' && params.body ? { body: JSON.stringify(params.body) } : {}),
    });

    let data = null;
    let rawText = '';
    try {
      rawText = await directRes.text();
      data = JSON.parse(rawText);
    } catch {
      // Plain text or JSON payload
    }

    return { resStatus: directRes.status, data, rawText };
  } catch (directErr: any) {
    // 3. Fallback: Automated CORS Proxy (corsproxy.io) for direct browser calls from static hosts
    try {
      const corsProxyUrl = `https://corsproxy.io/?${encodeURIComponent(directUrl)}`;
      const corsRes = await fetch(corsProxyUrl, {
        method: params.action === 'save' ? 'PUT' : 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          ...(params.action === 'save' ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(params.action === 'save' && params.body ? { body: JSON.stringify(params.body) } : {}),
      });

      if (corsRes.ok || corsRes.status === 401 || corsRes.status === 403 || corsRes.status === 404) {
        let data = null;
        try {
          data = await corsRes.json();
        } catch {
          // JSON parse
        }
        return { resStatus: corsRes.status, data };
      }
    } catch (corsErr) {
      // CORS proxy fallback also failed
    }

    const msg = directErr?.message || String(directErr);
    return {
      resStatus: 0,
      isNetworkError: true,
      error: `Network Error (${msg}). Please verify your Account ID, KV Namespace ID, and API Token.`,
    };
  }
}

/**
 * Test & validate Cloudflare KV API credentials
 */
export async function validateCloudflareCredentials(
  accountId: string,
  kvNamespaceId: string,
  apiToken: string,
  syncKey: string = 'flowledger_budget_data'
): Promise<{ valid: boolean; error?: string }> {
  const acc = (accountId || '').trim();
  const kv = (kvNamespaceId || '').trim();
  const token = (apiToken || '').trim();

  if (!acc || !kv || !token) {
    return { valid: false, error: 'Please enter your Account ID, KV Namespace ID, and API Token.' };
  }

  const result = await executeCloudflareKVFetch({
    method: 'GET',
    action: 'validate',
    accountId: acc,
    kvNamespaceId: kv,
    apiToken: token,
    key: syncKey,
  });

  if (result.isNetworkError || result.error) {
    return { valid: false, error: result.error || 'Failed to connect to Cloudflare KV.' };
  }

  // 200 OK (key exists) or 404 Not Found (key not created yet) both confirm valid KV storage permissions!
  if (result.resStatus === 200 || result.resStatus === 404) {
    return { valid: true };
  }

  if (result.resStatus === 401) {
    return {
      valid: false,
      error: 'Invalid Cloudflare API Token. Please check that you copied the complete token string.',
    };
  }

  if (result.resStatus === 403) {
    return {
      valid: false,
      error: 'HTTP 403 Forbidden from Cloudflare API. Please check: 1) Ensure you created an "API Token" (not Global API Key), 2) Set Permission to "Account -> Workers KV Storage -> Edit", 3) Set Account Resources to "Include -> All accounts" or account ID ' + acc + '.',
    };
  }

  const msg = result.data?.errors?.[0]?.message || result.data?.message || `HTTP ${result.resStatus}`;
  return { valid: false, error: `Cloudflare Error: ${msg}` };
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

    const result = await executeCloudflareKVFetch({
      method: 'PUT',
      action: 'save',
      accountId,
      kvNamespaceId: namespaceId,
      apiToken: token,
      key: syncKey,
      body: state,
    });

    if (result.isNetworkError || result.error) {
      return { success: false, error: result.error || 'Failed to connect to Cloudflare KV.' };
    }

    if (result.resStatus === 401 || result.resStatus === 403) {
      return {
        success: false,
        error: `Authentication Error (${result.resStatus}): Please verify your API Token has "Workers KV Storage: Edit" permissions.`,
      };
    }

    if (result.resStatus === 404) {
      return {
        success: false,
        error: 'Cloudflare Account ID or KV Namespace ID not found. Please double check your IDs.',
      };
    }

    if (result.resStatus < 200 || result.resStatus >= 300) {
      const msg = result.data?.errors?.[0]?.message || result.data?.message || `HTTP ${result.resStatus}`;
      return { success: false, error: `Cloudflare KV API Error: ${msg}` };
    }

    const syncedAt = new Date().toISOString();
    const updatedConfig = { ...config, lastSyncedAt: syncedAt };
    saveCloudflareConfig(updatedConfig);

    return { success: true, syncedAt };
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
      const msg = err?.message || String(err);
      if (msg.toLowerCase().includes('load failed') || msg.toLowerCase().includes('failed to fetch') || err?.name === 'TypeError') {
        return {
          success: false,
          error: `CORS / Network Error: Could not reach Worker Endpoint (${endpoint}). Ensure your Cloudflare Worker responds with Access-Control-Allow-Origin headers.`,
        };
      }
      return { success: false, error: msg || 'Failed to reach Cloudflare Worker endpoint.' };
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

    const result = await executeCloudflareKVFetch({
      method: 'GET',
      action: 'load',
      accountId,
      kvNamespaceId: namespaceId,
      apiToken: token,
      key: syncKey,
    });

    if (result.isNetworkError || result.error) {
      return { success: false, error: result.error || 'Failed to fetch data from Cloudflare KV.' };
    }

    if (result.resStatus === 404) {
      return { 
        success: false, 
        error: `Key "${syncKey}" not found in Cloudflare KV yet. Click "Push & Save to Cloudflare" to save your budget data first.` 
      };
    }

    if (result.resStatus === 401 || result.resStatus === 403) {
      return {
        success: false,
        error: `Authentication Error (${result.resStatus}): Please verify your API Token has "Workers KV Storage: Edit" permissions.`,
      };
    }

    if (result.resStatus < 200 || result.resStatus >= 300) {
      const msg = result.data?.errors?.[0]?.message || result.data?.message || `HTTP ${result.resStatus}`;
      return { success: false, error: `Cloudflare KV Error: ${msg}` };
    }

    const parsedState = result.data;
    if (!parsedState || !parsedState.months || !parsedState.currentMonthId) {
      return { success: false, error: 'Cloudflare KV data does not match FlowLedger BudgetState format.' };
    }

    return { success: true, state: parsedState };
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
      const msg = err?.message || String(err);
      if (msg.toLowerCase().includes('load failed') || msg.toLowerCase().includes('failed to fetch') || err?.name === 'TypeError') {
        return {
          success: false,
          error: `CORS / Network Error: Could not reach Worker Endpoint (${endpoint}). Ensure your Cloudflare Worker returns Access-Control-Allow-Origin headers.`,
        };
      }
      return { success: false, error: msg || 'Failed to fetch from Cloudflare Worker.' };
    }
  }

  return { success: false, error: 'Invalid mode.' };
}
