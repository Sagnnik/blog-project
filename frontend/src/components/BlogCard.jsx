import React, { useEffect, useRef, useState } from "react";
import ToggleButton from "./ToggleButton";
import { MoreHorizontal, Edit3, Trash2 } from "lucide-react";

export default function BlogCard({ post, onOpen, onToggleStatus, onDelete, onEdit }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const menuButtonRef = useRef(null);
    const [openUp, setOpenUp] = useState(true);
    const CARD_HEIGHT_CLASS = "h-44";

    function getImageUrl() {
        if(!post?.cover_image) return null;
        return post.cover_image.public_link;
    }
    const imgUrl = getImageUrl();

    useEffect(() => {
        function handleClick(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuOpen(false);
            }
        }
        if (menuOpen) {
            document.addEventListener("mousedown", handleClick);
        }
        return () => {
            document.removeEventListener("mousedown", handleClick);
        };
    }, [menuOpen]);


    useEffect(() => {
        if (!menuOpen || !menuButtonRef.current) return;

        const btnRect = menuButtonRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;

        const estimatedMenuHeight = 120;

        const spaceAbove = btnRect.top;
        const spaceBelow = viewportHeight - btnRect.bottom;

        setOpenUp(spaceAbove >= estimatedMenuHeight + 8 || spaceAbove > spaceBelow);
    }, [menuOpen]);

    if (post.deleted) return null;

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
                        <p className="text-xs text-gray-500 mb-1">
                            {new Date(post.created_at).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                }
                            )}
                        </p>
                        <p className="text-gray-300 text-sm line-clamp-2">{post.summary}</p>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                        <div>
                            <ToggleButton
                                isPublished={post.status === "published"}
                                onToggle={() => onToggleStatus(post.id)}
                            />
                        </div>

                        <div className="relative" ref={menuRef}>
                            <button
                                ref={menuButtonRef}
                                onClick={() => setMenuOpen((s) => !s)}
                                className="p-1 rounded-md hover:bg-neutral-800 transition text-gray-300"
                                aria-haspopup="true"
                                aria-expanded={menuOpen}
                            >
                                <MoreHorizontal className="w-5 h-5" />
                                <span className="sr-only">Open actions menu</span>
                            </button>

                            {menuOpen && (
                                <div
                                className={`absolute right-0 z-30 w-40 bg-neutral-900 border border-neutral-700 rounded-md shadow-lg origin-top-right transform ${
                                    openUp ? "bottom-full mb-2" : "top-full mt-2"
                                }`}
                                >
                                {openUp ? (
                                    <div className="absolute right-3 -bottom-1 w-3 h-3 bg-neutral-900 rotate-45 border border-neutral-700" />
                                ) : (
                                    <div className="absolute right-3 -top-1 w-3 h-3 bg-neutral-900 rotate-45 border border-neutral-700" />
                                )}

                                <div className="py-1">
                                    <button
                                    onClick={() => {
                                        setMenuOpen(false);
                                        onEdit(post.id);
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-800 flex items-center gap-2"
                                    >
                                    <Edit3 className="w-4 h-4 text-gray-300" />
                                    <span className="text-gray-200">Edit</span>
                                    </button>

                                    <button
                                    onClick={() => {
                                        setMenuOpen(false);
                                        onDelete(post.id);
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-800 flex items-center gap-2"
                                    >
                                    <Trash2 className="w-4 h-4 text-red-400" />
                                    <span className="text-red-300">Delete</span>
                                    </button>
                                </div>
                                </div>
                            )}
                            </div>
                        </div>
                        </div>

                        <div
                        onClick={onOpen}
                        role="link"
                        tabIndex={0}
                        className={`w-1/3 flex-shrink-0 ${CARD_HEIGHT_CLASS} overflow-hidden`}>
                            <img
                            src={imgUrl || "/src/assets/img1.jpg"}
                            alt={post?.cover_image?.alt || "Cover Image"}
                            className="w-full h-full object-cover hover:cursor-pointer"
                            />
                        </div>
                    </div>
        </article>
    );
}