import { redirect } from "next/navigation";
import { DEMO_MODE } from "@/lib/config";
import { getCurrentUser } from "@/lib/auth/session";
import { countProfiles } from "@/lib/db/repo";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage() {
  // En mode démo, aucune authentification : on entre directement.
  if (DEMO_MODE) redirect("/espace");

  const user = await getCurrentUser();
  if (user) redirect("/espace");

  // S'il n'existe encore aucun compte, on propose la création (1er = admin).
  const firstRun = countProfiles() === 0;
  return <LoginForm firstRun={firstRun} />;
}
