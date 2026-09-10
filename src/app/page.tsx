import { redirect } from "next/navigation";

import { getSession, ROLE_HOME } from "@/lib/auth";

export default async function Home() {
  const session = await getSession();
  if (session) redirect(ROLE_HOME[session.profile.role] ?? "/shop");
  redirect("/shop");
}
