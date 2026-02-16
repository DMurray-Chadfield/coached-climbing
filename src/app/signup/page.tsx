import Link from "next/link";
import type { Metadata } from "next";
import { SignupForm } from "@/components/signup-form";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false
  }
};

export default function SignupPage() {
  return (
    <section className="auth-shell">
      <article className="card auth-card">
        <h1>Create your coaching account</h1>
        <p className="auth-subtitle">Choose a username and password to build and refine personalised climbing plans.</p>
        <SignupForm />
        <p className="auth-footer">
          Already have an account? <Link href="/login">Log in</Link>
        </p>
      </article>
    </section>
  );
}
