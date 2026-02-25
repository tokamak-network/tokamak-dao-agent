import { useEffect, useRef } from "react";
import hljs from "highlight.js/lib/core";
import solidity from "highlightjs-solidity/dist/solidity.es.min.js";
import { navigate } from "../../App";
import { useI18n } from "../../contexts/I18nContext";
import "../spec/syntax-highlight.css";

hljs.registerLanguage("solidity", solidity);

const CODE = `interface IAgentRegistry {
    struct AgentInfo {
        address operator;
        string metadataURI;
        uint256 registeredAt;
        bool active;
    }

    function registerAgent(string calldata metadataURI)
        external returns (bytes32 agentId);

    function getAgent(bytes32 agentId)
        external view returns (AgentInfo memory);

    function isRegistered(bytes32 agentId)
        external view returns (bool);
}`;

export default function CodePreviewSection() {
  const { t } = useI18n();
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      hljs.highlightElement(codeRef.current);
    }
  }, []);

  return (
    <section className="landing-section">
      <div className="landing-container" style={{ maxWidth: 800 }}>
        <h2
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "1.5rem",
            fontWeight: 700,
            textAlign: "center",
            marginBottom: "2rem",
          }}
        >
          {t("landing.code.title")}
        </h2>

        <pre>
          <code ref={codeRef} className="language-solidity">{CODE}</code>
        </pre>

        <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
          <a
            href="/spec"
            onClick={(e) => { e.preventDefault(); navigate("/spec"); }}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.85rem",
            }}
          >
            {t("landing.code.viewSpec")} →
          </a>
        </div>
      </div>
    </section>
  );
}
