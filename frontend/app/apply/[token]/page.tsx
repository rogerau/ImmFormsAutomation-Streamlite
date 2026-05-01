import { notFound } from "next/navigation";
import { verifyToken } from "@/lib/token";
import { Imm5645Form } from "@/components/forms/Imm5645Form";

export default async function ApplyPage({
  params,
}: {
  params: { token: string };
}) {
  const claims = await verifyToken(params.token);
  if (!claims) notFound();
  if (claims.form_type !== "imm5645") {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <h1 className="text-xl font-semibold">Form not yet available</h1>
        <p className="mt-2 text-sm text-gray-600">
          This link is for form <code>{claims.form_type}</code>, which is not
          yet supported. Please contact your immigration consultant.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold">IMM 5645 — Family Information</h1>
        <p className="mt-1 text-sm text-gray-600">
          Hello {claims.client_name}. Please complete every required field.
          Mandatory fields are marked with <span className="text-red-600">*</span>.
          Your information is reviewed by your consultant before submission to IRCC.
        </p>
        <p className="mt-2 text-xs text-gray-500">Case: {claims.case_id}</p>
      </header>
      <Imm5645Form
        token={params.token}
        caseId={claims.case_id}
        clientName={claims.client_name}
      />
    </main>
  );
}
