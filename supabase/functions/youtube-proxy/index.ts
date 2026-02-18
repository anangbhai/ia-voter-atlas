import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const YOUTUBE_KEY = Deno.env.get("YOUTUBE_KEY")!;
const YT_BASE = "https://www.googleapis.com/youtube/v3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "search") {
      const query = url.searchParams.get("q") || "";
      const order = url.searchParams.get("order") || "relevance";
      const maxResults = url.searchParams.get("maxResults") || "15";

      if (!query) {
        return new Response(JSON.stringify({ error: "Missing q parameter" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const searchUrl = `${YT_BASE}/search?part=snippet&type=video&maxResults=${maxResults}&order=${order}&q=${encodeURIComponent(query)}&key=${YOUTUBE_KEY}`;
      const searchRes = await fetch(searchUrl);
      if (!searchRes.ok) {
        const err = await searchRes.json();
        return new Response(JSON.stringify({ error: err.error?.message || `YouTube API ${searchRes.status}` }), {
          status: searchRes.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const searchData = await searchRes.json();
      const items = searchData.items || [];

      if (!items.length) {
        return new Response(JSON.stringify({ items: [], stats: {} }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const videoIds = items.map((i: any) => i.id.videoId).join(",");
      const statsUrl = `${YT_BASE}/videos?part=statistics,contentDetails&id=${videoIds}&key=${YOUTUBE_KEY}`;
      const statsRes = await fetch(statsUrl);
      const statsData = await statsRes.json();

      const statsMap: Record<string, any> = {};
      (statsData.items || []).forEach((v: any) => {
        statsMap[v.id] = { stats: v.statistics, duration: v.contentDetails?.duration };
      });

      return new Response(JSON.stringify({ items, stats: statsMap }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "stats") {
      const ids = url.searchParams.get("ids") || "";
      if (!ids) {
        return new Response(JSON.stringify({ error: "Missing ids parameter" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const statsUrl = `${YT_BASE}/videos?part=statistics&id=${ids}&key=${YOUTUBE_KEY}`;
      const res = await fetch(statsUrl);
      if (!res.ok) {
        return new Response(JSON.stringify({ error: `YouTube API ${res.status}` }), {
          status: res.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const data = await res.json();

      return new Response(JSON.stringify({ items: data.items || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action. Use ?action=search or ?action=stats" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
