"use client";
import { useEffect } from "react";
import { FieldErrors, UseFormRegister, UseFormWatch, UseFormSetValue } from "react-hook-form";
import type { StudyPermitData } from "@/lib/schemas/study_permit";

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
}: {
  prefix: string;
  label: string;
  register: UseFormRegister<StudyPermitData>;
  errors: any;
  showAddress?: boolean;
  showAccompany?: boolean;
  showMarital?: boolean;
  showStatus?: boolean;
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
        <Field label="Date of Birth" required error={errors?.date_of_birth?.message}>
          <input {...register(`${prefix}.date_of_birth` as any)} placeholder="YYYY-MM-DD" className={inp} />
        </Field>
        <Field label="Country of Birth" required error={errors?.country_of_birth?.message}>
          <input {...register(`${prefix}.country_of_birth` as any)} className={inp} />
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
          <Field label="Will Accompany to Canada?" error={errors?.will_accompany?.message}>
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

export function FamilyBackgroundStep({ register, errors, watch, setValue }: Props) {
  const f = errors.family;
  const maritalStatus = watch("family.applicant_marital_status");
  const hasSpouse = ["Common-law", "Married-physically present", "Married-not physically present"].includes(maritalStatus);

  // Auto-fill occupation = "Deceased" when parent status = Deceased
  const fatherStatus = watch("family.father.status");
  const motherStatus = watch("family.mother.status");
  useEffect(() => {
    if (fatherStatus === "Deceased") setValue("family.father.occupation", "Deceased");
  }, [fatherStatus, setValue]);
  useEffect(() => {
    if (motherStatus === "Deceased") setValue("family.mother.occupation", "Deceased");
  }, [motherStatus, setValue]);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-800">Family Information (IMM 5707)</h2>

      {/* Applicant IMM 5707 fields */}
      <div className="space-y-3">
        <h3 className={sectionHeading}>About You (for IMM 5707)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Marital Status" required error={f?.applicant_marital_status?.message}>
            <select {...register("family.applicant_marital_status")} className={inp}>
              <option value="">-- Select --</option>
              {MARITAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Occupation" required error={f?.applicant_occupation?.message}>
            <input {...register("family.applicant_occupation")} className={inp} />
          </Field>
        </div>
      </div>

      {/* Spouse (conditional) */}
      {hasSpouse ? (
        <PersonBlock
          prefix="family.spouse"
          label="Spouse / Common-law Partner"
          register={register}
          errors={f?.spouse}
          showAddress
          showAccompany
          showMarital
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
    </div>
  );
}
