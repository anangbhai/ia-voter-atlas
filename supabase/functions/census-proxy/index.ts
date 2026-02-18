import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CENSUS_KEY = Deno.env.get("CENSUS_KEY")!;
const CENSUS_BASE = "https://api.census.gov/data";

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

    if (action === "language") {
      const vintages = ["2022", "2021", "2023"];
      let data = null;
      let usedVintage = null;

      for (const yr of vintages) {
        try {
          const vars = "NAME,C16001_001E,C16001_015E,C16001_017E,C16001_030E,C16001_032E";
          const censusUrl = `${CENSUS_BASE}/${yr}/acs/acs5?get=${vars}&for=congressional%20district:*&in=state:*&key=${CENSUS_KEY}`;
          const res = await fetch(censusUrl);
          if (res.ok) {
            data = await res.json();
            usedVintage = yr;
            break;
          }
        } catch (_) {}
      }

      if (!data) {
        const fallbackUrl = `${CENSUS_BASE}/2022/acs/acs5?get=NAME,B16004_001E,B16004_067E,B16004_068E,B16004_069E&for=congressional%20district:*&in=state:*&key=${CENSUS_KEY}`;
        const res = await fetch(fallbackUrl);
        if (res.ok) {
          data = await res.json();
          usedVintage = "2022-B16004";
        }
      }

      if (!data) {
        const lastUrl = `${CENSUS_BASE}/2022/acs/acs5/profile?get=NAME,DP02_0113E,DP02_0114E&for=congressional%20district:*&in=state:*&key=${CENSUS_KEY}`;
        const res = await fetch(lastUrl);
        if (res.ok) {
          data = await res.json();
          usedVintage = "2022-DP02";
        }
      }

      if (!data) {
        return new Response(JSON.stringify({ error: "All Census language tables returned errors" }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ data, vintage: usedVintage }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify") {
      const censusUrl = `${CENSUS_BASE}/2022/acs/acs5?get=NAME,B02015_002E&for=congressional%20district:*&in=state:*&key=${CENSUS_KEY}`;
      const res = await fetch(censusUrl);
      if (!res.ok) {
        return new Response(JSON.stringify({ error: `Census API returned ${res.status}` }), {
          status: res.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const data = await res.json();

      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action. Use ?action=language or ?action=verify" }), {
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
