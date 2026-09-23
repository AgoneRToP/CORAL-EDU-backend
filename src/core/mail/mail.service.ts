import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465, // 465 требует secure:true, 587 — secure:false (STARTTLS)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 10_000, // 10с на установление соединения
    greetingTimeout: 10_000, // 10с ждать приветствие сервера
    socketTimeout: 15_000, // 15с максимум на весь диалог
  });

  async sendVerificationCode(email: string, code: string) {
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM || 'no-reply@coraledu.uz',
      to: email,
      subject: 'Код подтверждения аккаунта',
      html: this.buildVerificationEmail(code),
    });
  }

  private buildVerificationEmail(code: string): string {
    const digits = code.split('');

    return `
<!DOCTYPE html>
<html lang="ru">
  <body style="margin:0; padding:0; background-color:#f4fbfb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4fbfb; padding: 40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px; width:100%; background-color:#ffffff; border-radius:24px; overflow:hidden; border:1px solid #dceeee; box-shadow:0 20px 60px rgba(40,130,140,0.15);">

            <!-- Верхняя тил-полоса, как .auth-left -->
            <tr>
              <td style="background-image: linear-gradient(155deg, #28bbb9 0%, #35d0c8 55%, #1599a1 100%); padding: 36px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:44px; height:44px; border-radius:9999px; background-color:rgba(255,255,255,0.16); text-align:center; vertical-align:middle;">
                      <span style="font-size:20px; line-height:44px; color:#ffffff;">🐠</span>
                    </td>
                    <td style="padding-left:12px; vertical-align:middle;">
                      <div style="font-size:16px; font-weight:700; color:#ffffff;">CoralEdu</div>
                      <div style="font-size:12px; color:rgba(255,255,255,0.85);">Подтверждение аккаунта</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Тело письма -->
            <tr>
              <td style="padding: 36px 32px 8px; text-align:center;">
                <h1 style="margin:0 0 10px; font-size:20px; font-weight:700; color:#183b50;">
                  Ваш код подтверждения
                </h1>
                <p style="margin:0 0 28px; font-size:14px; line-height:1.5; color:#78939e;">
                  Введите этот код на сайте, чтобы подтвердить адрес электронной почты и активировать аккаунт.
                </p>
              </td>
            </tr>

            <!-- Круглый бейдж с кодом, как .confirm-icon.primary / .status-pill -->
            <tr>
              <td style="padding: 0 32px 32px; text-align:center;">
                <table role="presentation" cellpadding="0" cellspacing="0" align="center">
                  <tr>
                    ${digits
                      .map(
                        (d) => `
                    <td style="padding: 0 4px;">
                      <div style="width:42px; height:52px; border-radius:12px; background-color:#d9f7f5; color:#18a8ae; font-size:24px; font-weight:700; text-align:center; line-height:52px;">
                        ${d}
                      </div>
                    </td>`,
                      )
                      .join('')}
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding: 0 32px 36px; text-align:center;">
                <p style="margin:0; font-size:13px; color:#8198a2;">
                  Код действителен <b style="color:#526e7b;">10 минут</b>.
                  Если вы не запрашивали код — просто проигнорируйте это письмо.
                </p>
              </td>
            </tr>

            <!-- Разделитель + футер -->
            <tr>
              <td style="padding: 20px 32px 28px; border-top:1px solid #edf3f3; text-align:center;">
                <p style="margin:0; font-size:12px; color:#8ca5af;">
                  © ${new Date().getFullYear()} CoralEdu. Это автоматическое письмо, отвечать на него не нужно.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
    `.trim();
  }
}
