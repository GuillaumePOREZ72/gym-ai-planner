import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";

const CreateProfileSchema = z.object({
  goal: z.enum(["bulk", "cut", "recomp", "strength", "endurance"]),
  experience: z.enum(["beginner", "intermediate", "advanced"]),
  daysPerWeek: z.number().int().min(1).max(7),
  sessionLength: z.number().int().min(15).max(240),
  equipment: z.enum(["full_gym", "home", "dumbbells"]),
  preferredSplit: z.enum(["full", "upper_lower", "push_pull", "chest_back", "legs_arms"]),
  injuries: z.string().max(500).nullable().optional(),
});

const router = Router();

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  const userId: string | undefined = (req as any).userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const profile = await prisma.userProfiles.findUnique({ where: { userId } });
    res.json({ profile });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  const userId: string | undefined = (req as any).userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = CreateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }
  const { goal, experience, daysPerWeek, sessionLength, equipment, preferredSplit, injuries } = parsed.data;

  try {
    const profile = await prisma.userProfiles.upsert({
      where: { userId },
      update: { goal, experience, daysPerWeek, sessionLength, equipment, preferredSplit, injuries: injuries ?? null },
      create: { userId, goal, experience, daysPerWeek, sessionLength, equipment, preferredSplit, injuries: injuries ?? null },
    });

    // Return full record so client confirms persistence before generating plan
    res.json({ profile });
  } catch (err) {
    next(err);
  }
});

export default router;
