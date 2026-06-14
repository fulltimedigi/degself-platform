import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Minimal, dependency-free Markdown → JSX renderer (server component) tuned for
 * the exact constructs used in degself blog content: h2–h4, paragraphs, ordered
 * and unordered lists, GFM tables, blockquotes, horizontal rules, inline bold,
 * inline code, and links. Internal degself.com links become relative Next links.
 *
 * It is intentionally line-based and not a general CommonMark parser — keep the
 * source authored in the same shapes you see in /tmp content (one block per blank
 * line, single-line list items, pipe tables with a `|---|` separator row).
 */

const SITE = "https://degself.com";

// ── inline: **bold**, `code`, [text](href) ──────────────────────────────────
function renderInline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+?)\*\*|`([^`]+?)`/g;
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const key = `${keyBase}-${i}`;
    if (m[1] !== undefined) {
      let href = m[2].trim();
      if (href.startsWith(SITE)) href = href.slice(SITE.length) || "/";
      const isHttp = /^https?:\/\//.test(href);
      const isMailOrTel = href.startsWith("mailto:") || href.startsWith("tel:");
      const cls = "font-semibold text-primary hover:underline";
      if (isHttp) {
        nodes.push(
          <a key={key} href={href} target="_blank" rel="noopener noreferrer" className={cls}>
            {m[1]}
          </a>
        );
      } else if (isMailOrTel) {
        nodes.push(
          <a key={key} href={href} className={cls}>
            {m[1]}
          </a>
        );
      } else {
        nodes.push(
          <Link key={key} href={href} className={cls}>
            {m[1]}
          </Link>
        );
      }
    } else if (m[3] !== undefined) {
      nodes.push(
        <strong key={key} className="font-bold text-foreground">
          {m[3]}
        </strong>
      );
    } else if (m[4] !== undefined) {
      nodes.push(
        <code key={key} dir="ltr" className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">
          {m[4]}
        </code>
      );
    }
    last = re.lastIndex;
    i++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

const SEP_RE = /^\|[\s:|-]*-[\s:|-]*\|?$/; // table separator row, e.g. |---|---|
const ORDERED_RE = /^(\d+)\.\s+(.*)$/;
const UNORDERED_RE = /^[-*]\s+(.*)$/;

function cells(row: string): string[] {
  let r = row.trim();
  if (r.startsWith("|")) r = r.slice(1);
  if (r.endsWith("|")) r = r.slice(0, -1);
  return r.split("|").map((c) => c.trim());
}

export function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // blank
    if (trimmed === "") {
      i++;
      continue;
    }

    // horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push(<hr key={key++} className="border-border" />);
      i++;
      continue;
    }

    // headings (#### … ##) — strip the leading H1 (page renders its own title)
    const h = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const content = renderInline(h[2], `h${key}`);
      if (level <= 1) {
        i++;
        continue; // skip page-title H1 if present
      }
      if (level === 2)
        blocks.push(
          <h2 key={key++} className="mt-4 text-2xl font-extrabold">
            {content}
          </h2>
        );
      else if (level === 3)
        blocks.push(
          <h3 key={key++} className="mt-2 text-xl font-bold">
            {content}
          </h3>
        );
      else
        blocks.push(
          <h4 key={key++} className="text-lg font-bold">
            {content}
          </h4>
        );
      i++;
      continue;
    }

    // table: a header row followed by a separator row
    if (trimmed.startsWith("|") && i + 1 < lines.length && SEP_RE.test(lines[i + 1].trim())) {
      const header = cells(trimmed);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(cells(lines[i].trim()));
        i++;
      }
      const single = header.length === 1; // callout-style single-column tables
      blocks.push(
        <div key={key++} className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {header.map((c, ci) => (
                  <th
                    key={ci}
                    className="border border-border bg-muted px-3 py-2 font-bold"
                  >
                    {renderInline(c, `th${key}-${ci}`)}
                  </th>
                ))}
              </tr>
            </thead>
            {!single && (
              <tbody>
                {rows.map((r, ri) => (
                  <tr key={ri} className="even:bg-muted/30">
                    {r.map((c, ci) => (
                      <td key={ci} className="border border-border px-3 py-2 align-top">
                        {renderInline(c, `td${key}-${ri}-${ci}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            )}
            {single && (
              <tbody>
                {rows.map((r, ri) => (
                  <tr key={ri} className="even:bg-muted/30">
                    <td className="border border-border px-3 py-2">
                      {renderInline(r[0] ?? "", `td${key}-${ri}`)}
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
      );
      continue;
    }

    // blockquote (consecutive "> " lines)
    if (trimmed.startsWith(">")) {
      const quoted: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoted.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      blocks.push(
        <blockquote
          key={key++}
          className="rounded-lg border-r-4 border-primary bg-muted/50 px-4 py-3 leading-loose text-foreground/90"
        >
          {quoted.map((q, qi) => (
            <p key={qi}>{renderInline(q, `bq${key}-${qi}`)}</p>
          ))}
        </blockquote>
      );
      continue;
    }

    // ordered list (consecutive "N. " lines) — preserve original start number
    if (ORDERED_RE.test(trimmed)) {
      const items: string[] = [];
      const start = parseInt(trimmed.match(ORDERED_RE)![1], 10);
      while (i < lines.length && ORDERED_RE.test(lines[i].trim())) {
        items.push(lines[i].trim().match(ORDERED_RE)![2]);
        i++;
      }
      blocks.push(
        <ol
          key={key++}
          start={start}
          className="list-decimal space-y-1 pr-6 leading-loose text-foreground/85 marker:font-bold marker:text-foreground"
        >
          {items.map((it, ii) => (
            <li key={ii}>{renderInline(it, `ol${key}-${ii}`)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // unordered list (consecutive "- " lines)
    if (UNORDERED_RE.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && UNORDERED_RE.test(lines[i].trim())) {
        items.push(lines[i].trim().match(UNORDERED_RE)![1]);
        i++;
      }
      blocks.push(
        <ul
          key={key++}
          className="list-disc space-y-1 pr-6 leading-loose text-foreground/85 marker:text-primary"
        >
          {items.map((it, ii) => (
            <li key={ii}>{renderInline(it, `ul${key}-${ii}`)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // paragraph (single line)
    blocks.push(
      <p key={key++} className="leading-loose text-foreground/85">
        {renderInline(trimmed, `p${key}`)}
      </p>
    );
    i++;
  }

  return <div className="flex flex-col gap-4">{blocks}</div>;
}
