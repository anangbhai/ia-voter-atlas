import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CONGRESS_KEY = Deno.env.get("CONGRESS_KEY")!;

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
    const query = url.searchParams.get("q") || "";
    const limit = url.searchParams.get("limit") || "20";

    if (!query) {
      return new Response(JSON.stringify({ error: "Missing q parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const congressUrl = `https://api.congress.gov/v3/bill?query=${encodeURIComponent(query)}&limit=${limit}&sort=updateDate+desc&api_key=${CONGRESS_KEY}`;
    const res = await fetch(congressUrl);

    if (!res.ok) {
      const text = await res.text();
      return new Response(JSON.stringify({ error: `Congress API ${res.status}: ${text.substring(0, 200)}` }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
