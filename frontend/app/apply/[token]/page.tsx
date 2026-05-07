import { notFound } from "next/navigation";
import { verifyToken } from "@/lib/token";
import { StudyPermitWizard } from "@/components/forms/StudyPermitWizard";

export default async function ApplyPage({
  params,
}: {
  params: { token: string };
}) {
  const claims = await verifyToken(params.token);
  if (!claims) notFound();

  if (claims.form_type === "study_permit") {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold">Study Permit Application</h1>
          <p className="mt-1 text-sm text-gray-600">
            Hello {claims.client_name}. Complete all required fields.
            Mandatory fields are marked with <span className="text-red-600">*</span>.
          </p>
          <p className="mt-2 text-xs text-gray-500">Case: {claims.case_id}</p>
        </header>
        <StudyPermitWizard token={params.token} claims={claims} />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-xl font-semibold">Form not yet available</h1>
      <p className="mt-2 text-sm text-gray-600">
        This link is for form <code>{claims.form_type}</code>, which is not yet
        supported. Please contact your immigration consultant.
      </p>
    </main>
  );
}
