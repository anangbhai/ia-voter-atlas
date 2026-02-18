// api/govinfo.js — Vercel serverless function
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { query, api_key } = req.query;
  if (!query || !api_key) return res.status(400).json({ error: 'Missing query or api_key' });

  // GovInfo v1 search — api_key in both URL and header per their docs
  const upstreamUrl = `https://api.govinfo.gov/search?query=${encodeURIComponent(query)}&pageSize=20&offsetMark=*&collections=CREC&api_key=${encodeURIComponent(api_key)}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: { 'X-Api-Key': api_key, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(20000),
    });

    const text = await upstream.text();
    let data;
    try { data = JSON.parse(text); }
    catch {
      return res.status(502).json({ 
        error: `GovInfo non-JSON (HTTP ${upstream.status}): ${text.slice(0, 400)}` 
      });
    }

    if (!upstream.ok) {
      // Surface GovInfo's own error message (often has a "message" field)
      return res.status(upstream.status).json({
        error: `GovInfo HTTP ${upstream.status}: ${data.message || data.error || JSON.stringify(data).slice(0,200)}`
      });
    }

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(data);
  } catch (err) {
    return res.status(502).json({ error: 'GovInfo upstream failed: ' + err.message });
  }
}
