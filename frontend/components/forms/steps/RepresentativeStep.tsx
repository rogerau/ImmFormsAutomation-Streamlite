"use client";
import { useEffect } from "react";
import { FieldErrors, UseFormRegister, UseFormGetValues, UseFormSetValue, useWatch, Control } from "react-hook-form";
import type { StudyPermitData } from "@/lib/schemas/study_permit";
import { CountrySelect } from "@/components/forms/fields/CountrySelect";

interface Props {
  register: UseFormRegister<StudyPermitData>;
  errors: FieldErrors<StudyPermitData>;
  getValues: UseFormGetValues<StudyPermitData>;
  setValue: UseFormSetValue<StudyPermitData>;
  control?: Control<StudyPermitData>;
}

const inp = "block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";

const ACTION_OPTIONS: Array<{ value: string; label: string; sections: string }> = [
  { value: "appointing", label: "Appointing a representative", sections: "Sections A, B, E" },
  { value: "updating", label: "Updating contact information of an appointed representative", sections: "Sections A, B, E" },
  { value: "cancelling", label: "Cancelling the appointment of a representative", sections: "Sections A, C, E" },
  { value: "cancelling_and_appointing", label: "Cancelling and appointing a new representative", sections: "Sections A, B, C, E" },
  { value: "withdrawing", label: "Withdrawing role as a representative", sections: "Sections A, D, E" },
];

const SUBTYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "unpaid_friend_family", label: "Unpaid — Friend or family member" },
  { value: "unpaid_iccrc", label: "Unpaid — Member of CICC (College of Immigration and Citizenship Consultants)" },
  { value: "unpaid_law_society", label: "Unpaid — Member of a Canadian Provincial / Territorial law society or student-at-law" },
  { value: "unpaid_chambre", label: "Unpaid — Member of the Chambre des notaires du Québec" },
  { value: "unpaid_other", label: "Unpaid — Other (please specify)" },
  { value: "paid_iccrc", label: "Paid — Member of CICC" },
  { value: "paid_law_society", label: "Paid — Member of a Canadian Provincial / Territorial law society or student-at-law" },
  { value: "paid_chambre", label: "Paid — Member of the Chambre des notaires du Québec" },
];

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

