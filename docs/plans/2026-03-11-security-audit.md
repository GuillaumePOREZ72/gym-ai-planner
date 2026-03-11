# Security Audit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Audit and harden the gym-ai-planner application (Express backend + React frontend) against real-world attack vectors before VPS deployment, following OWASP Top 10 priorities relevant to this stack.

**Architecture:** Express 5 API behind JWT auth (Neon/JWKS), React SPA served statically or from the same VPS. Node is exposed directly (no Nginx), so all HTTP security headers and TLS hardening must happen in Node itself. Fixes are applied incrementally: each task is self-contained, tested, and committed independently.

**Tech Stack:** Express 5, TypeScript, Prisma + Neon PostgreSQL, Zod (to add), Helmet.js (to add), express-rate-limit (to add), jose (JWT), React 19 + Vite, Tailwind CSS v4.

---

## Scope

| # | Area | OWASP ref | Severity |
|---|------|-----------|----------|
| 1 | HTTP security headers (Helmet) | A05 Security Misconfiguration | High |
| 2 | Rate limiting on all routes | A04 Insecure Design | High |
| 3 | Input validation with Zod | A03 Injection / A01 Broken Access Control | High |
| 4 | CORS hardening for production | A05 Security Misconfiguration | High |
| 5 | `express.json()` body size limit | A05 / DoS | Medium |
| 6 | Error leakage masking in prod | A05 Security Misconfiguration | Medium |
| 7 | Frontend env vars audit (no secrets via VITE_*) | A02 Cryptographic Failures | Medium |
| 8 | HTTPS / TLS for Node direct | A02 Cryptographic Failures | High |
| 9 | `npm audit` — dependency CVEs | A06 Vulnerable Components | Medium |
| 10 | JWT middleware edge-case review | A07 Auth Failures | Medium |

---

## Task 1: Install security dependencies

**Files:**
- Modify: `server/package.json`

**Step 1: Install Helmet, express-rate-limit, Zod**

```bash
cd server && npm install helmet express-rate-limit zod
npm install --save-dev @types/helmet
```

**Step 2: Verify install**

```bash
cd server && npm ls helmet express-rate-limit zod
```

Expected: all three listed without errors.

**Step 3: Commit**

```bash
git add server/package.json server/package-lock.json
git commit -m "chore(security): install helmet, express-rate-limit, zod"
```

---

## Task 2: Add HTTP security headers with Helmet

**Files:**
- Modify: `server/source/index.ts`

**Context:** Helmet sets ~14 security-related HTTP headers in one call:
- `Strict-Transport-Security` (HSTS) — forces HTTPS
- `X-Content-Type-Options: nosniff` — prevents MIME sniffing
- `X-Frame-Options: DENY` — prevents clickjacking
- `Referrer-Policy: no-referrer`
- `X-Permitted-Cross-Domain-Policies: none`
- `Content-Security-Policy` — restricts resource loading

Since Node is exposed directly (no Nginx), this is critical.

**Step 1: Add Helmet to `server/source/index.ts`**

Add the import at the top:
```typescript
import helmet from "helmet";
```

Add helmet **before** cors, as the first middleware after `const app = express()`:
```typescript
app.use(helmet({
  // CSP: allow same-origin + Neon auth domain for scripts/styles
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.NEON_AUTH_URL ?? ""],
    },
  },
  // HSTS: 1 year, include subdomains
  strictTransportSecurity: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
}));
```

**Step 2: Start server and verify headers appear**

```bash
cd server && npm run dev &
curl -I http://localhost:3001/health
```

Expected output includes:
```
x-content-type-options: nosniff
x-frame-options: DENY
strict-transport-security: max-age=31536000; includeSubDomains
```

Kill the dev server after verifying.

**Step 3: Commit**

```bash
git add server/source/index.ts
git commit -m "feat(security): add Helmet HTTP security headers"
```

---

## Task 3: Rate limiting

**Files:**
- Modify: `server/source/index.ts`

**Context:** Without rate limiting, an attacker can:
- Spam `/api/plan/generate` → exhaust OpenRouter API credits
- Brute-force any endpoint
- Cause DoS via cheap requests

