import { useState } from "react";
import type { ContractGuide, DaoFunction } from "./data";
import { useTabContext } from "../../contexts/TabContext";

const RISK_LABELS: Record<string, string> = {
  safe: "Safe",
  caution: "Caution",
  dangerous: "Dangerous",
};

const CATEGORY_LABELS: Record<string, string> = {
  governance: "Governance",
  treasury: "Treasury",
  staking: "Staking",
  registry: "Registry",
  token: "Token",
};

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function FunctionRow({ fn }: { fn: DaoFunction }) {
  const [open, setOpen] = useState(false);
  const { navigateWithMessage } = useTabContext();

  return (
    <div className={`guide-fn-row${open ? " open" : ""}`}>
      <button className="guide-fn-header" onClick={() => setOpen(!open)}>
        <span className="guide-fn-name">{fn.name}</span>
        <span className={`guide-risk-badge ${fn.risk}`}>{RISK_LABELS[fn.risk]}</span>
        <span className="guide-fn-chevron">{open ? "\u25B4" : "\u25BE"}</span>
      </button>
      {open && (
        <div className="guide-fn-detail">
          <div className="guide-fn-sig">{fn.signature}</div>
          {fn.params.length > 0 && (
            <div className="guide-fn-params">
              {fn.params.map((p) => (
                <div key={p.name} className="guide-fn-param">
                  <code>{p.name}</code>
                  <span className="guide-fn-param-type">{p.type}</span>
                  <span className="guide-fn-param-desc">{p.description}</span>
                </div>
              ))}
            </div>
          )}
          <p className="guide-fn-desc">{fn.description}</p>
          {fn.notes && <p className="guide-fn-notes">{fn.notes}</p>}
          <button
            className="guide-try-btn"
            onClick={(e) => {
              e.stopPropagation();
              navigateWithMessage("forum", fn.example);
            }}
          >
            Try it &rarr; <span className="guide-try-example">{fn.example}</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function ContractSection({ contract }: { contract: ContractGuide }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="guide-contract">
      <button className="guide-contract-header" onClick={() => setOpen(!open)}>
        <div className="guide-contract-info">
          <span className="guide-contract-name">{contract.name}</span>
          <span className={`guide-category-badge ${contract.category}`}>
            {CATEGORY_LABELS[contract.category]}
          </span>
          <span className="guide-contract-addr">{truncateAddress(contract.address)}</span>
        </div>
        <div className="guide-contract-meta">
          <span className="guide-fn-count">{contract.functions.length} fn{contract.functions.length !== 1 ? "s" : ""}</span>
          <span className="guide-contract-chevron">{open ? "\u25B4" : "\u25BE"}</span>
        </div>
      </button>
      {open && (
        <div className="guide-contract-body">
          <p className="guide-contract-desc">{contract.description}</p>
          {contract.functions.map((fn) => (
            <FunctionRow key={fn.signature} fn={fn} />
          ))}
        </div>
      )}
    </div>
  );
}
