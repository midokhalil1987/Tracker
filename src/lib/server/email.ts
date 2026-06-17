import nodemailer from "nodemailer";

type SendXlsxEmailInput = {
  to: string;
  filename: string;
  buffer: Buffer;
};

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    throw new Error(
      "SMTP is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS."
    );
  }
  return {
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  };
}

export async function sendXlsxEmail({
  to,
  filename,
  buffer,
}: SendXlsxEmailInput): Promise<void> {
  const from =
    process.env.SMTP_FROM?.trim() ||
    `Tempo Time Tracker <${process.env.SMTP_USER}>`;

  const transporter = nodemailer.createTransport(getSmtpConfig());

  await transporter.sendMail({
    from,
    to,
    subject: `Tempo time report — ${filename}`,
    text:
      "Attached is your latest Tempo time tracker export.\n\n" +
      "This email is sent automatically on weekdays when email reports are enabled.",
    attachments: [
      {
        filename,
        content: buffer,
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    ],
  });
}

export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
  );
}
