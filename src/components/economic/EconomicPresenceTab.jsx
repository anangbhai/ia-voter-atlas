import { useState } from "react";
import { C, font } from "../../lib/theme.js";
import { useEconomicData } from "../../hooks/useEconomicData.js";
import { ImmigrationPipeline } from "./ImmigrationPipeline.jsx";
import { HouseholdWealth } from "./HouseholdWealth.jsx";
import { BusinessOwnership } from "./BusinessOwnership.jsx";

const SUB_SECTIONS = [
  { key: "immigration", label: "Immigration Pipeline" },
  { key: "wealth", label: "Household Wealth" },
  { key: "business", label: "Business Ownership" },
  { key: "research", label: "Research & Innovation" },
  { key: "political", label: "Political Economy" },
];

export function EconomicPresenceTab({
  permDistrictData, permStateData,
  permDistrict, setPermDistrict,
  permEmpDistrict, setPermEmpDistrict,
  permEmpYear, setPermEmpYear,
  permSubTab, setPermSubTab,
  isMobile,
}) {
  const [activeSection, setActiveSection] = useState("immigration");
  const economicData = useEconomicData();

  return (
    <div>
      {/* Sub-navigation pills */}
      <div style={{
        display: "flex", gap: 8, marginBottom: 24, overflowX: "auto",
        WebkitOverflowScrolling: "touch", paddingBottom: 2,
      }}>
        {SUB_SECTIONS.map(s => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            style={{
              padding: isMobile ? "8px 14px" : "8px 18px",
              fontSize: isMobile ? 11 : 13,
              fontWeight: 600,
              fontFamily: font.body,
              border: `1px solid ${activeSection === s.key ? C.saffronDark : C.royalBlue}`,
              borderRadius: 20,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.15s",
              background: activeSection === s.key ? C.saffronDark : C.surface,
              color: activeSection === s.key ? "#FFFFFF" : C.royalBlue,
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Section content */}
      {activeSection === "immigration" && (
        <ImmigrationPipeline
          permDistrictData={permDistrictData}
          permStateData={permStateData}
          permDistrict={permDistrict}
          setPermDistrict={setPermDistrict}
          permEmpDistrict={permEmpDistrict}
          setPermEmpDistrict={setPermEmpDistrict}
          permEmpYear={permEmpYear}
          setPermEmpYear={setPermEmpYear}
          permSubTab={permSubTab}
          setPermSubTab={setPermSubTab}
          isMobile={isMobile}
        />
      )}

      {activeSection === "wealth" && (
        <HouseholdWealth data={economicData} isMobile={isMobile} />
      )}

      {activeSection === "business" && (
        <BusinessOwnership data={economicData} isMobile={isMobile} />
      )}

      {activeSection === "research" && (
        <div style={{
          padding: "40px 20px", textAlign: "center",
          background: C.surfaceAlt, borderRadius: 10, border: `1px solid ${C.borderLight}`,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, fontFamily: font.display }}>Research & Innovation</div>
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>NIH grants & H-1B data — coming in next deploy</div>
        </div>
      )}

      {activeSection === "political" && (
        <div style={{
          padding: "40px 20px", textAlign: "center",
          background: C.surfaceAlt, borderRadius: 10, border: `1px solid ${C.borderLight}`,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.navy, fontFamily: font.display }}>Political Economy</div>
          <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>FEC contribution data — coming in next deploy</div>
        </div>
      )}
    </div>
  );
}
