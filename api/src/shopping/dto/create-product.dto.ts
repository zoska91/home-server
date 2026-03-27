import { IsString, IsInt } from "class-validator";

export class CreateProductDto {
  @IsString()
  name!: string;
}

export class AddToListDto {
  @IsInt()
  product_id!: number;
}
