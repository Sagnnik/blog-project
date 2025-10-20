import React, { useEffect, useMemo, useState } from "react";
import PublicBlogCard from "../components/PublicBlogCard";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import { Plus } from "lucide-react";
import Navbar from '../components/Navbar'
import PublicLatestBlogCard from "../components/PublicLatestBlogCard";
import { Hourglass } from "ldrs/react";
import 'ldrs/react/Hourglass.css'
import { useInfiniteQuery } from '@tanstack/react-query';
import { Pulsar } from 'ldrs/react'
import 'ldrs/react/Pulsar.css'
import { useInView } from 'react-intersection-observer'


const BACKEND_BASE_URL = import.meta.env.FASTAPI_BASE_URL || 'http://localhost:8000';

export default function PublicBlogPage() {
  const navigate = useNavigate();
  const limit = 10;

  const fetchPostsPage = async ({pageParam = 0, signal}) => {
    const url = `${BACKEND_BASE_URL}/api/public/posts?limit=${limit}&skip=${pageParam}`;

    const res = await fetch(url, {
      method:"GET",
      signal,
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Posts Loading error: ${txt}`);
    }
    return res.json();
  };

  const { data, isLoading, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage, refetch} = useInfiniteQuery({
    queryKey: ["publicPosts"],
    queryFn: fetchPostsPage,
    getNextPageParam: (lastPage, allPages) => {
      if(!Array.isArray(lastPage)) return undefined;
      if(lastPage.length === limit) {
        return allPages.length * limit;
      }
      return undefined;
    },
    staleTime: 1000 * 60 * 1
  });

  const { ref: loadMoreRef, inView } = useInView();
  useEffect(() => {
    if(inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, inView, hasNextPage, isFetchingNextPage]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black/95 text-gray-300">
        <Navbar />
        <div className="max-w-6xl mx-auto p-6 flex flex-col gap-7 mt-5">
          <section className="flex flex-col gap-4">
            <div className="flex flex-col items-center justify-center py-16 gap-4 mt-60">
              <Hourglass size="60" bgOpacity="0.1" speed="1.4" color="#da7756" />
              <p className="text-gray-300 text-sm tracking-wide">Loading Posts</p>
            </div>
          </section>
        </div>
      </div>

    );
  }

  if (isError) {
    console.error("Error fetching posts:", error);
    const err_msg = error instanceof Error ? error.message : str(error);
    return (
      <div className="min-h-screen bg-black/95 text-gray-300">
        <Navbar />
        <div className="max-w-6xl mx-auto p-6 flex flex-col gap-7 mt-5">
          <div className="blog-error">Error fetching posts: {msg}</div>
          <div>
            <Button onClick={() => refetch()} variant="primary">Retry</Button>
          </div>
        </div>
      </div>
    );
  }

  function onOpen(post) {
    const slug = post.slug
    navigate(`/article/${slug}`, { state: {postId: post.id}});
  }

  const allPosts = data?.pages?.flat() || [];
  const latestPost = allPosts.length > 0 ? allPosts[0] : null;
  const olderPosts = allPosts.slice(1);

  return (
    <div className="min-h-screen bg-black/95 text-gray-300">
      <Navbar />
      <div className="max-w-6xl mx-auto p-6 flex flex-col gap-7 mt-5">
        <section className="flex flex-col gap-4">
          {allPosts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Pulsar size="70" speed="1.75" color="#da7756" />
              <p className="text-gray-300 text-sm tracking-wide">No posts yet</p>
            </div>
          )}
          {latestPost && (
            <section className="flex flex-col gap-4">
              <PublicLatestBlogCard 
              post={latestPost}
              onOpen={() => onOpen(latestPost)}/>
            </section>
          )}
          <section className="flex flex-col gap-4 mt-6">
            {olderPosts.map((post) =>
            <PublicBlogCard
            key={post.id}
            post={post}
            onOpen={() => onOpen(post)} />
            )}
          </section>
          
          <div className="flex flex-col items-center gap-3 mt-6">
            {isFetchingNextPage? (
              <div>
                <Hourglass size="40" bgOpacity="0.1" speed="1.2" color="#da7756" />
                <p className="text-sm text-gray-300">Loading more…</p>
              </div>
            ): hasNextPage? (
              <>
                <div ref={loadMoreRef} />
                <Button onClick={() => fetchNextPage()} variant="primary">Load More</Button>
              </>
              
            ): (
              <p className="text-sm text-gray-400">No more posts</p>
            )}
          </div>
        </section>
      </div >
    </div>
  )
}
