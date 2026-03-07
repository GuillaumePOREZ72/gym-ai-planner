import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  const userId: string | undefined = (req as any).userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const profile = await prisma.userProfiles.findUnique({ where: { userId } });
  res.json({ profile });
});

router.post("/", async (req: Request, res: Response) => {
  const userId: string | undefined = (req as any).userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { goal, experience, daysPerWeek, sessionLength, equipment, preferredSplit, injuries } = req.body;

  if (!goal || !experience || !daysPerWeek || !sessionLength || !equipment || !preferredSplit) {
    res.status(400).json({ error: "Missing required profile fields" });
    return;
  }

  const profile = await prisma.userProfiles.upsert({
    where: { userId },
    update: { goal, experience, daysPerWeek: Number(daysPerWeek), sessionLength: Number(sessionLength), equipment, preferredSplit, injuries: injuries || null },
    create: { userId, goal, experience, daysPerWeek: Number(daysPerWeek), sessionLength: Number(sessionLength), equipment, preferredSplit, injuries: injuries || null },
  });

  // Return full record so client confirms persistence before generating plan
  res.json({ profile });
});

export default router;
