import nodemailer from "nodemailer";
import { ENV } from "./env";

function createTransport() {
  if (!ENV.smtpHost) return null;

  return nodemailer.createTransport({
    host: ENV.smtpHost,
    port: ENV.smtpPort,
    secure: ENV.smtpPort === 465,
    auth: ENV.smtpUser
      ? { user: ENV.smtpUser, pass: ENV.smtpPass }
      : undefined,
  });
}

export async function sendVerificationEmail(
  to: string,
  code: string,
  appName = "Pensar Exatas"
): Promise<void> {
  const transport = createTransport();
  if (!transport) {
    // If no SMTP is configured, log the code so it can be used during development
    console.info(`[Email] Verification code for ${to}: ${code}`);
    return;
  }

  const from = ENV.smtpFrom || `"${appName}" <noreply@pensarexatas.com.br>`;

  await transport.sendMail({
    from,
    to,
    subject: `${appName} – código de verificação`,
    text: [
      `Olá!`,
      ``,
      `Seu código de verificação é: ${code}`,
      ``,
      `Esse código expira em 24 horas.`,
      ``,
      `Se você não criou uma conta em ${appName}, pode ignorar este e-mail.`,
    ].join("\n"),
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#1C3550">Verificação de e-mail – ${appName}</h2>
        <p>Olá!</p>
        <p>Use o código abaixo para verificar seu e-mail:</p>
        <div style="font-size:2rem;font-weight:bold;letter-spacing:.4rem;
                    background:#f3f4f6;border-radius:8px;padding:16px 24px;
                    display:inline-block;color:#1C3550;margin:16px 0">
          ${code}
        </div>
        <p style="color:#6b7280;font-size:.875rem">
          Esse código expira em 24 horas.<br>
          Se você não criou uma conta em ${appName}, pode ignorar este e-mail.
        </p>
      </div>
    `,
  });
}
