import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createRemoteJWKSet, jwtVerify } from "jose";
import profileRouter from "./routes/profile";
import planRouter from "./routes/plan";

const app = express();
const PORT = process.env.PORT || 3001;
const NEON_AUTH_URL = process.env.NEON_AUTH_URL;

// Build JWKS verifier from Neon Auth public keys
const JWKS = NEON_AUTH_URL
  ? createRemoteJWKSet(new URL(`${NEON_AUTH_URL}/.well-known/jwks.json`))
  : null;

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
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

app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
