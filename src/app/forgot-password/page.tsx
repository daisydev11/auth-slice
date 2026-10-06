import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <>
      <h1>Forgot password</h1>
      <p className="lede">Enter your email and we will send a link to choose a new password.</p>
      <ForgotPasswordForm />
      <p className="links">
        <Link href="/signin">Back to sign in</Link>
      </p>
    </>
  );
}
