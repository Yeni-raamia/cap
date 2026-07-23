import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/session";
import { getSecuritySettings, getSettings } from "@/lib/db/admin";
import { getTotp, setTotpSecret } from "@/lib/db/repo";
import { generateTotpSecret, otpauthUrl } from "@/lib/auth/totp";
import { qrDataUrl } from "@/lib/auth/qr";
import { Enroll2faScreen } from "@/components/Enroll2faScreen";

/** Enrôlement 2FA imposé par la politique de sécurité (compte sans 2FA). */
export default async function Enroll2faPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  if (!user.approved) redirect("/pending");
  if (user.mustChangePassword) redirect("/change-password");
  if (!getSecuritySettings().twofaRequired || user.totpEnabled) redirect("/cockpit");

  // Secret en attente (réutilisé s'il en existe déjà un non confirmé).
  let secret = getTotp(user.id)?.secret;
  if (!secret) {
    secret = generateTotpSecret();
    setTotpSecret(user.id, secret);
  }
  const qr = await qrDataUrl(otpauthUrl(secret, user.nom, getSettings().orgName));
  return <Enroll2faScreen name={user.nom} secret={secret} qr={qr} />;
}
