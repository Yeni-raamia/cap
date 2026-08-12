// Déclenche le moteur de relance en appelant la route protégée.
// Usage : npm run reminders   (le serveur Cap doit tourner)
// Lit CRON_SECRET et CAP_URL depuis l'environnement, ou depuis .env.local.
import { readFileSync } from "node:fs";

function fromEnvLocal(key) {
  try {
    const txt = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    const m = txt.match(new RegExp(`^\\s*${key}\\s*=\\s*(.+)\\s*$`, "m"));
    return m ? m[1].trim().replace(/^["']|["']$/g, "") : "";
  } catch {
    return "";
  }
}

const base = (process.env.CAP_URL || fromEnvLocal("CAP_URL") || "http://localhost:3000").replace(/\/$/, "");
const secret = process.env.CRON_SECRET || fromEnvLocal("CRON_SECRET");
const url = `${base}/api/cron/reminders`;

try {
  const res = await fetch(url, {
    method: "POST",
    headers: secret ? { Authorization: `Bearer ${secret}` } : {},
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`Échec (${res.status}) :`, data);
    process.exit(1);
  }
  console.log(
    `Rappels exécutés → ${data.relances} relance(s), ${data.escalades} escalade(s), ` +
      `${data.echeances ?? 0} échéance(s) planifiée(s), ${data.digests} digest(s), ` +
      `${data.recurrences ?? 0} tâche(s) récurrente(s) engendrée(s), ` +
      `${data.emailsSent} e-mail(s)` +
      `${data.emailConfigured ? "" : " (e-mail non configuré : in-app uniquement)"}.`
  );
} catch (err) {
  console.error(`Impossible de joindre ${url} — le serveur Cap tourne-t-il ?`, err?.message || err);
  process.exit(1);
}
