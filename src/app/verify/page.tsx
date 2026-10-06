import Link from "next/link";
import { redirect } from "next/navigation";
import { VerifyForm } from "@/components/auth/VerifyForm";
import { config } from "@/lib/config";

type Props = { searchParams: Promise<{ email?: string }> };

export default async function VerifyPage({ searchParams }: Props) {
  const { email } = await searchParams;
  if (!email) redirect("/signin");
  return (
    <>
      <h1>Verify your email</h1>
      <p className="lede">
        If <strong>{email}</strong> needs verifying, we sent it a code.
      </p>
      <VerifyForm email={email} initialCooldownSeconds={config.verification.resendCooldownMs / 1000} />
      <p className="links">
        <Link href="/signin">Back to sign in</Link>
      </p>
    </>
  );
}
