"use client";
import { useEffect } from "react";
import { FieldErrors, UseFormRegister, UseFormWatch, UseFormSetValue } from "react-hook-form";
import type { StudyPermitData } from "@/lib/schemas/study_permit";
import { CountrySelect } from "@/components/forms/fields/CountrySelect";

const MARITAL_STATUSES = [
  "Annulled marriage",
  "Common-law",
  "Divorced",
  "Legally separated",
  "Married-physically present",
  "Married-not physically present",
  "Single",
  "Widowed",
];
const PARENT_STATUSES = ["Living", "Deceased"];

interface Props {
  register: UseFormRegister<StudyPermitData>;
  errors: FieldErrors<StudyPermitData>;
  watch: UseFormWatch<StudyPermitData>;
  setValue: UseFormSetValue<StudyPermitData>;
}

const inp = "block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";
const sectionHeading = "text-base font-semibold text-gray-800 border-b pb-1 mb-3";

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

function PersonBlock({
  prefix,
  label,
  register,
  errors,
  showAddress = true,
  showAccompany = true,
  showMarital = true,
  showStatus = false,
  showNativeName = false,
}: {
  prefix: string;
  label: string;
  register: UseFormRegister<StudyPermitData>;
  errors: any;
  showAddress?: boolean;
  showAccompany?: boolean;
  showMarital?: boolean;
  showStatus?: boolean;
  showNativeName?: boolean;
}) {
  return (
    <div className="space-y-3">
      <h3 className={sectionHeading}>{label}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Family Name" required error={errors?.family_name?.message}>
          <input {...register(`${prefix}.family_name` as any)} className={inp} />
        </Field>
        <Field label="Given Name(s)" required error={errors?.given_names?.message}>
          <input {...register(`${prefix}.given_names` as any)} className={inp} />
        </Field>
        {showNativeName && (
          <Field label="Name in Native Language (optional)" error={errors?.native_name?.message}>
            <input {...register(`${prefix}.native_name` as any)} className={inp} />
          </Field>
        )}
        <Field label="Date of Birth" required error={errors?.date_of_birth?.message}>
          <input {...register(`${prefix}.date_of_birth` as any)} placeholder="YYYY-MM-DD" className={inp} />
        </Field>
        <Field label="Country of Birth" required error={errors?.country_of_birth?.message}>
          <CountrySelect {...register(`${prefix}.country_of_birth` as any)} className={inp} />
        </Field>
        {showStatus && (
          <Field label="Status" required error={errors?.status?.message}>
            <select {...register(`${prefix}.status` as any)} className={inp}>
              {PARENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        )}
        {showAddress && (
          <Field label="Home Address" required error={errors?.address?.message}>
            <input {...register(`${prefix}.address` as any)} className={inp} />
          </Field>
        )}
        <Field label="Occupation" required error={errors?.occupation?.message}>
          <input {...register(`${prefix}.occupation` as any)} className={inp} />
        </Field>
        {showMarital && (
          <Field label="Marital Status" error={errors?.marital_status?.message}>
            <select {...register(`${prefix}.marital_status` as any)} className={inp}>
              <option value="">-- Select --</option>
              {MARITAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        )}
        {showAccompany && (
          <Field label="Will Accompany to Canada?" required error={errors?.will_accompany?.message}>
            <select {...register(`${prefix}.will_accompany` as any)} className={inp}>
              <option value="">-- Select --</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </Field>
        )}
      </div>
    </div>
  );
}

const isYes = (v: unknown) => v === true || v === "true";

export function FamilyBackgroundStep({ register, errors, watch, setValue }: Props) {
  const f = errors.family;
  const maritalStatus = watch("family.applicant_marital_status");
  const hasSpouse = ["Common-law", "Married-physically present", "Married-not physically present"].includes(maritalStatus);
  const hadPrevious = isYes(watch("family.previous_marriage.had_previous"));

  // Auto-fill occupation = "Deceased" when parent status = Deceased
  const fatherStatus = watch("family.father.status");
  const motherStatus = watch("family.mother.status");
  useEffect(() => {
    if (fatherStatus === "Deceased") setValue("family.father.occupation", "Deceased");
  }, [fatherStatus, setValue]);
  useEffect(() => {
    if (motherStatus === "Deceased") setValue("family.mother.occupation", "Deceased");
  }, [motherStatus, setValue]);

  // Auto-fill applicant attestation signatures from the name already entered in Step 1.
  const piFamily = watch("personal_info.family_name");
  const piGiven = watch("personal_info.given_name");
  useEffect(() => {
    const fullName = [piGiven, piFamily].filter(Boolean).join(" ");
    if (fullName) {
      setValue("family.section_c_signature", fullName);
      setValue("family.no_spouse_signature", fullName);
    }
  }, [piFamily, piGiven, setValue]);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-800">Marital Status &amp; Family (IMM 1294, IMM 5707)</h2>

      {/* Applicant IMM 5707 fields */}
      <div className="space-y-3">
        <h3 className={sectionHeading}>About You (for IMM 5707)</h3>
        <p className="text-xs text-gray-500">Your occupation is taken from your most recent activity in the Education &amp; Employment step — no need to enter it here.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Marital Status" required error={f?.applicant_marital_status?.message}>
            <select {...register("family.applicant_marital_status")} className={inp}>
              <option value="">-- Select --</option>
              {MARITAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>
      </div>

      {/* Marriage / common-law date (IMM 1294 subsection 10) */}
      {hasSpouse && (
        <div className="space-y-3">
          <h3 className={sectionHeading}>Date of marriage / common-law relationship (IMM 1294)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Date" required error={(f as any)?.marriage_date?.message}>
              <input {...register("family.marriage_date")} placeholder="YYYY-MM-DD" className={inp} />
            </Field>
          </div>
        </div>
      )}

      {/* Spouse (conditional) */}
      {hasSpouse ? (
        <PersonBlock
          prefix="family.spouse"
          label="Spouse / Common-law Partner"
          register={register}
          errors={f?.spouse}
          showAddress={false}
          showAccompany
          showMarital
          showNativeName
        />
      ) : (
        <div className="space-y-3">
          <h3 className={sectionHeading}>No Spouse / Partner Declaration</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Type your full name to confirm" required error={f?.no_spouse_signature?.message}>
              <input {...register("family.no_spouse_signature")} className={inp} />
            </Field>
            <Field label="Date" required error={f?.no_spouse_date?.message}>
              <input {...register("family.no_spouse_date")} placeholder="YYYY-MM-DD" className={inp} />
            </Field>
          </div>
        </div>
      )}

      {/* Father */}
      <PersonBlock
        prefix="family.father"
        label="Father"
        register={register}
        errors={f?.father}
        showStatus
        showAddress
        showAccompany
        showMarital
      />

      {/* Mother */}
      <PersonBlock
        prefix="family.mother"
        label="Mother"
        register={register}
        errors={f?.mother}
        showStatus
        showAddress
        showAccompany
        showMarital
      />

      {/* Previously married / common-law (IMM 1294 subsection 11) */}
      <div className="space-y-3">
        <h3 className={sectionHeading}>Previous Marriage / Common-law (IMM 1294)</h3>
        <Field label="Have you previously been married or in a common-law relationship?" required error={(f as any)?.previous_marriage?.had_previous?.message}>
          <select {...register("family.previous_marriage.had_previous")} className={inp}>
            <option value="">-- Select --</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </Field>
        {hadPrevious && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-gray-50 rounded border">
            <Field label="Family Name (of previous partner)" error={(f as any)?.previous_marriage?.family_name?.message}>
              <input {...register("family.previous_marriage.family_name")} className={inp} />
            </Field>
            <Field label="Given Name(s)" error={(f as any)?.previous_marriage?.given_names?.message}>
              <input {...register("family.previous_marriage.given_names")} className={inp} />
            </Field>
            <Field label="Date of Birth" error={(f as any)?.previous_marriage?.date_of_birth?.message}>
              <input {...register("family.previous_marriage.date_of_birth")} placeholder="YYYY-MM-DD" className={inp} />
            </Field>
            <Field label="Type of Relationship" error={(f as any)?.previous_marriage?.relationship_type?.message}>
              <select {...register("family.previous_marriage.relationship_type")} className={inp}>
                <option value="">-- Select --</option>
                <option value="Married">Married</option>
                <option value="Common-law">Common-law</option>
              </select>
            </Field>
            <Field label="From Date" error={(f as any)?.previous_marriage?.from_date?.message}>
              <input {...register("family.previous_marriage.from_date")} placeholder="YYYY-MM-DD" className={inp} />
            </Field>
            <Field label="To Date" error={(f as any)?.previous_marriage?.to_date?.message}>
              <input {...register("family.previous_marriage.to_date")} placeholder="YYYY-MM-DD" className={inp} />
            </Field>
          </div>
        )}
      </div>

      {/* Section C — Certification (IMM 5707) */}
      <div className="space-y-3">
        <h3 className={sectionHeading}>Section C — Certification (IMM 5707)</h3>
        <p className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-3 leading-relaxed">
          I certify that the information contained in this document is complete, accurate and factual. I also
          realize that once this document has been completed and signed that it will form part of my
          Immigration Record and will be used to verify my family details on future applications.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Signature (type your full legal name)" required error={f?.section_c_signature?.message}>
            <input {...register("family.section_c_signature")} className={inp} />
          </Field>
          <Field label="Date" required error={f?.section_c_date?.message}>
            <input {...register("family.section_c_date")} placeholder="YYYY-MM-DD" className={inp} />
          </Field>
        </div>
      </div>
    </div>
  );
}
