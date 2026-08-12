import { redirect } from "next/navigation";

/**
 * Le registre des non-conformités a rejoint le GRC (onglet « Écarts &
 * manquements »), à sa place ISO 27001 §10.1. On conserve la route pour ne
 * casser aucun lien existant.
 */
export default function NonConformitesPage() {
  redirect("/grc?tab=ecarts");
}
