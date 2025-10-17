import React, { useEffect, useState } from "react";
import BlogCard from "../components/BlogCard";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import { Plus } from "lucide-react";
import ShowDeletedToggle from "../components/ShowDeleted";

export default function AdminBlogPage() {

    const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN;
    const BACKEND_BASE_URL = import.meta.env.FASTAPI_BASE_URL;

    const navigate = useNavigate();
    const [posts, setPosts] = useState([]);
    const [isCreating, setIsCreating] = useState(false);
    const [isLoading, setisLoading] = useState(false);
    const [loadingIds, setLoadingIds] = useState(new Set);

    const [nextId, setNextId] = useState(3);
    const [showDeleted, setShowDeleted] = useState(false);
    const [deletingIds, setDeletingIds] = useState(new Set());

    useEffect(() => {
        async function fetchPost() {
            try {
                setisLoading(true);
                let limit = 50;
                let skip = 0;
                const res = await fetch (`http://localhost:8000/api/posts?limit=${limit}&${skip}`, {
                    headers: {"Authorization": `Bearer ${ADMIN_TOKEN}`}
                });
                if (!res.ok) {
                    const txt = await res.text()
                    throw new Error(`Post Loding Error: ${res.status} ${txt}`)
                }
                const data = await res.json();
                setPosts(data);
            }
            catch(err) {
                console.error("Error Fetching posts: ", err);
                alert("Error fetching posts: " + (err.message || err))
                throw err
            }
            finally{
                setisLoading(false);
            }   
        }
        fetchPost();
    }, [])

    async function createNew() {
        try {
            setIsCreating(true);
            const res = await fetch ("http://localhost:8000/api/posts", {
                method:"POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${ADMIN_TOKEN}` 
                }
            });

            if(!res.ok) {
                const txt = await res.text()
                throw new Error(`Create Post Failed: ${res.status} ${txt}`)
            }
            
            const data = await res.json()
            const postId = data.id || data.post_id;
            
            navigate(`/admin/publish/${postId}`);
        }
        catch(err) {
            console.error("Create-New Error:", err);
            alert("Error Creating New post: " + (err.message || err))
            throw err;
        }
        finally {
            setIsCreating(false);
        }
    }

    // need to copy the ids and save in another state and revert if the Operation fails
    function setLoading(id, isLoading) {
        setLoadingIds(prev => {
            const copy = new Set(prev);
            if (isLoading) copy.add(id);
            else copy.delete(id);
            return copy;
        });
    }

    async function toggleStatus(id) {
        const prevPost = posts.find(p => p.id === id);
        if(!prevPost) return;

        const newStatus = prevPost.status === "published"? "draft" : "published";

        setPosts(prev => prev.map(p => p.id === id? { ...p, status: newStatus}: p));
        setLoading(id, true);
        //encodeURIComponent for any string term
        try {
            const res = await fetch(`http://localhost:8000/api/posts/${id}/status?status=${encodeURIComponent(newStatus)}`, {
                method: "PATCH",
                headers: {
                    "Authorization": `Bearer ${ADMIN_TOKEN}`,
                    "Content-Type": "application/json"
                }
            });

            if(!res.ok) {
                const txt = await res.text()
                throw new Error(`Error Toggling Status: ${res.status} {txt}` )
            }
        }
        catch(err) {
            console.error("togglestatus error: ", err);
            alert("Failed to toggle status: ", (err.message || err));

            setPosts(prev => prev.map ( p => p.id === id? {...p, status: prevPost.status} : p));
        }
        finally{
            setLoading(id, false)
        }  
    }

    async function softDelete(id) {
        const prevPost = posts.find(p => p.id === id);
        if (!prevPost) return;

        setPosts(prev => prev.map( p => p.id === id? {...p, is_deleted: true} : p));
        setLoading(id, true);

        try{
            const res = await fetch (`http://localhost:8000/api/posts/${id}/delete`, {
                method: "PATCH",
                headers: {
                    "Authorization": `Bearer ${ADMIN_TOKEN}`,
                    "Content-Type": "application/json"
                }  
            });

            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`Soft-delete failed: ${res.status} ${txt}`);
            }
        }
        catch (err) {
            console.error("softDelete Failed: ", err);
            alert("Failed to soft delete: ", (err.message || err))

            setPosts(prev => prev.map(p => p.id === id? {...p, is_deleted:false} : p));
        }
        finally{
            setLoading(id, false);
        }
    }

    async function restore(id) {
        const prevPost = posts.find( p => p.id === id);
        if(!prevPost) return;

        setPosts(prev => prev.map( p => p.id === id? {...p, is_deleted:false } : p));
        setLoading(id, true)

        try {
            const res = await fetch (`http://localhost:8000/api/posts/${id}/restore`, {
                method:"PATCH",
                headers: {
                    "Authorization": `Bearer ${ADMIN_TOKEN}`,
                    "Content-Type": "application/json"
                }
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Restore failed: ${res.status} ${text}`);
            }
        }
        catch(err) {
            console.error("restore error:", err);
            alert("Failed to restore post: " + (err.message || err));

            setPosts(prev => prev.map ( p => p.id === id ? { ...p, is_deleted: true} : p));
        }
        finally{
            setLoading(id, false);
        }
    }

    const setDeleting = (id, val) => {
        setDeletingIds(prev => {
            const next = new Set(prev)
            if (val) next.add(id)
            else next.delete(id)
            return next
        })
    }

    async function permanentDelete(id) {
        const ok = window.confirm("This will permanently delete the post. This action cannot be undone. Proceed?")
        if (!ok) return
        try {
            setDeleting(id, true)
            const res = await fetch(`http://localhost:8000/api/posts/${encodeURIComponent(id)}/delete`, {
                method: "DELETE",
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${ADMIN_TOKEN}`
                },
            });
            if (!res.ok) {
                const err = await res.json().catch(() => null)
                throw new Error(err?.detail || `Failed to delete (status ${res.status})`)
            }
            setPosts(prev => prev.filter(p => p.id !== id))
        }
        catch (error) {
            console.error("Permanent delete failed:", error)
            alert(error.message || "Failed to permanently delete post.")
        } 
        finally {
            setDeleting(id, false)
        }
    }

    function openPost(post) {
        const slug = post.slug
        navigate(`/article/${slug}`, { state: {postId: post.id}});
    }



    const visiblePosts = posts.filter(p => (showDeleted? true: !p.is_deleted))
    const deletedCount = posts.filter(p => p.is_deleted).length

    return (
    <div className="min-h-screen bg-black/95 text-gray-300">
        <Navbar />
        <main className="max-w-6xl mx-auto p-6 flex flex-col gap-6">
            <header className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Admin-Dashboard</h1>
                <div className="flex gap-3">
                    <Button
                    onClick={createNew}
                    loading={isCreating}
                    variant="outline"
                    icon={Plus}
                    >
                        New Post
                    </Button>

                    <ShowDeletedToggle
                        showDeleted={showDeleted}
                        setShowDeleted={setShowDeleted}
                        deletedCount={deletedCount}/>

                </div>
            </header>

            <section className="flex flex-col gap-4">
                {visiblePosts.length === 0 && (
                    <div className="text-center text-gray-500 py-12">
                        No Posts yet. Create one.
                    </div>
                )}

                {visiblePosts.map((post) => (
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
                            {deletingIds.has(post.id)
                                ? "Deleting…"
                                : "Delete Permanently"}
                            </button>
                        </div>
                        </div>
                    ) : (
                        <BlogCard
                        key={post.id}
                        post={post}
                        onOpen={() => openPost(post)}
                        onToggleStatus={toggleStatus}
                        onDelete={softDelete}
                        onEdit={(id) => navigate(`/admin/publish/${id}`)}
                        />
                    )
                    ))}
            </section>
        </main>
    </div>
);
}