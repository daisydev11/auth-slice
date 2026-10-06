"use client";

import { useRouter } from "next/navigation";
import { Field } from "@/components/auth/Field";
import { useApiForm } from "@/components/auth/useApiForm";
import { signupSchema } from "@/lib/validation/auth";

export function SignupForm() {
  const router = useRouter();
  const form = useApiForm({
    schema: signupSchema,
    endpoint: "/api/auth/signup",
    initialValues: { name: "", email: "", password: "" },
    onSuccess: (_data, values) => router.push(`/verify?email=${encodeURIComponent(values.email)}`),
  });

  return (
    <form onSubmit={form.onSubmit} noValidate>
      <Field label="Name" type="text" autoComplete="name" {...form.field("name")} />
      <Field label="Email" type="email" autoComplete="email" inputMode="email" {...form.field("email")} />
      <Field
        label="Password"
        type="password"
        autoComplete="new-password"
        hint="At least 8 characters, with a letter and a number."
        {...form.field("password")}
      />
      {form.formError && (
        <p className="alert" role="alert">
          {form.formError}
        </p>
      )}
      <button type="submit" disabled={form.disabled}>
        {form.pending ? "Creating account…" : form.retryIn > 0 ? `Try again in ${form.retryIn}s` : "Create account"}
      </button>
    </form>
  );
}
