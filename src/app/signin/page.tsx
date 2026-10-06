import Link from "next/link";
import { redirect } from "next/navigation";
import { SigninForm } from "@/components/auth/SigninForm";
import { getSessionUser } from "@/lib/auth/session";

type Props = { searchParams: Promise<{ reset?: string }> };

export default async function SigninPage({ searchParams }: Props) {
  if (await getSessionUser()) redirect("/dashboard");
  const { reset } = await searchParams;
  return (
    <>
      <h1>Sign in</h1>
      <p className="lede">
        {reset ? "Your password was changed. Sign in with the new one." : "Enter your email and password."}
      </p>
      <SigninForm />
      <p className="links">
        <Link href="/forgot-password">Forgot your password?</Link>
        <span>
          New here? <Link href="/signup">Create an account</Link>
        </span>
      </p>
    </>
  );
}
