import { useAccount } from "wagmi";
import { useDemo } from "../../contexts/DemoContext";
import { useI18n } from "../../contexts/I18nContext";
import { isWalletConfigured } from "../../config/wagmi";
import RegisterAgentStep from "./steps/RegisterAgentStep";
import DelegateStep from "./steps/DelegateStep";
import CreateProposalStep from "./steps/CreateProposalStep";
import CommitRationaleStep from "./steps/CommitRationaleStep";
import VoteStep from "./steps/VoteStep";
import RevealRationaleStep from "./steps/RevealRationaleStep";
import ResolveStep from "./steps/ResolveStep";
import CredibilityStep from "./steps/CredibilityStep";

const STEP_COMPONENTS = [
  RegisterAgentStep,
  DelegateStep,
  CreateProposalStep,
  CommitRationaleStep,
  VoteStep,
  RevealRationaleStep,
  ResolveStep,
  CredibilityStep,
];

export default function StepContainer() {
  const { currentStep } = useDemo();
  const { t } = useI18n();

  const { isConnected } = useAccount();

  if (!isWalletConfigured) {
    return (
      <div className="card" style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}>
        <div>
          <div style={{
            fontSize: "1.2rem",
            fontWeight: 600,
            marginBottom: "0.5rem",
          }}>
            {t("wallet.notConfigured")}
          </div>
          <p style={{
            color: "var(--text-secondary)",
            fontSize: "0.85rem",
            maxWidth: "400px",
          }}>
            {t("wallet.notConfiguredDesc")}
          </p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="card" style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}>
        <div>
          <div style={{
            fontSize: "1.2rem",
            fontWeight: 600,
            marginBottom: "0.5rem",
          }}>
            {t("wallet.notConnected")}
          </div>
          <p style={{
            color: "var(--text-secondary)",
            fontSize: "0.85rem",
            maxWidth: "400px",
          }}>
            {t("wallet.notConnectedDesc")}
          </p>
          <div style={{ marginTop: "1rem", display: "flex", justifyContent: "center" }}>
            <w3m-button size="md" />
          </div>
        </div>
      </div>
    );
  }

  const StepComponent = STEP_COMPONENTS[currentStep];
  if (!StepComponent) return null;

  return (
    <div className="card">
      <StepComponent />
    </div>
  );
}
