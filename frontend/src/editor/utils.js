// Helpers for Editor

// ----------- REGEX -----------
// g -> all occurances
// + -> one or more
// \s -> all whitespace 
// \w -> all alphanumeric characters
// ^ -> negates the selection
// $ -> end of the string
// /-+$/ --> removes trailing '-'

export function slugify(s = "") {
    return s
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/g, "")
    .replace(/-+$/, ""); 
}

export function buildFullHtml (titleInner, body, summaryInner) {
    const esc = (str = "") =>
        String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

    const t = esc(titleInner || "Preview");
    const s = esc(summaryInner || "");

    return `<!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${t}</title>
        <meta name="description" content="${s}" />
        <style>
          body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; padding: 28px; }
          pre { background:#06203a; color:#e6f0ff; padding:12px; border-radius:8px; overflow:auto; }
        </style>
      </head>
      <body>
        <article>
          <h1>${t}</h1>
          <section class="summary"><p>${s}</p></section>
          <section class="content">
            ${body}
          </section>
        </article>
      </body>
      </html>`;
}

export function parseTags(t = "") {
    return t
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
}
