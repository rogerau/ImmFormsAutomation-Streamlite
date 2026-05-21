"use client";
import { Control, FieldErrors, UseFormRegister, UseFormWatch, useFieldArray } from "react-hook-form";
import type { StudyPermitData } from "@/lib/schemas/study_permit";
import { CountrySelect } from "@/components/forms/fields/CountrySelect";

interface Props {
  control: Control<StudyPermitData>;
  register: UseFormRegister<StudyPermitData>;
  errors: FieldErrors<StudyPermitData>;
  watch?: UseFormWatch<StudyPermitData>;
}

const isYes = (v: unknown) => v === true || v === "true";

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

const EMPTY_EDU = { from_year: "", from_month: "", to_year: "", to_month: "", field_of_study: "", school: "", city: "", country: "", province_state: "" };
const EMPTY_OCC = { from_year: "", from_month: "", to_year: "", to_month: "", occupation: "", employer: "", city: "", country: "", province_state: "" };

export function EmploymentHistoryStep({ control, register, errors, watch }: Props) {
  const { fields: eduFields, append: appendEdu, remove: removeEdu } = useFieldArray({ control, name: "education_history" });
  const { fields: occFields, append: appendOcc, remove: removeOcc } = useFieldArray({ control, name: "occupation_history" });
  const hasEducation = isYes(watch?.("has_education_history"));

  return (
    <div className="space-y-8">
      {/* Education */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Education History (IMM 1294)</h2>
        <p className="text-sm text-gray-500 mb-2">Have you ever attended or completed a post-secondary educational institution (e.g. university, college, vocational school)?</p>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Has post-secondary education? <span className="text-red-600">*</span>
          </label>
          <select {...register("has_education_history")} className={inp + " max-w-xs"}>
            <option value="">-- Select --</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
        {hasEducation && eduFields.map((field, idx) => (
          <div key={field.id} className="border border-gray-200 rounded p-4 mb-3 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Education {idx + 1}</span>
              <button type="button" onClick={() => removeEdu(idx)} className="text-xs text-red-600 hover:underline">Remove</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[["from_year","From Year"],["from_month","From Month"],["to_year","To Year"],["to_month","To Month"]].map(([k, lbl]) => (
                <Field key={k} label={lbl} error={(errors.education_history?.[idx] as any)?.[k]?.message}>
                  <input {...register(`education_history.${idx}.${k}` as any)} placeholder={k.includes("year") ? "YYYY" : "MM"} className={inp} />
                </Field>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Field of Study" required error={errors.education_history?.[idx]?.field_of_study?.message}>
                <input {...register(`education_history.${idx}.field_of_study`)} className={inp} />
              </Field>
              <Field label="Institution" required error={errors.education_history?.[idx]?.school?.message}>
                <input {...register(`education_history.${idx}.school`)} className={inp} />
              </Field>
              <Field label="City" required error={errors.education_history?.[idx]?.city?.message}>
                <input {...register(`education_history.${idx}.city`)} className={inp} />
              </Field>
              <Field label="Country" required error={errors.education_history?.[idx]?.country?.message}>
                <CountrySelect {...register(`education_history.${idx}.country`)} className={inp} />
              </Field>
            </div>
          </div>
        ))}
        {hasEducation && (
          <button type="button" onClick={() => appendEdu(EMPTY_EDU)} className="text-sm text-blue-600 hover:underline border border-blue-300 rounded px-3 py-1">
            + Add Education
          </button>
        )}
      </div>

      {/* Occupation */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Work / Activity History (IMM 1294)</h2>
        <p className="text-sm text-gray-500 mb-2">
          Provide details of your personal history for the last <strong>10 years</strong>. List your most recent
          activity first; include all employment, self-employment, unemployment, studies, travel, etc. If you have more
          entries than space allows (the IMM 1294 supports up to 3 rows), let your representative know so the remainder
          can be communicated separately.
        </p>
        <p className="text-sm text-gray-500 mb-4">Up to 3 entries on the PDF.</p>
        {occFields.map((field, idx) => (
          <div key={field.id} className="border border-gray-200 rounded p-4 mb-3 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Activity {idx + 1}</span>
              <button type="button" onClick={() => removeOcc(idx)} className="text-xs text-red-600 hover:underline">Remove</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[["from_year","From Year"],["from_month","From Month"],["to_year","To Year"],["to_month","To Month"]].map(([k, lbl]) => (
                <Field key={k} label={lbl} error={(errors.occupation_history?.[idx] as any)?.[k]?.message}>
                  <input {...register(`occupation_history.${idx}.${k}` as any)} placeholder={k.includes("year") ? "YYYY" : "MM"} className={inp} />
                </Field>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Occupation / Activity" required error={errors.occupation_history?.[idx]?.occupation?.message}>
                <input {...register(`occupation_history.${idx}.occupation`)} className={inp} />
              </Field>
              <Field label="Employer / School / Other" required error={errors.occupation_history?.[idx]?.employer?.message}>
                <input {...register(`occupation_history.${idx}.employer`)} className={inp} />
              </Field>
              <Field label="City" required error={errors.occupation_history?.[idx]?.city?.message}>
                <input {...register(`occupation_history.${idx}.city`)} className={inp} />
              </Field>
              <Field label="Country" required error={errors.occupation_history?.[idx]?.country?.message}>
                <CountrySelect {...register(`occupation_history.${idx}.country`)} className={inp} />
              </Field>
            </div>
          </div>
        ))}
        {occFields.length < 3 && (
          <button type="button" onClick={() => appendOcc(EMPTY_OCC)} className="text-sm text-blue-600 hover:underline border border-blue-300 rounded px-3 py-1">
            + Add Activity
          </button>
        )}
      </div>
    </div>
  );
}
