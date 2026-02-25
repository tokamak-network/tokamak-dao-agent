import { useMemo } from "react";
import { useI18n } from "../contexts/I18nContext";
import type { Locale } from "../i18n/translations";
import FrontmatterCard from "../components/spec/FrontmatterCard";
import SpecRenderer from "../components/spec/SpecRenderer";
import TableOfContents from "../components/spec/TableOfContents";

import specEn from "../../../../docs/erc-ai-governance.md?raw";
import specKo from "../../../../docs/erc-ai-governance.ko.md?raw";
import specZh from "../../../../docs/erc-ai-governance.zh.md?raw";
import specJa from "../../../../docs/erc-ai-governance.ja.md?raw";

const specByLocale: Record<Locale, string> = {
  en: specEn,
  ko: specKo,
  zh: specZh,
  ja: specJa,
};

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
  const { locale } = useI18n();
  const specMd = specByLocale[locale] || specEn;
  const { data, content } = useMemo(() => parseFrontmatter(specMd), [specMd]);

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
