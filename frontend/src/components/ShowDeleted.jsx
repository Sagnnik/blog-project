import { Check } from "lucide-react";

export default function ShowDeletedToggle({ showDeleted, setShowDeleted, deletedCount }) {
  return (
    <label
      className="flex items-center gap-2 bg-neutral-900 border border-neutral-700 rounded-md px-3 py-1 cursor-pointer text-sm select-none hover:bg-neutral-800 transition"
      onClick={() => setShowDeleted(!showDeleted)}
    >
      <div
        className={`w-4 h-4 rounded-sm flex items-center justify-center border transition-colors
        ${showDeleted ? "bg-[#da7756] border-[#da7756]" : "bg-neutral-800 border-neutral-600"}`}
      >
        {showDeleted && <Check className="w-3 h-3 text-black" />}
      </div>

      <span className="text-gray-300">
        Show Deleted <span className="text-gray-500">({deletedCount})</span>
      </span>
    </label>
  );
}
