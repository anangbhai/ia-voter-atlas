/**
 * Economic Presence Index (EPI)
 *
 * Composite score (0–100) measuring Indian American economic footprint per district.
 *
 * 5 components with weighted min-max normalization:
 *   1. FEC donor activity (30%) — donor-to-population ratio
 *   2. HMDA mortgage originations per capita (25%)
 *   3. Business ownership rate — ACS/ABS (20%)
 *   4. NIH/NSF grant activity — state-level proxy (15%)
 *   5. SBA loan volume per capita (10%)
 *
 * Normalization: min-max across the 24-district set → 0–100
 * Missing components: excluded from denominator, weights renormalized.
 */

/**
 * Min-max normalize an array of values to 0–100.
 * If all values are the same, returns 50 for all.
 */
function minMaxNormalize(values) {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 50);
  return values.map(v => Math.round(((v - min) / (max - min)) * 100));
}

// Component weights
const WEIGHTS = {
  fec: 0.30,
  hmda: 0.25,
  business: 0.20,
  grants: 0.15,
  sba: 0.10,
};

// Labels for display
export const EPI_COMPONENT_LABELS = {
  fec: "FEC Donors",
  hmda: "HMDA Mortgages",
  business: "Business Ownership",
  grants: "NIH/NSF Grants",
  sba: "SBA Loans",
};

/**
 * Compute EPI for all districts.
 *
 * @param {Array} districts — district objects with .id, .state, .indianPop, .totalPop
 * @param {Object} econData — { hmda, sba, grants, fec, acs, abs } from useEconomicData (unfiltered)
 * @param {Object} permCumulative — unused (kept for API compat)
 * @returns {Object} { [districtId]: { score, coverage, components } }
 *   score: 0–100 composite
 *   coverage: number of components with data (0–5)
 *   components: { fec, hmda, business, grants, sba } — individual 0–100 scores or null
 */
