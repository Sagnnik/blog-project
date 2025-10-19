import React, { useEffect, useRef, useState } from "react";
import Button from "./Button";
import { MoreHorizontal, Edit3, Trash2 } from "lucide-react";

export default function PublicLatestBlogCard({post, onOpen}) {
    const [cardImage, setCardImage] = useState(null);
    const cardImageRef = useRef(null);
    const [imageLoading, setImageLoading] = useState(false);
    const CARD_HEIGHT_CLASS = "h-60";

    function getImageUrl() {
        if(!post?.cover_image) return null;
        const public_link = post.cover_image.public_link;
        return public_link;
    }

    async function handleImage() {
        const url = getImageUrl();
        if (!url) {
            if (cardImageRef.current && cardImageRef.current.startsWith("blob:")) {
                URL.revokeObjectURL(cardImageRef.current);
                cardImageRef.current = null;
            }
            setCardImage(null);
            return;
        }
        try {
            setImageLoading(true);
            const res = await fetch(url, { mode: "cors"});
            if(!res.ok) {
                const txt = await res.text();
                throw new Error(`Failed to fetch Cover Image ${res.status} ${txt}`);
            }

            const blob = await res.blob();
            const objectUrl = URL.createObjectURL(blob);
            if (cardImageRef.current && cardImageRef.current.startsWith("blob:")) {
                try {
                URL.revokeObjectURL(cardImageRef.current);
                } catch (e) {
                }
            }
            cardImageRef.current = objectUrl;
            setCardImage(objectUrl)
        }
        catch(err) {
            console.error("Error fetching Cover Image: ", err);
            setCardImage(null);
            if (cardImageRef.current && cardImageRef.current.startsWith("blob:")) {
                try {
                URL.revokeObjectURL(cardImageRef.current);
                } catch (e) {}
                cardImageRef.current = null;
            }
        }
        finally{
            setImageLoading(false);
        }    
    }

    useEffect(() => {
        handleImage();
        return () => {
            if (cardImageRef.current && cardImageRef.current.startsWith("blob:")) {
                try {
                    URL.revokeObjectURL(cardImageRef.current);
                } 
                catch (e) {}
                cardImageRef.current = null;
            }
        };
    }, [post?.cover_image?.public_link]);

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
                    className={`w-1/3 flex-shrink-0 ${CARD_HEIGHT_CLASS} overflow-hidden`}
                    >
                    {imageLoading ? (
                        <div className="w-full h-full flex items-center justify-center bg-neutral-700">
                        Loading…
                        </div>
                    ) : (
                        <img
                        src={cardImage || "/src/assets/img1.jpg"}
                        alt={post?.cover_image?.alt || "Cover Image"}
                        className="w-full h-full object-cover hover:cursor-pointer"
                        />
                    )}
                    </div>
    
                    <div className='w-2/3 pl-10 flex flex-col justify-between p-4'>
                        <div onClick={onOpen} role='link' tabIndex={0}>
                            <h3 className='text-[23px] justify-end font-roboto font-semibold mb-1 hover:cursor-pointer hover:underline hover:underline-offset-4 hover:text-terra-dark'>{post.title}</h3>
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
