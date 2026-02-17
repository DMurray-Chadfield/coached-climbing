import Link from "next/link";
import type { Metadata } from "next";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Personalised climbing training plans",
  description:
    "Structured climbing sessions you can adjust with coach chat, plus progress tracking.",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    type: "website",
    url: "/",
    title: "Personalised climbing training plans",
    description:
      "Structured climbing sessions you can adjust with coach chat, plus progress tracking.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Personalised climbing training plans built around your goals"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "Personalised climbing training plans",
    description:
      "Structured climbing sessions you can adjust with coach chat, plus progress tracking.",
    images: ["/twitter-image"]
  }
};

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
            <p className="marketing-kicker">Coached Climbing</p>
            <h1>Personalised training plans, built around your goals.</h1>
            <p className="marketing-lede">
              Answer a short onboarding questionnaire to build a structured plan, adjust sessions with coach chat, and
              track what you complete.
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
              Plans and coach chat are drafted by an AI model using your onboarding, chat, and saved plan data (plan,
              completion, notes), guided by conservative coaching rules and discipline-specific context.
            </p>
          </div>

          <div className="marketing-hero-panel" aria-hidden="true">
            <div className="marketing-hero-bubble">
              <p className="marketing-hero-bubble-title">Your next plan</p>
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
            <h3>Create your plan</h3>
            <p>Create a plan to start. You’ll fill in onboarding next, then write your first draft.</p>
          </li>
          <li className="marketing-step">
            <h3>Answer onboarding</h3>
            <p>
              Share your discipline, schedule, goals, and constraints so your plan fits real life.
            </p>
          </li>
          <li className="marketing-step">
            <h3>Build your plan</h3>
            <p>
              An AI model drafts a readable, week-by-week plan (guided by discipline-specific training context) with sessions you can actually execute.
            </p>
          </li>
          <li className="marketing-step">
            <h3>Adjust and complete</h3>
            <p>Use coach chat to refine sessions, then track what you complete each week.</p>
          </li>
        </ol>
      </section>

      <section className="card marketing-section">
        <h2>Why not generic plans?</h2>
        <p className="marketing-compare-intro">
          Generic templates can be hard to stick to. Your plan should fit your schedule, goals, and training reality.
        </p>
        <div className="marketing-compare-grid">
          <article className="marketing-compare-item">
            <h3>Built from your context</h3>
            <p>
              Your onboarding captures discipline, goals, schedule, and constraints so your plan starts from your reality.
            </p>
          </article>
          <article className="marketing-compare-item">
            <h3>Easy to adjust</h3>
            <p>When life changes, coach chat helps you adjust sessions without rewriting your entire plan.</p>
          </article>
          <article className="marketing-compare-item">
            <h3>Progress you can track</h3>
            <p>Track completed sessions and notes so your next steps are based on what you actually did.</p>
          </article>
          <article className="marketing-compare-item">
            <h3>Clear session instructions</h3>
            <p>Each session is laid out clearly, so you always know what to do next without guesswork.</p>
          </article>
        </div>
        <div className="link-row marketing-cta-row">
          <Link className="plan-open-cta" href="/signup">
            Get started
          </Link>
          <Link className="marketing-cta-secondary" href="/login">
            Log in
          </Link>
        </div>
      </section>

      <section className="card marketing-section">
        <h2>What you get</h2>
        <div className="marketing-trust-grid">
          <article className="marketing-trust-item">
            <h3>How your plan is personalised</h3>
            <p>Your onboarding answers are used by an AI model to draft plan structure, intensity, and weekly focus from the start.</p>
          </article>
          <article className="marketing-trust-item">
            <h3>How it stays practical</h3>
            <p>Coach chat adjustments help you adapt sessions quickly when your schedule or energy changes.</p>
          </article>
          <article className="marketing-trust-item">
            <h3>How it stays grounded</h3>
            <p>Progress tracking and notes keep each adjustment tied to what you actually completed.</p>
          </article>
        </div>
        <div className="marketing-feature-grid">
          <div className="marketing-feature">
            <h3>Custom personalised training plans</h3>
            <p>
              Your plan is built from your goals, schedule, and constraints, so it is more useful than a one-size-fits-all
              generic template.
            </p>
          </div>
          <div className="marketing-feature">
            <h3>Structured plans</h3>
            <p>Consistent session structure that is easy to scan and follow.</p>
          </div>
          <div className="marketing-feature">
            <h3>Plan-specific onboarding</h3>
            <p>Each plan keeps its own onboarding answers, so the guidance stays relevant to that goal and schedule.</p>
          </div>
          <div className="marketing-feature">
            <h3>Coach chat adjustments</h3>
            <p>Request substitutions and intensity changes without rewriting the full plan.</p>
          </div>
          <div className="marketing-feature">
            <h3>Progress tracking</h3>
            <p>Track completed sessions and keep notes to stay consistent.</p>
          </div>
          <div className="marketing-feature">
            <h3>Built for real schedules</h3>
            <p>Adapt when travel, fatigue, or time constraints affect training.</p>
          </div>
        </div>
      </section>

      <section className="card marketing-section marketing-bottom-cta">
        <h2>Ready to start?</h2>
        <p>Create a plan, answer onboarding, and get your first draft.</p>
        <div className="link-row marketing-cta-row">
          <Link className="plan-open-cta" href="/signup">
            Create an account
          </Link>
          <Link className="marketing-cta-secondary" href="/login">
            Log in
          </Link>
        </div>
        <p className="marketing-fineprint">
          Not medical advice. If you’re injured or unsure, talk to a qualified professional.
        </p>
        <p className="marketing-fineprint">
          <a href="https://github.com/tomteece/tomteece.github.io" target="_blank" rel="noreferrer noopener">
            Source code on GitHub
          </a>
          .
        </p>
      </section>
    </>
  );
}
