import express from 'express';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '10mb' }));

  // Cloudflare KV Proxy Route (bypasses browser CORS restrictions for direct Cloudflare API calls)
  app.all('/api/cloudflare-kv', async (req, res) => {
    const accountId = (req.headers['x-cf-account-id'] as string || '').trim();
    const kvNamespaceId = (req.headers['x-cf-kv-id'] as string || '').trim();
    const authHeader = req.headers['authorization'] as string || '';
    const apiToken = authHeader.replace(/^Bearer\s+/i, '').trim();
    const key = (req.headers['x-cf-key'] as string || 'flowledger_budget_data').trim();

    const action = req.query.action || req.body?.action || (req.method === 'PUT' || req.method === 'POST' ? 'save' : 'load');

    if (!accountId || !kvNamespaceId || !apiToken) {
      return res.status(400).json({ error: 'Missing Cloudflare credentials (Account ID, KV Namespace ID, or API Token)' });
    }

    try {
      if (action === 'validate') {
        const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${kvNamespaceId}/keys?limit=1&_t=${Date.now()}`;
        const cfRes = await fetch(cfUrl, {
          headers: { Authorization: `Bearer ${apiToken}` }
        });
        const data = await cfRes.json().catch(() => ({}));
        return res.status(cfRes.status).json(data);
      }

      if (action === 'save' || req.method === 'PUT' || req.method === 'POST') {
        const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${kvNamespaceId}/values/${key}`;
        const bodyData = req.body.data !== undefined ? req.body.data : req.body;
        const cfRes = await fetch(cfUrl, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bodyData),
        });
        const data = await cfRes.json().catch(() => ({ success: cfRes.ok }));
        return res.status(cfRes.status).json(data);
      }

      // Action: Load (GET)
      const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${kvNamespaceId}/values/${key}?_t=${Date.now()}`;
      const cfRes = await fetch(cfUrl, {
        headers: { Authorization: `Bearer ${apiToken}` }
      });

      if (!cfRes.ok) {
        if (cfRes.status === 404) {
          return res.status(404).json({ error: `Key "${key}" not found in Cloudflare KV.` });
        }
        const data = await cfRes.json().catch(() => ({}));
        return res.status(cfRes.status).json(data);
      }

      const stateData = await cfRes.json();
      return res.json(stateData);
    } catch (err: any) {
      console.error('Cloudflare proxy error:', err);
      return res.status(500).json({ error: err.message || 'Server proxy failed to connect to Cloudflare API' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FlowLedger server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
