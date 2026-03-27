import { Controller, Get, Post, Delete, Body } from "@nestjs/common";
import { ShoppingService } from "./shopping.service";
import { CreateProductDto, AddToListDto } from "./dto/create-product.dto";

@Controller("shopping")
export class ShoppingController {
  constructor(private readonly shoppingService: ShoppingService) {}

  @Get("products")
  getProducts() {
    return this.shoppingService.getProducts();
  }

  @Post("products")
  createProduct(@Body() dto: CreateProductDto) {
    return this.shoppingService.createProduct(dto.name);
  }

  @Get("list")
  getList() {
    return this.shoppingService.getList();
  }

  @Post("list")
  addToList(@Body() dto: AddToListDto) {
    return this.shoppingService.addToList(dto.product_id);
  }

  @Delete("list")
  clearList() {
    return this.shoppingService.clearList();
  }
}
