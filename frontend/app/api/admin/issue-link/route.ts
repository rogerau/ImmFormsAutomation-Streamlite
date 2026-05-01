import { NextRequest, NextResponse } from "next/server";
import { signToken } from "@/lib/token";

export async function POST(req: NextRequest) {
  const adminSecret = req.headers.get("x-admin-secret");
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.case_id || !body?.client_name || !body?.tenant_id) {
    return NextResponse.json(
      { error: "case_id, client_name, tenant_id required" },
      { status: 400 },
    );
  }

  const token = await signToken({
    case_id: body.case_id,
    form_type: body.form_type || "imm5645",
    client_name: body.client_name,
    tenant_id: body.tenant_id,
  }, body.expires_in_days || 30);

  const base = process.env.NEXT_PUBLIC_FRONTEND_BASE_URL || "http://localhost:3000";
  return NextResponse.json({ token, url: `${base}/apply/${token}` });
}
