# UI Text Replacement Map

## Scope
This map covers copy standardisation for UK spelling, practical coaching voice, and consistent product terminology.

| File | Current text | New text | Rationale |
|---|---|---|---|
| `src/app/layout.tsx` | `Login` | `Log in` | UK/UX verb form consistency. |
| `src/app/layout.tsx` | `AI Personalised Training Plans` (template title) | Keep in metadata only | Preserve SEO discoverability while keeping visible branding human-first. |
| `src/app/page.tsx` | `Personalized climbing blocks, generated in minutes.` | `Personalised climbing blocks, built around your week.` | UK spelling and practical positioning. |
| `src/app/page.tsx` | Hero lede with “generate … then iterate …” | `Answer a short onboarding questionnaire to build a structured plan, adjust sessions with coach chat, and track what you complete.` | Clearer outcome-focused flow. |
| `src/app/page.tsx` | `Create a plan` | `Create your plan` | Direct user-oriented phrasing. |
| `src/app/page.tsx` | `Generate your block` | `Build your block` | Reduces mechanical wording while retaining intent. |
| `src/app/page.tsx` | `Iterate and complete` | `Adjust and complete` | Coaching language and practical tone. |
| `src/app/page.tsx` | `Structured plans are generated with strict schemas...` | `Consistent session structure that is easy to scan and follow.` | Less technical jargon on marketing page. |
| `src/app/page.tsx` | `Plan-scoped onboarding` | `Plan-specific onboarding` | Natural user-facing wording. |
| `src/app/page.tsx` | `Coach chat tweaks` | `Coach chat adjustments` | More approachable phrasing. |
| `src/app/page.tsx` | `Regenerate safely` | `Safe regeneration` | Noun phrase aligns with feature-card style. |
| `src/app/page.tsx` | `Designed for reality` | `Built for real schedules` | More concrete benefit framing. |
| `src/app/opengraph-image.tsx` | `Personalized ...` | `Personalised ...` | UK spelling consistency in social assets. |
| `src/app/twitter-image.tsx` | `Personalized ...` | `Personalised ...` | UK spelling consistency in social assets. |
| `src/app/signup/page.tsx` | `personalized climbing plans` | `personalised climbing plans` | UK spelling consistency. |
| `src/app/dashboard/page.tsx` | `tune sessions` | `adjust sessions` | Align with practical coaching language. |
| `src/components/generate-plan-button.tsx` | `Generating your plan...` | Keep | Already practical and concise. |
| `src/components/plan-chat-panel.tsx` | `Apply as tweak` | Keep | Matches existing feature terminology and backend action. |
| `src/components/plan-completion-view.tsx` | `Summary` | Keep | Already aligned with simplified naming. |

## Notes
- AI/intelligent language remains in metadata only.
- No API, schema, or route changes are required for this copy pass.
