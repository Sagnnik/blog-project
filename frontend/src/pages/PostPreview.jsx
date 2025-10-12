import React, { useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom';

export default function PostPreview() {
  const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN;
  const BACKEND_BASE_URL = import.meta.env.FASTAPI_BASE_URL || "http://localhost:8000";
  const {slug} = useParams();
  const location = useLocation();

  const [html, setHtml] = useState(null);
  const [loading, setLoading] = useState(false);        
  const [err, setErr] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function fetchHtml() {
      if (!slug) {
        if (mounted) setErr("Missing slug");
        return
      }
      setLoading(true);
      setErr(null);

      try {
        const url = `${BACKEND_BASE_URL.replace(/\/$/, "")}/api/assets/html/${encodeURIComponent(slug)}`;
        const res = await fetch (url, {
          method:"GET",
          headers: {"Accept": "application/json"}
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`Failed to fetch HTML: ${res.status} ${text}`);
        }

        const data = await res.json();

        let baseHref = BACKEND_BASE_URL + "/";
        if (data.metadata && data.metadata.public_link) {
          try {
            const u = new URL(data.metadata.public_link, BACKEND_BASE_URL);
            u.pathname = u.pathname.replace(/\/[^/]*$/, "/"); 
            baseHref = u.href;
          } catch {
            baseHref = BACKEND_BASE_URL + "/";
          }
        }

        const returnedHtml = data.html || "";
        const htmlWithBase = `<base href="${baseHref}">${returnedHtml}`;
        if (mounted) setHtml(htmlWithBase);
      }
      catch (error) {
        console.error("fetchHtml error:", error);
        if (mounted) setErr(error.message || "Unknown error");
      } 
      finally {
        if (mounted) setLoading(false);
      } 
    }
    fetchHtml();
    return () => {
      mounted = false;
    };
  }, [slug, BACKEND_BASE_URL, ADMIN_TOKEN]);

  if (loading) {
    return <div className="blog-loading">Loading preview…</div>;
  }

  if (err) {
    return <div className="blog-error">Error: {err}</div>;
  }

  return (
    <div
        className="blog-content"
        dangerouslySetInnerHTML={{ __html: html || "<p>No content</p>" }}
      />
  );
}
