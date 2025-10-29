import React from "react";

export default function PublicLatestBlogCard({post, onOpen}) {
    const CARD_HEIGHT_CLASS = "h-60";
    const BASE = import.meta.env.VITE_FASTAPI_BASE_URL || "http://localhost:8000";

    function getImageUrl() {
        if(!post?.cover_asset_id) return null;
        const link = `${BASE}/api/assets/${post.cover_asset_id}`;
        return link
    }

    return (
            <article
                className={`bg-neutral-800/70 shadow-xl p-0 overflow-hidden w-full max-w-6xl mx-auto rounded-md ${CARD_HEIGHT_CLASS}`}
                role="article"
            >
                <div className='flex h-full'>
    
                    <div
                    onClick={onOpen}
                    role="link"
                    tabIndex={0}
                    className={`w-1/3 flex-shrink-0 ${CARD_HEIGHT_CLASS} overflow-hidden`}>
                        <img
                        src={getImageUrl()}
                        alt={post?.cover_image?.alt || "Cover Image"}
                        className="w-full h-full object-cover hover:cursor-pointer"
                        />
                    </div>
    
                    <div className='w-2/3 pl-10 flex flex-col justify-between p-4'>
                        <div onClick={onOpen} role='link' tabIndex={0}>
                            <h3 className='text-[23px] justify-end font-roboto font-semibold mb-1 hover:cursor-pointer hover:underline hover:underline-offset-4 hover:text-terra-dark'>
                                <span className="text-terra text-xs p-1 rounded-md mr-3 bg-orange-200/10">Recent</span>{post.title}
                            </h3>
                            <p className='text-[16px] text-gray-500 mb-1'>
                                {new Date(post.created_at).toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    }
                                )}
                            </p>
                            <p className='text-gray-300 text-[19px] line-clamp-2'>{post.summary}</p>
                        </div>
                    </div>
                </div>    
            </article>
    );
}
