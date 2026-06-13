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

function htmlEscape(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
  appName = "Pensar Exatas"
): Promise<void> {
  const transport = createTransport();
  if (!transport) {
    console.info(`[Email] Password reset link for ${to}: ${resetUrl}`);
    return;
  }

  const from = ENV.smtpFrom || `"${appName}" <noreply@pensarexatas.com.br>`;

  const safeResetUrl = htmlEscape(resetUrl);

  try {
    await transport.sendMail({
      from,
      to,
      subject: `${appName} – redefinição de senha`,
      text: [
        `Olá!`,
        ``,
        `Recebemos uma solicitação para redefinir a senha da sua conta em ${appName}.`,
        ``,
        `Clique no link abaixo para criar uma nova senha (válido por 1 hora):`,
        ``,
        resetUrl,
        ``,
        `Se você não solicitou a redefinição de senha, pode ignorar este e-mail.`,
      ].join("\n"),
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#1C3550">Redefinição de senha – ${appName}</h2>
          <p>Olá!</p>
          <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
          <p>Clique no botão abaixo para criar uma nova senha. Este link é válido por <strong>1 hora</strong>.</p>
          <div style="margin:24px 0">
            <a href="${safeResetUrl}"
               style="background:#7c3aed;color:#fff;text-decoration:none;padding:12px 24px;
                      border-radius:8px;font-weight:bold;display:inline-block">
              Redefinir senha
            </a>
          </div>
          <p style="color:#6b7280;font-size:.875rem">
            Se o botão não funcionar, copie e cole este link no navegador:<br>
            <a href="${safeResetUrl}" style="color:#7c3aed">${safeResetUrl}</a>
          </p>
          <p style="color:#6b7280;font-size:.875rem">
            Se você não solicitou a redefinição de senha, pode ignorar este e-mail.
          </p>
        </div>
      `,
    });
  } catch (err) {
    console.error("[Email] Failed to send password reset email", err);
    console.info(`[Email] Password reset link for ${to}: ${resetUrl}`);
  }
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
