"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

type SignupResponse = {
  userId: string;
};

export function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        password,
        ...(name.trim() ? { name: name.trim() } : {})
      })
    });

    const body = (await response.json()) as SignupResponse | { error: { message: string } };

    if (!response.ok) {
      setIsLoading(false);
      setError("error" in body ? body.error.message : "Signup failed.");
      return;
    }

    await signIn("credentials", {
      email,
      password,
      redirect: false
    });

    setIsLoading(false);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="auth-form">
      <label>
        <span>Name</span>
        <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" />
      </label>
      <label>
        <span>Email</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
      </label>
      <label>
        <span>Password</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </label>
      <button type="submit" disabled={isLoading}>
        {isLoading ? "Creating account..." : "Create account"}
      </button>
      {error ? <p className="error">{error}</p> : null}
    </form>
  );
}
