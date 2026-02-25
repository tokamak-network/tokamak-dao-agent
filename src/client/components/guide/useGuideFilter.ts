import { useState, useMemo } from "react";
import { DAO_GUIDE, type ContractCategory, type RiskLevel, type ContractGuide } from "./data";

export function useGuideFilter() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ContractCategory | "all">("all");
  const [risk, setRisk] = useState<RiskLevel | "all">("all");

  const { contracts, visibleFnCount, totalFnCount } = useMemo(() => {
    const q = search.toLowerCase();
    let total = 0;
    let visible = 0;

    const filtered: ContractGuide[] = [];
    for (const contract of DAO_GUIDE) {
      total += contract.functions.length;
      if (category !== "all" && contract.category !== category) continue;

      const fns = contract.functions.filter((fn) => {
        if (risk !== "all" && fn.risk !== risk) return false;
        if (!q) return true;
        return (
          fn.name.toLowerCase().includes(q) ||
          fn.signature.toLowerCase().includes(q) ||
          fn.description.toLowerCase().includes(q) ||
          fn.example.toLowerCase().includes(q) ||
          contract.name.toLowerCase().includes(q)
        );
      });

      if (fns.length > 0) {
        visible += fns.length;
        filtered.push({ ...contract, functions: fns });
      }
    }

    return { contracts: filtered, visibleFnCount: visible, totalFnCount: total };
  }, [search, category, risk]);

  return {
    search, setSearch,
    category, setCategory,
    risk, setRisk,
    contracts,
    visibleFnCount,
    totalFnCount,
    contractCount: contracts.length,
    totalContractCount: DAO_GUIDE.length,
  };
}
