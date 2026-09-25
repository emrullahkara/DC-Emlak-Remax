/**
 * Şablonlar için küçük ve güvenli Markdown ayrıştırıcı.
 *
 * Yalnızca şablonlarda kullanılan yapılar desteklenir: başlık, paragraf,
 * madde/sıralı liste, alıntı, tablo, yatay çizgi, kod bloğu; satır içinde
 * kalın, italik, kod, `[ ]` kutucuğu ve `{{alan}}` yer tutucusu.
 *
 * Çıktı bir sözdizimi ağacıdır (AST). Arayüz bu ağacı React öğelerine çevirir,
 * böylece hiçbir kullanıcı değeri HTML olarak yorumlanmaz. `renderHtml` ise
 * her metni önce kaçışlayarak (escape) HTML dizesi üretir (e-posta/çıktı için).
 */

export type Inline =
  | { t: "text"; v: string }
  | { t: "strong"; c: Inline[] }
  | { t: "em"; c: Inline[] }
  | { t: "code"; v: string }
  | { t: "field"; name: string }
  | { t: "check"; checked: boolean }
  | { t: "br" };

export type Block =
  | { t: "heading"; level: number; c: Inline[] }
  | { t: "p"; c: Inline[] }
  | { t: "ul"; items: Inline[][] }
  | { t: "ol"; items: Inline[][]; start: number }
  | { t: "quote"; blocks: Block[] }
  | { t: "table"; head: Inline[][] | null; rows: Inline[][][] }
  | { t: "hr" }
  | { t: "code"; v: string };

// ---- Satır içi ------------------------------------------------------------------

const FIELD_RE = /^\{\{\s*([a-z0-9_]+)\s*\}\}/;

