"use client";
import { FieldErrors, UseFormRegister } from "react-hook-form";
import type { StudyPermitData } from "@/lib/schemas/study_permit";
import { CountrySelect } from "@/components/forms/fields/CountrySelect";

interface Props {
  register: UseFormRegister<StudyPermitData>;
  errors: FieldErrors<StudyPermitData>;
}

const inp = "block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
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
  const cl = errors.common_law as any;
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Common-law Declaration (IMM 5409)</h2>
      <div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <strong>When to complete:</strong> Only fill in this section if you are declaring a
        common-law partner. Refer to the responsible visa office for your region.
      </div>

      <h3 className="text-base font-medium text-gray-700 border-b pb-1">Jurisdiction where declaration is made</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Country" required error={cl?.jurisdiction_country?.message}>
          <CountrySelect {...register("common_law.jurisdiction_country")} className={inp} />
        </Field>
        <Field label="Province / State" error={cl?.jurisdiction_province?.message}>
          <input {...register("common_law.jurisdiction_province")} className={inp} />
        </Field>
      </div>

      <h3 className="text-base font-medium text-gray-700 border-b pb-1">Partner Information</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Your Full Name" required error={cl?.applicant_name?.message}>
          <input {...register("common_law.applicant_name")} className={inp} />
        </Field>
        <Field label="Partner's Full Name" required error={cl?.partner_name?.message}>
          <input {...register("common_law.partner_name")} className={inp} />
        </Field>
        <Field label="Cohabitation Start Date" required error={cl?.start_date?.message}>
          <input {...register("common_law.start_date")} placeholder="YYYY-MM-DD" className={inp} />
        </Field>
        <Field label="Cohabitation End Date (blank if ongoing)" error={cl?.end_date?.message}>
          <input {...register("common_law.end_date")} placeholder="YYYY-MM-DD" className={inp} />
        </Field>
        <Field label="Years Together" required error={cl?.years_together?.message}>
          <input {...register("common_law.years_together")} className={inp} />
        </Field>
      </div>

      <h3 className="text-base font-medium text-gray-700 border-b pb-1">Cohabitation Address</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="City" required error={cl?.cohabitation_city?.message}>
          <input {...register("common_law.cohabitation_city")} className={inp} />
        </Field>
        <Field label="County (if applicable)" error={cl?.cohabitation_county?.message}>
          <input {...register("common_law.cohabitation_county")} className={inp} />
        </Field>
        <Field label="Province / State" error={cl?.cohabitation_province?.message}>
          <input {...register("common_law.cohabitation_province")} className={inp} />
        </Field>
        <Field label="Country" required error={cl?.cohabitation_country?.message}>
          <CountrySelect {...register("common_law.cohabitation_country")} className={inp} />
        </Field>
      </div>

      <h3 className="text-base font-medium text-gray-700 border-b pb-1">Section 1 — Nature of relationship</h3>
      <p className="text-xs text-gray-600">Answer Yes or No to each statement as it applies to your common-law relationship.</p>
      <div className="grid grid-cols-1 gap-3">
        <Field label="a) Have jointly signed a residential lease, mortgage or purchase agreement relating to a residence in which we both live." error={cl?.section1_joint_residential_agreement?.message}>
          <select {...register("common_law.section1_joint_residential_agreement")} className={inp}>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </Field>
        <Field label="b) Jointly own property other than our residence." error={cl?.section1_joint_property_ownership?.message}>
          <select {...register("common_law.section1_joint_property_ownership")} className={inp}>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </Field>
        <Field label="c) Have joint bank, trust, credit union or charge card accounts." error={cl?.section1_joint_financial_accounts?.message}>
          <select {...register("common_law.section1_joint_financial_accounts")} className={inp}>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </Field>
        <Field label='d) Have declared our common-law union under the Canadian Income Tax Act (T-1 "General — Individual Income Tax Return").' error={cl?.section1_declared_income_tax?.message}>
          <select {...register("common_law.section1_declared_income_tax")} className={inp}>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </Field>
      </div>

      <h3 className="text-base font-medium text-gray-700 border-b pb-1">Section 2 &amp; 3</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Do you have children together?" error={cl?.has_children?.message}>
          <select {...register("common_law.has_children")} className={inp}>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </Field>
        <Field label="Have you previously declared this relationship?" error={cl?.previous_declaration?.message}>
          <select {...register("common_law.previous_declaration")} className={inp}>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </Field>
      </div>

      <h3 className="text-base font-medium text-gray-700 border-b pb-1">Section 4 — Additional details</h3>
      <Field label="Any additional details about your relationship (optional)" error={cl?.additional_details?.message}>
        <textarea {...register("common_law.additional_details")} rows={3} className={inp} />
      </Field>

      <h3 className="text-base font-medium text-gray-700 border-b pb-1">Section 5 — Declaration</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Field label="City" required error={cl?.declaration_city?.message}>
          <input {...register("common_law.declaration_city")} className={inp} />
        </Field>
        <Field label="County (if applicable)" error={cl?.declaration_county?.message}>
          <input {...register("common_law.declaration_county")} className={inp} />
        </Field>
        <Field label="Province / State" error={cl?.declaration_province?.message}>
          <input {...register("common_law.declaration_province")} className={inp} />
        </Field>
        <Field label="Country" required error={cl?.declaration_country?.message}>
          <CountrySelect {...register("common_law.declaration_country")} className={inp} />
        </Field>
        <Field label="Day" required error={cl?.declaration_day?.message}>
          <input {...register("common_law.declaration_day")} placeholder="DD" className={inp} />
        </Field>
        <Field label="Month" required error={cl?.declaration_month?.message}>
          <input {...register("common_law.declaration_month")} placeholder="MM" className={inp} />
        </Field>
        <Field label="Year" required error={cl?.declaration_year?.message}>
          <input {...register("common_law.declaration_year")} placeholder="YYYY" className={inp} />
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Your Signature (type full name)" required error={cl?.applicant_signature?.message}>
          <input {...register("common_law.applicant_signature")} className={inp} />
        </Field>
        <Field label="Partner Signature (type full name)" required error={cl?.partner_signature?.message}>
          <input {...register("common_law.partner_signature")} className={inp} />
        </Field>
      </div>

      <h3 className="text-base font-medium text-gray-700 border-b pb-1">Commissioner / notary (optional)</h3>
      <p className="text-xs text-gray-500">
        Only fill in this block if a Commissioner of Oaths, Notary Public, or other
        authorised official is witnessing the declaration.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Commissioner / notary name" error={cl?.admin_name?.message}>
          <input {...register("common_law.admin_name")} className={inp} />
        </Field>
        <Field label="Commissioner / notary signature (typed name)" error={cl?.admin_signature?.message}>
          <input {...register("common_law.admin_signature")} className={inp} />
        </Field>
      </div>
    </div>
  );
}
