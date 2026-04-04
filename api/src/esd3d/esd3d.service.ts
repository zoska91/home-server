import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";

export class ContactFormDto {
  name!: string;
  company!: string;
  email!: string;
  phone!: string;
  quantity!: string;
  material!: string;
  message!: string;
}

@Injectable()
export class Esd3dService {
  private readonly transporter: nodemailer.Transporter;
  private readonly recipient = "kontakt@esd3d.pl";

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get("SMTP_HOST") ?? "smtp.example.com",
      port: Number(config.get("SMTP_PORT") ?? 587),
      secure: false,
      auth: {
        user: config.get("SMTP_USER") ?? "",
        pass: config.get("SMTP_PASS") ?? "",
      },
    });
  }

  async sendContactForm(dto: ContactFormDto): Promise<void> {
    await this.transporter.sendMail({
      from: `"${dto.name}" <${this.config.get("SMTP_USER") ?? "noreply@esd3d.pl"}>`,
      to: this.recipient,
      replyTo: dto.email,
      subject: `Zapytanie o druk 3D — ${dto.name}${dto.company ? ` (${dto.company})` : ""}`,
      text: this.buildText(dto),
      html: this.buildHtml(dto),
    });
  }

  private buildText(dto: ContactFormDto): string {
    return [
      `Imię i nazwisko: ${dto.name}`,
      `Firma: ${dto.company || "—"}`,
      `Email: ${dto.email}`,
      `Telefon: ${dto.phone || "—"}`,
      `Ilość: ${dto.quantity}`,
      `Materiał: ${dto.material}`,
      ``,
      `Wiadomość:`,
      dto.message,
    ].join("\n");
  }

  private buildHtml(dto: ContactFormDto): string {
    const row = (label: string, value: string) =>
      `<tr><td style="padding:4px 12px 4px 0;color:#666;white-space:nowrap">${label}</td><td style="padding:4px 0"><strong>${value}</strong></td></tr>`;

    return `
      <div style="font-family:sans-serif;max-width:600px">
        <h2 style="color:#333">Nowe zapytanie o druk 3D</h2>
        <table style="border-collapse:collapse;margin-bottom:20px">
          ${row("Imię i nazwisko:", dto.name)}
          ${row("Firma:", dto.company || "—")}
          ${row("Email:", dto.email)}
          ${row("Telefon:", dto.phone || "—")}
          ${row("Ilość:", dto.quantity)}
          ${row("Materiał:", dto.material)}
        </table>
        <p style="color:#333"><strong>Wiadomość:</strong></p>
        <p style="background:#f5f5f5;padding:12px;border-radius:4px;white-space:pre-wrap">${dto.message}</p>
      </div>
    `;
  }
}
