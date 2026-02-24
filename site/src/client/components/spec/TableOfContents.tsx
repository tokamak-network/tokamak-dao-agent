import { useState, useEffect } from "react";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface Props {
  markdown: string;
}

function extractHeadings(md: string): TocItem[] {
  const items: TocItem[] = [];
  const lines = md.split("\n");
  let inCodeBlock = false;

  for (const line of lines) {
    if (line.trimStart().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const match = line.match(/^(#{2,4})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].replace(/[`*_]/g, "");
      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-");
      items.push({ id, text, level });
    }
  }
  return items;
}

export default function TableOfContents({ markdown }: Props) {
  const [activeId, setActiveId] = useState("");
  const headings = extractHeadings(markdown);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -70% 0px" }
    );

    for (const h of headings) {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [headings]);

  return (
    <nav style={{
      position: "sticky",
      top: "5rem",
      maxHeight: "calc(100vh - 6rem)",
      overflowY: "auto",
      paddingRight: "1rem",
      fontSize: "0.78rem",
      lineHeight: 1.8,
    }}>
      <div style={{
        fontFamily: "var(--font-mono)",
        fontWeight: 600,
        fontSize: "0.7rem",
        color: "var(--text-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        marginBottom: "0.75rem",
      }}>
        On this page
      </div>
      {headings.map((h) => (
        <a
          key={h.id}
          href={`#${h.id}`}
          onClick={(e) => {
            e.preventDefault();
            document.getElementById(h.id)?.scrollIntoView({ behavior: "smooth" });
          }}
          style={{
            display: "block",
            paddingLeft: `${(h.level - 2) * 0.75}rem`,
            color: activeId === h.id ? "var(--accent-blue)" : "var(--text-secondary)",
            fontWeight: activeId === h.id ? 500 : 400,
            textDecoration: "none",
            borderLeft: activeId === h.id ? "2px solid var(--accent-blue)" : "2px solid transparent",
            paddingTop: "0.1rem",
            paddingBottom: "0.1rem",
            transition: "all 0.15s ease",
          }}
        >
          {h.text}
        </a>
      ))}
    </nav>
  );
}
