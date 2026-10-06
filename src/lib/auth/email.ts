import { Resend } from "resend";
import { config } from "@/lib/config";

type Message = { to: string; subject: string; text: string };

async function send(message: Message): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Local development without an email provider: print instead of send.
    console.log(`\n[email:dev] To: ${message.to}\n[email:dev] Subject: ${message.subject}\n[email:dev] ${message.text}\n`);
    return;
  }
  const from = process.env.EMAIL_FROM;
  if (!from) throw new Error("EMAIL_FROM is not set.");
  const { error } = await new Resend(apiKey).emails.send({ from, ...message });
  if (error) throw new Error(`Email provider rejected the message: ${error.message}`);
}

export function sendVerificationEmail(to: string, code: string): Promise<void> {
  const minutes = config.verification.ttlMs / 60000;
  return send({
    to,
    subject: "Your verification code",
    text: `Your verification code is ${code}. It expires in ${minutes} minutes.`,
  });
}

export function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  const link = `${base}/reset-password?token=${encodeURIComponent(token)}`;
  const minutes = config.passwordReset.ttlMs / 60000;
  return send({
    to,
    subject: "Reset your password",
    text: `Use this link to choose a new password: ${link}\nIt works once and expires in ${minutes} minutes. If you did not ask for it, ignore this email.`,
  });
}
