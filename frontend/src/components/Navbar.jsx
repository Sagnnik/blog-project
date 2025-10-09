import React from "react";

export default function Navbar() {
    return (
        <nav className="w-full bg-white/80 backdrop-blur-sm border-b py-3 px-6">
            <div className="max-w-5xl mx-auto flex items-center justify-between">
                <div className="text-lg font-semibold">vectorThoughts</div>
                <div className="flex gap-4 items-center text-sm">
                    <a className="hover:underline cursor-pointer">Blog</a>
                    <a className="hover:underline cursor-pointer">About</a>
                    <a className="hover:underline cursor-pointer">Tags</a>
                </div>
            </div>
        </nav>
    );
}