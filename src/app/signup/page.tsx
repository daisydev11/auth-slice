import Link from "next/link";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/SignupForm";
import { getSessionUser } from "@/lib/auth/session";

export default async function SignupPage() {
  if (await getSessionUser()) redirect("/dashboard");
  return (
    <>
      <h1>Create account</h1>
      <p className="lede">We will email you a code to confirm your address.</p>
      <SignupForm />
      <p className="links">
        <span>
          Already have an account? <Link href="/signin">Sign in</Link>
        </span>
      </p>
    </>
  );
}
