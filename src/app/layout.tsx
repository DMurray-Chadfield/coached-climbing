import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";

export const metadata: Metadata = {
  title: "AI Climbing Coach",
  description: "Generate personalized climbing plans"
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <div className="topbar-inner">
            <strong>AI Climbing Coach</strong>
            <nav className="link-row">
              {session?.user ? (
                <>
                  <Link href="/dashboard">Dashboard</Link>
                  <Link href="/onboarding">Onboarding</Link>
                  <SignOutButton />
                </>
              ) : (
                <>
                  <Link href="/login">Login</Link>
                  <Link href="/signup">Sign up</Link>
                </>
              )}
            </nav>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
