import { NextResponse } from "next/server";
import { requireUserJson } from "@/lib/auth";
import { getProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

export async function GET() {
  // The profile carries email, phone, and location — never serve it anonymously.
  if (!(await requireUserJson())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const profile = await getProfile();
  return NextResponse.json(profile);
}
