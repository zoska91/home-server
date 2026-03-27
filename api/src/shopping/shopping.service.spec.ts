import { Test } from "@nestjs/testing";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ShoppingService } from "./shopping.service";
import { PrismaService } from "../prisma/prisma.service";
import { MESSAGES } from "../utils/messages";

const mockPrisma = {
  shoppingProduct: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
  shoppingListItem: { findMany: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
};

describe("ShoppingService", () => {
  let service: ShoppingService;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        ShoppingService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(ShoppingService);
  });

  describe("getList", () => {
    it("returns items with products", async () => {
      mockPrisma.shoppingListItem.findMany.mockResolvedValue([
        { id: 1, productId: 1, product: { id: 1, name: "mleko" } },
      ]);
      const result = await service.getList();
      expect(result[0]?.product.name).toBe("mleko");
    });
  });

  describe("clearList", () => {
    it("clears all items", async () => {
      mockPrisma.shoppingListItem.deleteMany.mockResolvedValue({});
      const result = await service.clearList();
      expect(result.message).toBe("The shopping list has been cleared");
    });
  });

  describe("createProduct", () => {
    it("creates product when not existing", async () => {
      mockPrisma.shoppingProduct.findUnique.mockResolvedValue(null);
      mockPrisma.shoppingProduct.create.mockResolvedValue({ id: 1, name: "chleb" });
      const result = await service.createProduct("chleb");
      expect(result.name).toBe("chleb");
    });

    it("throws BadRequestException when product exists", async () => {
      mockPrisma.shoppingProduct.findUnique.mockResolvedValue({ id: 1, name: "mleko" });
      await expect(service.createProduct("mleko")).rejects.toThrow(BadRequestException);
    });
  });

  describe("addToList", () => {
    it("adds product to list", async () => {
      mockPrisma.shoppingProduct.findUnique.mockResolvedValue({ id: 1, name: "mleko" });
      mockPrisma.shoppingListItem.create.mockResolvedValue({ id: 1, productId: 1, product: { id: 1, name: "mleko" } });
      const result = await service.addToList(1);
      expect(result.product.name).toBe("mleko");
    });

    it("throws NotFoundException when product not found", async () => {
      mockPrisma.shoppingProduct.findUnique.mockResolvedValue(null);
      await expect(service.addToList(999)).rejects.toThrow(NotFoundException);
    });
  });
});
