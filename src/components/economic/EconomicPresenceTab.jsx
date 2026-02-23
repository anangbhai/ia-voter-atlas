import { useState } from "react";
import { C, font } from "../../lib/theme.js";
import { useEconomicData } from "../../hooks/useEconomicData.js";
import { ImmigrationPipeline } from "./ImmigrationPipeline.jsx";
import { HouseholdWealth } from "./HouseholdWealth.jsx";
import { BusinessOwnership } from "./BusinessOwnership.jsx";
import { ResearchInnovation } from "./ResearchInnovation.jsx";
import { PoliticalEconomy } from "./PoliticalEconomy.jsx";

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
        <ResearchInnovation data={economicData} isMobile={isMobile} />
      )}

      {activeSection === "political" && (
        <PoliticalEconomy data={economicData} isMobile={isMobile} />
      )}
    </div>
  );
}