We apply two tiers:
- **Global limiter:** 200 req/15min per IP for all routes
- **Strict AI limiter:** 10 req/hour per IP for `/api/plan/generate` (expensive LLM call)

**Step 1: Add rate limiters to `server/source/index.ts`**

Add import:
```typescript
import rateLimit from "express-rate-limit";
```

Add global limiter after helmet, before other middleware:
```typescript
// Global rate limit: 200 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,   // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use(globalLimiter);
```

Add strict AI limiter to plan route specifically (add it in `server/source/routes/plan.ts`):
```typescript
import rateLimit from "express-rate-limit";

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "AI plan generation limit reached. Try again in an hour." },
});

// Apply before the POST handler
router.post("/generate", aiLimiter, async (req, res) => { ... });
```

**Step 2: Verify rate limit headers**

```bash
cd server && npm run dev &
curl -I http://localhost:3001/health
```

Expected: `RateLimit-Limit: 200` header present.

Kill dev server.

**Step 3: Commit**

```bash
git add server/source/index.ts server/source/routes/plan.ts
git commit -m "feat(security): add global and AI-specific rate limiting"
```

---

## Task 4: Input validation with Zod on all POST routes

**Files:**
- Modify: `server/source/routes/workouts.ts`
- Modify: `server/source/routes/meals.ts`
- Modify: `server/source/routes/profile.ts`
- Modify: `server/source/routes/plan.ts` (no body, nothing to add)

**Context:** Currently the routes do manual `if (!field)` checks with no type coercion validation or length limits. Zod enforces:
- Field presence and type (not just truthiness)
- String length limits (prevent DB column overflow and abuse)
- Numeric bounds (no negative calories, no 9999-hour workouts)
- Date format (ISO 8601 `YYYY-MM-DD`)

**Step 1: Add Zod schemas to `server/source/routes/workouts.ts`**

Add at top:
```typescript
import { z } from "zod";

const CreateWorkoutSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  type: z.string().min(1).max(100),
  duration: z.number().int().min(1).max(600),  // max 10h session
  calories: z.number().int().min(0).max(10000),
});
```

Replace the manual destructuring/check in POST handler:
```typescript
const parsed = CreateWorkoutSchema.safeParse(req.body);
if (!parsed.success) {
  res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  return;
}
const { date, type, duration, calories } = parsed.data;
```

**Step 2: Add Zod schemas to `server/source/routes/meals.ts`**

Add at top:
```typescript
import { z } from "zod";

const CreateMealSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  name: z.string().min(1).max(200),
  calories: z.number().int().min(0).max(10000),
  protein: z.number().min(0).max(1000),
  carbs: z.number().min(0).max(1000),
  fat: z.number().min(0).max(1000),
});
```

Replace the manual check in POST handler:
```typescript
const parsed = CreateMealSchema.safeParse(req.body);
if (!parsed.success) {
  res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  return;
}
const { date, name, calories, protein, carbs, fat } = parsed.data;
```

**Step 3: Add Zod schemas to `server/source/routes/profile.ts`**

```typescript
import { z } from "zod";

const VALID_GOALS = ["bulk", "cut", "recomp", "strength", "endurance"] as const;
const VALID_EXPERIENCE = ["beginner", "intermediate", "advanced"] as const;
const VALID_EQUIPMENT = ["full_gym", "home", "dumbbells"] as const;
const VALID_SPLITS = ["full", "upper_lower", "push_pull", "chest_back", "legs_arms"] as const;

const CreateProfileSchema = z.object({
  goal: z.enum(VALID_GOALS),
  experience: z.enum(VALID_EXPERIENCE),
  daysPerWeek: z.number().int().min(1).max(7),
  sessionLength: z.number().int().min(15).max(240),
  equipment: z.enum(VALID_EQUIPMENT),
  preferredSplit: z.enum(VALID_SPLITS),
  injuries: z.string().max(500).nullable().optional(),
});
```

Replace the manual check in POST handler:
```typescript
const parsed = CreateProfileSchema.safeParse(req.body);
if (!parsed.success) {
  res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  return;
}
const { goal, experience, daysPerWeek, sessionLength, equipment, preferredSplit, injuries } = parsed.data;
```

**Step 4: Build to check TypeScript**

```bash
cd server && npm run build
```

