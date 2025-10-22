// Helpers for Editor
const BASE = import.meta.env.VITE_FASTAPI_BASE_URL || "http://localhost:8000";

export async function authFetch(getToken, url, options = {}) {
    const token = await getToken();
    const providedHeaders = options.headers || {};

    const headers = {
        ...providedHeaders,
        Authorization: `Bearer ${token}`,
    };

    const hasContentType = Object.keys(headers).some(
        (k) => k.toLowerCase() === "content-type"
    );

    if (!hasContentType && !(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }

    const res = await fetch(url, { ...options, headers });
    return res;
}

export async function fetchPost({ getToken, postId, signal }) {
    if (!postId) throw new Error("postId is required");
    const url = `${BASE}/api/posts/${postId}`;
    const res = await authFetch(getToken, url, { signal });
    if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Fetch post failed: ${res.status} ${txt || ""}`);
    }
    return res.json();
}

export async function updatePost({ getToken, postId, payload }) {
    if (!postId) throw new Error("postId is required");
    const url = `${BASE}/api/posts/${postId}`;
    const res = await authFetch(getToken, url, {
        method: "PATCH",
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Save failed: ${res.status} ${txt || ""}`);
    }
    return res.json();
}

export async function uploadAsset({ getToken, formData, endpoint }) {
    if (!formData) throw new Error("formData is required");
    const url = endpoint;
    const res = await authFetch(getToken, url, {
        method: "POST",
        body: formData,
    });
    if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Upload failed: ${res.status} ${txt || ""}`);
    }
    return res.json();
}

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

export function buildFullHtml(
  titleInner,
  body,
  coverImageUrl = "",
  coverImageCaption = "",
  options = {},
  creationDate = ""
) {
  // options:
  //  - hMargin: e.g. "12px" (horizontal margin for cover image)
  //  - bgOpacity: 0.95 (number between 0.0 - 1.0)
  //  - titleWeight: "700"

  const esc = (str = "") =>
    String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  const t = esc(titleInner || "Preview");
  const caption = esc(coverImageCaption || "");
  const dateDisplay = esc(creationDate || "Date will be added here");
  const hMargin = options.hMargin || "12px";
  const bgOpacity =
    typeof options.bgOpacity === "number"
      ? options.bgOpacity
      : parseFloat(options.bgOpacity || "0.95");
  const titleWeight = options.titleWeight || "700";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${t}</title>

  <!-- Google Fonts -->
  <link href="https://fonts.googleapis.com/css2?family=BBH+Sans+Hegarty:wght@400;700&family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">

  <style>
    :root{
      --page-bg: rgba(0, 0, 0, 0.95);
      --link-color: #da7756;
      --muted-color: #9fb0c8;
      --text-color: #ffffff;
      --page-padding: 28px;
      --h-margin: ${hMargin};
      --content-max-width: 1000px;
    }
    
    html {
      background-color: #1a1a1a;
    }

    html, body {
      height: 100%;
      margin: 0;
      padding: 0;
      background: var(--page-bg);
      color: var(--text-color);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }

    .page {
      box-sizing: border-box;
      min-height: 100%;
      padding: var(--page-padding);
      display: flex;
      justify-content: center;
    }

    .reader {
      width: 100%;
      max-width: var(--content-max-width);
      margin: 0 auto;
    }

    h1 {
      margin: 0 0 6px 0;
      font-family: "BBH Sans Hegarty", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-weight: ${titleWeight};
      letter-spacing: -0.01em;
      font-size: clamp(22px, 3.2vw, 36px);
      color: var(--text-color);
      text-align: center;
    }

    .creation-date {
      text-align: center;
      font-family: "Roboto", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 0.9rem;
      color: var(--muted-color);
      margin-bottom: 18px;
      letter-spacing: 0.02em;
    }

    h2, h3, h4, h5, h6 {
      font-family: "Roboto", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-weight: 500;
      margin-top: 1.2em;
      margin-bottom: 0.5em;
      text-align: center;
      color: var(--text-color);
    }

    .content {
      margin-top: 18px;
      line-height: 1.6;
      color: var(--text-color);
      text-align: justify;
    }

    .content a, a {
      color: var(--link-color);
      text-decoration: underline;
    }

    .cover-wrapper {
      margin: 12px auto;
      padding-left: var(--h-margin);
      padding-right: var(--h-margin);
      text-align: center;
    }

    .cover {
      display: block;
      width: calc(100% - (var(--h-margin) * 2));
      max-height: 60vh;
      height: auto;
      margin: 0 auto;
      border-radius: 8px;
      object-fit: cover;
      box-shadow: 0 6px 18px rgba(0,0,0,0.6);
    }

    .caption {
      margin-top: 6px;
      color: var(--muted-color);
      font-size: 0.9rem;
      font-style: italic;
      text-align: center;
    }

    pre code,
    pre {
      background-color: #000a1a;
      color: #e6f0ff;
      padding: 8px;
      border-radius: 8px;
      display: block;
      overflow-x: auto;
      line-height: 1.5;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", "Fira Code", monospace;
      margin-top: 0
    }

    pre[class*="language-"] {
      background: #111213;
      color: #e6f0ff;
      border-radius: 8px;
      padding: 8px;
    }

    .content img {
      max-width: 100%;
      height: auto;
      border-radius: 6px;
      display: block;
      margin: 12px auto;
    }

    .meta {
      color: var(--muted-color);
      font-size: 0.9rem;
      margin-bottom: 6px;
      text-align: center;
    }

    blockquote {
      border-left: 4px solid rgba(255,255,255,0.06);
      margin: 0 0 1em 0;
      padding-left: 12px;
      color: var(--muted-color);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      background-color: rgba(255, 255, 255, 0.13);
      border: 1px solid rgba(218, 119, 86, 0.4);
      border-radius: 8px;
      overflow: hidden;
    }

    th, td {
      padding: 12px 16px;
      text-align: left;
      color: #ffffff;
      border-bottom: 1px solid rgba(218, 119, 86, 0.25);
    }

    th {
      background-color: rgba(218, 119, 86, 0.15);
      color: #da7756;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    tr:hover {
      background-color: rgba(218, 119, 86, 0.1);
      transition: background-color 0.2s ease-in-out;
    }

    caption {
      caption-side: bottom;
      padding: 8px;
      color: #da7756;
      font-style: italic;
      font-size: 0.9rem;
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="reader">
      <article>
        <h1>${t}</h1>
        <div class="creation-date">${dateDisplay}</div>

        ${coverImageUrl ? `
          <div class="cover-wrapper">
            <img class="cover" src="${coverImageUrl}" alt="${t} — cover image">
            ${caption ? `<div class="caption">${caption}</div>` : ""}
          </div>
        ` : ``}

        <hr style="border: none; border-top: 1px solid gray; margin: 10px 0;">

        <section class="content">
          ${body}
        </section>
      </article>
    </div>
  </div>
</body>
</html>`;
}



export function parseTags(t = "") {
    return t
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
}
