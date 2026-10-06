"use client";

import { useRouter } from "next/navigation";
import { Field } from "@/components/auth/Field";
import { useApiForm } from "@/components/auth/useApiForm";
import { signinSchema } from "@/lib/validation/auth";

export function SigninForm() {
  const router = useRouter();
  const form = useApiForm({
    schema: signinSchema,
    endpoint: "/api/auth/signin",
    initialValues: { email: "", password: "" },
    onSuccess: () => {
      router.replace("/dashboard");
      router.refresh();
    },
    onError: (error, values) => {
      if (error.code !== "EMAIL_NOT_VERIFIED") return false;
      router.push(`/verify?email=${encodeURIComponent(values.email)}`);
      return true;
    },
  });

  return (
    <form onSubmit={form.onSubmit} noValidate>
      <Field label="Email" type="email" autoComplete="email" inputMode="email" {...form.field("email")} />
      <Field label="Password" type="password" autoComplete="current-password" {...form.field("password")} />
      {form.formError && (
        <p className="alert" role="alert">
          {form.formError}
        </p>
      )}
      <button type="submit" disabled={form.disabled}>
        {form.pending ? "Signing in…" : form.retryIn > 0 ? `Try again in ${form.retryIn}s` : "Sign in"}
      </button>
    </form>
  );
}
