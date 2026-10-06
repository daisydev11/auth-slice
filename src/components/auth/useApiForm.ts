"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { z } from "zod";
import { toFieldErrors, type FieldErrors } from "@/lib/validation/auth";
import type { ApiError } from "@/lib/http";

type Options<S extends z.ZodTypeAny> = {
  /** The same schema object the route handler validates with. */
  schema: S;
  endpoint: string;
  initialValues: Record<string, string>;
  onSuccess: (data: Record<string, unknown>, values: z.infer<S>) => void;
  /** Return true if the error was handled (e.g. by navigating away). */
  onError?: (error: ApiError["error"], values: z.infer<S>) => boolean;
};

/**
 * Shared behaviour for every auth form: validate in the browser with the
 * shared schema for instant feedback, POST as JSON, then show whatever the
 * server decided. The browser check is a courtesy; the server check is the rule.
 */
export function useApiForm<S extends z.ZodTypeAny>({ schema, endpoint, initialValues, onSuccess, onError }: Options<S>) {
  const [values, setValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [retryIn, setRetryIn] = useState(0);

  // Counts down a server-issued Retry-After. The server enforces it either way.
  useEffect(() => {
    if (retryIn <= 0) return;
    const timer = setTimeout(() => setRetryIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [retryIn]);

  function field(name: string) {
    return {
      name,
      value: values[name] ?? "",
      error: fieldErrors[name],
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
        setValues((v) => ({ ...v, [name]: event.target.value }));
        if (fieldErrors[name]) setFieldErrors(({ [name]: _cleared, ...rest }) => rest);
      },
      onBlur: () => {
        if (!values[name]) return; // do not nag about a field the user has not filled yet
        const parsed = schema.safeParse(values);
        const message = parsed.success ? undefined : toFieldErrors(parsed.error)[name];
        setFieldErrors(({ [name]: _old, ...rest }) => (message ? { ...rest, [name]: message } : rest));
      },
    };
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    setPending(true);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await response.json().catch(() => null);
      if (response.ok && data) {
        onSuccess(data, parsed.data);
        return;
      }
      const error: ApiError["error"] = data?.error ?? { code: "UNKNOWN", message: "Something went wrong. Try again." };
      if (onError?.(error, parsed.data)) return;
      if (error.fields) setFieldErrors(error.fields);
      if (error.retryAfterSeconds) setRetryIn(error.retryAfterSeconds);
      if (!error.fields) setFormError(error.message);
    } catch {
      setFormError("Could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return { field, onSubmit, pending, formError, retryIn, disabled: pending || retryIn > 0 };
}
