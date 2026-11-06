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

export function loadCloudflareConfig(): CloudflareConfig {
  if (typeof window === 'undefined') return DEFAULT_CLOUDFLARE_CONFIG;
  try {
    const raw = localStorage.getItem(CLOUDFLARE_CONFIG_KEY);
    if (!raw) return DEFAULT_CLOUDFLARE_CONFIG;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CLOUDFLARE_CONFIG, ...parsed };
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
    const accountId = config.accountId.trim();
    const namespaceId = config.kvNamespaceId.trim();
    const token = config.apiToken.trim();

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
    const endpoint = config.workerEndpoint.trim();
    if (!endpoint) {
      return { success: false, error: 'Cloudflare Worker Endpoint URL is required.' };
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiToken ? { Authorization: `Bearer ${config.apiToken.trim()}` } : {}),
        },
        body: JSON.stringify({ key: syncKey, data: state }),
      });

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
    const accountId = config.accountId.trim();
    const namespaceId = config.kvNamespaceId.trim();
    const token = config.apiToken.trim();

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
    const endpoint = config.workerEndpoint.trim();
    if (!endpoint) {
      return { success: false, error: 'Cloudflare Worker Endpoint URL is required.' };
    }

    try {
      const url = `${endpoint}?key=${encodeURIComponent(syncKey)}&_t=${Date.now()}`;
      const res = await fetch(url, {
        headers: {
          ...(config.apiToken ? { Authorization: `Bearer ${config.apiToken.trim()}` } : {}),
        },
      });

      if (!res.ok) {
        return { success: false, error: `Worker Endpoint HTTP ${res.status}: ${res.statusText}` };
      }

      const parsedState = await res.json();
      const state = parsedState.data || parsedState;
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
