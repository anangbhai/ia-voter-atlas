// /api/gdelt.js (Vercel Serverless Function)
const DEFAULT_TIMEOUT_MS = 15000;
const UA = "iavoteratlas-admin/1.0 (vercel-serverless)";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.status(200).end(); return; }

  try {
    const q = req?.query || {};
    const source = String(q.source || "doc").toLowerCase();
    const query = String(q.query || "").trim();
    const timespanRaw = String(q.timespan || "1m").trim();
    const maxRaw = q.maxrecords ?? q.max ?? q.maxRecords;

    if (!query) { res.status(400).json({ error: "Missing required parameter: query" }); return; }

    const sanitizedQuery = sanitizeGdeltQuery(query);

    if (source === "doc") {
      const timespan = normalizeDocTimespan(timespanRaw);
      const maxrecords = clampInt(maxRaw, 1, 250, 50);
      const upstreamUrl =
        "https://api.gdeltproject.org/api/v2/doc/doc" +
        `?query=${encodeURIComponent(sanitizedQuery)}` +
        "&mode=artlist&format=json&sort=datedesc" +
        `&timespan=${encodeURIComponent(timespan)}` +
        `&maxrecords=${maxrecords}`;

      const { ok, status, json, text } = await fetchJson(upstreamUrl);
      if (!ok) {
        res.status(status).json({ error: "GDELT DOC upstream error", upstream_status: status, upstream_text: safeTrim(text), query: sanitizedQuery });
        return;
      }
      const articles = Array.isArray(json?.articles) ? json.articles : [];
      res.status(200).json({ articles });
      return;
    }

    if (source === "tv") {
      const timespan = normalizeTvTimespan(timespanRaw);
      const maxrecords = clampInt(maxRaw, 1, 250, 50);
      const upstreamUrl =
        "https://api.gdeltproject.org/api/v2/tv/tv" +
        `?query=${encodeURIComponent(sanitizedQuery)}` +
        "&mode=clipgallery&format=json&sort=datedesc" +
        `&TIMESPAN=${encodeURIComponent(timespan)}` +
        `&maxrecords=${maxrecords}`;

      const { ok, status, json, text } = await fetchJson(upstreamUrl);
      if (!ok) {
        res.status(status).json({ error: "GDELT TV upstream error", upstream_status: status, upstream_text: safeTrim(text), query: sanitizedQuery });
        return;
      }
      const clipsRaw = Array.isArray(json?.clips) ? json.clips : Array.isArray(json?.show_clips) ? json.show_clips : [];
      const clips = clipsRaw.map((c) => ({
        station: c?.station || c?.station_name || c?.stationName || c?.source || "",
        show: c?.show || c?.program || c?.show_name || c?.showName || "",
        date: c?.date || c?.startdatetime || c?.datetime || c?.dateline || c?.seendate || "",
        snippet: c?.snippet || c?.teaser || c?.context || c?.caption || c?.summary || "",
        url: c?.url || c?.clip || c?.clipurl || c?.link || ""
      }));
      res.status(200).json({ clips });
      return;
    }

    res.status(400).json({ error: "Invalid source. Use source=doc or source=tv", source });
  } catch (err) {
    res.status(500).json({ error: "Unhandled /api/gdelt error", message: err?.message || String(err) });
  }
}

function sanitizeGdeltQuery(q) {
  let s = String(q).replace(/[""]/g, '"').replace(/['']/g, "'");
  s = s.replace(/"([^"]+)"/g, (m, inner) => {
    const alphaNumLen = String(inner).replace(/[^A-Za-z0-9]/g, "").length;
    if (alphaNumLen < 4) return inner;
    return m;
  });
  return s.replace(/\s+/g, " ").trim();
}

function normalizeDocTimespan(ts) {
  const t = String(ts || "").trim().toLowerCase();
  const map = { "1m": "30d", "3m": "90d", "6m": "180d", "1y": "365d" };
  if (map[t]) return map[t];
  if (/^\d+(h|d|w|m|y)$/.test(t)) return t;
  return "30d";
}

function normalizeTvTimespan(ts) {
  const t = String(ts || "").trim().toLowerCase();
  const map = { "1m": "30days", "3m": "90days", "6m": "180days", "1y": "365days" };
  if (map[t]) return map[t];
  if (/^\d+days$/.test(t)) return t;
  const m = t.match(/^(\d+)(h|d|w)$/);
  if (m) {
    const n = parseInt(m[1], 10);
    const unit = m[2];
    if (unit === "h") return `${Math.max(1, Math.round(n / 24))}days`;
    if (unit === "d") return `${n}days`;
    if (unit === "w") return `${n * 7}days`;
  }
  return "30days";
}

function clampInt(v, min, max, fallback) {
  const n = parseInt(String(v ?? ""), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    const resp = await fetch(url, {
      method: "GET", signal: controller.signal,
      headers: { "User-Agent": UA, Accept: "application/json,text/plain;q=0.9,*/*;q=0.8" }
    });
    const text = await resp.text();
    let parsed = null;
    try { parsed = JSON.parse(text); } catch (_) { parsed = null; }
    const looksLikePlainError = typeof text === "string" &&
      (text.includes("The specified phrase is too short") || text.toLowerCase().includes("error") || text.toLowerCase().includes("invalid"));
    if (!parsed) {
      const status = resp.ok && looksLikePlainError ? 400 : resp.status || 502;
      return { ok: false, status, text };
    }
    if (!resp.ok) return { ok: false, status: resp.status, text, json: parsed };
    return { ok: true, status: resp.status, json: parsed, text };
  } catch (e) {
    const msg = e?.name === "AbortError" ? "Upstream timeout" : (e?.message || String(e));
    return { ok: false, status: 504, text: msg };
  } finally {
    clearTimeout(timeout);
  }
}

function safeTrim(s) {
  if (s == null) return "";
  const t = String(s);
  return t.length > 800 ? t.slice(0, 800) + "…" : t;
}
