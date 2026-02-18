// api/gdelt.js — Vercel serverless function
// Proxies GDELT DOC 2.0 and TV 2.0 requests server-side to avoid browser CORS issues.
// Place at /api/gdelt.js in your Vercel project root.

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { source, query, timespan, maxrecords, maxclips } = req.query;

  if (!source || !query) {
    return res.status(400).json({ error: 'Missing required params: source, query' });
  }

  let upstreamUrl;

  if (source === 'doc') {
    const u = new URL('https://api.gdeltproject.org/api/v2/doc/doc');
    u.searchParams.set('query', query);
    u.searchParams.set('mode', 'artlist');
    u.searchParams.set('maxrecords', maxrecords || '250');
    u.searchParams.set('timespan', timespan || '3months');
    u.searchParams.set('sort', 'hybridrel');
    u.searchParams.set('format', 'json');
    upstreamUrl = u.toString();

  } else if (source === 'tv') {
    const u = new URL('https://api.gdeltproject.org/api/v2/tv/tv');
    u.searchParams.set('query', query);
    u.searchParams.set('mode', 'clipgallery');
    u.searchParams.set('maxclips', maxclips || '20');
    u.searchParams.set('timespan', timespan || '3months');
    u.searchParams.set('datacomb', 'or');
    u.searchParams.set('format', 'json');
    upstreamUrl = u.toString();

  } else {
    return res.status(400).json({ error: 'source must be "doc" or "tv"' });
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(20000),
    });

    const text = await upstream.text();

    // GDELT sometimes returns plain-text errors — surface them clearly
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({
        error: 'GDELT returned non-JSON response',
        raw: text.slice(0, 300),
      });
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=300'); // cache 5 min on Vercel edge
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(data);

  } catch (err) {
    return res.status(502).json({ error: 'GDELT upstream failed: ' + err.message });
  }
}
