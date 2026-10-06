import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { getSessionUser } from "@/lib/auth/session";

// The placeholder dashboard: one line of text and a button, nothing else.
export default async function DashboardPage() {
  // The real gate. The middleware only checks that a cookie exists; this
  // checks that the cookie matches a live, unexpired session in the database.
  const user = await getSessionUser();
  if (!user) redirect("/signin");

  return (
    <div className="stack">
      <h1>You are signed in</h1>
      <p className="lede">Signed in as {user.name}.</p>
      <SignOutButton />
    </div>
  );
}
