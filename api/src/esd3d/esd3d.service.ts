import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";
import axios from "axios";
import { PrismaService } from "../prisma/prisma.service";

export class ContactFormDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @MinLength(1)
  quantity!: string;

  @IsString()
  @MinLength(1)
  material!: string;

  @IsString()
  @MinLength(1)
  message!: string;
}

@Injectable()
export class Esd3dService {
  private readonly discordMessageLimit = 2000;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async sendContactForm(dto: ContactFormDto): Promise<void> {
    const submission = await this.prisma.esd3dContactSubmission.create({
      data: {
        name: dto.name,
        company: dto.company || null,
        email: dto.email,
        phone: dto.phone || null,
        quantity: dto.quantity,
        material: dto.material,
        message: dto.message,
      },
    });

    await this.sendDiscordMessage(this.buildDiscordMessage(submission.id, dto));
  }

  private async sendDiscordMessage(content: string): Promise<void> {
    const token = this.config.get<string>("DISCORD_TOKEN");
    const channelId = this.config.get<string>("DISCORD_ALERT_CHANNEL_ID");

    if (!token || !channelId) {
      throw new InternalServerErrorException("Discord configuration is missing");
    }

    await axios.post(
      `https://discord.com/api/v10/channels/${channelId}/messages`,
      { content },
      { headers: { Authorization: `Bot ${token}` } },
    );
  }

  private buildDiscordMessage(id: number, dto: ContactFormDto): string {
    const lines = [
      "**Nowe zapytanie o druk 3D**",
      `ID: ${id}`,
      `Imie i nazwisko: ${dto.name}`,
      dto.company ? `Firma: ${dto.company}` : null,
      `Email: ${dto.email}`,
      dto.phone ? `Telefon: ${dto.phone}` : null,
      `Ilosc: ${dto.quantity}`,
      `Material: ${dto.material}`,
      "",
      "Wiadomosc:",
      dto.message,
    ].filter((line): line is string => line !== null);

    return this.truncateDiscordMessage(lines.join("\n"));
  }

  private truncateDiscordMessage(message: string): string {
    if (message.length <= this.discordMessageLimit) return message;

    const suffix = "\n\n[Wiadomosc ucieta do limitu Discorda]";
    return `${message.slice(0, this.discordMessageLimit - suffix.length)}${suffix}`;
  }
}
