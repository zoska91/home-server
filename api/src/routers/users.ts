import { Router, Request, Response } from "express";
import { prisma } from "../db/prisma";
import { MESSAGES } from "../messages";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  const { discord_id, username, display_name, avatar, is_ai } = req.body;

  const existing = await prisma.user.findUnique({ where: { discordId: discord_id } });
  if (existing) return res.json(toResponse(existing));

  const user = await prisma.user.create({
    data: { discordId: discord_id, username, displayName: display_name, avatar, isAi: is_ai ?? false },
  });
  return res.status(201).json(toResponse(user));
});

router.get("/:discord_id", async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({ where: { discordId: req.params["discord_id"] } });
  if (!user) return res.status(404).json({ detail: MESSAGES.USER_NOT_FOUND });
  return res.json(toResponse(user));
});

function toResponse(user: { id: number; discordId: string; username: string; isAdmin: boolean; isAi: boolean; createdAt: Date }) {
  return {
    id: user.id,
    discord_id: user.discordId,
    username: user.username,
    is_admin: user.isAdmin,
    is_ai: user.isAi,
    created_at: user.createdAt,
  };
}

export default router;
