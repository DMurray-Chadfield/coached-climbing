import type { Metadata } from "next";
import Link from "next/link";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";

export const metadata: Metadata = {
  title: "AI Climbing Coach",
  description: "Generate personalized climbing plans"
};

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"]
});

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["500", "600", "700"]
});

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);
  const homeHref = session?.user ? "/dashboard" : "/";

  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${headingFont.variable}`}>
        <header className="topbar">
          <div className="topbar-inner">
            <Link href={homeHref} className="brand-mark">
              <span className="brand-mark-badge" aria-hidden="true">
                AC
              </span>
              <span className="brand-mark-label">AI Climbing Coach</span>
            </Link>
            <nav className="link-row topbar-nav">
              {session?.user ? (
                <>
                  <Link className="topbar-link" href="/dashboard">
                    Dashboard
                  </Link>
                  <SignOutButton />
                </>
              ) : (
                <>
                  <Link className="topbar-link" href="/#how-it-works">
                    How it works
                  </Link>
                  <Link className="topbar-link" href="/login">
                    Login
                  </Link>
                  <Link className="topbar-link topbar-link-accent" href="/signup">
                    Sign up
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>
        <main className="page-shell">{children}</main>
      </body>
    </html>
  );
}