Expected: no TypeScript errors.

**Step 5: Commit**

```bash
git add server/source/routes/
git commit -m "feat(security): add Zod input validation on all POST routes"
```

---

## Task 5: CORS hardening + body size limit

**Files:**
- Modify: `server/source/index.ts`
- Modify: `server/.env.example`

**Context — CORS:**
Currently: `origin: process.env.CLIENT_URL || "http://localhost:5173"`. This is already correct for single-origin. But we need to ensure that in production, `CLIENT_URL` is set to the exact VPS domain (e.g. `https://app.mydomain.com`). We also add an explicit `allowedHeaders` whitelist and `methods` list.

**Context — Body size:**
`express.json()` with no limit accepts arbitrarily large JSON bodies. Default Express limit is 100kb, but it's better to be explicit and restrictive (our largest payload is a profile form, < 1kb).

**Step 1: Harden CORS config in `server/source/index.ts`**

Replace:
```typescript
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
```

With:
```typescript
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173").split(",").map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl in dev)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
```

This also supports comma-separated origins in `CLIENT_URL` for multi-domain prod setups.

**Step 2: Add body size limit to `express.json()`**

Replace:
```typescript
app.use(express.json());
```

With:
```typescript
app.use(express.json({ limit: "16kb" }));
```

**Step 3: Update `.env.example` to document multi-origin support**

Add comment to `CLIENT_URL` line:
```
# Allowed CORS origins (comma-separated for multiple domains)
# Production example: CLIENT_URL=https://app.mydomain.com
CLIENT_URL=http://localhost:5173
```

**Step 4: Commit**

```bash
git add server/source/index.ts server/.env.example
git commit -m "feat(security): harden CORS config and add body size limit"
```

---

## Task 6: Error leakage masking in production

**Files:**
- Modify: `server/source/index.ts`
- Modify: `server/source/routes/profile.ts`
- Modify: `server/source/routes/plan.ts`

**Context:** Currently several routes have bare `try/catch` with empty catch blocks or generic 500. However, `plan.ts` and `profile.ts` have no try/catch at all — if Prisma throws, Express 5 will propagate the error. Express 5 has async error handling built-in, but without a global error handler the default response may leak a stack trace.

We add a global error handler that logs the full error server-side but returns a generic 500 to the client in production.

**Step 1: Add global error handler to `server/source/index.ts`**

Add **after all routes** (important: error middleware has 4 params):
```typescript
// Global error handler — must be last middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const isProd = process.env.NODE_ENV === "production";
  console.error("[error]", err.message, isProd ? "" : err.stack);
  res.status(500).json({
    error: isProd ? "Internal server error" : err.message,
  });
});
```

**Step 2: Wrap uncaught Prisma calls in plan.ts with try/catch**

In `plan.ts`, the `POST /generate` and `GET /` handlers have no try/catch. Wrap both:

```typescript
router.post("/generate", aiLimiter, async (req: Request, res: Response) => {
  const userId: string | undefined = (req as any).userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    const profile = await prisma.userProfiles.findUnique({ where: { userId } });
    if (!profile) { res.status(404).json({ error: "Profile not found. Complete onboarding first." }); return; }
    const { planJson, planText } = await generateTrainingPlan(profile);
    const existing = await prisma.trainingPlans.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
    const plan = await prisma.trainingPlans.create({
      data: { userId, planJson, planText, version: existing ? existing.version + 1 : 1 },
    });
    res.json({ plan });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate plan" });
  }
});
```

Similarly wrap `GET /` in plan.ts.

**Step 3: Wrap profile.ts GET and POST with try/catch**

Both handlers in `profile.ts` have no try/catch. Add around the Prisma calls.

**Step 4: Build**

```bash
cd server && npm run build
```

Expected: no errors.

**Step 5: Commit**

```bash
git add server/source/index.ts server/source/routes/plan.ts server/source/routes/profile.ts
git commit -m "feat(security): add global error handler and mask stack traces in prod"
```

---

## Task 7: Frontend env vars audit

**Files:**
- Read: `frontend/.env` (if exists) / `frontend/.env.example` (if exists)
- Read: `frontend/vite.config.ts`

