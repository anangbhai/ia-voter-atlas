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
          supaFetch("uscis_india").catch(() => []),
          supaFetch("hmda_by_district").catch(() => []),
          supaFetch("acs_econ_by_district").catch(() => []),
          supaFetch("abs_by_district").catch(() => []),
          supaFetch("sba_loans").catch(() => []),
          supaFetch("grants_south_asian").catch(() => []),
          supaFetch("fec_south_asian").catch(() => []),
        ]);

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
