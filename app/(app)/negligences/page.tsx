import { redirect } from "next/navigation";

/**
 * Le registre des négligences a rejoint le GRC (onglet « Écarts & manquements »).
 * On conserve la route : les liens, favoris et notifications existants continuent
 * de fonctionner.
 */
export default function NegligencesPage() {
  redirect("/grc?tab=ecarts");
}
