import { useDemo } from "../../contexts/DemoContext";
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
            Wallet Not Configured
          </div>
          <p style={{
            color: "var(--text-secondary)",
            fontSize: "0.85rem",
            maxWidth: "400px",
          }}>
            Set <code>VITE_REOWN_PROJECT_ID</code> in your environment to enable
            wallet connection and interact with the demo contracts on Sepolia.
          </p>
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
