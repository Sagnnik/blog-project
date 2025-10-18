import React, { useEffect, useRef, useState } from "react";
import {Link, NavLink, useNavigate} from "react-router-dom";
import { SignInButton, UserButton, useUser } from "@clerk/clerk-react";
import Button from "./Button";

export default function Navbar() {
  const baseClasses = "hover:text-terra transition cursor-pointer underline-offset-4 hover:underline";
  const activeClasses = "text-terra font-semibold underline";
  const { isSignedIn } = useUser();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const ddRef = useRef(null);

  const prevSignedIn = useRef(isSignedIn);

  useEffect(() => {
    if (!prevSignedIn.current && isSignedIn) {
      setOpen(false);
      navigate("/admin");
    }
    prevSignedIn.current = isSignedIn;
  }, [isSignedIn, navigate])

  useEffect(() => {
    function onDocClick(e) {
      if (ddRef.current && !ddRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <nav className="w-full bg-neutral-800/70 backdrop-blur-sm border-b border-gray-800 py-3 px-6 text-gray-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="text-3xl font-bold font-mono text-terra">
          <NavLink to="/" className="hover:opacity-80 transition">
            vectorThoughts
          </NavLink>
        </div>

        <div className="flex gap-6 items-center text-lg font-mono">
          <NavLink to={isSignedIn? "/admin":"/"} className={({ isActive }) => `${baseClasses} ${isActive ? activeClasses : "text-gray-300"}`}>Blog</NavLink>
          <NavLink to="/about" className={({ isActive }) => `${baseClasses} ${isActive ? activeClasses : "text-gray-300"}`}>About</NavLink>

          <div className="relative" ref={ddRef}>
            <button
              aria-haspopup="menu"
              aria-expanded={open}
              onClick={() => setOpen((s) => !s)}
              className="p-2 rounded hover:bg-neutral-700/40 transition"
              title="Open menu"
            >
              <svg width="20" height="14" viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-200">
                <rect y="0.5" width="20" height="2" rx="1" fill="currentColor" />
                <rect y="6" width="20" height="2" rx="1" fill="currentColor" />
                <rect y="11.5" width="20" height="2" rx="1" fill="currentColor" />
              </svg>
            </button>

            <div
              className={`origin-top-right absolute right-0 mt-2 w-52 rounded-md shadow-lg ring-1 ring-black ring-opacity-20 bg-neutral-900 z-50 transform transition-all ${
                open ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
              }`}
              role="menu"
              hidden={!open && true}
            >
              <div className="py-1">
                {isSignedIn ? ( <div className="px-4 py-2"><UserButton /></div> ) : (
                  <div className="px-4 py-2">
                    <SignInButton>
                      <Button variant="primary">Sign In</Button>
                    </SignInButton>
                  </div>
                )}
              
                <NavLink
                  to="/request-admin"
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `block px-4 py-2 text-sm ${baseClasses} ${isActive ? activeClasses : "text-gray-300"}`
                  }
                  role="menuitem"
                >
                  Invite Link
                </NavLink>

                <NavLink
                  to="/tags"
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `block px-4 py-2 text-sm ${baseClasses} ${isActive ? activeClasses : "text-gray-300"}`
                  }
                  role="menuitem"
                >
                  Tags
                </NavLink>

              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}