export function RepresentativeStep({ register, errors, getValues, setValue, control }: Props) {
  const r = errors.representative as any;

  // Auto-populate applicant identity from personal_info / contact (same person).
  useEffect(() => {
    const pi = getValues("personal_info");
    const contact = getValues("contact");
    if (pi?.family_name) setValue("representative.applicant_family_name", pi.family_name);
    if (pi?.given_name) setValue("representative.applicant_given_name", pi.given_name);
    if (pi?.date_of_birth) setValue("representative.applicant_dob", pi.date_of_birth);
    if (pi?.uci) setValue("representative.uci_number", pi.uci);
    if (contact?.email) setValue("representative.applicant_email", contact.email);
    setValue("representative.type_of_application", "Study Permit (Outside Canada)");
    // Section E consent signature = applicant's full name (given + family), same
    // convention as every other form's main-applicant signature. Editable.
    const fullName = [pi?.given_name, pi?.family_name].filter(Boolean).join(" ");
    if (fullName) setValue("representative.applicant_signature", fullName);
  }, [getValues, setValue]);

  const action = useWatch({ control, name: "representative.rep_action" }) ?? "appointing";
  const repType = useWatch({ control, name: "representative.rep_type" }) ?? "paid_iccrc";

  const sections = (() => {
    switch (action) {
      case "appointing":
      case "updating":
        return new Set(["B"]);
      case "cancelling":
        return new Set(["C"]);
      case "cancelling_and_appointing":
        return new Set(["B", "C"]);
      case "withdrawing":
        return new Set(["D"]);
      default:
        return new Set<string>();
    }
  })();

  const showB = sections.has("B");
  const showC = sections.has("C");
  const showD = sections.has("D");

  const isLawSociety = repType === "unpaid_law_society" || repType === "paid_law_society";
  const isCICC = repType === "unpaid_iccrc" || repType === "paid_iccrc";
  const isChambre = repType === "unpaid_chambre" || repType === "paid_chambre";
  const isUnpaidOther = repType === "unpaid_other";

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Use of a Representative (IMM 5476)</h2>
      <div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <strong>When to complete:</strong> Only fill in this section if you are using the
        services of an authorized representative, or if you are appointing, cancelling, or
        withdrawing a representative.
      </div>

      <h3 className="text-base font-medium text-gray-700 border-b pb-1">I am: (Action)</h3>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          What action are you taking? <span className="text-red-600">*</span>
        </label>
        <select {...register("representative.rep_action")} className={inp}>
          {ACTION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label} ({o.sections})</option>
          ))}
        </select>
      </div>

      {showB && (
        <>
          <h3 className="text-base font-medium text-gray-700 border-b pb-1">Section B — Representative Type & Details</h3>
          <Field label="Representative sub-type" required error={r?.rep_type?.message}>
            <select {...register("representative.rep_type")} className={inp}>
              {SUBTYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Family Name" required error={r?.rep_family_name?.message}>
              <input {...register("representative.rep_family_name")} className={inp} />
            </Field>
            <Field label="Given Name" required error={r?.rep_given_name?.message}>
              <input {...register("representative.rep_given_name")} className={inp} />
            </Field>
            {isCICC && (
              <Field label="CICC Member Number" error={r?.iccrc_number?.message}>
                <input {...register("representative.iccrc_number")} className={inp} />
              </Field>
            )}
            {isLawSociety && (
              <>
                <Field label="Law Society Province" error={r?.provincial_law_society?.message}>
                  <input {...register("representative.provincial_law_society")} className={inp} />
                </Field>
                <Field label="Law Society Member ID" error={r?.membership_id?.message}>
                  <input {...register("representative.membership_id")} className={inp} />
                </Field>
              </>
            )}
            {isChambre && (
              <Field label="Chambre des notaires Member #" error={r?.membership_id?.message}>
                <input {...register("representative.membership_id")} className={inp} />
              </Field>
            )}
            {isUnpaidOther && (
              <Field label='Specify "Other" relationship' error={r?.unpaid_other_specify?.message}>
                <input {...register("representative.unpaid_other_specify")} className={inp} />
              </Field>
            )}
            <Field label="Organization / Firm Name" error={r?.organization_name?.message}>
              <input {...register("representative.organization_name")} className={inp} />
            </Field>
            <Field label="Unit / Apt (optional)" error={r?.unit?.message}>
              <input {...register("representative.unit")} className={inp} />
            </Field>
            <Field label="Street Number" error={r?.street_number?.message}>
              <input {...register("representative.street_number")} className={inp} />
            </Field>
            <Field label="Street Name" error={r?.street_name?.message}>
              <input {...register("representative.street_name")} className={inp} />
            </Field>
            <Field label="City" error={r?.city?.message}>
              <input {...register("representative.city")} className={inp} />
            </Field>
            <Field label="Province / State" error={r?.province?.message}>
              <input {...register("representative.province")} className={inp} />
            </Field>
            <Field label="Country" error={r?.country?.message}>
              <CountrySelect {...register("representative.country")} className={inp} />
            </Field>
            <Field label="Postal Code" error={r?.postal_code?.message}>
              <input {...register("representative.postal_code")} className={inp} />
            </Field>
            <Field label="Phone Number" error={r?.phone_number?.message}>
              <input {...register("representative.phone_number")} className={inp} />
            </Field>
            <Field label="Representative Email" error={r?.email?.message}>
              <input {...register("representative.email")} type="email" className={inp} />
            </Field>
          </div>
        </>
      )}

      {showC && (
        <>
          <h3 className="text-base font-medium text-gray-700 border-b pb-1">Section C — Existing Representative Being Cancelled</h3>
          <p className="text-xs text-gray-600">Enter the details of the representative whose appointment is being cancelled. If cancelling and appointing a new one, the fields in Section B above describe the new representative.</p>
        </>
      )}

      {showD && (
        <>
          <h3 className="text-base font-medium text-gray-700 border-b pb-1">Section D — You Are Withdrawing as a Representative</h3>
          <p className="text-xs text-gray-600">Fill in your representative details above (Section B fields are reused) and provide your signature + date.</p>
        </>
      )}

      <h3 className="text-base font-medium text-gray-700 border-b pb-1">Section E — Your Consent (Applicant)</h3>
      <p className="text-xs text-gray-600">Your signature and date below also fulfil Section E (Applicant's Consent), which IRCC requires regardless of the action selected.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Your Signature (type full name)" required error={r?.applicant_signature?.message}>
          <input {...register("representative.applicant_signature")} className={inp} />
        </Field>
        <Field label="Date Signed" required error={r?.applicant_date_signed?.message}>
          <input {...register("representative.applicant_date_signed")} placeholder="YYYY-MM-DD" className={inp} />
        </Field>
      </div>
    </div>
  );
}
