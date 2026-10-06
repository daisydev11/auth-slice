"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/auth/Field";
import { useApiForm } from "@/components/auth/useApiForm";
import { verifySchema } from "@/lib/validation/auth";

type Props = { email: string; initialCooldownSeconds: number };

export function VerifyForm({ email, initialCooldownSeconds }: Props) {
  const router = useRouter();
  const form = useApiForm({
    schema: verifySchema,
    endpoint: "/api/auth/verify",
    initialValues: { email, code: "" },
    onSuccess: () => {
      router.replace("/dashboard");
      router.refresh();
    },
  });

  // This countdown only mirrors the server's cooldown so the button is honest.
  // The server refuses an early resend with 429 whatever this number says.
  const [cooldown, setCooldown] = useState(initialCooldownSeconds);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function resend() {
    setResending(true);
    setResendMessage(null);
    try {
      const response = await fetch("/api/auth/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => null);
      if (response.ok) {
        setCooldown(data?.cooldownSeconds ?? initialCooldownSeconds);
        setResendMessage("A new code has been sent. The earlier one no longer works.");
      } else {
        if (data?.error?.retryAfterSeconds) setCooldown(data.error.retryAfterSeconds);
        setResendMessage(data?.error?.message ?? "Could not send a new code. Try again.");
      }
    } catch {
      setResendMessage("Could not reach the server. Check your connection and try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="stack">
      <form onSubmit={form.onSubmit} noValidate>
        <Field
          label="Verification code"
          className="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          hint="The 6-digit code expires 10 minutes after it was sent."
          {...form.field("code")}
        />
        {form.formError && (
          <p className="alert" role="alert">
            {form.formError}
          </p>
        )}
        <button type="submit" disabled={form.disabled}>
          {form.pending ? "Checking…" : form.retryIn > 0 ? `Try again in ${form.retryIn}s` : "Verify email"}
        </button>
      </form>
      <button type="button" className="secondary" onClick={resend} disabled={resending || cooldown > 0}>
        {resending ? "Sending…" : cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
      </button>
      {resendMessage && (
        <p className="notice" role="status">
          {resendMessage}
        </p>
      )}
    </div>
  );
}
