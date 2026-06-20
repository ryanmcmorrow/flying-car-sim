"use client";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes } from "react";

interface PixelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "cyan" | "pink" | "green" | "amber";
  size?: "sm" | "md" | "lg";
}

const variantClass: Record<string, string> = {
  cyan: "pixel-btn",
  pink: "pixel-btn pixel-btn-pink",
  green: "pixel-btn pixel-btn-green",
  amber: "pixel-btn pixel-btn-amber",
};

const sizeClass: Record<string, string> = {
  sm: "text-[0.45rem] px-3 py-1.5",
  md: "text-[0.6rem] px-4 py-2",
  lg: "text-[0.7rem] px-6 py-3",
};

export function PixelButton({
  children,
  className,
  variant = "cyan",
  size = "md",
  ...props
}: PixelButtonProps) {
  return (
    <button
      className={cn(variantClass[variant], sizeClass[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}
