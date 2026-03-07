import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { authClient } from "@neondatabase/neon-js";
import profileRouter from "./routes/profile";
import planRouter from "./routes/plan";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Middleware: verify Neon Auth session and attach userId to request
app.use(async (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    next();
    return;
  }
  try {
    const session = await authClient.verifyToken(token);
    if (session?.userId) {
      (req as any).userId = session.userId;
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
