import { Router, Request, Response } from "express";
import { prisma } from "../db/prisma";
import { MESSAGES } from "../messages";

const router = Router();

// Products
router.get("/products", async (_req: Request, res: Response) => {
  const products = await prisma.shoppingProduct.findMany();
  return res.json(products);
});

router.post("/products", async (req: Request, res: Response) => {
  const { name } = req.body;
  const existing = await prisma.shoppingProduct.findUnique({ where: { name } });
  if (existing) return res.status(400).json({ detail: MESSAGES.PRODUCT_ALREADY_EXISTS });

  const product = await prisma.shoppingProduct.create({ data: { name } });
  return res.status(201).json(product);
});

// Shopping list
router.get("/list", async (_req: Request, res: Response) => {
  const items = await prisma.shoppingListItem.findMany({ include: { product: true } });
  return res.json(items);
});

router.post("/list", async (req: Request, res: Response) => {
  const { product_id } = req.body;
  const product = await prisma.shoppingProduct.findUnique({ where: { id: product_id } });
  if (!product) return res.status(404).json({ detail: MESSAGES.PRODUCT_NOT_FOUND });

  const item = await prisma.shoppingListItem.create({
    data: { productId: product_id },
    include: { product: true },
  });
  return res.status(201).json(item);
});

router.delete("/list", async (_req: Request, res: Response) => {
  await prisma.shoppingListItem.deleteMany();
  return res.json({ message: MESSAGES.SHOPPING_LIST_CLEARED });
});

export default router;
