import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

/** Root — bounce to the app or the login screen. */
export default async function Home() {
  const user = await getCurrentUser();
  redirect(user ? "/dashboard" : "/login");
}
