import Link from "next/link";
import { SignupForm } from "@/components/signup-form";

export default function SignupPage() {
  return (
    <section className="auth-shell">
      <article className="card auth-card">
        <h1>Create your coaching account</h1>
        <p className="auth-subtitle">Set up your account to build and refine personalized climbing plans.</p>
        <SignupForm />
        <p className="auth-footer">
          Already have an account? <Link href="/login">Login</Link>
        </p>
      </article>
    </section>
  );
}
