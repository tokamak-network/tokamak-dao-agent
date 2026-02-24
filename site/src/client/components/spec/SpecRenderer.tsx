import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import type { Components } from "react-markdown";

interface Props {
  content: string;
}

const components: Components = {
  h2: ({ children, id, ...props }) => (
    <h2
      id={id}
      style={{
        fontSize: "1.4rem",
        fontWeight: 700,
        marginTop: "2.5rem",
        marginBottom: "1rem",
        paddingBottom: "0.5rem",
        borderBottom: "1px solid var(--border)",
      }}
      {...props}
    >
      {children}
    </h2>
  ),

  h3: ({ children, id, ...props }) => (
    <h3
      id={id}
      style={{
        fontSize: "1.15rem",
        fontWeight: 600,
        marginTop: "2rem",
        marginBottom: "0.75rem",
        color: "var(--text-primary)",
      }}
      {...props}
    >
      {children}
    </h3>
  ),

  h4: ({ children, id, ...props }) => (
    <h4
      id={id}
      style={{
        fontSize: "1rem",
        fontWeight: 600,
        marginTop: "1.5rem",
        marginBottom: "0.5rem",
        color: "var(--text-secondary)",
      }}
      {...props}
    >
      {children}
    </h4>
  ),

  p: ({ children, ...props }) => (
    <p
      style={{
        marginBottom: "1rem",
        lineHeight: 1.7,
        color: "var(--text-primary)",
      }}
      {...props}
    >
      {children}
    </p>
  ),

  ul: ({ children, ...props }) => (
    <ul
      style={{
        marginBottom: "1rem",
        paddingLeft: "1.5rem",
        lineHeight: 1.7,
      }}
      {...props}
    >
      {children}
    </ul>
  ),

  ol: ({ children, ...props }) => (
    <ol
      style={{
        marginBottom: "1rem",
        paddingLeft: "1.5rem",
        lineHeight: 1.7,
      }}
      {...props}
    >
      {children}
    </ol>
  ),

  li: ({ children, ...props }) => (
    <li style={{ marginBottom: "0.25rem" }} {...props}>
      {children}
    </li>
  ),

  table: ({ children, ...props }) => (
    <div style={{ overflowX: "auto", marginBottom: "1.5rem" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "0.85rem",
          fontFamily: "var(--font-mono)",
        }}
        {...props}
      >
        {children}
      </table>
    </div>
  ),

  thead: ({ children, ...props }) => (
    <thead
      style={{
        background: "var(--bg-tertiary)",
        borderBottom: "2px solid var(--border)",
      }}
      {...props}
    >
      {children}
    </thead>
  ),

  th: ({ children, ...props }) => (
    <th
      style={{
        padding: "0.6rem 0.75rem",
        textAlign: "left",
        fontWeight: 600,
        color: "var(--text-secondary)",
        fontSize: "0.78rem",
      }}
      {...props}
    >
      {children}
    </th>
  ),

  td: ({ children, ...props }) => (
    <td
      style={{
        padding: "0.5rem 0.75rem",
        borderBottom: "1px solid var(--border)",
        color: "var(--text-primary)",
      }}
      {...props}
    >
      {children}
    </td>
  ),

  blockquote: ({ children, ...props }) => (
    <blockquote
      style={{
        borderLeft: "3px solid var(--accent-blue)",
        paddingLeft: "1rem",
        margin: "1rem 0",
        color: "var(--text-secondary)",
        fontStyle: "italic",
      }}
      {...props}
    >
      {children}
    </blockquote>
  ),

  hr: ({ ...props }) => (
    <hr
      style={{
        border: "none",
        borderTop: "1px solid var(--border)",
        margin: "2rem 0",
      }}
      {...props}
    />
  ),

  strong: ({ children, ...props }) => (
    <strong style={{ color: "var(--text-primary)", fontWeight: 600 }} {...props}>
      {children}
    </strong>
  ),

  a: ({ children, href, ...props }) => (
    <a
      href={href}
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
      {...props}
    >
      {children}
    </a>
  ),
};

export default function SpecRenderer({ content }: Props) {
  return (
    <div className="spec-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
