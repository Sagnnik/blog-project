import React from "react";

export default function PublicBlogCard({post, onOpen}) {
    const CARD_HEIGHT_CLASS = "h-42";

    function getImageUrl() {
        if(!post?.cover_image) return null;
        return post.cover_image.public_link;
    }

  return (
    <article
        className={`bg-neutral-800/70 shadow-xl p-0 overflow-hidden w-full max-w-6xl mx-auto rounded-md ${CARD_HEIGHT_CLASS}`}
        role="article"
    >
       <div className="flex h-full">
                <div className="w-2/3 pr-4 flex flex-col justify-between p-4">
                    <div onClick={onOpen} role="link" tabIndex={0}>
                        <h3 className="text-lg font-semibold font-roboto mb-1 hover:cursor-pointer hover:underline hover:underline-offset-4 hover:text-terra-dark">
                            {post.title}
                        </h3>
                        <p className="text-xs text-gray-500 mb-2">
                            {new Date(post.created_at).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                }
                            )}
                        </p>
                        <p className="text-gray-300 text-sm line-clamp-3">{post.summary}</p>
                    </div> 
                </div>
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
                </div>
        </article>
  );
}
