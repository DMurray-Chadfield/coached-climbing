import Link from "next/link";
import { SignupForm } from "@/components/signup-form";

export default function SignupPage() {
  return (
    <section className="card">
      <h1>Create account</h1>
      <SignupForm />
      <p>
        Already have an account? <Link href="/login">Login</Link>
      </p>
    </section>
  );
}
