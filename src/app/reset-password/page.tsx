import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

type Props = { searchParams: Promise<{ token?: string }> };

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams;
  return (
    <>
      <h1>Choose a new password</h1>
      {token ? (
        <>
          <p className="lede">This link works once. Setting a new password signs you out everywhere.</p>
          <ResetPasswordForm token={token} />
        </>
      ) : (
        <p className="lede">This page needs the link from your reset email.</p>
      )}
      <p className="links">
        <Link href="/forgot-password">Request a new link</Link>
      </p>
    </>
  );
}
