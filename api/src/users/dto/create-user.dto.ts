import { IsString, IsOptional, IsBoolean } from "class-validator";

export class CreateUserDto {
  @IsString()
  discord_id!: string;

  @IsString()
  username!: string;

  @IsString()
  @IsOptional()
  display_name?: string;

  @IsString()
  @IsOptional()
  avatar?: string;

  @IsBoolean()
  @IsOptional()
  is_ai?: boolean;
}
