// api/govinfo.js  —  Vercel serverless function
// Proxies GovInfo Congressional Record search server-side to bypass browser CORS.
// Deploy by placing this file at /api/govinfo.js in your Vercel project root.

export default async function handler(req, res) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query, api_key } = req.query;

  if (!query || !api_key) {
    return res.status(400).json({ error: 'Missing required params: query, api_key' });
  }

  const govUrl = new URL('https://api.govinfo.gov/search');
  govUrl.searchParams.set('query', query);
  govUrl.searchParams.set('pageSize', '20');
  govUrl.searchParams.set('offsetMark', '*');
  govUrl.searchParams.set('collections', 'CREC');
  govUrl.searchParams.set('api_key', api_key);

  try {
    const upstream = await fetch(govUrl.toString(), {
      headers: {
        'X-Api-Key': api_key,
        'Accept': 'application/json',
      },
    });

    const data = await upstream.json();

    // Forward the response with CORS headers so the browser accepts it
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    return res.status(upstream.status).json(data);

  } catch (err) {
    return res.status(502).json({ error: 'Upstream GovInfo request failed: ' + err.message });
  }
}
