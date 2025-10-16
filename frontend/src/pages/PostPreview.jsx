import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function PostPreview() {
  const NPX_SERVER_URL = import.meta.env.VITE_NPX_SERVER_URL || "http://localhost:8001";
  const { slug } = useParams();

  const [html, setHtml] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let mounted = true;
    if (!slug) {
      setErr("Missing slug");
      return;
    }

    async function fetchFromNpx() {
      setLoading(true);
      setErr(null);

      const filename = `${encodeURIComponent(slug)}-post.html`;
      const npxUrl = `${NPX_SERVER_URL.replace(/\/$/, "")}/html/${filename}`;

      try {
        const res = await fetch(npxUrl, {
          method: "GET",
          headers: { Accept: "text/html" },
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`NPX fetch failed: ${res.status} ${text}`);
        }

        const returnedHtml = await res.text();
        const baseHref = `${NPX_SERVER_URL.replace(/\/$/, "")}/html/`;
        const htmlWithBase = `<base href="${baseHref}">${returnedHtml}`;

        if (mounted) setHtml(htmlWithBase);
      } catch (error) {
        console.error("Error fetching HTML from NPX server:", error);
        if (mounted) setErr(error.message || "Failed to load post");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchFromNpx();

    return () => {
      mounted = false;
    };
  }, [slug, NPX_SERVER_URL]);

  if (loading) return <div className="blog-loading">Loading preview…</div>;
  if (err) return <div className="blog-error">Error: {err}</div>;

  return (
    <div
      className="blog-content"
      dangerouslySetInnerHTML={{ __html: html || "<p>No content</p>" }}
    />
  );
}
