"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      className="topbar-link-button"
      type="button"
      onClick={() => {
        void signOut({ callbackUrl: "/login" });
      }}
    >
      Sign out
    </button>
  );
}
