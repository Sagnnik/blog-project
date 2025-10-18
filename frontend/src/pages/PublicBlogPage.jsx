import React, { useEffect, useState } from "react";
import PublicBlogCard from "../components/PublicBlogCard";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import { Plus } from "lucide-react";
import Navbar from '../components/Navbar'

export default function PublicBlogPage() {

  const BACKEND_BASE_URL = import.meta.env.FASTAPI_BASE_URL || 'http://localhost:8000';

  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [isLoading, setisLoading] = useState(false);

  useEffect(() => {
    async function fetchPost() {
      try {
        setisLoading(true);
        let limit = 10;
        let skip = 0;
        const url = `${BACKEND_BASE_URL}/api/public/posts?limit=${limit}&skip=${skip}`;
        const res = await fetch(url);
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
      finally {
        setisLoading(false);
      }
    }
    fetchPost();
  }, []);

  function openPost(post) {
    const slug = post.slug
    navigate(`/article/${slug}`, { state: {postId: post.id}});
  }

  return (
    <div className="min-h-screen bg-black/95 text-gray-300">
      <Navbar />
      <main className="max-w-6xl mx-auto p-6 flex flex-col gap-7 mt-5">
        <section className="flex flex-col gap-4">
          {posts.length === 0 && (
              <div className="text-center text-gray-500 py-12">
                  No Posts yet. Create one.
              </div>
          )}
          {posts.map((post) => (
            <PublicBlogCard
            key={post.id} 
            post={post} 
            onOpen={() => openPost(post)}/>
          ))}
        </section>
      </main>
    </div>
  )
}
