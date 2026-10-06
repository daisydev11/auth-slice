import { redirect } from "next/navigation";

// No landing page. The root sends you to the dashboard, which sends you to
// sign in if you have no session.
export default function Home() {
  redirect("/dashboard");
}
