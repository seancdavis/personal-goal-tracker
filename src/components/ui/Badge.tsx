import type { HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "outline" | "warning" | "success";
}

export function Badge({
  className = "",
  variant = "default",
  ...props
}: BadgeProps) {
  const variantClasses = {
    default: "bg-green-100 text-green-800",
    secondary: "bg-gray-100 text-gray-700",
    outline: "border border-gray-300 text-gray-600",
    warning: "bg-yellow-100 text-yellow-800",
    success: "bg-green-100 text-green-800",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
