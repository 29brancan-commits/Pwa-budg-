import { BudgetState } from '../types/expense';

export interface GitHubConfig {
  enabled: boolean;
  token: string;
  owner: string;
  repo: string;
  branch: string;
  filePath: string;
  autoSave: boolean;
  skipCi: boolean;
  lastSyncedAt?: string;
  lastCommitSha?: string;
}

const GITHUB_CONFIG_KEY = 'flowledger_github_config_v1';

export const DEFAULT_GITHUB_CONFIG: GitHubConfig = {
  enabled: false,
  token: '',
  owner: '',
  repo: 'pwa-budgv2',
  branch: 'main',
  filePath: 'data/flowledger-data.json',
  autoSave: true,
  skipCi: true,
};

export function loadGitHubConfig(): GitHubConfig {
  if (typeof window === 'undefined') return DEFAULT_GITHUB_CONFIG;
  try {
    const raw = localStorage.getItem(GITHUB_CONFIG_KEY);
    if (!raw) return DEFAULT_GITHUB_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_GITHUB_CONFIG,
      ...parsed,
    };
  } catch (e) {
    console.error('Failed to load GitHub config:', e);
    return DEFAULT_GITHUB_CONFIG;
  }
}

export function saveGitHubConfig(config: GitHubConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GITHUB_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save GitHub config:', e);
  }
}

/**
 * Validates a GitHub Personal Access Token by testing /user
 */
export async function validateGitHubToken(token: string): Promise<{
  valid: boolean;
  username?: string;
  avatarUrl?: string;
  name?: string;
  error?: string;
}> {
  if (!token.trim()) {
    return { valid: false, error: 'Token is required' };
  }

  try {
    const res = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (res.status === 401) {
      return { valid: false, error: 'Invalid GitHub Personal Access Token (401 Unauthorized).' };
    }

    if (!res.ok) {
      return { valid: false, error: `GitHub API error: ${res.status} ${res.statusText}` };
    }

    const data = await res.json();
    return {
      valid: true,
      username: data.login,
      avatarUrl: data.avatar_url,
      name: data.name || data.login,
    };
  } catch (err: any) {
    return { valid: false, error: err.message || 'Network connection failed' };
  }
}

/**
 * Fetch available user repositories
 */
export async function fetchUserRepos(token: string): Promise<{
  success: boolean;
  repos: string[];
  error?: string;
}> {
  try {
    const res = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!res.ok) {
      return { success: false, repos: [], error: `Failed to fetch repos: ${res.statusText}` };
    }

    const data = await res.json();
    const repos = Array.isArray(data) ? data.map((r: any) => r.name) : [];
    return { success: true, repos };
  } catch (err: any) {
    return { success: false, repos: [], error: err.message || 'Failed to list repositories' };
  }
}

/**
 * Save / Commit BudgetState to GitHub repository
 */
export async function saveDataToGitHub(
  config: GitHubConfig,
  state: BudgetState,
  customMessage?: string
): Promise<{
  success: boolean;
  commitSha?: string;
  syncedAt?: string;
  error?: string;
}> {
  if (!config.token || !config.owner || !config.repo) {
    return { success: false, error: 'GitHub repository or token is not configured.' };
  }

  const cleanToken = config.token.trim();
  const owner = config.owner.trim();
  const repo = config.repo.trim();
  const branch = (config.branch || 'main').trim();
  const cleanPath = config.filePath.replace(/^\/+/, '').trim() || 'data/flowledger-data.json';

  const contentsUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}`;

  try {
    // Step 1: Check if the file already exists to get its blob SHA
    let existingSha: string | undefined = undefined;
    const getRes = await fetch(`${contentsUrl}?ref=${encodeURIComponent(branch)}&_t=${Date.now()}`, {
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (getRes.status === 200) {
      const fileData = await getRes.json();
      existingSha = fileData.sha;
    } else if (getRes.status !== 404) {
      if (getRes.status === 401) {
        return { success: false, error: 'Unauthorized: Check your GitHub Personal Access Token permissions.' };
      }
      if (getRes.status === 403) {
        return { success: false, error: 'Forbidden: Token lacks "repo" or "Contents: Read and write" permission.' };
      }
    }

    // Step 2: Encode JSON payload in base64 (UTF-8 safe)
    const jsonString = JSON.stringify(state, null, 2);
    const contentBase64 = btoa(unescape(encodeURIComponent(jsonString)));

    const now = new Date();
    const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const ciTag = config.skipCi ? ' [skip ci]' : '';
    const commitMessage = customMessage || `FlowLedger update: ${now.toLocaleDateString()} at ${timeFormatted}${ciTag}`;

    // Step 3: Put file commit
    const putRes = await fetch(contentsUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        message: commitMessage,
        content: contentBase64,
        branch: branch,
        ...(existingSha ? { sha: existingSha } : {}),
      }),
    });

    if (!putRes.ok) {
      const errJson = await putRes.json().catch(() => ({}));
      const msg = errJson.message || `HTTP ${putRes.status}: ${putRes.statusText}`;
      if (putRes.status === 409) {
        return {
          success: false,
          error: 'Conflict on GitHub: Remote file has been updated elsewhere. Please load latest from GitHub first.',
        };
      }
      return { success: false, error: msg };
    }

    const putData = await putRes.json();
    const commitSha = putData.commit?.sha ? putData.commit.sha.substring(0, 7) : 'head';
    const syncedAt = now.toISOString();

    // Update config with last synced info
    const updatedConfig: GitHubConfig = {
      ...config,
      lastSyncedAt: syncedAt,
      lastCommitSha: commitSha,
    };
    saveGitHubConfig(updatedConfig);

    return {
      success: true,
      commitSha,
      syncedAt,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to connect to GitHub API.',
    };
  }
}

/**
 * Load BudgetState from GitHub repository file
 */
export async function loadDataFromGitHub(config: GitHubConfig): Promise<{
  success: boolean;
  state?: BudgetState;
  commitSha?: string;
  error?: string;
}> {
  if (!config.token || !config.owner || !config.repo) {
    return { success: false, error: 'GitHub repository or token is not configured.' };
  }

  const cleanToken = config.token.trim();
  const owner = config.owner.trim();
  const repo = config.repo.trim();
  const branch = (config.branch || 'main').trim();
  const cleanPath = config.filePath.replace(/^\/+/, '').trim() || 'data/flowledger-data.json';

  const contentsUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${cleanPath}?ref=${encodeURIComponent(branch)}&_t=${Date.now()}`;

  try {
    const res = await fetch(contentsUrl, {
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (res.status === 404) {
      return {
        success: false,
        error: `File "${cleanPath}" does not exist in ${owner}/${repo} (${branch}) yet. Save your current data to create it.`,
      };
    }

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      return { success: false, error: errJson.message || `HTTP ${res.status}: ${res.statusText}` };
    }

    const data = await res.json();
    if (!data.content) {
      return { success: false, error: 'No file content returned from GitHub.' };
    }

    // Decode UTF-8 base64
    const cleanBase64 = data.content.replace(/\s/g, '');
    const jsonString = decodeURIComponent(escape(atob(cleanBase64)));
    const parsedState = JSON.parse(jsonString);

    if (!parsedState || !parsedState.months || !parsedState.currentMonthId) {
      return {
        success: false,
        error: 'The file in GitHub does not match FlowLedger BudgetState format.',
      };
    }

    const shortSha = data.sha ? data.sha.substring(0, 7) : undefined;

    return {
      success: true,
      state: parsedState,
      commitSha: shortSha,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to download data from GitHub.',
    };
  }
}
