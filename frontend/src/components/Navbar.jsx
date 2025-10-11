import React from "react";
import {Link, NavLink} from "react-router-dom";

export default function Navbar() {
    const baseClasses = "hover:underline transition cursor-pointer";
    const activeClasses = "text-blue-600 font-medium underline"

    return (
        <nav className="w-full bg-white/80 backdrop-blur-sm border-b py-3 px-6">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="text-3xl font-bold font-mono">
                    <NavLink to="/" className="hover:opacity-80">
                        vectorThoughts
                    </NavLink>
                </div>
                
                <div className="flex gap-4 items-center text-lg">
                    <NavLink 
                    to="/"
                    className={({isActive}) =>
                        `${baseClasses} ${isActive? activeClasses: ""}`
                    }>
                        Blog
                    </NavLink>
                    
                    <NavLink
                    to="/about"
                    className={({isActive}) =>
                        `${baseClasses} ${isActive? activeClasses: ""}`
                    }>
                        About
                    </NavLink>

                    <NavLink
                    to="/tags"
                    className={({isActive}) =>
                        `${baseClasses} ${isActive? activeClasses: ""}`
                    }>
                        Tags
                    </NavLink>
                </div> 
            </div>
        </nav>
    );
}