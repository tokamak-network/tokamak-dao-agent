import { useState } from "react";
import type { ToolCall } from "./types";

export function ToolCallBlock({ toolCall }: { toolCall: ToolCall }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="tool-call-block">
      <div className="tool-call-header" onClick={() => setExpanded(!expanded)}>
        <span className={`tool-call-chevron ${expanded ? "open" : ""}`}>
          &#9654;
        </span>
        <span className="tool-call-name">{toolCall.name}</span>
        {toolCall.isRunning ? (
          <>
            <span className="tool-spinner" />
            <span className="tool-call-status running">running...</span>
          </>
        ) : toolCall.isError ? (
          <span className="tool-call-status error">error</span>
        ) : (
          <span className="tool-call-status done">done</span>
        )}
      </div>
      {expanded && toolCall.result && (
        <div className="tool-call-body">{toolCall.result}</div>
      )}
    </div>
  );
}
