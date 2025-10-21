import React, { useEffect, useState, useMemo } from "react";
import BlogCard from "../components/BlogCard";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import { Plus } from "lucide-react";
import ShowDeletedToggle from "../components/ShowDeleted";
import { useAuth } from "@clerk/clerk-react";
import LatestBlogCard from "../components/LatestBlogCard";
import { Hourglass } from "ldrs/react";
import 'ldrs/react/Hourglass.css'

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    fetchPostById,
    fetchPosts,
    createPost,
    patchStatus,
    softDeletePost,
    restorePost,
    permanentDeletePost,
} from "./postsApi";

export default function AdminBlogPage() {

    const { getToken } = useAuth();
    const BACKEND_BASE_URL = import.meta.env.VITE_FASTAPI_BASE_URL || "http://localhost:8000";
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [showDeleted, setShowDeleted] = useState(false);
    const [loadingIds, setLoadingIds] = useState(new Set);
    const [deletingIds, setDeletingIds] = useState(new Set());

    const setLoading = (id, val) => 
        setLoadingIds((prev) => {
            const next = new Set(prev);
            if (val) next.add(id);
            else next.delete(id);
            return next;
    });

    const setDeleting = (id, val) =>
        setDeletingIds((prev) => {
        const next = new Set(prev);
        if (val) next.add(id);
        else next.delete(id);
        return next;
    });

    //Fetching posts
    const {data: posts=[], isLoading: isPostsLoading, isError:isPostsError, error:postsError} = useQuery({
        queryKey:["posts", { showDeleted }],
        queryFn: async () => fetchPosts({ getToken, backendUrl: BACKEND_BASE_URL, limit:20, skip:0, showDeleted }),
        staleTime: 1000 * 30,
        gcTime: 1000 * 60 * 10,
    });

    if(isPostsError){
        console.error("Error fetching posts", postsError);
        alert("Error fetching posts: " + (postsError.message || postsError));
    }

    const visiblePosts = useMemo(() => posts.filter((p) => (showDeleted ? true : !p.is_deleted)), [posts, showDeleted]);
    const deletedCount = useMemo(() => posts.filter((p) => p.is_deleted).length, [posts]);
    const latestPost = visiblePosts.length > 0 ? visiblePosts[0] : null;
    const olderPosts = visiblePosts.length > 1 ? visiblePosts.slice(1) : [];

    // 1. Create Posts (btn click) -> navigate to editor page (onSuccess)
    const {mutate: createNew, isLoading:isCreateNewLoading} = useMutation({
        mutationFn: () => createPost({ getToken, backendUrl:BACKEND_BASE_URL }),
        onSuccess: (data) => {
            const postId = data?.id || data?.post_id;
            queryClient.invalidateQueries(["posts"]);
            if (postId) navigate(`/admin/publish/${postId}`)
        },
        onError: (err) => {
            console.error("Create post failed:", err);
            alert("Error creating new post: " + (err.message || err));
        }
    });

    // 2. Toggle Status (optimistic)
    // for optimistic 3 steps: onMutate, onError, onSetteled
    // onMutate 4 steps: stop in-flight, get previous, set new cache, return the previous
    // onError 2 steps: log error, roll-back changes with previous
    // onSetteled 1 step: invalidate cache
    const {mutate: toggleStatusMutation} = useMutation({
        mutationFn: ({ id, newStatus }) => patchStatus({getToken, backendUrl:BACKEND_BASE_URL, id, status:newStatus}),
        onMutate: async ({ id, newStatus }) => {
            await queryClient.cancelQueries(["posts", { showDeleted }]);
            const previous = queryClient.getQueryData(["posts", { showDeleted }]);

            queryClient.setQueryData(["posts", { showDeleted }], (oldPosts = []) =>
                oldPosts.map((p) => (p.id === id ? {...p, status: newStatus} : p))
            );

            setLoading(id, true);
            return {previous, id};
        },
        onError: (err, variables, context) => {
            console.error("Toggle status failed:", err);
            alert("Failed to toggle status: " + (err.message || err));
            queryClient.setQueryData(["posts", { showDeleted }], context.previous);
        },
        onSettled: (data, err, variables, context) => {
            setLoading(context?.id, false);
            queryClient.invalidateQueries(["posts", { showDeleted }]);
        },
    });

    // 3. Soft Delete (Optimistic)
    const { mutate: softDeleteMutation } = useMutation({
        mutationFn: ({ id }) => softDeletePost({getToken, backendUrl:BACKEND_BASE_URL, id}),
        onMutate: async ({ id }) => {
            await queryClient.cancelQueries(["posts", { showDeleted }]);
            const previous = queryClient.getQueryData(["posts", { showDeleted }]);
            queryClient.setQueryData(["posts", { showDeleted }], (old = []) => 
                old.map((p) => (p.id === id) ? {...p, is_deleted: true} : p));
            setLoading(id, true);
            return {previous, id};
        },
        onError: (err, variables, context) => {
            console.error("Soft delete failed:", err);
            alert("Failed to soft delete: " + (err.message || err));
            queryClient.setQueryData(["posts", { showDeleted }], context.previous);
        },
        onSettled: (data, err, variables, context) => {
            setLoading(context?.id, false);
            queryClient.invalidateQueries(["posts", { showDeleted }]);
        }
    });

    // 4. Restore (optimistic)
    const { mutate: restoreMutation } = useMutation({
        mutationFn: ({ id }) => restorePost({ getToken, backendUrl:BACKEND_BASE_URL, id }),
        onMutate: async ({ id }) => {
            await queryClient.cancelQueries(["posts", { showDeleted }]);
            const previous = queryClient.getQueryData(["posts", { showDeleted }]);
            queryClient.setQueryData(["posts", { showDeleted }], (old = []) => 
                old.map((p) => (p.id === id ? { ...p, is_deleted: false } : p)));
            setLoading(id, true);
            return { previous, id };
        },
        onError: (err, variables, context) => {
            console.error("Restore failed:", err);
            alert("Failed to restore: " + (err.message || err));
            queryClient.setQueryData(["posts", { showDeleted }], context.previous);
        },
        onSettled: (data, err, variables, context) => {
            setLoading(context?.id, false);
            queryClient.invalidateQueries(["posts", { showDeleted }]);
        },
    });

    // 5. Permanent Delete
    const { mutate: permaDeleteMutation } = useMutation({
        mutationFn: ({ id }) => permanentDeletePost({ getToken, backendUrl:BACKEND_BASE_URL, id}),
        onMutate: ({ id }) => {
            setDeleting(id, true);
        },
        onSuccess: (_, { id }) => {
            queryClient.setQueryData(["posts", { showDeleted }], (old = []) => 
                old.filter((p) => p.id !== id));
        },
        onError: (err, variables) => {
            console.error("Permanent delete failed:", err);
            alert("Failed to permanently delete post: " + (err.message || err));
        },
        onSettled: (_, __, context) => {
            setDeleting(context?.id, false);
            queryClient.invalidateQueries(["posts", { showDeleted }]);
        },
    });

    // Prefetch and cache before action
    const prefetchPost = (id) => {
        queryClient.prefetchQuery({
            queryKey: ["post", id],
            queryFn: () => fetchPostById({ getToken, backendUrl: BACKEND_BASE_URL, id }),
            staleTime: 1000 * 60 * 5,
        });
    };

    // Handler for Mutations
    function toggleStatus(id) {
        const post = posts.find((p) => p.id === id);
        if (!post) return;
        const newStatus = post.status === "published" ? "draft" : "published";
        toggleStatusMutation({ id, newStatus });
    }

    function softDelete(id) {
        softDeleteMutation({ id });
    }

    function restore(id) {
        restoreMutation({ id });
    }

    function permanentDelete(id) {
        const ok = window.confirm("This will permanently delete the post. Click ok to continue");
        if (!ok) return;
        permaDeleteMutation({ id });
    }

    function openPost(post) {
        const slug = post.slug
        navigate(`/article/${slug}`, { state: {postId: post.id}});
    }

    function handleEdit(id) {
        prefetchPost(id);
        navigate(`/admin/publish/${id}`);
    }

    return (
        <div className="min-h-screen bg-black/95 text-gray-300">
            <Navbar />

            <div className="max-w-6xl mx-auto p-6 flex flex-col gap-6">
            <header className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Admin-Dashboard</h1>
                <div className="flex gap-3">
                <Button
                    onClick={createNew}
                    loading={isCreateNewLoading}
                    variant="outline"
                    icon={Plus}
                >
                    New Post
                </Button>

                <ShowDeletedToggle
                    showDeleted={showDeleted}
                    setShowDeleted={setShowDeleted}
                    deletedCount={deletedCount}
                />
                </div>
            </header>

            {isPostsLoading ? (
                <>
                    <Hourglass size="60" bgOpacity="0.1" speed="1.4" color="#da7756" />
                    <p className="text-gray-300 text-sm tracking-wide">Loading Posts</p>
                </>
            ) : visiblePosts.length === 0 ? (
                <div className="text-center text-gray-500 py-12">No posts yet. Create one.</div>
            ) : (
                <>
                {latestPost && (
                    <section className="flex flex-col gap-4">
                    {latestPost.is_deleted ? (
                        <div className="bg-neutral-800/60 border border-neutral-700/60 rounded-md p-4 flex items-center justify-between shadow-md hover:shadow-lg hover:bg-neutral-800/80 transition-all duration-200">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-200 text-base">
                                {latestPost.title}
                            </h3>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-400/30 uppercase tracking-wide">
                                Deleted
                            </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                            {new Date(latestPost.date).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                            })}
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <button
                            onClick={() => restore(latestPost.id)}
                            disabled={loadingIds.has(latestPost.id)}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                                loadingIds.has(latestPost.id)
                                ? "bg-neutral-700 text-gray-400 cursor-not-allowed"
                                : "bg-green-600/20 text-green-400 hover:bg-green-600/30 hover:text-green-300"
                            }`}
                            >
                            {loadingIds.has(latestPost.id) ? "Restoring…" : "Restore"}
                            </button>

                            <button
                            onClick={() => permanentDelete(latestPost.id)}
                            disabled={deletingIds.has(latestPost.id)}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                                deletingIds.has(latestPost.id)
                                ? "bg-neutral-700 text-gray-400 cursor-not-allowed"
                                : "bg-red-600/20 text-red-400 hover:bg-red-600/30 hover:text-red-300"
                            }`}
                            >
                            {deletingIds.has(latestPost.id) ? "Deleting…" : "Delete Permanently"}
                            </button>
                        </div>
                        </div>
                    ) : (
                        <LatestBlogCard
                        post={latestPost}
                        onOpen={() => openPost(latestPost)}
                        onToggleStatus={() => toggleStatus(latestPost.id)}
                        onDelete={() => softDelete(latestPost.id)}
                        onEdit={() => handleEdit(latestPost.id)}
                        />
                    )}
                    </section>
                )}

                <section className="flex flex-col gap-4 mt-6">
                    {olderPosts.map((post) =>
                    post.is_deleted ? (
                        <div
                        key={post.id}
                        className="bg-neutral-800/60 border border-neutral-700/60 rounded-md p-4 flex items-center justify-between shadow-md hover:shadow-lg hover:bg-neutral-800/80 transition-all duration-200"
                        >
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-200 text-base">
                                {post.title}
                            </h3>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-400/30 uppercase tracking-wide">
                                Deleted
                            </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                            {new Date(post.date).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                            })}
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <button
                            onClick={() => restore(post.id)}
                            disabled={loadingIds.has(post.id)}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                                loadingIds.has(post.id)
                                ? "bg-neutral-700 text-gray-400 cursor-not-allowed"
                                : "bg-green-600/20 text-green-400 hover:bg-green-600/30 hover:text-green-300"
                            }`}
                            >
                            {loadingIds.has(post.id) ? "Restoring…" : "Restore"}
                            </button>

                            <button
                            onClick={() => permanentDelete(post.id)}
                            disabled={deletingIds.has(post.id)}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                                deletingIds.has(post.id)
                                ? "bg-neutral-700 text-gray-400 cursor-not-allowed"
                                : "bg-red-600/20 text-red-400 hover:bg-red-600/30 hover:text-red-300"
                            }`}
                            >
                            {deletingIds.has(post.id) ? "Deleting…" : "Delete Permanently"}
                            </button>
                        </div>
                        </div>
                    ) : (
                        <BlogCard
                        key={post.id}
                        post={post}
                        onOpen={() => openPost(post)}
                        onToggleStatus={() => toggleStatus(post.id)}
                        onDelete={() => softDelete(post.id)}
                        onEdit={() => handleEdit(post.id)}
                        />
                    )
                    )}
                </section>
                </>
            )}
            </div>
        </div>
    );
}