import nodemailer from "nodemailer";
import { APP_FULL_TITLE, APP_NAME } from "@/lib/brand";
import { normalizeEmailRecipients } from "@/lib/email-recipients";
import type { EmailReportSummary } from "@/lib/server/email-template";
import {
  buildTimeReportEmailHtml,
  buildTimeReportEmailText,
} from "@/lib/server/email-template";

type SendXlsxEmailInput = {
  to: string;
  filename: string;
  buffer: Buffer;
  summary: EmailReportSummary;
};

type SendXlsxEmailBatchInput = Omit<SendXlsxEmailInput, "to"> & {
  to: string[];
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
  summary,
}: SendXlsxEmailInput): Promise<void> {
  await sendXlsxEmailToRecipients({
    to: [to],
    filename,
    buffer,
    summary,
  });
}

export async function sendXlsxEmailToRecipients({
  to,
  filename,
  buffer,
  summary,
}: SendXlsxEmailBatchInput): Promise<void> {
  const recipients = normalizeEmailRecipients(to);
  if (recipients.length === 0) {
    throw new Error("No valid recipient emails.");
  }

  const from =
    process.env.SMTP_FROM?.trim() ||
    `${APP_FULL_TITLE} <${process.env.SMTP_USER}>`;

  const transporter = nodemailer.createTransport(getSmtpConfig());

  const text = buildTimeReportEmailText({ filename, summary });
  const html = buildTimeReportEmailHtml({ filename, summary });

  for (const recipient of recipients) {
    await transporter.sendMail({
      from,
      to: recipient,
      subject: `${APP_NAME} time report — ${filename}`,
      text,
      html,
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
}

export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
  );
}