**Context:** Vite bundles every `VITE_*` env var into the client-side JavaScript, making it readable by anyone who opens DevTools. We need to confirm:
1. No secret keys (API keys, database passwords) are in `VITE_*` vars
2. `VITE_NEON_AUTH_URL` — public URL, safe to expose
3. `VITE_API_URL` — public URL, safe to expose
4. The actual secrets (`OPENROUTER_API_KEY`, `DATABASE_URL`) live only in `server/.env`

**Step 1: Check what VITE_ vars are used in the frontend**

```bash
grep -r "VITE_" frontend/src/ --include="*.ts" --include="*.tsx"
```

Expected output: only `VITE_NEON_AUTH_URL` and `VITE_API_URL`.

**Step 2: Confirm server secrets are NOT in frontend .env**

```bash
grep -r "OPENROUTER\|DATABASE_URL\|sk-or-" frontend/ --include="*.env*" --include="*.ts" --include="*.tsx"
```

Expected: no output (no secrets in frontend).

**Step 3: Create `frontend/.env.example` if missing**

If there's no `frontend/.env.example`, create it:
```
# Neon Auth public URL (safe to expose — no secret)
VITE_NEON_AUTH_URL=https://<your-neon-host>/neondb/auth

# Backend API URL
VITE_API_URL=http://localhost:3001
```

**Step 4: Commit (if .env.example was created/modified)**

```bash
git add frontend/.env.example
git commit -m "docs(security): add frontend .env.example documenting safe VITE_ vars"
```

---

## Task 8: HTTPS / TLS hardening for Node direct

**Files:**
- Create: `server/source/https.ts` (HTTPS server wrapper)
- Modify: `server/source/index.ts`
- Create: `server/README-tls.md` (TLS setup instructions)

