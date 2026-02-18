// api/gdelt.js — Vercel serverless function
// Proxies GDELT DOC 2.0 and TV 2.0 requests server-side to avoid browser CORS issues.
// Place at /api/gdelt.js in your Vercel project root.
//
// GDELT timespan values: 1m, 3m, 6m, 1y (NOT "3months" etc.)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { source, query, timespan, maxrecords, maxclips } = req.query;

  if (!source || !query) {
    return res.status(400).json({ error: 'Missing required params: source, query' });
  }

  let upstreamUrl;

  if (source === 'doc') {
    // Build URL manually — avoid double-encoding from URLSearchParams
    const base = 'https://api.gdeltproject.org/api/v2/doc/doc';
    const params = [
      'query=' + encodeURIComponent(query),
      'mode=artlist',
      'maxrecords=' + (maxrecords || '250'),
      'timespan=' + (timespan || '3m'),
      'sort=hybridrel',
      'format=json',
    ];
    upstreamUrl = base + '?' + params.join('&');

  } else if (source === 'tv') {
    const base = 'https://api.gdeltproject.org/api/v2/tv/tv';
    const params = [
      'query=' + encodeURIComponent(query),
      'mode=clipgallery',
      'maxclips=' + (maxclips || '20'),
      'timespan=' + (timespan || '3m'),
      'datacomb=or',
      'format=json',
    ];
    upstreamUrl = base + '?' + params.join('&');

  } else {
    return res.status(400).json({ error: 'source must be "doc" or "tv"' });
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'ia-voter-atlas/1.0' },
      signal: AbortSignal.timeout(25000),
    });

    const text = await upstream.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      // GDELT returned plain text — surface the full message so browser shows it
      return res.status(502).json({
        error: 'GDELT error (HTTP ' + upstream.status + '): ' + text.slice(0, 500),
        upstream_url: upstreamUrl,
      });
    }

    res.setHeader('Cache-Control', 's-maxage=300');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(data);

  } catch (err) {
    return res.status(502).json({
      error: 'GDELT upstream failed: ' + err.message,
      upstream_url: upstreamUrl,
    });
  }
}
