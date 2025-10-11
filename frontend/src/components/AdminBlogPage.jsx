import React, { useState } from "react";
import BlogCard from "./BlogCard";
import Navbar from "./Navbar";
import PublishHtml from "../editor/PublishHtml";
import { useNavigate } from "react-router-dom";

const initialPosts = [
{
id: 1,
title: "Recreating BLIP-2: first steps",
excerpt: "A short write-up about building the Q-Former...",
status: 'draft',
deleted: false,
date: '2025-10-05',
readTime: 6,
tags: ['vision', 'research'],
},
{
id: 2,
title: "Designing layout GNNs",
excerpt: "Using graph neural networks for UI layout embeddings...",
status: 'published',
deleted: false,
date: '2025-09-30',
readTime: 8,
tags: ['gnn', 'ui'],
},
];

export default function AdminBlogPage() {

    const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN;
    const BACKEND_BASE_URL = import.meta.env.FASTAPI_BASE_URL;

    const navigate = useNavigate();

    //const [postId, setPostId] = useState(null);
    const [posts, setPosts] = useState(initialPosts);
    const [isCreating, setIsCreating] = useState(false);
    const [nextId, setNextId] = useState(3);
    const [showDeleted, setShowDeleted] = useState(false);

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

    function toggleStatus(id) {
        setPosts(posts.map(p => 
            p.id === id? 
            {...p, status:p.status === 'published'? 'draft': 'published'}: p));
    }

    function softDelete(id) {
        setPosts(posts.map(p => 
            p.id === id?
            {...p, deleted:true}:p
        ))
    }

    function restore(id) {
        setPosts(posts.map(p => 
            p.id === id?
            {...p , deleted:false}:p
        ))
    }

    const visiblePosts = posts.filter(p => (showDeleted? true: !p.deleted))  // ?? Not needed DB query will handle this
    const deletedCount = posts.filter(p => p.deleted).length

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900">
            <Navbar />
            <main className="max-w-5xl mx-auto p-6  flex flex-col gap-6">
                <header className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Admin-Posts</h1>
                    <div className="flex gap-3">
                        <button 
                            onClick={createNew} 
                            disabled={isCreating}
                            className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition">New Post</button>
                        <label className="flex items-center gap-2 text-sm bg-red-400 rounded-md px-3 py-1">
                            <input type="checkbox" 
                            checked={showDeleted} 
                            onChange={(e) => setShowDeleted(e.target.checked)}/>
                            Show Deleted ({deletedCount})
                        </label>
                    </div>
                </header>
                <section className="flex flex-col gap-4">
                    {visiblePosts.length === 0 && (
                        <div className="text-center text-gray-500 py-12">No Posts yet Create One</div>
                    )}

                    {visiblePosts.map( post => (
                        post.deleted ? (
                            <div key={post.id} className="bg-red-50 border rounded-md p-4 flex items-center justify-between">
                                <div>
                                    <div className="font-semibold">{post.title} (deleted)</div>
                                    <div className="text-xs text-gray-500">{post.date}</div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => restore(post.id)}
                                    className="px-3 py-1 rounded-md border text-sm bg-green-200">
                                        Restore
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <BlogCard 
                            key={post.id}
                            post={post}
                            onToggleStatus={toggleStatus}
                            onDelete={softDelete}
                            />
                        )
                    ))}
                </section>
            </main>
            
        </div>
    );
}