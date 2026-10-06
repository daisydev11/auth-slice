"use client";

import { useState } from "react";
import { Field } from "@/components/auth/Field";
import { useApiForm } from "@/components/auth/useApiForm";
import { forgotPasswordSchema } from "@/lib/validation/auth";

export function ForgotPasswordForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const form = useApiForm({
    schema: forgotPasswordSchema,
    endpoint: "/api/auth/forgot-password",
    initialValues: { email: "" },
    onSuccess: (_data, values) => setSentTo(values.email),
  });

  if (sentTo) {
    return (
      <p className="notice" role="status">
        If an account exists for <strong>{sentTo}</strong>, a reset link is on its way. It works once and expires in 30
        minutes.
      </p>
    );
  }

  return (
    <form onSubmit={form.onSubmit} noValidate>
      <Field label="Email" type="email" autoComplete="email" inputMode="email" {...form.field("email")} />
      {form.formError && (
        <p className="alert" role="alert">
          {form.formError}
        </p>
      )}
      <button type="submit" disabled={form.disabled}>
        {form.pending ? "Sending…" : form.retryIn > 0 ? `Try again in ${form.retryIn}s` : "Send reset link"}
      </button>
    </form>
  );
}
