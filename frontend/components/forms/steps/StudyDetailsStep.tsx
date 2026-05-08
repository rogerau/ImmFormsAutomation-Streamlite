"use client";
import { FieldErrors, UseFormRegister, UseFormWatch } from "react-hook-form";
import type { StudyPermitData } from "@/lib/schemas/study_permit";

interface Props {
  register: UseFormRegister<StudyPermitData>;
  errors: FieldErrors<StudyPermitData>;
  watch: UseFormWatch<StudyPermitData>;
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

const STUDY_LEVELS = ["University", "College", "CEGEP", "High School", "Vocational / Trade", "Other"];

export function StudyDetailsStep({ register, errors, watch }: Props) {
  const s = errors.study;
  const medical = watch("medical_condition");
  const refused = watch("previously_refused_visa");
  const military = watch("military_service");
  const e = errors as any;
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Study Details</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="School / Institution Name" required error={s?.school_name?.message}>
          <input {...register("study.school_name")} className={inp} />
        </Field>
        <Field label="Level of Study" required error={s?.level?.message}>
          <select {...register("study.level")} className={inp}>
            <option value="">-- Select --</option>
            {STUDY_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </Field>
        <Field label="Program / Field of Study" required error={s?.program?.message}>
          <input {...register("study.program")} className={inp} />
        </Field>
        <Field label="City / Town" required error={s?.city?.message}>
          <input {...register("study.city")} className={inp} />
        </Field>
        <Field label="Province / State" error={s?.province_state?.message}>
          <input {...register("study.province_state")} className={inp} />
        </Field>
        <Field label="School Address" error={s?.address?.message}>
          <input {...register("study.address")} className={inp} />
        </Field>
        <Field label="DLI Number" required error={s?.dli_number?.message}>
          <input {...register("study.dli_number")} placeholder="O123456789012" className={inp} />
        </Field>
        <Field label="Student ID / Number (optional)" error={s?.student_number?.message}>
          <input {...register("study.student_number")} className={inp} />
        </Field>
        <Field label="Program Start Date" required error={s?.start_date?.message}>
          <input {...register("study.start_date")} placeholder="YYYY-MM-DD" className={inp} />
        </Field>
        <Field label="Program End Date" required error={s?.end_date?.message}>
          <input {...register("study.end_date")} placeholder="YYYY-MM-DD" className={inp} />
        </Field>
      </div>

      <h2 className="text-lg font-semibold text-gray-800 pt-4">Background Questions</h2>
      <p className="text-sm text-gray-500">If you answer "Yes", please provide details below.</p>
      <div className="space-y-4">
        {[
          { field: "medical_condition", detailsField: "medical_condition_details",
            label: "Do you have a medical condition requiring health care or special assistance?",
            value: medical },
          { field: "previously_refused_visa", detailsField: "previously_refused_visa_details",
            label: "Have you previously been refused a visa, permit, or entry to Canada or any other country?",
            value: refused },
          { field: "military_service", detailsField: "military_service_details",
            label: "Have you served in a military, paramilitary, or armed group in any country?",
            value: military },
        ].map(({ field, detailsField, label, value }) => (
          <div key={field} className="space-y-2">
            <Field label={label} required error={e?.[field]?.message}>
              <select {...register(field as any)} className={inp}>
                <option value="">-- Select --</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </Field>
            {value === true && (
              <Field label="Details" required={false} error={e?.[detailsField]?.message}>
                <textarea
                  {...register(detailsField as any)}
                  rows={4}
                  maxLength={1500}
                  placeholder="Provide all relevant details (max 1500 characters)"
                  className={inp}
                />
              </Field>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
