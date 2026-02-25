import { useGuideFilter } from "./useGuideFilter";
import { ContractSection } from "./ContractSection";
import type { ContractCategory, RiskLevel } from "./data";

export function GuideTab() {
  const {
    search, setSearch,
    category, setCategory,
    risk, setRisk,
    contracts,
    visibleFnCount,
    totalFnCount,
    contractCount,
    totalContractCount,
  } = useGuideFilter();

  return (
    <div className="guide-container">
      <div className="guide-header">
        <div className="guide-title">DAO Function Guide</div>
        <div className="guide-stats">
          {visibleFnCount === totalFnCount
            ? `${totalFnCount} functions across ${totalContractCount} contracts`
            : `${visibleFnCount} / ${totalFnCount} functions \u2022 ${contractCount} contracts`}
        </div>
      </div>

      <div className="guide-filters">
        <input
          className="guide-search"
          type="text"
          placeholder="Search functions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="guide-select"
          value={category}
          onChange={(e) => setCategory(e.target.value as ContractCategory | "all")}
        >
          <option value="all">All Categories</option>
          <option value="governance">Governance</option>
          <option value="treasury">Treasury</option>
          <option value="staking">Staking</option>
          <option value="registry">Registry</option>
          <option value="token">Token</option>
        </select>
        <select
          className="guide-select"
          value={risk}
          onChange={(e) => setRisk(e.target.value as RiskLevel | "all")}
        >
          <option value="all">All Risk Levels</option>
          <option value="safe">Safe</option>
          <option value="caution">Caution</option>
          <option value="dangerous">Dangerous</option>
        </select>
      </div>

      <div className="guide-list">
        {contracts.length === 0 ? (
          <div className="guide-empty">No matching functions found.</div>
        ) : (
          contracts.map((c) => <ContractSection key={c.name} contract={c} />)
        )}
      </div>
    </div>
  );
}
