import React from "react";

// ?? props: onToggle and handle onToggle in Button
export default function ToggleButton({isPublished, onToggle}) {
    return(
        <button onClick={onToggle}
        className={`px-3 py-1 rounded-md text-sm font-medium border transition-all` + 
            (isPublished? 'bg-green-50 border-green-300 text-green-700 hover:cursor-pointer':
                'bg-yellow-50 border-amber-300 text-amber-700 hover:cursor-pointer'
            )
        }>
            {isPublished? "Published": "Draft"}
        </button>
    );
}