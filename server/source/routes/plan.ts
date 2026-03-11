import { Router, Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { prisma } from "../lib/prisma";
import { generateTrainingPlan } from "../lib/ai";

const router = Router();

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "AI plan generation limit reached. Try again in an hour." },
});

router.post("/generate", aiLimiter, async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const profile = await prisma.userProfiles.findUnique({ where: { userId } });
    if (!profile) {
      res.status(404).json({ error: "Profile not found. Complete onboarding first." });
      return;
    }

    const { planJson, planText } = await generateTrainingPlan(profile);

    const existing = await prisma.trainingPlans.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    const plan = await prisma.trainingPlans.create({
      data: {
        userId,
        planJson,
        planText,
        version: existing ? existing.version + 1 : 1,
      },
    });

    res.json({ plan });
  } catch (err) {
    next(err);
  }
});

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const plan = await prisma.trainingPlans.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ plan });
  } catch (err) {
    next(err);
  }
});

export default router;
