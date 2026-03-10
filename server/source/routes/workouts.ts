import { Router, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { generateWorkoutInsight } from "../lib/ai";

const router = Router();

// GET /api/workouts — list workouts for the authenticated user
router.get("/", async (req: Request, res: Response) => {
  const userId: string | undefined = (req as any).userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const workouts = await prisma.workout.findMany({
      where: { userId },
      orderBy: { date: "desc" },
    });
    res.json({ workouts });
  } catch {
    res.status(500).json({ error: "Failed to fetch workouts" });
  }
});

// POST /api/workouts — create a workout and generate AI insight
router.post("/", async (req: Request, res: Response) => {
  const userId: string | undefined = (req as any).userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { date, type, duration, calories } = req.body as {
    date: string;
    type: string;
    duration: number;
    calories: number;
  };
  if (!date || !type || duration == null || calories == null) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  let aiInsight: string | undefined;
  try {
    aiInsight = await generateWorkoutInsight({ type, duration, calories });
  } catch {
    // Non-fatal: proceed without AI insight
  }

  try {
    const workout = await prisma.workout.create({
      data: { userId, date, type, duration: Number(duration), calories: Number(calories), aiInsight },
    });
    res.status(201).json({ workout });
  } catch {
    res.status(500).json({ error: "Failed to create workout" });
  }
});

// DELETE /api/workouts/:id
router.delete("/:id", async (req: Request, res: Response) => {
  const userId: string | undefined = (req as any).userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = req.params.id as string;
  try {
    const workout = await prisma.workout.findUnique({ where: { id } });
    if (!workout || workout.userId !== userId) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    await prisma.workout.delete({ where: { id } });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Failed to delete workout" });
  }
});

export default router;
