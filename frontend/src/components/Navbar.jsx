import React from "react";
import {Link, NavLink} from "react-router-dom";

export default function Navbar() {
  const baseClasses = "hover:text-terra transition cursor-pointer underline-offset-4 hover:underline";
  const activeClasses = "text-terra font-semibold underline";

  return (
    <nav className="w-full bg-neutral-800/60 backdrop-blur-sm border-b border-gray-800 py-3 px-6 text-gray-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        <div className="text-3xl font-bold font-mono text-terra">
          <NavLink to="/" className="hover:opacity-80 transition">
            vectorThoughts
          </NavLink>
        </div>

        <div className="flex gap-6 items-center text-lg font-mono">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `${baseClasses} ${isActive ? activeClasses : "text-gray-300"}`
            }
          >
            Blog
          </NavLink>

          <NavLink
            to="/about"
            className={({ isActive }) =>
              `${baseClasses} ${isActive ? activeClasses : "text-gray-300"}`
            }
          >
            About
          </NavLink>

          <NavLink
            to="/tags"
            className={({ isActive }) =>
              `${baseClasses} ${isActive ? activeClasses : "text-gray-300"}`
            }
          >
            Tags
          </NavLink>
        </div>
      </div>
    </nav>
  );
}