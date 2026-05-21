"use client";
import { FieldErrors, UseFormRegister, UseFormWatch } from "react-hook-form";
import type { StudyPermitData } from "@/lib/schemas/study_permit";
import { CountrySelect } from "@/components/forms/fields/CountrySelect";

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

const RESIDENCE_STATUSES = [
  "Citizen",
  "Permanent resident",
  "Visitor",
  "Worker",
  "Student",
  "Other",
];

const PHONE_TYPES = ["Residence", "Work", "Cell"];
const LANGUAGES = ["English", "French", "Both", "Neither"];

function ResidenceRow({
  prefix,
  register,
  errors,
}: {
  prefix: string;
  register: UseFormRegister<StudyPermitData>;
  errors: any;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3 bg-gray-50 rounded border">
      <Field label="Country / Territory" error={errors?.country?.message}>
        <CountrySelect {...register(`${prefix}.country` as any)} className={inp} />
      </Field>
      <Field label="Status" error={errors?.status?.message}>
        <select {...register(`${prefix}.status` as any)} className={inp}>
          <option value="">-- Select --</option>
          {RESIDENCE_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </Field>
      <Field label="If Other (specify)" error={errors?.status_other?.message}>
        <input {...register(`${prefix}.status_other` as any)} className={inp} />
      </Field>
      <Field label="From (YYYY-MM-DD)" error={errors?.from_date?.message}>
        <input {...register(`${prefix}.from_date` as any)} placeholder="YYYY-MM-DD" className={inp} />
      </Field>
      <Field label="To (YYYY-MM-DD)" error={errors?.to_date?.message}>
        <input {...register(`${prefix}.to_date` as any)} placeholder="YYYY-MM-DD" className={inp} />
      </Field>
    </div>
  );
}

export function PersonalInfoStep({ register, errors, watch }: Props) {
  const pi = errors.personal_info;
  const nat = errors.national_id as any;
  const usc = errors.us_pr_card as any;
  const hasNatID = isYes(watch("national_id.has_document"));
  const hasUSCard = isYes(watch("us_pr_card.has_card"));
  const hasPrevRes = isYes(watch("personal_info.has_previous_residence"));
  const sameApplyCor = isYes(watch("personal_info.applying_country_same_as_current"));
  const sameResidential = isYes(watch("contact.residential_address_same_as_mailing"));
  const hasAltPhone = isYes(watch("contact.has_alt_phone"));
  const hasFax = isYes(watch("contact.has_fax"));
  const contactErr = errors.contact as any;
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Personal Information (IMM 1294, IMM 5707)</h2>
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
          <CountrySelect {...register("personal_info.place_birth_country")} className={inp} />
        </Field>
        <Field label="City of Birth" required error={pi?.place_birth_city?.message}>
          <input {...register("personal_info.place_birth_city")} className={inp} />
        </Field>
        <Field label="Country of Citizenship" required error={pi?.citizenship?.message}>
          <CountrySelect {...register("personal_info.citizenship")} className={inp} />
        </Field>
        <Field label="Current Country of Residence" required error={pi?.current_country?.message}>
          <CountrySelect {...register("personal_info.current_country")} className={inp} />
        </Field>
        <Field label="Marital Status" required error={pi?.marital_status?.message}>
          <select {...register("personal_info.marital_status")} className={inp}>
            <option value="">-- Select --</option>
            {["Single","Married","Common-law","Divorced","Separated","Widowed","Annulled"].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="UCI / Client ID Number (if known)" error={pi?.uci?.message}>
          <input {...register("personal_info.uci")} placeholder="e.g. 12345678" className={inp} />
        </Field>
        <Field label="I want service in" required error={(pi as any)?.service_in?.message}>
          <select {...register("personal_info.service_in")} className={inp}>
            <option value="English">English</option>
            <option value="French">French</option>
          </select>
        </Field>
      </div>

      <h2 className="text-lg font-semibold text-gray-800 pt-4">Languages (IMM 1294)</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Language able to communicate in" required error={pi?.language?.message}>
          <select {...register("personal_info.language")} className={inp}>
            {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </Field>
        <Field label="In which language are you most at ease?" error={(pi as any)?.language_most_at_ease?.message}>
          <select {...register("personal_info.language_most_at_ease")} className={inp}>
            <option value="">-- Select --</option>
            {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </Field>
        <Field label="Have you taken an English/French language test?" error={(pi as any)?.taken_language_test?.message}>
          <select {...register("personal_info.taken_language_test")} className={inp}>
            <option value="">-- Select --</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </Field>
      </div>

      <h2 className="text-lg font-semibold text-gray-800 pt-4">Current Country of Residence — details (IMM 1294)</h2>
      <p className="text-xs text-gray-500">Status in your current country of residence (e.g. Citizen, Permanent resident, Worker), with the dates this status is valid for.</p>
      <ResidenceRow prefix="personal_info.current_residence" register={register} errors={(pi as any)?.current_residence} />

      <h2 className="text-lg font-semibold text-gray-800 pt-4">Previous Countries of Residence (IMM 1294)</h2>
      <p className="text-xs text-gray-500">During the past five years, have you lived in any country other than your country of citizenship or your current country of residence for more than six months?</p>
      <Field label="Have any previous residences to declare?" required error={(pi as any)?.has_previous_residence?.message}>
        <select {...register("personal_info.has_previous_residence")} className={inp}>
          <option value="">-- Select --</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </Field>
      {hasPrevRes && (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1">Previous residence #1</p>
            <ResidenceRow prefix="personal_info.previous_residences.0" register={register} errors={(pi as any)?.previous_residences?.[0]} />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1">Previous residence #2 (optional)</p>
            <ResidenceRow prefix="personal_info.previous_residences.1" register={register} errors={(pi as any)?.previous_residences?.[1]} />
          </div>
        </div>
      )}

      <h2 className="text-lg font-semibold text-gray-800 pt-4">Country Where Applying (IMM 1294)</h2>
      <Field label="Country where applying — same as current country of residence?" required error={(pi as any)?.applying_country_same_as_current?.message}>
        <select {...register("personal_info.applying_country_same_as_current")} className={inp}>
          <option value="">-- Select --</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </Field>
      {!sameApplyCor && (
        <ResidenceRow prefix="personal_info.applying_country" register={register} errors={(pi as any)?.applying_country} />
      )}

      <h2 className="text-lg font-semibold text-gray-800 pt-4">Passport (IMM 1294)</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Passport Number" required error={errors.passport?.passport_number?.message}>
          <input {...register("passport.passport_number")} className={inp} />
        </Field>
        <Field label="Country of Issue" required error={errors.passport?.country_of_issue?.message}>
          <CountrySelect {...register("passport.country_of_issue")} className={inp} />
        </Field>
        <Field label="Issue Date" required error={errors.passport?.issue_date?.message}>
          <input {...register("passport.issue_date")} placeholder="YYYY-MM-DD" className={inp} />
        </Field>
        <Field label="Expiry Date" required error={errors.passport?.expiry_date?.message}>
          <input {...register("passport.expiry_date")} placeholder="YYYY-MM-DD" className={inp} />
        </Field>
        <Field label="For this trip, will you use a passport issued by the Ministry of Foreign Affairs in Taiwan that includes your personal identification number?" error={(pi as any)?.taiwan_passport?.message}>
          <select {...register("personal_info.taiwan_passport")} className={inp}>
            <option value="">-- Select --</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </Field>
        <Field label="For this trip, will you use a National Israeli passport?" error={(pi as any)?.israel_passport_not_valid?.message}>
          <select {...register("personal_info.israel_passport_not_valid")} className={inp}>
            <option value="">-- Select --</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </Field>
      </div>

      <h2 className="text-lg font-semibold text-gray-800 pt-4">National Identity Document (IMM 1294)</h2>
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
            <CountrySelect {...register("national_id.country_of_issue")} className={inp} />
          </Field>
          <Field label="Issue Date" error={nat?.issue_date?.message}>
            <input {...register("national_id.issue_date")} placeholder="YYYY-MM-DD" className={inp} />
          </Field>
          <Field label="Expiry Date" error={nat?.expiry_date?.message}>
            <input {...register("national_id.expiry_date")} placeholder="YYYY-MM-DD" className={inp} />
          </Field>
        </div>
      )}

      <h2 className="text-lg font-semibold text-gray-800 pt-4">U.S. Permanent Resident Card (IMM 1294)</h2>
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
          <Field label="USCIS Number (A-Number)" error={usc?.uscis_number?.message}>
            <input {...register("us_pr_card.uscis_number")} placeholder="9 digits" className={inp} />
          </Field>
          <Field label="Expiry Date" error={usc?.expiry_date?.message}>
            <input {...register("us_pr_card.expiry_date")} placeholder="YYYY-MM-DD" className={inp} />
          </Field>
        </div>
      )}

      <h2 className="text-lg font-semibold text-gray-800 pt-4">Contact Information (IMM 1294)</h2>
      <h3 className="text-sm font-medium text-gray-700">Mailing address</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Unit / Apt" error={contactErr?.mailing_address?.unit?.message}>
          <input {...register("contact.mailing_address.unit")} className={inp} />
        </Field>
        <Field label="Street Number" error={contactErr?.mailing_address?.street_number?.message}>
          <input {...register("contact.mailing_address.street_number")} className={inp} />
        </Field>
        <Field label="Street Name" required error={contactErr?.mailing_address?.street_name?.message}>
          <input {...register("contact.mailing_address.street_name")} className={inp} />
        </Field>
        <Field label="City" required error={contactErr?.mailing_address?.city?.message}>
          <input {...register("contact.mailing_address.city")} className={inp} />
        </Field>
        <Field label="District" error={contactErr?.mailing_address?.district?.message}>
          <input {...register("contact.mailing_address.district")} className={inp} />
        </Field>
        <Field label="Country" required error={contactErr?.mailing_address?.country?.message}>
          <CountrySelect {...register("contact.mailing_address.country")} className={inp} />
        </Field>
        <Field label="Province / State" error={contactErr?.mailing_address?.province_state?.message}>
          <input {...register("contact.mailing_address.province_state")} className={inp} />
        </Field>
        <Field label="Postal / ZIP Code" error={contactErr?.mailing_address?.postal_code?.message}>
          <input {...register("contact.mailing_address.postal_code")} className={inp} />
        </Field>
      </div>

      <h3 className="text-sm font-medium text-gray-700 pt-2">Residential address</h3>
      <Field label="Is your residential address the same as your mailing address?" required error={contactErr?.residential_address_same_as_mailing?.message}>
        <select {...register("contact.residential_address_same_as_mailing")} className={inp}>
          <option value="">-- Select --</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </Field>
      {!sameResidential && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-gray-50 rounded border">
          <Field label="Unit / Apt" error={contactErr?.residential_address?.unit?.message}>
            <input {...register("contact.residential_address.unit")} className={inp} />
          </Field>
          <Field label="Street Number" error={contactErr?.residential_address?.street_number?.message}>
            <input {...register("contact.residential_address.street_number")} className={inp} />
          </Field>
          <Field label="Street Name" error={contactErr?.residential_address?.street_name?.message}>
            <input {...register("contact.residential_address.street_name")} className={inp} />
          </Field>
          <Field label="City" error={contactErr?.residential_address?.city?.message}>
            <input {...register("contact.residential_address.city")} className={inp} />
          </Field>
          <Field label="District" error={contactErr?.residential_address?.district?.message}>
            <input {...register("contact.residential_address.district")} className={inp} />
          </Field>
          <Field label="Country" error={contactErr?.residential_address?.country?.message}>
            <CountrySelect {...register("contact.residential_address.country")} className={inp} />
          </Field>
          <Field label="Province / State" error={contactErr?.residential_address?.province_state?.message}>
            <input {...register("contact.residential_address.province_state")} className={inp} />
          </Field>
          <Field label="Postal / ZIP Code" error={contactErr?.residential_address?.postal_code?.message}>
            <input {...register("contact.residential_address.postal_code")} className={inp} />
          </Field>
        </div>
      )}

      <h3 className="text-sm font-medium text-gray-700 pt-2">Phone & Email</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Primary Phone Number" required error={contactErr?.phone?.message}>
          <input {...register("contact.phone")} placeholder="+1-555-000-0000" className={inp} />
        </Field>
        <Field label="Phone Type" error={contactErr?.primary_phone_type?.message}>
          <select {...register("contact.primary_phone_type")} className={inp}>
            <option value="">-- Select --</option>
            {PHONE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Email" required error={contactErr?.email?.message}>
          <input {...register("contact.email")} type="email" className={inp} />
        </Field>
      </div>

      <Field label="Do you have an alternate phone number?" error={contactErr?.has_alt_phone?.message}>
        <select {...register("contact.has_alt_phone")} className={inp}>
          <option value="">-- Select --</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </Field>
      {hasAltPhone && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 bg-gray-50 rounded border">
          <Field label="Type" error={contactErr?.alt_phone?.phone_type?.message}>
            <select {...register("contact.alt_phone.phone_type")} className={inp}>
              <option value="">-- Select --</option>
              {PHONE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Country code" error={contactErr?.alt_phone?.country_code?.message}>
            <input {...register("contact.alt_phone.country_code")} placeholder="1" className={inp} />
          </Field>
          <Field label="Number" error={contactErr?.alt_phone?.number?.message}>
            <input {...register("contact.alt_phone.number")} placeholder="6045550999" className={inp} />
          </Field>
          <Field label="Ext" error={contactErr?.alt_phone?.ext?.message}>
            <input {...register("contact.alt_phone.ext")} className={inp} />
          </Field>
        </div>
      )}

      <Field label="Do you have a fax number?" error={contactErr?.has_fax?.message}>
        <select {...register("contact.has_fax")} className={inp}>
          <option value="">-- Select --</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </Field>
      {hasFax && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-3 bg-gray-50 rounded border">
          <Field label="Country code" error={contactErr?.fax?.country_code?.message}>
            <input {...register("contact.fax.country_code")} placeholder="1" className={inp} />
          </Field>
          <Field label="Number" error={contactErr?.fax?.number?.message}>
            <input {...register("contact.fax.number")} className={inp} />
          </Field>
          <Field label="Ext" error={contactErr?.fax?.ext?.message}>
            <input {...register("contact.fax.ext")} className={inp} />
          </Field>
        </div>
      )}
    </div>
  );
}
