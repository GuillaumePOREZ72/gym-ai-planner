# Copilot Instructions

## Project

An AI-powered gym workout planner (PERN stack). Users authenticate via Neon Auth, complete an onboarding questionnaire, and receive an AI-generated training plan (via OpenRouter). The repo is a monorepo with a `/client` (Vite + React) and a `/server` (Node.js/Express + Prisma).

## Project Structure

```
/root
├── /server
│   ├── /prisma/schema.prisma
│   └── /source
│       ├── /lib
│       │   ├── prisma.ts       # Prisma client singleton (PrismaPg adapter)
│       │   └── ai.ts           # Prompt engineering + OpenRouter calls
│       ├── /routes
│       │   ├── profile.ts      # POST /api/profile (upsert)
│       │   └── plan.ts         # POST /api/plan/generate
│       └── index.ts
└── /client
    └── /src
        ├── /components
        │   ├── /layout         # Navbar
        │   ├── /plan           # PlanDisplay, ExerciseRow
        │   └── /ui             # Button, Card, Input, Select, Textarea
        ├── /context            # AuthContext.tsx
        ├── /lib                # api.ts (fetch wrappers)
        ├── /pages              # Home, Onboarding, Profile, Auth, Account
        └── /types              # Centralized TypeScript interfaces
```

## Commands

```bash
# Client
npm run dev       # Vite dev server (HMR)
npm run build     # tsc -b && vite build
npm run lint      # ESLint
npm run preview   # Preview production build

# Server
npx tsx source/index.ts   # Run dev server
npx prisma migrate dev    # Apply schema migrations
npx prisma generate       # Regenerate Prisma client
```

No test suite exists yet.

## Environment Variables

**Client (`.env`):**
- `VITE_API_URL` — backend base URL
- `VITE_NEON_AUTH_URL` — Neon Auth endpoint

**Server (`.env`):**
- `DATABASE_URL` — Neon PostgreSQL connection string
- `OPENROUTER_API_KEY`
- `PORT=3001`

## Database Schema (Prisma)

Use native PostgreSQL types for all fields. The two core models:

```prisma
model UserProfiles {
  userId         String   @id @db.Uuid
  goal           String   @db.VarChar(20)
  experience     String   @db.VarChar(20)
  daysPerWeek    Int
  sessionLength  Int
  equipment      String   @db.VarChar(20)
  preferredSplit String   @db.VarChar(20)
  injuries       String?  @db.Text
  updatedAt      DateTime @default(now()) @updatedAt @db.Timestamp(6)
}

model TrainingPlans {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @db.Uuid
  planJson  Json
  planText  String   @db.Text
  version   Int      @default(1)
  createdAt DateTime @default(now()) @db.Timestamp(6)
  @@index([userId])
}
```

## Backend Conventions

**Prisma client** (`server/source/lib/prisma.ts`) — use `@prisma/adapter-pg` for Neon compatibility:
```typescript
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });
```

**`POST /api/profile`** — use `upsert`. Must return the full saved record so the frontend can confirm persistence before triggering plan generation (prevents race condition).

**`POST /api/plan/generate`** — validate profile existence with `findUnique` first. If a plan already exists for this user, increment `version` before storing the new AI-generated JSON.

## AI / Prompt Engineering

**Never pass raw enum values to the model.** Use semantic mapping dictionaries in `server/source/lib/ai.ts`:

```typescript
const GoalMap    = { bulk: "build muscle and gain size", cut: "lose fat and maintain muscle" };
const ExpMap     = { beginner: "0-1 years of experience, focus on form", advanced: "5+ years, high intensity" };
const EquipmentMap = { dumbbells: "access to only a pair of dumbbells", home: "limited bodyweight and basic equipment" };
```

**`normalizeProfileData`** — sanitize profile before every AI call; apply defaults (`goal: "bulk"`, `experience: "intermediate"`) for missing/corrupt fields.

**OpenRouter config:**
- Base URL: `https://openrouter.ai/api/v1`
- Model: `nvidia/mitron-3-nano-free`
- System prompt: `"Vous êtes un expert fitness. Répondez exclusivement en JSON pur. Structure : overview, weeklySchedule (array d'objets exercises), progression."`
- Constraints: RPE 6–9, 4–6 exercises per session, compound movements prioritized, include `alternatives` array when `injuries` is set.

## Auth & Race Condition Prevention

**`AuthContext.tsx`** — guard concurrent refreshes with a ref:
```typescript
const isRefreshingRef = useRef(false);
const refreshData = async () => {
  if (isRefreshingRef.current) return;
  isRefreshingRef.current = true;
  try {
    // fetch profile then plan sequentially (not in parallel)
  } finally {
    isRefreshingRef.current = false;
  }
};
```

**Onboarding** — `await saveProfile(...)` must resolve and be confirmed before calling `generatePlan(...)`. Never fire both concurrently.

**Neon Auth components:**
- `AuthView` — pass `pathName` from `useParams()` to switch between `/signin` and `/signup`
- `/account` page — delegate to `AccountView` from `@neondatabase/neon-js` for email/password management

## Frontend Conventions

**Component patterns:**
- UI primitives in `src/components/ui/` use `React.forwardRef` and extend native HTML element props
- `Button` accepts `variant` (`primary` | `outline` | `ghost` | `danger`) and `size` (`sm` | `md` | `lg` | `icon`) — follow this pattern for new primitives
- Pages: default exports. UI components: named exports.

**Styling:**
- Tailwind CSS v4 via `@tailwindcss/vite`; imported with `@import "@tailwindcss/"` in `index.css`
- Always use design tokens (CSS variables) — never hardcode hex values

**Design tokens** (defined in `src/index.css` `@theme`):

| Token                   | Value       | Usage                        |
|-------------------------|-------------|------------------------------|
| `--color-background`    | `#0a0a0a`   | Page background              |
| `--color-foreground`    | `#fafafa`   | Primary text                 |
| `--color-muted`         | `#a1a1aa`   | Secondary/placeholder text   |
| `--color-border`        | `#27272a`   | Borders, dividers, skeletons |
| `--color-card`          | `#18181b`   | Card/surface background      |
| `--color-accent`        | `#a3e635`   | Primary CTA, highlights      |
| `--color-accent-hover`  | `#84cc16`   | Hover state for accent       |
| `--font-sans`           | `"Geist"`   | All text                     |

**TypeScript:** strict mode, `noUnusedLocals`, `noUnusedParameters` — unused variables are compile errors.

## Plan Display UI

**`PlanDisplay`** maps `weeklySchedule` and renders each exercise via `ExerciseRow`.

**RPE badge colors** (10% background opacity for readability):
```
RPE >= 8  →  bg-red-500/10 text-red-400 border-red-500/20
RPE >= 7  →  bg-yellow-500/10 text-yellow-400 border-yellow-500/20
default   →  bg-green-500/10 text-green-400 border-green-500/20
```

**`ExerciseRow`** must include:
1. Index (`index + 1`)
2. Exercise name + `Info` icon (Lucide) if notes exist
3. Sets × reps format (e.g. `3 x 8-12`)
4. Rest time + RPE badge
5. Alternatives section (hidden/tooltip) when `injuries` is set

**Regenerate button** — set local `isGenerating` state and show `<Loader2 className="animate-spin" />` during AI call.
