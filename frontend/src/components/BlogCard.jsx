import React from "react";
import ToggleButton from "./ToggleButton";

export default function BlogCard({ post, onOpen, onToggleStatus, onDelete, onEdit }) {
    if (post.deleted) return null;
    return (
        <article className="bg-white rounded-lg shadow-xl border-2 p-4 hover:shadow-md tansition-shadow w-full max-w-6xl mx-auto">
            <div className="flex items-start">
                <div className="w-2/3 pr-4 flex flex-col justify-between h-full">
                    <div onClick={onOpen} role="link" tabIndex={0}>
                        <h3 className="text-xl font-semibold mb-1 hover:cursor-pointer hover:underline hover:underline-offset-4 hover:text-gray-600">{post.title}</h3>
                        <p className="text-sm text-gray-500 mb-2 hover:cursor-pointer">Published on: {post.date}</p>
                        <p className="text-gray-700 text-sm line-clamp-2 hover:cursor-pointer">{post.excerpt}</p>
                    </div>
                    <div className="flex space-x-2 mt-4">
                        <ToggleButton 
                        isPublished={post.status === 'published'}
                        onToggle= {() => onToggleStatus(post.id)}
                        />
                        <button onClick={() => onDelete(post.id)}
                        className="border-red-200 bg-red-50 px-3 py-1 rounded-md text-sm text-red-600 hover:cursor-pointer">
                            Delete
                        </button>
                        <button onClick={() => onEdit(post.id)}
                        className="px-3 py-1 rounded-md border text-sm bg-yellow-100 hover:bg-yellow-200">
                            Edit
                        </button>
                    </div>
                </div>
                <div
                onClick={onOpen} 
                role="link" 
                tabIndex={0} 
                className="w-1/3 flex-shrink-0 h-40">  
                    <img src="src/assets/img1.jpg" alt="nothing" 
                    className="w-full h-full object-cover rounded-md border hover:cursor-pointer"/>
                </div>
            </div>
            
        </article>
    );
}