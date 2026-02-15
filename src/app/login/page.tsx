import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <section className="card">
      <h1>Login</h1>
      <LoginForm />
      <p>
        Need an account? <Link href="/signup">Sign up</Link>
      </p>
    </section>
  );
}
