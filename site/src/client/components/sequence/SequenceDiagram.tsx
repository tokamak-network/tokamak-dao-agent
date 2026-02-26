import { P, COLS, SVG_W, SVG_H, HEADER_H, SELF_H, STEP_LAYOUTS, STEPS } from "./data";

interface Props {
  activeStep: number;
  onShowDetail: (id: number) => void;
}

export default function SequenceDiagram({ activeStep, onShowDetail }: Props) {
  return (
    <svg
      className="diagram-svg"
      width={SVG_W}
      height={SVG_H}
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      style={{ display: "block", minWidth: SVG_W, fontFamily: "var(--font-mono)" }}
    >
      <defs>
        <marker id="ah" viewBox="0 0 10 8" refX="10" refY="4" markerWidth="8" markerHeight="6" orient="auto">
          <path d="M0,0 L10,4 L0,8 Z" style={{ fill: "var(--accent-blue)" }} />
        </marker>
        <marker id="ah-ret" viewBox="0 0 10 8" refX="10" refY="4" markerWidth="8" markerHeight="6" orient="auto">
          <path d="M0,0 L10,4 L0,8 Z" style={{ fill: "var(--text-muted)" }} />
        </marker>
        <marker id="ah-sub" viewBox="0 0 10 8" refX="10" refY="4" markerWidth="7" markerHeight="5" orient="auto">
          <path d="M0,0 L10,4 L0,8 Z" style={{ fill: "var(--text-secondary)" }} />
        </marker>
      </defs>

      {/* Background */}
      <rect x={0} y={0} width={SVG_W} height={SVG_H} style={{ fill: "var(--bg-primary)" }} />

      {/* Participant headers */}
      {P.map((p, i) => {
        const x = COLS[i];
        return (
          <g key={p.id}>
            <rect
              x={x - 60} y={8} width={120} height={38} rx={6}
              style={{ fill: "var(--bg-card)", stroke: p.color, strokeWidth: 1.5 }}
            />
            <text
              x={x} y={27}
              fill={p.color} fontSize={9} fontWeight={600}
              textAnchor="middle" dominantBaseline="central"
            >
              {p.label}
            </text>
          </g>
        );
      })}

      {/* Lifelines */}
      {P.map((_, i) => (
        <line
          key={i}
          x1={COLS[i]} y1={HEADER_H} x2={COLS[i]} y2={SVG_H}
          style={{ stroke: "var(--border)", strokeWidth: 1, strokeDasharray: "4,4" }}
        />
      ))}

      {/* Steps */}
      {STEPS.map((step, si) => {
        const layout = STEP_LAYOUTS[si];
        const isActive = si <= activeStep;

        return (
          <g key={si} opacity={isActive ? 1 : 0.12} style={{ transition: "opacity 0.4s ease" }}>
            {/* Step label */}
            <rect
              x={4} y={layout.startY + 5 - 9} width={44} height={16} rx={3}
              style={{
                fill: isActive ? "var(--bg-tertiary)" : "transparent",
                stroke: isActive ? "var(--border)" : "transparent",
                strokeWidth: 0.5,
              }}
            />
            <text
              x={8} y={layout.startY + 5 + 3}
              style={{ fill: isActive ? "var(--text-secondary)" : "var(--text-muted)" }}
              fontSize={7.5} fontWeight={600}
            >
              {step.title}
            </text>

            {/* Arrows */}
            {step.arrows.map((a, ai) => {
              const y = layout.arrowYs[ai];
              const x1 = COLS[a.from];
              const x2 = COLS[a.to];

              if (a.type === "self") {
                const cx = COLS[a.from];
                return (
                  <g key={ai}>
                    <path
                      d={`M${cx + 4},${y} C${cx + 30},${y} ${cx + 30},${y + SELF_H} ${cx + 4},${y + SELF_H}`}
                      fill="none"
                      style={{ stroke: "var(--text-secondary)", strokeWidth: 1, strokeDasharray: "3,2" }}
                      markerEnd="url(#ah-sub)"
                    />
                    <text
                      x={cx + 36} y={y + SELF_H / 2 + 3}
                      style={{ fill: "var(--text-secondary)" }}
                      fontSize={7} fontStyle="italic"
                    >
                      {a.label}
                    </text>
                  </g>
                );
              }

              if (a.type === "call") {
                const dir = x2 > x1 ? 1 : -1;
                const mid = (x1 + x2) / 2;
                const label = a.label.length > 50 ? a.label.slice(0, 48) + "..." : a.label;
                return (
                  <g key={ai}>
                    <line
                      x1={x1 + dir * 4} y1={y} x2={x2 - dir * 4} y2={y}
                      style={{ stroke: "var(--accent-blue)", strokeWidth: 1.5 }}
                      markerEnd="url(#ah)"
                    />
                    <text
                      x={mid} y={y - 5}
                      style={{ fill: "var(--text-primary)" }}
                      fontSize={7.5} textAnchor="middle" fontWeight={500}
                    >
                      {label}
                    </text>
                    {a.detailId !== undefined && isActive && (
                      <rect
                        x={Math.min(x1, x2)} y={y - 12}
                        width={Math.abs(x2 - x1)} height={18}
                        fill="transparent"
                        style={{ cursor: "pointer" }}
                        onClick={() => onShowDetail(a.detailId!)}
                      />
                    )}
                  </g>
                );
              }

              if (a.type === "return") {
                const dir = x2 > x1 ? 1 : -1;
                const mid = (x1 + x2) / 2;
                return (
                  <g key={ai}>
                    <line
                      x1={x1 + dir * 4} y1={y} x2={x2 - dir * 4} y2={y}
                      style={{ stroke: "var(--text-muted)", strokeWidth: 1, strokeDasharray: "5,3" }}
                      markerEnd="url(#ah-ret)"
                    />
                    <text
                      x={mid} y={y - 5}
                      style={{ fill: "var(--text-muted)" }}
                      fontSize={7} textAnchor="middle"
                    >
                      {a.label}
                    </text>
                  </g>
                );
              }

              if (a.type === "subcall") {
                const dir = x2 > x1 ? 1 : -1;
                const mid = (x1 + x2) / 2;
                return (
                  <g key={ai}>
                    <line
                      x1={x1 + dir * 4} y1={y} x2={x2 - dir * 4} y2={y}
                      style={{ stroke: "var(--text-secondary)", strokeWidth: 1, strokeDasharray: "3,2" }}
                      markerEnd="url(#ah-sub)"
                    />
                    <text
                      x={mid} y={y - 5}
                      style={{ fill: "var(--text-secondary)" }}
                      fontSize={6.5} textAnchor="middle" fontStyle="italic"
                    >
                      {a.label}
                    </text>
                    {a.detailId !== undefined && isActive && (
                      <rect
                        x={Math.min(x1, x2)} y={y - 10}
                        width={Math.abs(x2 - x1)} height={15}
                        fill="transparent"
                        style={{ cursor: "pointer" }}
                        onClick={() => onShowDetail(a.detailId!)}
                      />
                    )}
                  </g>
                );
              }

              if (a.type === "subreturn") {
                const dir = x2 > x1 ? 1 : -1;
                const mid = (x1 + x2) / 2;
                return (
                  <g key={ai}>
                    <line
                      x1={x1 + dir * 4} y1={y} x2={x2 - dir * 4} y2={y}
                      style={{ stroke: "var(--border-hover)", strokeWidth: 0.8, strokeDasharray: "3,3" }}
                      markerEnd="url(#ah-ret)"
                    />
                    <text
                      x={mid} y={y - 4}
                      style={{ fill: "var(--border-hover)" }}
                      fontSize={6} textAnchor="middle"
                    >
                      {a.label}
                    </text>
                  </g>
                );
              }

              return null;
            })}
          </g>
        );
      })}
    </svg>
  );
}
