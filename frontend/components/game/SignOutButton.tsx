"use client";

import { signOut } from "next-auth/react";

interface Props {
  className?: string;
  style?: React.CSSProperties;
}

export function SignOutButton({ className, style }: Props) {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className={className}
      style={style}
    >
      SIGN OUT
    </button>
  );
}
