import React from "react";
import clsx from "clsx";
import { Loader2 } from "lucide-react";

export default function Button({
    children,
    variant = "primary",
    onClick,
    disabled = false,
    loading = false,
    icon: Icon, 
    iconPosition = "left",
    className="",
    ...props  

}) {
    const baseStyles = "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";

    const variants = {
        primary: "bg-terra text-white hover:bg-terra-light focus:ring-terra-light disabled:opacity-50",
        outline: "border border-terra text-terra hover:bg-terra-light hover:text-black focus:ring-terra-light disabled:opacity-50",
        subtle: "bg-gray-700/70 text-gray-200 hover:bg-gray-700 focus:ring-gray-600 disabled:opacity-50",
        danger:"bg-danger text-white hover:bg-danger-hover focus:ring-red-600 disabled:opacity-70",
    };

    return (
        <button
        onClick={onClick}
        disabled={disabled || loading}
        className={clsx (
            baseStyles,
            variants[variant],
            disabled && "cursor-not-allowed",
            className
            )}
        {...props}
        >
            {loading && (
                <Loader2 className="animate-spin h-4 w-4 text-current" />
            )}

            {!loading && Icon && iconPosition === "left" && (
                <Icon className="h-4 w-4" />
            )}
            <span>{children}</span>
            
            {!loading && Icon && iconPosition === "right" && (
                <Icon className="h-4 w-4" />
            )}

        </button>
    );
}