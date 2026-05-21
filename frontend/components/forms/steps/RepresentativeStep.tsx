"use client";
import { useEffect } from "react";
import { FieldErrors, UseFormRegister, UseFormGetValues, UseFormSetValue } from "react-hook-form";
import type { StudyPermitData } from "@/lib/schemas/study_permit";
import { CountrySelect } from "@/components/forms/fields/CountrySelect";

interface Props {
  register: UseFormRegister<StudyPermitData>;
  errors: FieldErrors<StudyPermitData>;
  getValues: UseFormGetValues<StudyPermitData>;
  setValue: UseFormSetValue<StudyPermitData>;
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

export function RepresentativeStep({ register, errors, getValues, setValue }: Props) {
  const r = errors.representative as any;

  // Auto-populate applicant name from personal_info (same person — no need to re-ask).
  useEffect(() => {
    const pi = getValues("personal_info");
    if (pi?.family_name) setValue("representative.applicant_family_name", pi.family_name);
    if (pi?.given_name) setValue("representative.applicant_given_name", pi.given_name);
  }, [getValues, setValue]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Use of a Representative (IMM 5476)</h2>
      <p className="text-sm text-gray-500">Authorize an immigration consultant or lawyer to act on your behalf.</p>

      <h3 className="text-base font-medium text-gray-700 border-b pb-1">Representative Type</h3>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Representative Type <span className="text-red-600">*</span></label>
        <select {...register("representative.rep_type")} className={inp}>
          <option value="paid_member">Paid — member of regulatory body (ICCRC, law society)</option>
          <option value="paid_other">Paid — other</option>
          <option value="unpaid">Unpaid (friend/family)</option>
          <option value="cancel">Cancel / withdraw existing rep</option>
        </select>
      </div>

      <h3 className="text-base font-medium text-gray-700 border-b pb-1">Representative Details</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Family Name" required error={r?.rep_family_name?.message}>
          <input {...register("representative.rep_family_name")} className={inp} />
        </Field>
        <Field label="Given Name" required error={r?.rep_given_name?.message}>
          <input {...register("representative.rep_given_name")} className={inp} />
        </Field>
        <Field label="ICCRC Member Number" error={r?.iccrc_number?.message}>
          <input {...register("representative.iccrc_number")} className={inp} />
        </Field>
        <Field label="Organization / Firm Name" error={r?.organization_name?.message}>
          <input {...register("representative.organization_name")} className={inp} />
        </Field>
        <Field label="Street Name" required error={r?.street_name?.message}>
          <input {...register("representative.street_name")} className={inp} />
        </Field>
        <Field label="City" required error={r?.city?.message}>
          <input {...register("representative.city")} className={inp} />
        </Field>
        <Field label="Province / State" error={r?.province?.message}>
          <input {...register("representative.province")} className={inp} />
        </Field>
        <Field label="Country" required error={r?.country?.message}>
          <CountrySelect {...register("representative.country")} className={inp} />
        </Field>
        <Field label="Postal Code" error={r?.postal_code?.message}>
          <input {...register("representative.postal_code")} className={inp} />
        </Field>
        <Field label="Phone Number" required error={r?.phone_number?.message}>
          <input {...register("representative.phone_number")} className={inp} />
        </Field>
        <Field label="Email" required error={r?.email?.message}>
          <input {...register("representative.email")} type="email" className={inp} />
        </Field>
      </div>

      <h3 className="text-base font-medium text-gray-700 border-b pb-1">Applicant UCI (if known)</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="UCI / Client ID Number" error={r?.uci_number?.message}>
          <input {...register("representative.uci_number")} className={inp} />
        </Field>
        <Field label="Applicant Date of Birth" required error={r?.applicant_dob?.message}>
          <input {...register("representative.applicant_dob")} placeholder="YYYY-MM-DD" className={inp} />
        </Field>
      </div>

      <h3 className="text-base font-medium text-gray-700 border-b pb-1">Signatures</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Your Signature (type full name)" required error={r?.applicant_signature?.message}>
          <input {...register("representative.applicant_signature")} className={inp} />
        </Field>
        <Field label="Date Signed" required error={r?.applicant_date_signed?.message}>
          <input {...register("representative.applicant_date_signed")} placeholder="YYYY-MM-DD" className={inp} />
        </Field>
        <Field label="Representative Signature (type name)" error={r?.rep_signature?.message}>
          <input {...register("representative.rep_signature")} className={inp} />
        </Field>
        <Field label="Representative Date Signed" error={r?.rep_date_signed?.message}>
          <input {...register("representative.rep_date_signed")} placeholder="YYYY-MM-DD" className={inp} />
        </Field>
      </div>
    </div>
  );
}
