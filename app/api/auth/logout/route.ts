import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/db/repo";
import { clearSessionCookie } from "@/lib/auth/cookie";
import { SESSION_COOKIE } from "@/lib/auth/session";

export async function POST() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) deleteSession(token);
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}
