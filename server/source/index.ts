import "dotenv/config";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createRemoteJWKSet, jwtVerify } from "jose";
import profileRouter from "./routes/profile";
import planRouter from "./routes/plan";
import workoutsRouter from "./routes/workouts";
import mealsRouter from "./routes/meals";

const app = express();
// trust proxy: false = Node is exposed directly (no Nginx/reverse proxy).
// If a proxy is added in front, change to: app.set("trust proxy", 1)
// and configure the proxy to set X-Forwarded-For correctly.
// Without this, rate limiting would use proxy IP (rate-limit entire user base as one).
app.set("trust proxy", false);
const PORT = process.env.PORT || 3001;
const NEON_AUTH_URL = process.env.NEON_AUTH_URL;

// Build JWKS verifier from Neon Auth public keys
const JWKS = NEON_AUTH_URL
  ? createRemoteJWKSet(new URL(`${NEON_AUTH_URL}/.well-known/jwks.json`))
  : null;

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "script-src": ["'self'"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "img-src": ["'self'", "data:", "https:"],
      "connect-src": ["'self'", ...(process.env.NEON_AUTH_URL ? [process.env.NEON_AUTH_URL] : [])],
      "frame-ancestors": ["'none'"],
    },
  },
  strictTransportSecurity: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
  frameguard: { action: "deny" },
}));

// Global rate limit: 200 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use(globalLimiter);

app.use(express.json());
app.use(cookieParser());

// Middleware: verify Neon Auth JWT and attach userId to request
app.use(async (req, _res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token || !JWKS) {
    next();
    return;
  }
  try {
    const { payload } = await jwtVerify(token, JWKS);
    const userId = (payload.sub ?? (payload as any).userId) as string | undefined;
    if (userId) {
      (req as any).userId = userId;
    }
  } catch {
    // Invalid/expired token — routes will return 401
  }
  next();
});

app.use("/api/profile", profileRouter);
app.use("/api/plan", planRouter);
app.use("/api/workouts", workoutsRouter);
app.use("/api/meals", mealsRouter);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
