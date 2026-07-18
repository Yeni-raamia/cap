import { NextResponse } from "next/server";
import { runReminders } from "@/lib/reminders/engine";

const CRON_SECRET = process.env.CRON_SECRET;

function authorized(request: Request): boolean {
  // Si aucun secret n'est défini : autorisé (pratique en local). En LAN/prod,
  // définir CRON_SECRET pour protéger la route.
  if (!CRON_SECRET) return true;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${CRON_SECRET}`) return true;
  const url = new URL(request.url);
  return url.searchParams.get("secret") === CRON_SECRET;
}

async function handle(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  const summary = await runReminders();
  return NextResponse.json({ ok: true, ...summary });
}

export async function POST(request: Request) {
  return handle(request);
}
export async function GET(request: Request) {
  return handle(request);
}
