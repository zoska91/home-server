import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ShoppingService {
  constructor(private readonly prisma: PrismaService) {}

  async getProducts() {
    return this.prisma.shoppingProduct.findMany();
  }

  async createProduct(name: string) {
    const existing = await this.prisma.shoppingProduct.findUnique({ where: { name } });
    if (existing) throw new BadRequestException("The product is already existing");
    return this.prisma.shoppingProduct.create({ data: { name } });
  }

  async getList() {
    return this.prisma.shoppingListItem.findMany({ include: { product: true } });
  }

  async addToList(productId: number) {
    const product = await this.prisma.shoppingProduct.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException("The product does not exist");
    return this.prisma.shoppingListItem.create({ data: { productId }, include: { product: true } });
  }

  async clearList() {
    await this.prisma.shoppingListItem.deleteMany();
    return { message: "The shopping list has been cleared" };
  }
}
