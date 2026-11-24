# ReportFix

**Campus Issue Triage, Deduplication & Community Verification Console**

ReportFix is a full-stack Next.js application built for campus facilities and safety operations. It combines AI-assisted semantic intake (multilingual and noisy text support via Gemini) with a deterministic rules engine for routing, priority scoring, prompt-injection defense, trust weighting, and anti-brigading community verification.

---

## Key Features

- **Role-Based Workspaces & Live Persona Switcher**
  - **Student Workspace:** Submit natural-language issue reports (supporting English, Roman Urdu, and mixed/typo-heavy phrasing), resolve ambiguous campus locations, join existing open tickets, and vote (`CONFIRM` / `DISPUTE`) when staff mark issues resolved.
  - **Department Staff Queue:** Department-scoped queues (`EE`, `CSE`, `IS`, `Library`, `Cafeteria`, `Labs`) with lifecycle transitions (`OPEN` → `IN_PROGRESS` → `RESOLVED` → `VERIFIED_RESOLVED` / `REOPENED` / `DISMISSED_SPAM`).
  - **Admin Oversight Console:** Cross-department telemetry, priority override controls with audit reason, brigading/security alert review, and AI-generated executive briefings.
- **Deterministic Rules Engine & Security Guardrails**
  - **Pre-Screening & Prompt-Injection Defense:** Detects rule-override and priority-hijack directives in raw report text and enforces deterministic scoring instead of trusting injected instructions.
  - **Campus Location Registry:** Resolves aliases, room numbers, and fuzzy matches across campus buildings while flagging ambiguous or nonexistent locations for student clarification.
  - **Trust-Weighted Community Verification:** Tracks user trust scores (`Trusted`, `Standard`, `Developing`, `Low trust`, `Restricted`) and weights crowd support and resolution votes accordingly.
  - **Rate Limiting & Anti-Brigading:** Enforces per-user submission rate limits and holds suspicious coordinated actions for admin inspection.
- **Resilient AI Triage (`gemini-3.8-flash`)**
  - Uses Vercel AI SDK (`@ai-sdk/google`) with structured Zod schemas for multi-item extraction, safety hazard verification, semantic duplicate matching, and admin briefings—with deterministic fallbacks when `GOOGLE_GENERATIVE_AI_API_KEY` is absent.

---

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack), React 19, TypeScript 5
- **Styling & UI:** Tailwind CSS 4, Lucide React, Recharts
- **AI & Validation:** Vercel AI SDK (`ai`, `@ai-sdk/google`), Zod 4
- **Storage:** Local JSON persistence (`data/reportfix-db.json`, auto-seeded and gitignored) + optional Firebase Admin helper (`src/lib/firebase-admin.ts`)

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials locally (never commit `.env.local`):

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
| --- | --- | --- |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Optional | Gemini API key for AI extraction, semantic dedup, and admin briefings. Deterministic fallbacks run if omitted. |
| `FIREBASE_PROJECT_ID` | Optional | Firebase project ID (used by `src/lib/firebase-admin.ts`). |
| `FIREBASE_CLIENT_EMAIL` | Optional | Firebase service account client email. |
| `FIREBASE_PRIVATE_KEY` | Optional | Firebase service account private key (escaped `\n` newlines). |

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Scripts & Verification

```bash
# Run ESLint
npm run lint

# Type-check with TypeScript
npx tsc --noEmit

# Production build
npm run build
```

### Adversarial Live-Attack Test Suite

With the development server running at `http://localhost:3000`, run the automated end-to-end adversarial test suite:

```bash
node scripts/live-attack-test.mjs
```

---

## Project Structure

```text
├── public/                     # Static SVG assets
├── scripts/
│   └── live-attack-test.mjs    # End-to-end adversarial API & rules verification suite
├── src/
│   ├── app/
│   │   ├── api/                # Next.js App Router API endpoints (health, state, reports, issues, admin, users, reset)
│   │   ├── globals.css         # Tailwind CSS & theme tokens
│   │   ├── layout.tsx          # Root layout & metadata
│   │   └── page.tsx            # Main application shell
│   ├── components/             # UI workspaces (Student, Staff, Admin, Sidebar, JudgeBar)
│   └── lib/
│       ├── ai-triage.ts        # Gemini structured extraction, semantic dedup & briefing logic
│       ├── campus-registry.ts  # Campus locations, aliases, and fuzzy matching
│       ├── firebase-admin.ts   # Singleton Firebase Admin / Firestore helper
│       ├── rules-engine.ts     # Deterministic scoring, trust weights & security pre-screening
│       ├── store.ts            # Local JSON store with write locking & seed data
│       ├── types.ts            # Shared TypeScript interfaces
│       └── ui-contract.ts      # UI contract helpers & labels
├── .env.example                # Sanitized environment variable template
├── .gitignore                  # Excludes .env*, runtime data, node_modules, build artifacts
└── package.json
```

---

## License

This project is licensed under the [MIT License](LICENSE).
