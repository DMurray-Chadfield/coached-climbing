import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false
  }
};

export default function LoginPage() {
  return (
    <section className="auth-shell">
      <article className="card auth-card">
        <h1>Welcome back</h1>
        <p className="auth-subtitle">Log in with your username to view your training plans and continue coaching.</p>
        <LoginForm />
        <p className="auth-footer">
          Need an account? <Link href="/signup">Sign up</Link>
        </p>
      </article>
    </section>
  );
}
