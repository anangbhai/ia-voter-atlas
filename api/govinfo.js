// api/govinfo.js — Vercel serverless function
// Proxies GovInfo Congressional Record search server-side to bypass browser CORS.
// Place at /api/govinfo.js in your Vercel project root.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query, api_key } = req.query;

  if (!query || !api_key) {
    return res.status(400).json({ error: 'Missing required params: query, api_key' });
  }

  // Build URL manually — api_key goes in header only, not query string
  const params = [
    'query=' + encodeURIComponent(query),
    'pageSize=20',
    'offsetMark=%2A',   // literal * encoded
    'collections=CREC',
  ];
  const upstreamUrl = 'https://api.govinfo.gov/search?' + params.join('&');

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: {
        'X-Api-Key': api_key,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(20000),
    });

    const text = await upstream.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({
        error: 'GovInfo non-JSON (HTTP ' + upstream.status + '): ' + text.slice(0, 300),
      });
    }

    res.setHeader('Content-Type', 'application/json');
    return res.status(upstream.status).json(data);

  } catch (err) {
    return res.status(502).json({ error: 'GovInfo upstream failed: ' + err.message });
  }
}