**Context:** Since Node is exposed directly (no Nginx), TLS termination must happen in Node. In production on the VPS, you'll need:
1. A TLS certificate (Let's Encrypt via `certbot` is free)
2. Node `https.createServer()` instead of `app.listen()`
3. HTTP → HTTPS redirect on port 80

We implement conditional HTTPS: if `TLS_CERT_PATH` and `TLS_KEY_PATH` env vars are set, the app starts in HTTPS mode; otherwise it falls back to HTTP (for local dev).

**Step 1: Modify `server/source/index.ts` for conditional HTTPS**

Replace `app.listen(...)` with:
```typescript
import fs from "fs";
import http from "http";
import https from "https";

const certPath = process.env.TLS_CERT_PATH;
const keyPath = process.env.TLS_KEY_PATH;

if (certPath && keyPath) {
  // Production: HTTPS mode
  const credentials = {
    cert: fs.readFileSync(certPath),
    key: fs.readFileSync(keyPath),
  };
  https.createServer(credentials, app).listen(PORT, () => {
    console.log(`Server running on https://0.0.0.0:${PORT}`);
  });

  // HTTP → HTTPS redirect on port 80
  const redirectApp = express();
  redirectApp.use((req, res) => {
    res.redirect(301, `https://${req.headers.host}${req.url}`);
  });
  http.createServer(redirectApp).listen(80, () => {
    console.log("HTTP → HTTPS redirect active on port 80");
  });
} else {
  // Development: HTTP mode
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
```

**Step 2: Update `.env.example`**

```
# TLS (production only — leave blank for local dev)
# Paths to your Let's Encrypt certificate files
TLS_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
TLS_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem
```

**Step 3: Create `server/README-tls.md` with VPS setup instructions**

```markdown
# TLS Setup on VPS (Let's Encrypt)

## Prerequisites
- Domain pointing to your VPS IP (A record)
- Port 80 and 443 open in VPS firewall

## Install certbot
```bash
sudo apt update && sudo apt install certbot
```

## Obtain certificate
```bash
sudo certbot certonly --standalone -d yourdomain.com
```

Certificates are saved to `/etc/letsencrypt/live/yourdomain.com/`.

## Set env vars on the server
```
TLS_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
TLS_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem
PORT=443
```

## Auto-renewal
```bash
sudo crontab -e
# Add: 0 0 * * * certbot renew --quiet && systemctl restart your-app
```
```

**Step 4: Build**

```bash
cd server && npm run build
```

**Step 5: Commit**

```bash
git add server/source/index.ts server/.env.example server/README-tls.md
git commit -m "feat(security): add conditional HTTPS/TLS support for VPS direct Node deployment"
```

---

## Task 9: Dependency CVE audit

**Files:** None (audit only, fix if issues found)

**Step 1: Audit server dependencies**

```bash
cd server && npm audit --audit-level=moderate
```

**Step 2: Audit frontend dependencies**

```bash
cd frontend && npm audit --audit-level=moderate
```

**Step 3: Fix any moderate/high/critical CVEs**

```bash
npm audit fix
# If breaking changes: npm audit fix --force (review changes carefully)
```

**Step 4: Commit if fixes were applied**

```bash
git add server/package-lock.json frontend/package-lock.json
git commit -m "fix(security): resolve npm dependency CVEs"
```

---

## Task 10: JWT middleware edge-case review

**Files:**
- Modify: `server/source/index.ts` (middleware)

**Context:** Current JWT middleware has two edge cases to review:

1. **Silent pass-through when JWKS is null:** If `NEON_AUTH_URL` is not set, `JWKS` is null and the middleware calls `next()` without setting `userId`. This means all routes will return 401 correctly — but only because each route individually checks `userId`. There's no defense-in-depth. If a developer adds a route and forgets the check, it's wide open.

2. **No `exp` claim enforcement check:** `jwtVerify` from `jose` validates expiry by default — but we should confirm `clockTolerance` is not accidentally widened.

3. **`(req as any).userId` pattern:** Attaching auth info to `req` via `any` cast is fragile. We should augment the Express `Request` type.

**Step 1: Create `server/source/types/express.d.ts` to type-augment Request**

```typescript
// Augment Express Request to include authenticated userId
declare namespace Express {
  interface Request {
    userId?: string;
  }
}
```

**Step 2: Replace all `(req as any).userId` with `req.userId`**

In `index.ts`:
```typescript
req.userId = userId;
```

In all route files (`workouts.ts`, `meals.ts`, `profile.ts`, `plan.ts`):
```typescript
const userId = req.userId;
```

**Step 3: Add startup guard for missing NEON_AUTH_URL**

In `server/source/index.ts`, after imports:
```typescript
if (!process.env.NEON_AUTH_URL && process.env.NODE_ENV === "production") {
  console.error("FATAL: NEON_AUTH_URL is not set in production. All routes will reject auth.");
  process.exit(1);
}
```

**Step 4: Build and verify TypeScript**

```bash
cd server && npm run build
```

Expected: no errors, no `any` casts for userId remaining.

**Step 5: Commit**

```bash
git add server/source/types/ server/source/index.ts server/source/routes/
git commit -m "feat(security): type-augment Express Request for userId, add prod NEON_AUTH_URL guard"
```

---

## Final verification

After all tasks are complete:

```bash
# Full build check
cd server && npm run build && cd ../frontend && npm run build

# Final security header check (start server briefly)
cd ../server && npm run dev &
sleep 2
curl -I http://localhost:3001/health
kill %1
```

Expected headers in response:
- `x-content-type-options: nosniff`
- `x-frame-options: DENY`
- `strict-transport-security: max-age=31536000; includeSubDomains`
- `ratelimit-limit: 200`

```bash
git log --oneline -10
```

Expected: 10 clean security commits.

---

## Summary of changes

| File | Changes |
|------|---------|
| `server/source/index.ts` | Helmet, rate limiter, CORS hardening, body limit, global error handler, HTTPS conditional, NEON_AUTH_URL guard |
| `server/source/routes/workouts.ts` | Zod validation, typed `req.userId` |
| `server/source/routes/meals.ts` | Zod validation, typed `req.userId` |
| `server/source/routes/profile.ts` | Zod validation, try/catch, typed `req.userId` |
| `server/source/routes/plan.ts` | Rate limiter on AI route, try/catch, typed `req.userId` |
| `server/source/types/express.d.ts` | Express Request type augmentation |
| `server/.env.example` | Document TLS vars + multi-origin CORS |
| `server/README-tls.md` | Let's Encrypt VPS setup guide |
| `frontend/.env.example` | Document VITE_ vars (created if missing) |
