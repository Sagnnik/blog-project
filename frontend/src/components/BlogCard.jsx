import React from "react";
import ToggleButton from "./ToggleButton";

// ?? have to add onToggle in Buttons
// ?? props: post, onToggleStatus, onDelete
export default function BlogCard({ post, onToggleStatus, onDelete }) {
    if (post.deleted) return null;
    return (
        <article className="bg-white rounded-lg shadow-xl border-2 p-4 hover:shadow-md tansition-shadow w-full max-w-[800px] mx-auto">
            <div className="flex items-start">
                <div className="w-2/3 pr-4 flex flex-col justify-between h-full">
                    <div>
                        <h3 className="text-xl font-semibold mb-1">{post.title}</h3>
                        <p className="text-sm text-gray-500 mb-2">Published on: {post.date}</p>
                        <p className="text-gray-700 text-sm line-clamp-2">{post.excerpt}</p>
                    </div>
                    <div className="flex space-x-2 mt-4">
                        <ToggleButton 
                        isPublished={post.status === 'published'}
                        onToggle= {() => onToggleStatus(post.id)}
                        />
                        <button onClick={() => onDelete(post.id)}
                        className="border-red-200 bg-red-50 px-3 py-1 rounded-md text-sm text-red-600">
                            Delete
                        </button>
                    </div>
                </div>
                <div className="w-1/3 flex-shrink-0">  
                    <img src="src/assets/img1.jpg" alt="nothing" 
                    className="w-full h-full object-cover rounded-md border"/>
                </div>
            </div>
            
        </article>
    );
}