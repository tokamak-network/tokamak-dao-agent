import { useMemo } from "react";
import specMd from "../../../../docs/erc-ai-governance.md?raw";
import FrontmatterCard from "../components/spec/FrontmatterCard";
import SpecRenderer from "../components/spec/SpecRenderer";
import TableOfContents from "../components/spec/TableOfContents";

function parseFrontmatter(raw: string): { data: Record<string, string>; content: string } {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };

  const data: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim();
      data[key] = val;
    }
  }
  return { data, content: match[2] };
}

export default function SpecPage() {
  const { data, content } = useMemo(() => parseFrontmatter(specMd), []);

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 220px",
      gap: "2rem",
      maxWidth: "var(--max-width)",
      margin: "0 auto",
      padding: "2rem 1.5rem",
    }}>
      <article>
        <FrontmatterCard data={data} />
        <SpecRenderer content={content} />
      </article>
      <aside style={{ display: "block" }}>
        <TableOfContents markdown={content} />
      </aside>
    </div>
  );
}