export function parseInline(s: string): Inline[] {
  const out: Inline[] = [];
  let buf = "";
  const flush = () => {
    if (buf) out.push({ t: "text", v: buf });
    buf = "";
  };
  let i = 0;
  while (i < s.length) {
    const rest = s.slice(i);
    const f = FIELD_RE.exec(rest);
    if (f) {
      flush();
      out.push({ t: "field", name: f[1]! });
      i += f[0].length;
      continue;
    }
    if (rest.startsWith("**")) {
      const end = s.indexOf("**", i + 2);
      if (end > i + 2) {
        flush();
        out.push({ t: "strong", c: parseInline(s.slice(i + 2, end)) });
        i = end + 2;
        continue;
      }
    }
    if (rest[0] === "*" && rest[1] !== "*" && rest[1] !== " ") {
      const end = findSingleStar(s, i + 1);
      if (end > i + 1) {
        flush();
        out.push({ t: "em", c: parseInline(s.slice(i + 1, end)) });
        i = end + 1;
        continue;
      }
    }
    if (rest[0] === "`") {
      const end = s.indexOf("`", i + 1);
      if (end > i) {
        flush();
        out.push({ t: "code", v: s.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    if (rest.startsWith("[ ]") || rest.startsWith("[x]") || rest.startsWith("[X]")) {
      flush();
      out.push({ t: "check", checked: rest[1] !== " " });
      i += 3;
      continue;
    }
    buf += rest[0];
    i += 1;
  }
  flush();
  return out;
}

/** Tek yıldızlı italiğin kapanışını bulur (çift yıldızları atlar). */
function findSingleStar(s: string, from: number): number {
  let i = from;
  while (i < s.length) {
    if (s[i] === "*") {
      if (s[i + 1] === "*") {
        const end = s.indexOf("**", i + 2);
        if (end < 0) return -1;
        i = end + 2;
        continue;
      }
      return s[i - 1] === " " ? -1 : i;
    }
    i += 1;
  }
  return -1;
}

// ---- Bloklar --------------------------------------------------------------------

const HR_RE = /^\s*(-{3,}|\*{3,}|_{3,})\s*$/;
const H_RE = /^(#{1,6})\s+(.*)$/;
const UL_RE = /^\s*[-*+]\s+(.*)$/;
const OL_RE = /^\s*(\d+)\.\s+(.*)$/;

function splitRow(line: string): string[] {
  let l = line.trim();
  if (l.startsWith("|")) l = l.slice(1);
  if (l.endsWith("|")) l = l.slice(0, -1);
  return l.split("|").map((c) => c.trim());
}

const isSep = (line: string) => /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/.test(line);

function startsBlock(line: string) {
  return HR_RE.test(line) || H_RE.test(line) || line.startsWith(">") || line.trim().startsWith("|") || UL_RE.test(line) || OL_RE.test(line) || line.startsWith("```");
}

export function parseMarkdown(src: string): Block[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.startsWith("```")) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.startsWith("```")) body.push(lines[i++]!);
      i++;
      blocks.push({ t: "code", v: body.join("\n") });
      continue;
    }
    if (HR_RE.test(line)) {
      blocks.push({ t: "hr" });
      i++;
      continue;
    }
    const h = H_RE.exec(line);
    if (h) {
      blocks.push({ t: "heading", level: h[1]!.length, c: parseInline(h[2]!.trim()) });
      i++;
      continue;
    }
    if (line.startsWith(">")) {
      const inner: string[] = [];
      while (i < lines.length && lines[i]!.startsWith(">")) inner.push(lines[i++]!.replace(/^>\s?/, ""));
      blocks.push({ t: "quote", blocks: parseMarkdown(inner.join("\n")) });
      continue;
    }
    if (line.trim().startsWith("|")) {
      const rows: string[] = [];
      while (i < lines.length && lines[i]!.trim().startsWith("|")) rows.push(lines[i++]!);
      let head: Inline[][] | null = null;
      let body = rows;
      if (rows.length > 1 && isSep(rows[1]!)) {
        head = splitRow(rows[0]!).map(parseInline);
        body = rows.slice(2);
      }
      blocks.push({ t: "table", head, rows: body.map((r) => splitRow(r).map(parseInline)) });
      continue;
    }
    if (UL_RE.test(line)) {
      const items: Inline[][] = [];
      while (i < lines.length && UL_RE.test(lines[i]!)) items.push(parseInline(UL_RE.exec(lines[i++]!)![1]!));
      blocks.push({ t: "ul", items });
      continue;
    }
    const ol = OL_RE.exec(line);
    if (ol) {
      const items: Inline[][] = [];
      while (i < lines.length && OL_RE.test(lines[i]!)) items.push(parseInline(OL_RE.exec(lines[i++]!)![2]!));
      blocks.push({ t: "ol", items, start: Number(ol[1]) });
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i]!.trim() && !startsBlock(lines[i]!)) para.push(lines[i++]!.trim());
    const c: Inline[] = [];
    para.forEach((p, k) => {
      if (k) c.push({ t: "br" });
      c.push(...parseInline(p));
    });
    blocks.push({ t: "p", c });
  }
  return blocks;
}

// ---- Değer çözümleme ------------------------------------------------------------------

export interface RenderValues {
  values: Record<string, string | null | undefined>;
  required: ReadonlySet<string> | readonly string[];
  /** Eksik zorunlu alan için gösterilecek etiket */
  label?: (name: string) => string;
}

export type FieldState = { kind: "value"; text: string } | { kind: "missing"; name: string; label: string } | { kind: "empty" };

export function resolveField(name: string, r: RenderValues): FieldState {
  const v = r.values[name];
  if (v !== undefined && v !== null && String(v).trim() !== "") return { kind: "value", text: String(v) };
  const req = r.required instanceof Set ? r.required.has(name) : (r.required as readonly string[]).includes(name);
  if (req) return { kind: "missing", name, label: r.label ? r.label(name) : name };
  return { kind: "empty" };
}

function inlineFields(c: Inline[], acc: string[] = []): string[] {
  for (const x of c) {
    if (x.t === "field") acc.push(x.name);
    else if (x.t === "strong" || x.t === "em") inlineFields(x.c, acc);
  }
  return acc;
}

/**
 * Tekrarlı satırlar: tablodaki bir satırın tüm yer tutucuları boşsa ve hiçbiri
 * zorunlu değilse satır çıktıdan çıkarılır (ör. `tasinmaz_2_*`, `demirbas_3_*`).
 */
export function visibleRows(rows: Inline[][][], r: RenderValues): Inline[][][] {
  return rows.filter((row) => {
    const names = row.flatMap((cell) => inlineFields(cell));
    if (!names.length) return true;
    return names.some((n) => resolveField(n, r).kind !== "empty");
  });
}