export function computeEPI(districts, econData, permCumulative) {
  const ids = districts.map(d => d.id);
  const pops = {};
  districts.forEach(d => { pops[d.id] = d.totalPop || d.indianPop || 1; });
  const n = ids.length;

  // 1. FEC — donor-to-population ratio (cumulative contributions / pop)
  const fecByDist = {};
  (econData.fec || []).forEach(r => {
    if (r.geographyId && r.geographyId.includes("-")) {
      fecByDist[r.geographyId] = (fecByDist[r.geographyId] || 0) + (r.totalContributions || 0);
    }
  });
  // Also try state-level as proxy for districts without direct data
  const fecByState = {};
  (econData.fec || []).forEach(r => {
    if (r.geographyId && !r.geographyId.includes("-")) {
      fecByState[r.geographyId] = (fecByState[r.geographyId] || 0) + (r.totalContributions || 0);
    }
  });
  const fecRaw = ids.map(id => {
    const direct = fecByDist[id];
    if (direct && direct > 0) return direct / pops[id];
    // State proxy: divide state total by number of tracked districts in that state
    const st = id.split("-")[0];
    const stateTotal = fecByState[st];
    if (stateTotal && stateTotal > 0) {
      const distsInState = ids.filter(d => d.startsWith(st + "-")).length;
      return (stateTotal / distsInState) / pops[id];
    }
    return 0;
  });

  // 2. HMDA — originations per capita
  const hmdaByDist = {};
  (econData.hmda || []).forEach(r => {
    if (r.districtId) {
      hmdaByDist[r.districtId] = (hmdaByDist[r.districtId] || 0) + (r.originations || 0);
    }
  });
  const hmdaRaw = ids.map(id => {
    const orig = hmdaByDist[id] || 0;
    return orig > 0 ? orig / pops[id] : 0;
  });

  // 3. Business ownership — ACS self-employment + ABS firms
  const bizByDist = {};
  (econData.acs || []).forEach(r => {
    if (r.districtId) {
      bizByDist[r.districtId] = (bizByDist[r.districtId] || 0) +
        (r.selfEmployed || r.selfEmployedCount || 0);
    }
  });
  (econData.abs || []).forEach(r => {
    if (r.districtId) {
      // ABS is broader (all Asian), so weight it less
      bizByDist[r.districtId] = (bizByDist[r.districtId] || 0) +
        (r.asianOwnedFirms || 0) * 0.22; // ~22% Asian Indian share
    }
  });
  const bizRaw = ids.map(id => {
    const biz = bizByDist[id] || 0;
    return biz > 0 ? biz / pops[id] : 0;
  });

  // 4. Grants — NIH + NSF awards by state, mapped to district
  const grantsByState = {};
  (econData.grants || []).forEach(r => {
    if (r.state) {
      grantsByState[r.state] = (grantsByState[r.state] || 0) +
        (r.nihMatchedAwards || 0) + (r.nsfMatchedAwards || 0);
    }
  });
  const grantsRaw = ids.map(id => {
    const st = id.split("-")[0];
    return grantsByState[st] || 0;
  });

  // 5. SBA — loan volume per capita
  const sbaByDist = {};
  (econData.sba || []).forEach(r => {
    const geoType = (r.geographyType || "").toLowerCase();
    if (geoType === "district" && r.geographyId) {
      const amount = (r.sba7aSurnameAmount || 0) + (r.sba504SurnameAmount || 0);
      sbaByDist[r.geographyId] = (sbaByDist[r.geographyId] || 0) + amount;
    }
  });
  const sbaRaw = ids.map(id => {
    const amt = sbaByDist[id] || 0;
    return amt > 0 ? amt / pops[id] : 0;
  });

  // Normalize each component
  const fecScores = minMaxNormalize(fecRaw);
  const hmdaScores = minMaxNormalize(hmdaRaw);
  const bizScores = minMaxNormalize(bizRaw);
  const grantsScores = minMaxNormalize(grantsRaw);
  const sbaScores = minMaxNormalize(sbaRaw);

  // Build per-district EPI with exclude-missing renormalization
  const result = {};
  for (let i = 0; i < n; i++) {
    const id = ids[i];
    const components = {
      fec: fecRaw[i] > 0 ? fecScores[i] : null,
      hmda: hmdaRaw[i] > 0 ? hmdaScores[i] : null,
      business: bizRaw[i] > 0 ? bizScores[i] : null,
      grants: grantsRaw[i] > 0 ? grantsScores[i] : null,
      sba: sbaRaw[i] > 0 ? sbaScores[i] : null,
    };

    // Weighted average with renormalized weights for available components
    let weightedSum = 0;
    let weightSum = 0;
    for (const [key, score] of Object.entries(components)) {
      if (score !== null) {
        weightedSum += score * WEIGHTS[key];
        weightSum += WEIGHTS[key];
      }
    }

    const coverage = Object.values(components).filter(v => v !== null).length;
    const score = weightSum > 0 ? Math.round(weightedSum / weightSum) : 0;

    result[id] = { score, coverage, components };
  }

  return result;
}

/**
 * Compute state-level EPI for Senate races.
 *
 * @param {Array} senateRaces — senate race objects with .state, .indianPop, .totalPop
 * @param {Object} econData — from useEconomicData (unfiltered)
 * @param {Object} permCumulative — { [districtId]: cumulativePermCount }
 * @param {Array} districts — for mapping districts to states
 * @returns {Object} { [stateCode]: { score, coverage, components } }
 */
