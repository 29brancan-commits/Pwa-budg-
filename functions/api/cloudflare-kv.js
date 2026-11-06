export async function onRequest(context) {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CF-Account-ID, X-CF-KV-ID, X-CF-Key',
      },
    });
  }

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CF-Account-ID, X-CF-KV-ID, X-CF-Key',
  };

  const accountId = (request.headers.get('x-cf-account-id') || '').trim();
  const kvNamespaceId = (request.headers.get('x-cf-kv-id') || '').trim();
  const authHeader = request.headers.get('authorization') || '';
  const apiToken = authHeader.replace(/^Bearer\s+/i, '').trim();
  const key = (request.headers.get('x-cf-key') || 'flowledger_budget_data').trim();

  const urlObj = new URL(request.url);
  const action = urlObj.searchParams.get('action') || (request.method === 'PUT' || request.method === 'POST' ? 'save' : 'load');

  if (!accountId || !kvNamespaceId || !apiToken) {
    return new Response(JSON.stringify({ error: 'Missing Cloudflare credentials headers' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    if (action === 'validate') {
      const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${kvNamespaceId}/keys?limit=1&_t=${Date.now()}`;
      const cfRes = await fetch(cfUrl, {
        headers: { Authorization: `Bearer ${apiToken}` },
      });
      const data = await cfRes.json().catch(() => ({}));
      return new Response(JSON.stringify(data), {
        status: cfRes.status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    if (action === 'save' || request.method === 'PUT' || request.method === 'POST') {
      const bodyText = await request.text();
      let bodyData;
      try {
        const parsed = JSON.parse(bodyText);
        bodyData = parsed.data !== undefined ? parsed.data : parsed;
      } catch {
        bodyData = bodyText;
      }

      const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${kvNamespaceId}/values/${key}`;
      const cfRes = await fetch(cfUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyData),
      });

      const data = await cfRes.json().catch(() => ({ success: cfRes.ok }));
      return new Response(JSON.stringify(data), {
        status: cfRes.status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Action: Load (GET)
    const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${kvNamespaceId}/values/${key}?_t=${Date.now()}`;
    const cfRes = await fetch(cfUrl, {
      headers: { Authorization: `Bearer ${apiToken}` },
    });

    if (!cfRes.ok) {
      if (cfRes.status === 404) {
        return new Response(JSON.stringify({ error: `Key "${key}" not found in Cloudflare KV.` }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
      const data = await cfRes.json().catch(() => ({}));
      return new Response(JSON.stringify(data), {
        status: cfRes.status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const stateData = await cfRes.json();
    return new Response(JSON.stringify(stateData), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Worker proxy error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}
