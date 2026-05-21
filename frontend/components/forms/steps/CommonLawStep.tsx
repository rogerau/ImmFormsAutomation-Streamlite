"use client";
import { FieldErrors, UseFormRegister } from "react-hook-form";
import type { StudyPermitData } from "@/lib/schemas/study_permit";
import { CountrySelect } from "@/components/forms/fields/CountrySelect";

interface Props {
  register: UseFormRegister<StudyPermitData>;
  errors: FieldErrors<StudyPermitData>;
}

const inp = "block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function CommonLawStep({ register, errors }: Props) {
  const cl = errors.common_law;
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Common-law Declaration (IMM 5409)</h2>
      <div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <strong>When to complete:</strong> Only fill in this section if you are declaring a
        common-law partner. Refer to the responsible visa office for your region.
      </div>

      <h3 className="text-base font-medium text-gray-700 border-b pb-1">Jurisdiction</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Country where declaration is made" required error={(cl as any)?.jurisdiction_country?.message}>
          <CountrySelect {...register("common_law.jurisdiction_country")} className={inp} />
        </Field>
        <Field label="Province / State" error={(cl as any)?.jurisdiction_province?.message}>
          <input {...register("common_law.jurisdiction_province")} className={inp} />
        </Field>
      </div>

      <h3 className="text-base font-medium text-gray-700 border-b pb-1">Partner Information</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Your Full Name" required error={(cl as any)?.applicant_name?.message}>
          <input {...register("common_law.applicant_name")} className={inp} />
        </Field>
        <Field label="Partner's Full Name" required error={(cl as any)?.partner_name?.message}>
          <input {...register("common_law.partner_name")} className={inp} />
        </Field>
        <Field label="Cohabitation Start Date" required error={(cl as any)?.start_date?.message}>
          <input {...register("common_law.start_date")} placeholder="YYYY-MM-DD" className={inp} />
        </Field>
        <Field label="Years Together" required error={(cl as any)?.years_together?.message}>
          <input {...register("common_law.years_together")} className={inp} />
        </Field>
        <Field label="Cohabitation City" required error={(cl as any)?.cohabitation_city?.message}>
          <input {...register("common_law.cohabitation_city")} className={inp} />
        </Field>
        <Field label="Cohabitation Country" required error={(cl as any)?.cohabitation_country?.message}>
          <CountrySelect {...register("common_law.cohabitation_country")} className={inp} />
        </Field>
      </div>

      <h3 className="text-base font-medium text-gray-700 border-b pb-1">Declaration</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="City" required error={(cl as any)?.declaration_city?.message}>
          <input {...register("common_law.declaration_city")} className={inp} />
        </Field>
        <Field label="Country" required error={(cl as any)?.declaration_country?.message}>
          <CountrySelect {...register("common_law.declaration_country")} className={inp} />
        </Field>
        <Field label="Day" required error={(cl as any)?.declaration_day?.message}>
          <input {...register("common_law.declaration_day")} placeholder="DD" className={inp} />
        </Field>
        <Field label="Month" required error={(cl as any)?.declaration_month?.message}>
          <input {...register("common_law.declaration_month")} placeholder="MM" className={inp} />
        </Field>
        <Field label="Year" required error={(cl as any)?.declaration_year?.message}>
          <input {...register("common_law.declaration_year")} placeholder="YYYY" className={inp} />
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Your Signature (type full name)" required error={(cl as any)?.applicant_signature?.message}>
          <input {...register("common_law.applicant_signature")} className={inp} />
        </Field>
        <Field label="Partner Signature (type full name)" required error={(cl as any)?.partner_signature?.message}>
          <input {...register("common_law.partner_signature")} className={inp} />
        </Field>
      </div>
    </div>
  );
}
