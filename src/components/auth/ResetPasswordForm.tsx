"use client";

import { useRouter } from "next/navigation";
import { Field } from "@/components/auth/Field";
import { useApiForm } from "@/components/auth/useApiForm";
import { resetPasswordSchema } from "@/lib/validation/auth";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const form = useApiForm({
    schema: resetPasswordSchema,
    endpoint: "/api/auth/reset-password",
    initialValues: { token, password: "" },
    onSuccess: () => router.replace("/signin?reset=1"),
  });
  const tokenError = form.field("token").error;

  return (
    <form onSubmit={form.onSubmit} noValidate>
      <Field
        label="New password"
        type="password"
        autoComplete="new-password"
        hint="At least 8 characters, with a letter and a number."
        {...form.field("password")}
      />
      {(form.formError || tokenError) && (
        <p className="alert" role="alert">
          {form.formError ?? tokenError}
        </p>
      )}
      <button type="submit" disabled={form.disabled}>
        {form.pending ? "Saving…" : form.retryIn > 0 ? `Try again in ${form.retryIn}s` : "Set new password"}
      </button>
    </form>
  );
}