export function computeStateEPI(senateRaces, econData, permCumulative, districts) {
  const states = senateRaces.map(r => r.state);
  const pops = {};
  senateRaces.forEach(r => { pops[r.state] = r.totalPop || r.indianPop || 1; });

  // FEC — state level contributions / pop
  const fecByState = {};
  (econData.fec || []).forEach(r => {
    if (r.geographyId && !r.geographyId.includes("-")) {
      fecByState[r.geographyId] = (fecByState[r.geographyId] || 0) + (r.totalContributions || 0);
    }
  });
  const fecRaw = states.map(st => {
    const total = fecByState[st] || 0;
    return total > 0 ? total / pops[st] : 0;
  });

  // HMDA — aggregate district originations to state
  const hmdaByState = {};
  (econData.hmda || []).forEach(r => {
    if (r.districtId) {
      const st = r.districtId.split("-")[0];
      hmdaByState[st] = (hmdaByState[st] || 0) + (r.originations || 0);
    }
  });
  const hmdaRaw = states.map(st => {
    const orig = hmdaByState[st] || 0;
    return orig > 0 ? orig / pops[st] : 0;
  });

  // Business — aggregate ACS + ABS to state
  const bizByState = {};
  (econData.acs || []).forEach(r => {
    if (r.districtId) {
      const st = r.districtId.split("-")[0];
      bizByState[st] = (bizByState[st] || 0) + (r.selfEmployed || r.selfEmployedCount || 0);
    }
  });
  (econData.abs || []).forEach(r => {
    if (r.districtId) {
      const st = r.districtId.split("-")[0];
      bizByState[st] = (bizByState[st] || 0) + (r.asianOwnedFirms || 0) * 0.22;
    }
  });
  const bizRaw = states.map(st => {
    const biz = bizByState[st] || 0;
    return biz > 0 ? biz / pops[st] : 0;
  });

  // Grants
  const grantsByState = {};
  (econData.grants || []).forEach(r => {
    if (r.state) {
      grantsByState[r.state] = (grantsByState[r.state] || 0) +
        (r.nihMatchedAwards || 0) + (r.nsfMatchedAwards || 0);
    }
  });
  const grantsRaw = states.map(st => grantsByState[st] || 0);

  // SBA — state level
  const sbaByState = {};
  (econData.sba || []).forEach(r => {
    const geoType = (r.geographyType || "").toLowerCase();
    if (geoType === "state" && r.geographyId) {
      const amount = (r.sba7aSurnameAmount || 0) + (r.sba504SurnameAmount || 0);
      sbaByState[r.geographyId] = (sbaByState[r.geographyId] || 0) + amount;
    } else if (geoType === "district" && r.geographyId) {
      const st = r.geographyId.split("-")[0];
      sbaByState[st] = (sbaByState[st] || 0) + (r.sba7aSurnameAmount || 0) + (r.sba504SurnameAmount || 0);
    }
  });
  const sbaRaw = states.map(st => {
    const amt = sbaByState[st] || 0;
    return amt > 0 ? amt / pops[st] : 0;
  });

  const fecScores = minMaxNormalize(fecRaw);
  const hmdaScores = minMaxNormalize(hmdaRaw);
  const bizScores = minMaxNormalize(bizRaw);
  const grantsScores = minMaxNormalize(grantsRaw);
  const sbaScores = minMaxNormalize(sbaRaw);

  const result = {};
  for (let i = 0; i < states.length; i++) {
    const st = states[i];
    const components = {
      fec: fecRaw[i] > 0 ? fecScores[i] : null,
      hmda: hmdaRaw[i] > 0 ? hmdaScores[i] : null,
      business: bizRaw[i] > 0 ? bizScores[i] : null,
      grants: grantsRaw[i] > 0 ? grantsScores[i] : null,
      sba: sbaRaw[i] > 0 ? sbaScores[i] : null,
    };

    let weightedSum = 0;
    let weightSum = 0;
    for (const [key, score] of Object.entries(components)) {
      if (score !== null) {
        weightedSum += score * WEIGHTS[key];
        weightSum += WEIGHTS[key];
      }
    }

    const coverage = Object.values(components).filter(v => v !== null).length;
    const score = weightSum > 0 ? Math.round(weightedSum / weightSum) : 0;

    result[st] = { score, coverage, components };
  }

  return result;
}
