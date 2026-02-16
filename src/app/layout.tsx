import type { Metadata } from "next";
import Link from "next/link";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";

export const metadata: Metadata = {
  metadataBase: new URL("https://coachedclimbing.com"),
  title: {
    default: "AI Intelligent Personalised Climbing Training Plans",
    template: "%s | Coached Climbing"
  },
  description:
    "AI-powered intelligent personalised climbing training plans with structured sessions, coach chat adjustments, and progress tracking.",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Coached Climbing",
    title: "AI Intelligent Personalised Climbing Training Plans",
    description:
      "AI-powered intelligent personalised climbing training plans with structured sessions, coach chat adjustments, and progress tracking.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Coached Climbing"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Intelligent Personalised Climbing Training Plans",
    description:
      "AI-powered intelligent personalised climbing training plans with structured sessions, coach chat adjustments, and progress tracking.",
    images: ["/twitter-image"]
  }
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
  const feedbackHref = `mailto:tom@coachedclimbing.com?subject=${encodeURIComponent("Coached Climbing feedback")}&body=${encodeURIComponent("Hi Tom,\n\nI'd like to share feedback:\n")}`;

  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${headingFont.variable}`}>
        <header className="topbar">
          <div className="topbar-inner">
            <Link href={homeHref} className="brand-mark">
              <span className="brand-mark-badge" aria-hidden="true">
                AC
              </span>
              <span className="brand-mark-label">Coached Climbing</span>
            </Link>
            <nav className="link-row topbar-nav">
              {session?.user ? (
                <>
                  <Link className="topbar-link" href="/dashboard">
                    Dashboard
                  </Link>
                  <a className="topbar-link" href={feedbackHref}>
                    Feedback
                  </a>
                  <SignOutButton />
                </>
              ) : (
                <>
                  <Link className="topbar-link" href="/#how-it-works">
                    How it works
                  </Link>
                  <Link className="topbar-link" href="/login">
                    Log in
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
