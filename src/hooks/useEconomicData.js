import { useState, useEffect } from "react";
import { supaFetch, toCamel } from "../lib/supabase.js";

export function useEconomicData(districtId = null, state = null) {
  const [data, setData] = useState({
    perm: [],
    uscis: [],
    hmda: [],
    acs: [],
    abs: [],
    sba: [],
    h1b: [],
    grants: [],
    fec: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [uscis, hmda, acs, abs, sba, grants, fec] = await Promise.all([
          supaFetch("uscis_india").catch(e => { console.warn("[ECON] uscis_india FAILED:", e.message); return []; }),
          supaFetch("hmda_by_district").catch(e => { console.warn("[ECON] hmda_by_district FAILED:", e.message); return []; }),
          supaFetch("acs_econ_by_district").catch(e => { console.warn("[ECON] acs_econ_by_district FAILED:", e.message); return []; }),
          supaFetch("abs_by_district").catch(e => { console.warn("[ECON] abs_by_district FAILED:", e.message); return []; }),
          supaFetch("sba_loans").catch(e => { console.warn("[ECON] sba_loans FAILED:", e.message); return []; }),
          supaFetch("grants_south_asian").catch(e => { console.warn("[ECON] grants_south_asian FAILED:", e.message); return []; }),
          supaFetch("fec_south_asian").catch(e => { console.warn("[ECON] fec_south_asian FAILED:", e.message); return []; }),
        ]);

        // TEMP DEBUG: log raw row counts and first row from each table
        console.log("[ECON] uscis_india:", uscis.length, "rows", uscis[0] || "(empty)");
        console.log("[ECON] hmda_by_district:", hmda.length, "rows", hmda[0] || "(empty)");
        console.log("[ECON] acs_econ_by_district:", acs.length, "rows", acs[0] || "(empty)");
        console.log("[ECON] abs_by_district:", abs.length, "rows", abs[0] || "(empty)");
        console.log("[ECON] sba_loans:", sba.length, "rows", sba[0] || "(empty)");
        console.log("[ECON] grants_south_asian:", grants.length, "rows", grants[0] || "(empty)");
        console.log("[ECON] fec_south_asian:", fec.length, "rows", fec[0] || "(empty)");

        if (cancelled) return;

        const mapped = {
          uscis: uscis.map(toCamel),
          hmda: hmda.map(toCamel),
          acs: acs.map(toCamel),
          abs: abs.map(toCamel),
          sba: sba.map(toCamel),
          grants: grants.map(toCamel),
          fec: fec.map(toCamel),
        };

        // Apply filters
        const deriveState = (id) => id ? id.split("-")[0] : null;
        const distState = state || deriveState(districtId);

        setData({
          perm: [],  // PERM data is still managed by the monolith
          uscis: mapped.uscis,  // always national, no filter
          hmda: districtId
            ? mapped.hmda.filter(r => r.districtId === districtId)
            : mapped.hmda,
          acs: districtId
            ? mapped.acs.filter(r => r.districtId === districtId)
            : mapped.acs,
          abs: districtId
            ? mapped.abs.filter(r => r.districtId === districtId)
            : mapped.abs,
          sba: districtId
            ? mapped.sba.filter(r => r.geographyType === "district" && r.geographyId === districtId)
            : distState
              ? mapped.sba.filter(r => r.geographyId === distState || r.geographyId === districtId)
              : mapped.sba,
          h1b: [],  // H-1B data is still managed by the monolith
          grants: distState
            ? mapped.grants.filter(r => r.state === distState)
            : mapped.grants,
          fec: districtId
            ? mapped.fec.filter(r => r.geographyId === districtId || r.geographyId === distState)
            : distState
              ? mapped.fec.filter(r => r.geographyId === distState)
              : mapped.fec,
        });
      } catch (e) {
        if (!cancelled) {
          console.warn("Economic data fetch failed:", e.message);
          setError(e.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [districtId, state]);

  return { ...data, loading, error };
}
