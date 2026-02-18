// /api/govinfo.js (Vercel Serverless Function)
const DEFAULT_TIMEOUT_MS = 20000;
const UA = "iavoteratlas-admin/1.0 (vercel-serverless)";
const SNIPPET_LIMIT = 10;
const ENRICH_CONCURRENCY = 3;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }

  try {
    const q = req?.query || {};
    const apiKey = String(q.api_key || "").trim();
    const userQuery = String(q.query || "").trim();
    const pageSize = clampInt(q.pageSize, 1, 50, 25);
    const offsetMark = String(q.offsetMark || "*").trim();

    if (!apiKey) { res.status(400).json({ error: "Missing required parameter: api_key" }); return; }
    if (!userQuery) { res.status(400).json({ error: "Missing required parameter: query" }); return; }

    const fullQuery = buildCrecFloorQuery(userQuery);
    const searchUrl = `https://api.govinfo.gov/search?api_key=${encodeURIComponent(apiKey)}`;
    const searchBody = {
      query: fullQuery,
      pageSize: String(pageSize),
      offsetMark: offsetMark,
      sorts: [{ field: "publishdate", sortOrder: "DESC" }]
    };

    const searchResp = await fetchWithTimeout(searchUrl, {
      method: "POST",
      headers: { "User-Agent": UA, Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(searchBody)
    });

    const text = await searchResp.text();
    let json;
    try { json = JSON.parse(text); } catch (_) {
      res.status(502).json({ error: "GovInfo returned non-JSON", upstream_status: searchResp.status, upstream_text: safeTrim(text) });
      return;
    }

    if (!searchResp.ok) {
      res.status(searchResp.status).json({ error: "GovInfo search failed", upstream_status: searchResp.status, upstream: json });
      return;
    }

    const rawResults = Array.isArray(json?.results) ? json.results : [];
    const normalized = rawResults.map(normalizeGovinfoResult);
    const needles = extractNeedles(userQuery);
    const enriched = await asyncPool(ENRICH_CONCURRENCY, normalized.slice(0, SNIPPET_LIMIT), async (r) => {
      const snippet = await tryFetchSnippet(r, apiKey, needles);
      return { ...r, snippet };
    });

    res.status(200).json({ results: [...enriched, ...normalized.slice(SNIPPET_LIMIT)], offsetMark: json?.offsetMark || json?.nextOffsetMark || null });
  } catch (err) {
    res.status(500).json({ error: "Unhandled /api/govinfo error", message: err?.message || String(err) });
  }
}

function buildCrecFloorQuery(userQuery) {
  const q = userQuery;
  if (/collection\s*:/i.test(q) || /docclass\s*:/i.test(q)) return q;
  return `collection:(CREC) AND (docClass:(HOUSE OR SENATE)) AND (${q})`;
}

function normalizeGovinfoResult(r) {
  return {
    title: r?.title || r?.packageTitle || r?.granuleTitle || "",
    dateIssued: r?.dateIssued || r?.publishDate || r?.lastModified || "",
    chamber: inferChamber(r),
    detailsLink: stripApiKey(r?.resultLink || r?.link || ""),
    packageId: r?.packageId || "",
    granuleId: r?.granuleId || "",
    snippet: ""
  };
}

function inferChamber(r) {
  const dc = String(r?.docClass || "").toUpperCase();
  if (dc.includes("HOUSE")) return "House";
  if (dc.includes("SENATE")) return "Senate";
  const g = String(r?.granuleId || "");
  if (g.includes("PgH")) return "House";
  if (g.includes("PgS")) return "Senate";
  if (g.includes("PgD")) return "Daily Digest";
  if (g.includes("PgE")) return "Extensions";
  return "";
}

async function tryFetchSnippet(r, apiKey, needles) {
  if (!r?.detailsLink) return "";
  try {
    const summaryUrl = ensureApiKey(r.detailsLink, apiKey);
    const summaryResp = await fetchWithTimeout(summaryUrl, { method: "GET", headers: { "User-Agent": UA, Accept: "application/json" } });
    const summaryJson = JSON.parse(await summaryResp.text());
    const dl = summaryJson?.download || summaryJson?.downloads || {};
    const candidate = dl?.txtLink || dl?.textLink || dl?.htmLink || dl?.htmlLink || summaryJson?.txtLink || summaryJson?.htmLink || "";
    if (!candidate) return "";
    const contentResp = await fetchWithTimeout(ensureApiKey(stripApiKey(candidate), apiKey), { method: "GET", headers: { "User-Agent": UA, Accept: "text/plain,text/html;q=0.9" } });
    return makeSnippet(stripHtml(await contentResp.text()), needles, 240);
  } catch (_) { return ""; }
}

function makeSnippet(text, needles, width) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  const lower = t.toLowerCase();
  let idx = -1;
  for (const n of needles) { const i = lower.indexOf(n); if (i >= 0) { idx = i; break; } }
  if (idx < 0) return t.slice(0, width);
  const start = Math.max(0, idx - Math.floor(width / 2));
  const end = Math.min(t.length, start + width);
  return (start > 0 ? "…" : "") + t.slice(start, end) + (end < t.length ? "…" : "");
}

function extractNeedles(userQuery) {
  const stop = new Set(["and","or","not","collection","crec","docclass","house","senate"]);
  const tokens = String(userQuery || "").match(/[A-Za-z0-9][A-Za-z0-9-]{2,}/g) || [];
  const seen = new Set(); const uniq = [];
  for (const tok of tokens) {
    const low = tok.toLowerCase();
    if (stop.has(low) || seen.has(low)) continue;
    seen.add(low); uniq.push(low);
  }
  return uniq.slice(0, 8);
}

function stripHtml(s) {
  return String(s || "").replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
}

function stripApiKey(url) {
  if (!url) return "";
  try { const u = new URL(url); u.searchParams.delete("api_key"); return u.toString(); } catch (_) { return String(url); }
}

function ensureApiKey(url, apiKey) {
  if (!url) return "";
  try { const u = new URL(url); if (!u.searchParams.get("api_key")) u.searchParams.set("api_key", apiKey); return u.toString(); }
  catch (_) { return `${url}${url.includes("?")?"&":"?"}api_key=${encodeURIComponent(apiKey)}`; }
}

function clampInt(v, min, max, fallback) {
  const n = parseInt(String(v ?? ""), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

async function fetchWithTimeout(url, init) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try { return await fetch(url, { ...init, signal: controller.signal, headers: { "User-Agent": UA, ...(init?.headers || {}) } }); }
  finally { clearTimeout(timeout); }
}

function safeTrim(s) {
  const t = String(s ?? "");
  return t.length > 800 ? t.slice(0, 800) + "…" : t;
}

async function asyncPool(limit, array, iteratorFn) {
  const ret = []; const executing = [];
  for (const item of array) {
    const p = Promise.resolve().then(() => iteratorFn(item));
    ret.push(p);
    if (limit <= array.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= limit) await Promise.race(executing);
    }
  }
  return Promise.all(ret);
}
