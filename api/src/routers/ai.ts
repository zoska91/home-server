import { Router, Request, Response } from "express";
import { prisma } from "../db/prisma";
import { getActionType } from "../services/aiService";
import { MESSAGES } from "../messages";

const router = Router();

router.post("/message", async (req: Request, res: Response) => {
  const { text, discord_id } = req.body as { text: string; discord_id: string };

  const user = await prisma.user.findUnique({ where: { discordId: discord_id } });
  if (!user || !user.isAi) {
    return res.json({ reply: MESSAGES.NO_AI_ACCESS });
  }

  const result = await getActionType(text, discord_id);
  return res.json(result);
});

export default router;