// ---- Düz metin (özet değeri / SHA-256 için) -----------------------------------------------

function inlineText(c: Inline[], r: RenderValues): string {
  return c
    .map((x) => {
      switch (x.t) {
        case "text":
        case "code":
          return x.v;
        case "strong":
        case "em":
          return inlineText(x.c, r);
        case "br":
          return "\n";
        case "check":
          return x.checked ? "[x]" : "[ ]";
        case "field": {
          const f = resolveField(x.name, r);
          return f.kind === "value" ? f.text : f.kind === "missing" ? `[${f.label}]` : "—";
        }
      }
    })
    .join("");
}

/** Belgenin imzalayana gösterilen içeriğinin kararlı düz metin karşılığı. */
export function renderPlainText(blocks: Block[], r: RenderValues): string {
  const out: string[] = [];
  for (const b of blocks) {
    switch (b.t) {
      case "heading":
      case "p":
        out.push(inlineText(b.c, r));
        break;
      case "ul":
        out.push(b.items.map((it) => `- ${inlineText(it, r)}`).join("\n"));
        break;
      case "ol":
        out.push(b.items.map((it, k) => `${b.start + k}. ${inlineText(it, r)}`).join("\n"));
        break;
      case "quote":
        out.push(renderPlainText(b.blocks, r));
        break;
      case "table": {
        const rows = [...(b.head ? [b.head] : []), ...visibleRows(b.rows, r)];
        out.push(rows.map((row) => row.map((c) => inlineText(c, r)).join(" | ")).join("\n"));
        break;
      }
      case "hr":
        out.push("---");
        break;
      case "code":
        out.push(b.v);
        break;
    }
  }
  return out.join("\n\n").trim();
}

// ---- HTML (kaçışlı) ---------------------------------------------------------------------

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function inlineHtml(c: Inline[], r: RenderValues): string {
  return c
    .map((x) => {
      switch (x.t) {
        case "text":
          return escapeHtml(x.v);
        case "code":
          return `<code>${escapeHtml(x.v)}</code>`;
        case "strong":
          return `<strong>${inlineHtml(x.c, r)}</strong>`;
        case "em":
          return `<em>${inlineHtml(x.c, r)}</em>`;
        case "br":
          return "<br>";
        case "check":
          return x.checked ? "☒" : "☐";
        case "field": {
          const f = resolveField(x.name, r);
          if (f.kind === "value") return `<span class="alan">${escapeHtml(f.text)}</span>`;
          if (f.kind === "missing") return `<mark class="alan-eksik">[${escapeHtml(f.label)}]</mark>`;
          return "—";
        }
      }
    })
    .join("");
}

/** Tüm metinleri kaçışlayarak HTML üretir; değerler asla etiket olarak yorumlanmaz. */
export function renderHtml(blocks: Block[], r: RenderValues): string {
  return blocks
    .map((b) => {
      switch (b.t) {
        case "heading":
          return `<h${b.level}>${inlineHtml(b.c, r)}</h${b.level}>`;
        case "p":
          return `<p>${inlineHtml(b.c, r)}</p>`;
        case "ul":
          return `<ul>${b.items.map((it) => `<li>${inlineHtml(it, r)}</li>`).join("")}</ul>`;
        case "ol":
          return `<ol start="${b.start}">${b.items.map((it) => `<li>${inlineHtml(it, r)}</li>`).join("")}</ol>`;
        case "quote":
          return `<blockquote>${renderHtml(b.blocks, r)}</blockquote>`;
        case "table": {
          const head = b.head ? `<thead><tr>${b.head.map((c) => `<th>${inlineHtml(c, r)}</th>`).join("")}</tr></thead>` : "";
          const rows = visibleRows(b.rows, r)
            .map((row) => `<tr>${row.map((c) => `<td>${inlineHtml(c, r)}</td>`).join("")}</tr>`)
            .join("");
          return `<table>${head}<tbody>${rows}</tbody></table>`;
        }
        case "hr":
          return "<hr>";
        case "code":
          return `<pre>${escapeHtml(b.v)}</pre>`;
      }
    })
    .join("\n");
}
