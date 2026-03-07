import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import profileRouter from "./routes/profile";
import planRouter from "./routes/plan";

const app = express();
const PORT = process.env.PORT || 3001;
const NEON_AUTH_URL = process.env.NEON_AUTH_URL;

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Middleware: verify Neon Auth session token and attach userId to request
app.use(async (req, _res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token || !NEON_AUTH_URL) {
    next();
    return;
  }
  try {
    const response = await fetch(`${NEON_AUTH_URL}/get-session`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok) {
      const data = await response.json() as { user?: { id: string } };
      if (data?.user?.id) {
        (req as any).userId = data.user.id;
      }
    }
  } catch {
    // Invalid token — continue without userId (routes will return 401)
  }
  next();
});

app.use("/api/profile", profileRouter);
app.use("/api/plan", planRouter);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
