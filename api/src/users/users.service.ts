import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreate(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { discordId: dto.discord_id } });
    if (existing) return { user: existing, created: false };

    const user = await this.prisma.user.create({
      data: {
        discordId: dto.discord_id,
        username: dto.username,
        displayName: dto.display_name,
        avatar: dto.avatar,
        isAi: dto.is_ai ?? false,
      },
    });
    return { user, created: true };
  }

  async findByDiscordId(discordId: string) {
    const user = await this.prisma.user.findUnique({ where: { discordId } });
    if (!user) throw new NotFoundException("User is not existing");
    return user;
  }
}
