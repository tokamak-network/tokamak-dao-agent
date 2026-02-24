import { DemoProvider } from "../contexts/DemoContext";
import StepRail from "../components/demo/StepRail";
import StepContainer from "../components/demo/StepContainer";
import EventLog from "../components/demo/EventLog";

export default function DemoPage() {
  return (
    <DemoProvider>
      <div style={{
        maxWidth: "var(--max-width)",
        margin: "0 auto",
        padding: "2rem 1.5rem",
      }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            Interactive Demo
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Walk through the full AI agent governance lifecycle on Sepolia testnet.
            Each step executes a real on-chain transaction.
          </p>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "240px 1fr",
          gap: "1.5rem",
          minHeight: "600px",
        }}>
          <StepRail />
          <StepContainer />
        </div>

        <EventLog />
      </div>
    </DemoProvider>
  );
}
