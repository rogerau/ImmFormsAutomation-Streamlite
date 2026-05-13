"use client";
import { Control, FieldErrors, UseFormRegister, UseFormWatch } from "react-hook-form";
import type { StudyPermitData } from "@/lib/schemas/study_permit";

interface Props {
  register: UseFormRegister<StudyPermitData>;
  errors: FieldErrors<StudyPermitData>;
  watch: UseFormWatch<StudyPermitData>;
}

const isYes = (v: unknown) => v === true || v === "true";

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
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

const inp =
  "mt-0 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";

export function PersonalInfoStep({ register, errors, watch }: Props) {
  const pi = errors.personal_info;
  const nat = errors.national_id as any;
  const usc = errors.us_pr_card as any;
  const hasNatID = isYes(watch("national_id.has_document"));
  const hasUSCard = isYes(watch("us_pr_card.has_card"));
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Personal Information</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Family Name" required error={pi?.family_name?.message}>
          <input {...register("personal_info.family_name")} className={inp} />
        </Field>
        <Field label="Given Name(s)" required error={pi?.given_name?.message}>
          <input {...register("personal_info.given_name")} className={inp} />
        </Field>
        <Field label="Name in Native Language (optional)" error={pi?.native_name?.message}>
          <input {...register("personal_info.native_name")} className={inp} />
        </Field>
        <Field label="Date of Birth" required error={pi?.date_of_birth?.message}>
          <input {...register("personal_info.date_of_birth")} placeholder="YYYY-MM-DD" className={inp} />
        </Field>
        <Field label="Sex" required error={pi?.sex?.message}>
          <select {...register("personal_info.sex")} className={inp}>
            <option value="">-- Select --</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </Field>
        <Field label="Country of Birth" required error={pi?.place_birth_country?.message}>
          <input {...register("personal_info.place_birth_country")} className={inp} />
        </Field>
        <Field label="City of Birth" required error={pi?.place_birth_city?.message}>
          <input {...register("personal_info.place_birth_city")} className={inp} />
        </Field>
        <Field label="Country of Citizenship" required error={pi?.citizenship?.message}>
          <input {...register("personal_info.citizenship")} className={inp} />
        </Field>
        <Field label="Current Country of Residence" required error={pi?.current_country?.message}>
          <input {...register("personal_info.current_country")} className={inp} />
        </Field>
        <Field label="Marital Status" required error={pi?.marital_status?.message}>
          <select {...register("personal_info.marital_status")} className={inp}>
            <option value="">-- Select --</option>
            {["Single","Married","Common-law","Divorced","Separated","Widowed","Annulled"].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Language You Communicate In" required error={pi?.language?.message}>
          <select {...register("personal_info.language")} className={inp}>
            <option value="English">English</option>
            <option value="French">French</option>
            <option value="Both">Both</option>
            <option value="Neither">Neither</option>
          </select>
        </Field>
        <Field label="I want service in" required error={(pi as any)?.service_in?.message}>
          <select {...register("personal_info.service_in")} className={inp}>
            <option value="English">English</option>
            <option value="French">French</option>
          </select>
        </Field>
        <Field label="UCI / Client ID Number (if known)" error={pi?.uci?.message}>
          <input {...register("personal_info.uci")} placeholder="e.g. 12345678" className={inp} />
        </Field>
      </div>

      <h2 className="text-lg font-semibold text-gray-800 pt-4">Passport</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Passport Number" required error={errors.passport?.passport_number?.message}>
          <input {...register("passport.passport_number")} className={inp} />
        </Field>
        <Field label="Country of Issue" required error={errors.passport?.country_of_issue?.message}>
          <input {...register("passport.country_of_issue")} className={inp} />
        </Field>
        <Field label="Issue Date" required error={errors.passport?.issue_date?.message}>
          <input {...register("passport.issue_date")} placeholder="YYYY-MM-DD" className={inp} />
        </Field>
        <Field label="Expiry Date" required error={errors.passport?.expiry_date?.message}>
          <input {...register("passport.expiry_date")} placeholder="YYYY-MM-DD" className={inp} />
        </Field>
      </div>

      <h2 className="text-lg font-semibold text-gray-800 pt-4">National Identity Document</h2>
      <p className="text-sm text-gray-500">Do you have a national identity document?</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Has national identity document?" required error={nat?.has_document?.message}>
          <select {...register("national_id.has_document")} className={inp}>
            <option value="">-- Select --</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </Field>
      </div>
      {hasNatID && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Document Number" error={nat?.doc_number?.message}>
            <input {...register("national_id.doc_number")} className={inp} />
          </Field>
          <Field label="Country of Issue" error={nat?.country_of_issue?.message}>
            <input {...register("national_id.country_of_issue")} className={inp} />
          </Field>
          <Field label="Issue Date" error={nat?.issue_date?.message}>
            <input {...register("national_id.issue_date")} placeholder="YYYY-MM-DD" className={inp} />
          </Field>
          <Field label="Expiry Date" error={nat?.expiry_date?.message}>
            <input {...register("national_id.expiry_date")} placeholder="YYYY-MM-DD" className={inp} />
          </Field>
        </div>
      )}

      <h2 className="text-lg font-semibold text-gray-800 pt-4">U.S. Permanent Resident Card</h2>
      <p className="text-sm text-gray-500">Do you currently hold a valid U.S. Permanent Resident Card (Green Card)?</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Has U.S. PR card?" required error={usc?.has_card?.message}>
          <select {...register("us_pr_card.has_card")} className={inp}>
            <option value="">-- Select --</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </Field>
      </div>
      {hasUSCard && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Document Number" error={usc?.doc_number?.message}>
            <input {...register("us_pr_card.doc_number")} className={inp} />
          </Field>
          <Field label="Expiry Date" error={usc?.expiry_date?.message}>
            <input {...register("us_pr_card.expiry_date")} placeholder="YYYY-MM-DD" className={inp} />
          </Field>
        </div>
      )}

      <h2 className="text-lg font-semibold text-gray-800 pt-4">Contact Information</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Street Name" required error={errors.contact?.mailing_address?.street_name?.message}>
          <input {...register("contact.mailing_address.street_name")} className={inp} />
        </Field>
        <Field label="Street Number" error={errors.contact?.mailing_address?.street_number?.message}>
          <input {...register("contact.mailing_address.street_number")} className={inp} />
        </Field>
        <Field label="Unit / Apt" error={errors.contact?.mailing_address?.unit?.message}>
          <input {...register("contact.mailing_address.unit")} className={inp} />
        </Field>
        <Field label="City" required error={errors.contact?.mailing_address?.city?.message}>
          <input {...register("contact.mailing_address.city")} className={inp} />
        </Field>
        <Field label="Country" required error={errors.contact?.mailing_address?.country?.message}>
          <input {...register("contact.mailing_address.country")} className={inp} />
        </Field>
        <Field label="Province / State" error={errors.contact?.mailing_address?.province_state?.message}>
          <input {...register("contact.mailing_address.province_state")} className={inp} />
        </Field>
        <Field label="Postal / ZIP Code" error={errors.contact?.mailing_address?.postal_code?.message}>
          <input {...register("contact.mailing_address.postal_code")} className={inp} />
        </Field>
        <Field label="Phone Number" required error={errors.contact?.phone?.message}>
          <input {...register("contact.phone")} placeholder="+1-555-000-0000" className={inp} />
        </Field>
        <Field label="Email" required error={errors.contact?.email?.message}>
          <input {...register("contact.email")} type="email" className={inp} />
        </Field>
      </div>
    </div>
  );
}
