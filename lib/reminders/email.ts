/* Envoi d'e-mail via Resend (API HTTP, aucune dépendance). Optionnel :
   sans RESEND_API_KEY, tout reste in-app. */
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || "Cap <onboarding@resend.dev>";

export function isEmailConfigured(): boolean {
  return Boolean(RESEND_API_KEY);
}

export async function sendEmail(
  to: string,
  subject: string,
  text: string,
  opts?: { replyTo?: string | null }
): Promise<boolean> {
  if (!RESEND_API_KEY || !to) return false;
  try {
    const body: Record<string, unknown> = { from: RESEND_FROM, to, subject, text };
    if (opts?.replyTo) body.reply_to = opts.replyTo;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}
