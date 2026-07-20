import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/session";
import { PendingScreen } from "@/components/PendingScreen";

/** Interface tampon : compte inscrit, en attente d'approbation admin. */
export default async function PendingPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login"); // non authentifié
  if (user.approved) redirect("/espace"); // déjà approuvé : plus d'accès à la page tampon
  return <PendingScreen name={user.nom} />;
}
