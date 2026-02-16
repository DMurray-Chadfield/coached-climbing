import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <>
      <section className="card marketing-hero">
        <div className="marketing-hero-grid">
          <div className="marketing-hero-copy">
            <p className="marketing-kicker">AI Climbing Coach</p>
            <h1>Personalized climbing blocks, generated in minutes.</h1>
            <p className="marketing-lede">
              Answer a short onboarding questionnaire, generate a structured plan, then iterate with coach chat and check
              off sessions as you go.
            </p>
            <div className="link-row marketing-cta-row">
              <Link className="plan-open-cta" href="/signup">
                Get started
              </Link>
              <Link className="marketing-cta-secondary" href="/login">
                Log in
              </Link>
              <Link className="marketing-cta-tertiary" href="/#how-it-works">
                How it works
              </Link>
            </div>
            <p className="marketing-fineprint">
              Not medical advice. If you’re injured or unsure, talk to a qualified professional.
            </p>
          </div>

          <div className="marketing-hero-panel" aria-hidden="true">
            <div className="marketing-hero-bubble">
              <p className="marketing-hero-bubble-title">Your next block</p>
              <ul className="marketing-hero-bullets">
                <li>Warm-ups + strength</li>
                <li>2–4 climbing sessions</li>
                <li>Rest + deload built-in</li>
              </ul>
            </div>
            <div className="marketing-hero-bubble marketing-hero-bubble-accent">
              <p className="marketing-hero-bubble-title">Coach chat</p>
              <p className="marketing-hero-bubble-body">“Swap Monday power for fingerboard?”</p>
              <p className="marketing-hero-bubble-body marketing-hero-bubble-muted">
                “Done. Here’s an equivalent session and why.”
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="card marketing-section">
        <h2>How it works</h2>
        <ol className="marketing-steps">
          <li className="marketing-step">
            <h3>Create a plan</h3>
            <p>Name your block. Every time you regenerate, the app keeps a new immutable version.</p>
          </li>
          <li className="marketing-step">
            <h3>Answer onboarding</h3>
            <p>
              Tell us your discipline, schedule, goals, and constraints. The generator uses this as the “truth” for your
              plan.
            </p>
          </li>
          <li className="marketing-step">
            <h3>Generate your block</h3>
            <p>Get a readable, week-by-week plan with sessions you can actually execute.</p>
          </li>
          <li className="marketing-step">
            <h3>Iterate and complete</h3>
            <p>Chat to tweak sessions, then check off what you did. Regenerate anytime to adapt.</p>
          </li>
        </ol>
      </section>

      <section className="card marketing-section">
        <h2>What you get</h2>
        <div className="marketing-feature-grid">
          <div className="marketing-feature">
            <h3>Structured plans</h3>
            <p>Plans are generated with strict schemas so sessions stay consistent and easy to scan.</p>
          </div>
          <div className="marketing-feature">
            <h3>Plan-scoped onboarding</h3>
            <p>Different goals? Different plan. Each plan has its own questionnaire and its own versions.</p>
          </div>
          <div className="marketing-feature">
            <h3>Coach chat tweaks</h3>
            <p>Ask for substitutions, swaps, and intensity adjustments without rewriting the whole block.</p>
          </div>
          <div className="marketing-feature">
            <h3>Completion tracking</h3>
            <p>Mark sessions done and keep notes. The app stays grounded in what you actually completed.</p>
          </div>
          <div className="marketing-feature">
            <h3>Regenerate safely</h3>
            <p>Regeneration creates a new version—so you can iterate without losing what worked.</p>
          </div>
          <div className="marketing-feature">
            <h3>Designed for reality</h3>
            <p>Life happens. Adjust the plan when travel, soreness, or schedule changes show up.</p>
          </div>
        </div>
      </section>

      <section className="card marketing-section marketing-bottom-cta">
        <h2>Ready to start?</h2>
        <p>Create your first plan, answer onboarding, and generate your first block.</p>
        <div className="link-row marketing-cta-row">
          <Link className="plan-open-cta" href="/signup">
            Create an account
          </Link>
          <Link className="marketing-cta-secondary" href="/login">
            Log in
          </Link>
        </div>
      </section>
    </>
  );
}
