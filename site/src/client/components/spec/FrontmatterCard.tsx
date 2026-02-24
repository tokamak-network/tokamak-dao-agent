interface FrontmatterProps {
  data: Record<string, string>;
}

export default function FrontmatterCard({ data }: FrontmatterProps) {
  if (!data.title) return null;

  return (
    <div style={{
      background: "var(--bg-secondary)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg)",
      padding: "2rem",
      marginBottom: "2rem",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
        <h1 style={{
          fontSize: "1.75rem",
          fontWeight: 700,
          lineHeight: 1.3,
          margin: 0,
        }}>
          {data.title}
        </h1>
        {data.status && (
          <span className="badge badge-draft">{data.status}</span>
        )}
      </div>

      {data.description && (
        <p style={{
          color: "var(--text-secondary)",
          fontSize: "0.95rem",
          marginBottom: "1.25rem",
          lineHeight: 1.5,
        }}>
          {data.description}
        </p>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "0.75rem",
        fontSize: "0.8rem",
        fontFamily: "var(--font-mono)",
      }}>
        {data.author && (
          <MetaField label="Author" value={data.author} />
        )}
        {data.type && (
          <MetaField label="Type" value={`${data.type} / ${data.category || ""}`} />
        )}
        {data.requires && (
          <MetaField label="Requires" value={`EIP-${data.requires.replace(/, /g, ", EIP-")}`} />
        )}
        {data.created && (
          <MetaField label="Created" value={data.created} />
        )}
        {data["discussions-to"] && (
          <MetaField
            label="Discussion"
            value={
              <a href={data["discussions-to"]} target="_blank" rel="noopener noreferrer">
                Ethereum Magicians
              </a>
            }
          />
        )}
      </div>
    </div>
  );
}

function MetaField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span style={{ color: "var(--text-muted)", marginRight: "0.5rem" }}>{label}:</span>
      <span style={{ color: "var(--text-primary)" }}>{value}</span>
    </div>
  );
}
