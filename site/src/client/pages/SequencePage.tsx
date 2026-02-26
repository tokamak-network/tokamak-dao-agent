import { useSequenceNav } from "../components/sequence/useSequenceNav";
import StepControls from "../components/sequence/StepControls";
import SequenceDiagram from "../components/sequence/SequenceDiagram";
import StatePanel from "../components/sequence/StatePanel";
import DetailOverlay from "../components/sequence/DetailOverlay";

export default function SequencePage() {
  const { activeStep, detailId, goToStep, nextStep, resetAll, showDetail, closeDetail, isComplete } = useSequenceNav();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 52px)" }}>
      {/* Step Controls */}
      <StepControls
        activeStep={activeStep}
        isComplete={isComplete}
        onGoToStep={goToStep}
        onNext={nextStep}
        onReset={resetAll}
      />

      {/* Main Layout */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Diagram Pane */}
        <div style={{ flex: 1, overflow: "auto", padding: 0, position: "relative", minWidth: 0 }}>
          <SequenceDiagram activeStep={activeStep} onShowDetail={showDetail} />
        </div>

        {/* State Pane */}
        <div style={{
          width: 340,
          flexShrink: 0,
          borderLeft: "1px solid var(--border)",
          background: "var(--bg-secondary)",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}>
          <div style={{
            padding: "0.75rem 1rem",
            borderBottom: "1px solid var(--border)",
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "var(--text-secondary)",
            fontFamily: "var(--font-mono)",
            position: "sticky",
            top: 0,
            background: "var(--bg-secondary)",
            zIndex: 2,
          }}>
            Contract State
          </div>
          <div style={{ padding: "0.75rem", flex: 1, fontSize: "0.65rem", fontFamily: "var(--font-mono)" }}>
            <StatePanel activeStep={activeStep} />
          </div>
        </div>
      </div>

      {/* Detail Overlay */}
      <DetailOverlay detailId={detailId} onClose={closeDetail} />
    </div>
  );
}
