"use client";
import { useEffect } from "react";
import { Control, FieldErrors, UseFormRegister, UseFormSetValue, useWatch } from "react-hook-form";
import type { StudyPermitData } from "@/lib/schemas/study_permit";
import { CountrySelect } from "@/components/forms/fields/CountrySelect";
import { NationalIdBlock, UsCardBlock, ResidenceHistory } from "@/components/forms/fields/DependentFields";

const isYes = (v: unknown) => v === true || v === "true";

interface Props {
  control: Control<StudyPermitData>;
  register: UseFormRegister<StudyPermitData>;
  errors: FieldErrors<StudyPermitData>;
  setValue: UseFormSetValue<StudyPermitData>;
  optionalForms: string[];
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

export function DependentSpouseStep({ control, register, errors, setValue, optionalForms }: Props) {
  const spouse = useWatch({ control, name: "family.spouse" });
  const isWorkPermit = optionalForms.includes("spouse_work_permit");
  const isVisitor = optionalForms.includes("spouse_visitor");
  const sa = errors.family?.spouse_study_applicant;
  const label = spouse ? [spouse.given_names, spouse.family_name].filter(Boolean).join(" ") : "Your spouse / partner";

  const workPermitType = useWatch({ control, name: "family.spouse_study_applicant.work.work_permit_type" as any });
  const isOpenWorkPermit = isWorkPermit && (workPermitType ?? "Open Work Permit") === "Open Work Permit";

  // Open Work Permit doesn't have a specific employer/job — job title and
  // position description are hardcoded to "OPEN" rather than collected, and
  // intended city/province are left blank (not asked, not hardcoded).
  useEffect(() => {
    if (!isOpenWorkPermit) return;
    setValue("family.spouse_study_applicant.work.job_title" as any, "OPEN");
    setValue("family.spouse_study_applicant.work.position_description" as any, "OPEN");
    setValue("family.spouse_study_applicant.work.intended_city_town" as any, "");
    setValue("family.spouse_study_applicant.work.intended_province_state" as any, "");
  }, [isOpenWorkPermit, setValue]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">
          {isWorkPermit ? "Spouse — Open Work Permit (IMM 1295)" : "Spouse — Visitor Visa (IMM 5257)"}
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          {label} needs their own application alongside yours.{" "}
          {isWorkPermit
            ? "Because your program of study qualifies, they can apply for an open work permit."
            : "Because your program of study doesn't qualify for an open work permit, they'll apply as a visitor."}
          {" "}Their name, date of birth and country of birth are reused from the Family
          Background step. The rest below is the spouse's own information.
        </p>
      </div>

      {!spouse && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
          No spouse / partner was added in the Family Background step. Go back and add one first.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Sex" required error={sa?.sex?.message}>
          <select {...register("family.spouse_study_applicant.sex" as any)} className={inp}>
            <option value="">-- Select --</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </Field>
        <Field label="City of Birth" required error={sa?.place_birth_city?.message}>
          <input {...register("family.spouse_study_applicant.place_birth_city" as any)} className={inp} />
        </Field>
        <Field label="Citizenship" error={sa?.citizenship?.message}>
          <CountrySelect {...register("family.spouse_study_applicant.citizenship" as any)} className={inp} />
        </Field>
        <Field label="Current Country of Residence" error={sa?.current_country?.message}>
          <CountrySelect {...register("family.spouse_study_applicant.current_country" as any)} className={inp} />
        </Field>
      </div>

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Passport</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Passport Number" required error={sa?.passport?.passport_number?.message}>
            <input {...register("family.spouse_study_applicant.passport.passport_number" as any)} className={inp} />
          </Field>
          <Field label="Country of Issue" required error={sa?.passport?.country_of_issue?.message}>
            <CountrySelect {...register("family.spouse_study_applicant.passport.country_of_issue" as any)} className={inp} />
          </Field>
          <Field label="Issue Date" error={(sa?.passport as any)?.issue_date?.message}>
            <input {...register("family.spouse_study_applicant.passport.issue_date" as any)} placeholder="YYYY-MM-DD" className={inp} />
          </Field>
          <Field label="Expiry Date" error={(sa?.passport as any)?.expiry_date?.message}>
            <input {...register("family.spouse_study_applicant.passport.expiry_date" as any)} placeholder="YYYY-MM-DD" className={inp} />
          </Field>
        </div>
      </div>

      {/* Phase X2 — the spouse's OWN national ID, US PR card, residence history,
          and address (was previously inferred from the main applicant). */}
      <NationalIdBlock prefix="family.spouse_study_applicant" control={control} register={register} errors={sa} />
      <UsCardBlock prefix="family.spouse_study_applicant" control={control} register={register} errors={sa} />
      <ResidenceHistory prefix="family.spouse_study_applicant" control={control} register={register} errors={sa} />

      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Address</h4>
        <Field label="Is the spouse's address the same as the main applicant's?">
          <select {...register("family.spouse_study_applicant.address_same_as_main" as any)} className={inp}>
            <option value="true">Yes — same household address</option>
            <option value="false">No — different address</option>
          </select>
        </Field>
        {isYes(useWatch({ control, name: "family.spouse_study_applicant.address_same_as_main" as any })) === false && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Unit" error={(sa?.mailing_address as any)?.unit?.message}>
              <input {...register("family.spouse_study_applicant.mailing_address.unit" as any)} className={inp} />
            </Field>
            <Field label="Street Number" error={(sa?.mailing_address as any)?.street_number?.message}>
              <input {...register("family.spouse_study_applicant.mailing_address.street_number" as any)} className={inp} />
            </Field>
            <Field label="Street Name" error={(sa?.mailing_address as any)?.street_name?.message}>
              <input {...register("family.spouse_study_applicant.mailing_address.street_name" as any)} className={inp} />
            </Field>
            <Field label="City / Town" error={(sa?.mailing_address as any)?.city?.message}>
              <input {...register("family.spouse_study_applicant.mailing_address.city" as any)} className={inp} />
            </Field>
            <Field label="Country / Territory" error={(sa?.mailing_address as any)?.country?.message}>
              <CountrySelect {...register("family.spouse_study_applicant.mailing_address.country" as any)} className={inp} />
            </Field>
            <Field label="Province / State" error={(sa?.mailing_address as any)?.province_state?.message}>
              <input {...register("family.spouse_study_applicant.mailing_address.province_state" as any)} className={inp} />
            </Field>
            <Field label="Postal Code" error={(sa?.mailing_address as any)?.postal_code?.message}>
              <input {...register("family.spouse_study_applicant.mailing_address.postal_code" as any)} className={inp} />
            </Field>
          </div>
        )}
      </div>

      {isWorkPermit && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Intended Work in Canada</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Work Permit Type" required error={(sa?.work as any)?.work_permit_type?.message}>
              <select {...register("family.spouse_study_applicant.work.work_permit_type" as any)} className={inp}>
                <option value="Open Work Permit">Open Work Permit</option>
                <option value="Employer-Specific Work Permit">Employer-Specific Work Permit</option>
              </select>
            </Field>
          </div>
          {isOpenWorkPermit ? (
            <p className="mt-2 text-xs text-gray-500">
              An open work permit isn't tied to a specific job or location — job title, position
              description, intended city and intended province are not collected for this path.
            </p>
          ) : (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Job Title" required error={(sa?.work as any)?.job_title?.message}>
                <input {...register("family.spouse_study_applicant.work.job_title" as any)} className={inp} />
              </Field>
              <Field label="Position Description" required error={(sa?.work as any)?.position_description?.message}>
                <textarea {...register("family.spouse_study_applicant.work.position_description" as any)} rows={3} className={inp} />
              </Field>
              <Field label="Intended City/Town in Canada" error={(sa?.work as any)?.intended_city_town?.message}>
                <input {...register("family.spouse_study_applicant.work.intended_city_town" as any)} className={inp} />
              </Field>
              <Field label="Intended Province/State" error={(sa?.work as any)?.intended_province_state?.message}>
                <input {...register("family.spouse_study_applicant.work.intended_province_state" as any)} className={inp} />
              </Field>
            </div>
          )}
        </div>
      )}

      {isVisitor && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Details of Visit</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Purpose of Visit" required error={(sa?.visit as any)?.purpose_of_visit?.message}>
              <select {...register("family.spouse_study_applicant.visit.purpose_of_visit" as any)} className={inp}>
                <option value="Visit">Visit</option>
                <option value="Business">Business</option>
                <option value="Other">Other</option>
              </select>
            </Field>
            <Field label="Funds Available (CAD)" error={(sa?.visit as any)?.funds_available?.message}>
              <input {...register("family.spouse_study_applicant.visit.funds_available" as any)} className={inp} />
            </Field>
            <Field label="Visit Start Date" required error={(sa?.visit as any)?.how_long_from?.message}>
              <input {...register("family.spouse_study_applicant.visit.how_long_from" as any)} placeholder="YYYY-MM-DD" className={inp} />
            </Field>
            <Field label="Visit End Date" required error={(sa?.visit as any)?.how_long_to?.message}>
              <input {...register("family.spouse_study_applicant.visit.how_long_to" as any)} placeholder="YYYY-MM-DD" className={inp} />
            </Field>
          </div>
        </div>
      )}
    </div>
  );
}
