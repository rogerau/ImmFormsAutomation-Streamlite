import { NextRequest, NextResponse } from "next/server";
import { signToken } from "@/lib/token";
import { TEMPLATE_USE_CASES } from "@/lib/templateLinks";

const TENANT_ID = "patko";
const EXPIRES_IN_DAYS = 730;

export async function GET(req: NextRequest) {
  const adminSecret = req.headers.get("x-admin-secret");
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const base = process.env.NEXT_PUBLIC_FRONTEND_BASE_URL || "http://localhost:3000";
  const links = await Promise.all(
    TEMPLATE_USE_CASES.map(async (uc) => {
      const token = await signToken(
        {
          case_id: uc.case_prefix,
          form_type: "study_permit",
          client_name: uc.client_name,
          tenant_id: TENANT_ID,
          optional_forms: uc.optional_forms,
          auto_number: true,
        },
        EXPIRES_IN_DAYS,
      );
      return {
        id: uc.id,
        label: uc.label,
        description: uc.description,
        optional_forms: uc.optional_forms,
        url: `${base}/apply/${token}`,
      };
    }),
  );
  return NextResponse.json({ links });
}
