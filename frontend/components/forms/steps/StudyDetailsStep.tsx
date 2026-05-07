"use client";
import { FieldErrors, UseFormRegister } from "react-hook-form";
import type { StudyPermitData } from "@/lib/schemas/study_permit";

interface Props {
  register: UseFormRegister<StudyPermitData>;
  errors: FieldErrors<StudyPermitData>;
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

export function StudyDetailsStep({ register, errors }: Props) {
  const s = errors.study;
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
      <p className="text-sm text-gray-500">Answer "Yes" if any of the following apply to you.</p>
      <div className="space-y-3">
        {[
          { field: "medical_condition", label: "Do you have a medical condition requiring health care or special assistance?" },
          { field: "previously_refused_visa", label: "Have you previously been refused a visa, permit, or entry to Canada or any other country?" },
          { field: "military_service", label: "Have you served in a military, paramilitary, or armed group in any country?" },
        ].map(({ field, label }) => (
          <label key={field} className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              {...register(field as any)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600"
            />
            <span className="text-sm text-gray-700">{label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
