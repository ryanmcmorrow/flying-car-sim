"use client";

import { cn } from "@/lib/utils";

interface PixelCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "cyan" | "pink" | "amber" | "green";
  title?: string;
}

const variantClass: Record<string, string> = {
  cyan: "pixel-card",
  pink: "pixel-card pixel-card-pink",
  amber: "pixel-card pixel-card-amber",
  green: "pixel-card pixel-card-green",
};

export function PixelCard({
  children,
  className,
  variant = "cyan",
  title,
}: PixelCardProps) {
  return (
    <div className={cn(variantClass[variant], className)}>
      {title && (
        <p
          className="pixel-heading text-xs mb-4"
          style={{ fontSize: "0.6rem", letterSpacing: "0.1em" }}
        >
          {title}
        </p>
      )}
      {children}
    </div>
  );
}
