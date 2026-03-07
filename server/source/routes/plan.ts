import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { generateTrainingPlan } from "../lib/ai";

const router = Router();

router.post("/generate", async (req: Request, res: Response) => {
  const userId: string | undefined = (req as any).userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

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
});

router.get("/", async (req: Request, res: Response) => {
  const userId: string | undefined = (req as any).userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const plan = await prisma.trainingPlans.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  res.json({ plan });
});

export default router;
