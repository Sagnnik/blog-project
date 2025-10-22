import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from '@tanstack/react-query'
import { Hourglass } from "ldrs/react";
import 'ldrs/react/Hourglass.css'

const NPX_SERVER_URL = import.meta.env.VITE_NPX_SERVER_URL || "http://localhost:8001";

export default function PostPreview() {

  const { slug } = useParams();

  const fetchPostNpx = async ({ signal }) => {
    if (!slug) throw new error("Missing Slug");

    const filename = `${encodeURIComponent(slug)}-post.html`;
    const npxUrl = `${NPX_SERVER_URL.replace(/\/$/, "")}/html/${filename}`;

    const res = await fetch(npxUrl, {
      method:"GET",
      headers: { Accept: "text/html"},
      signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`NPX fetch failed: ${res.status} ${text}`);
    }

    const returnedHtml = await res.text();
    const baseHref = `${NPX_SERVER_URL.replace(/\/$/, "")}/html/`;
    return `<base href="${baseHref}">${returnedHtml}`;
  };

  const {
    data: html,
    isLoading,
    isError,
    error
  } = useQuery({
    queryKey: ["publicPosts", slug],
    queryFn: fetchPostNpx,
    enabled: !!slug, // dont run util slug exists
    staleTime: 0,
    gcTime: 1000 * 60,
    refetchOnMount: "always",
    refetchOnWindowFocus: false
  })
  

  if (isLoading) return(
    <div className="flex flex-col items-center gap-3 mt-50">
      <Hourglass size="60" bgOpacity="0.1" speed="1.4" color="#da7756" />
      <p className="text-black text-sm tracking-wide">Loading Post...</p>
    </div>
  );
  if (isError) {
    const msg = error instanceof Error ? error.message : String(error);
    return <div className="blog-error">Error: {msg}</div>;
  }

  return (
    <div
      className="blog-content"
      dangerouslySetInnerHTML={{ __html: html || "<p>No content</p>" }}
    />
  );
}
