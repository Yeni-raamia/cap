import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/session";
import { ChangePasswordScreen } from "@/components/ChangePasswordScreen";

/** Renouvellement du mot de passe imposé (rotation demandée par l'admin ou par la politique d'âge). */
export default async function ChangePasswordPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  if (!user.approved) redirect("/pending");
  if (!user.mustChangePassword) redirect("/cockpit");
  return <ChangePasswordScreen name={user.nom} />;
}
