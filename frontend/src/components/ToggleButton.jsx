import React from "react";

export default function ToggleButton({ isPublished, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`px-3 py-1 rounded-md text-sm font-medium border transition-all duration-200
        ${isPublished
          ? "bg-[#1a1a1a] border-terra text-terra hover:bg-[#2a2a2a]"
          : "bg-neutral-900 border-neutral-700 text-neutral-400 hover:bg-neutral-800 hover:text-terra-light"
        }`}
    >
      {isPublished ? "Published" : "Draft"}
    </button>
  );
}