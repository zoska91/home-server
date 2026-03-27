import { Controller, Get, Post, Body, Param, HttpCode } from "@nestjs/common";
import { UsersService } from "./users.service";
import { CreateUserDto } from "./dto/create-user.dto";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() dto: CreateUserDto) {
    const { user, created } = await this.usersService.findOrCreate(dto);
    return {
      status: created ? 201 : 200,
      id: user.id,
      discord_id: user.discordId,
      username: user.username,
      is_admin: user.isAdmin,
      is_ai: user.isAi,
      created_at: user.createdAt,
    };
  }

  @Get(":discord_id")
  async findOne(@Param("discord_id") discordId: string) {
    const user = await this.usersService.findByDiscordId(discordId);
    return {
      id: user.id,
      discord_id: user.discordId,
      username: user.username,
      is_admin: user.isAdmin,
      is_ai: user.isAi,
      created_at: user.createdAt,
    };
  }
}
