const SUPABASE_URL = "https://myasgeeeutbbcahnguei.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15YXNnZWVldXRiYmNhaG5ndWVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNjk1NTksImV4cCI6MjA4Njg0NTU1OX0.JxmwK9sc3PA9f5ws96TxHiqGKJaHBSJ4HI_X9sUtJ88";

export async function supaFetch(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
    headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
  });
  if (!res.ok) throw new Error(`${table}: ${res.status}`);
  return res.json();
}

// snake_case → camelCase
export function toCamel(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const cc = k.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
    out[cc] = v;
  }
  return out;
}
