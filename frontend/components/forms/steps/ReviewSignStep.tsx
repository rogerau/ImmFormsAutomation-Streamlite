"use client";
import { FieldErrors, UseFormRegister, UseFormGetValues } from "react-hook-form";
import type { StudyPermitData } from "@/lib/schemas/study_permit";

interface Props {
  register: UseFormRegister<StudyPermitData>;
  errors: FieldErrors<StudyPermitData>;
  getValues: UseFormGetValues<StudyPermitData>;
  isSubmitting: boolean;
  submitError: string | null;
  submitResult: any;
}

const inp = "block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";

function ReviewRow({ label, value }: { label: string; value: string | undefined | null }) {
  return value ? (
    <div className="flex gap-2">
      <span className="text-sm text-gray-500 w-40 shrink-0">{label}:</span>
      <span className="text-sm text-gray-800">{value}</span>
    </div>
  ) : null;
}

export function ReviewSignStep({ register, errors, getValues, isSubmitting, submitError, submitResult }: Props) {
  const v = getValues();
  const pi = v.personal_info;

  if (submitResult) {
    const forms = submitResult.forms || {};
    return (
      <div className="space-y-6">
        <div className="rounded bg-green-50 border border-green-200 p-6">
          <h2 className="text-xl font-semibold text-green-800 mb-2">Submission Complete!</h2>
          <p className="text-sm text-green-700">Submission ID: <code className="font-mono">{submitResult.submission_id}</code></p>
        </div>
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-gray-700">Filled PDF Forms</h3>
          {Object.entries(forms).map(([formId, info]: [string, any]) => (
            <div key={formId} className="flex items-center gap-3 text-sm">
              <span className="font-mono text-gray-600 uppercase">{formId}</span>
              {info.pdf_url && (
                <a href={info.pdf_url} target="_blank" rel="noopener noreferrer"
                   className="text-blue-600 hover:underline">
                  View PDF →
                </a>
              )}
            </div>
          ))}
        </div>
        {submitResult.sheets_warning && (
          <div className="rounded bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-800">
            Note: Sheets append had a warning: {submitResult.sheets_warning}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-800">Review & Sign</h2>

      <div className="bg-gray-50 rounded border p-4 space-y-2">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Personal Information</h3>
        <ReviewRow label="Name" value={`${pi?.family_name}, ${pi?.given_name}`} />
        <ReviewRow label="Date of Birth" value={pi?.date_of_birth} />
        <ReviewRow label="Citizenship" value={pi?.citizenship} />
        <ReviewRow label="Passport #" value={v.passport?.passport_number} />
        <ReviewRow label="Email" value={v.contact?.email} />
      </div>

      <div className="bg-gray-50 rounded border p-4 space-y-2">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Study Details</h3>
        <ReviewRow label="School" value={v.study?.school_name} />
        <ReviewRow label="Program" value={v.study?.program} />
        <ReviewRow label="DLI" value={v.study?.dli_number} />
        <ReviewRow label="Dates" value={v.study?.start_date && v.study?.end_date ? `${v.study.start_date} → ${v.study.end_date}` : undefined} />
      </div>

      <div className="bg-gray-50 rounded border p-4 space-y-2">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Family (IMM 5707)</h3>
        <ReviewRow label="Marital status" value={v.family?.applicant_marital_status} />
        <ReviewRow label="Children" value={v.family?.children?.length ? `${v.family.children.length} child(ren)` : "None"} />
        <ReviewRow label="Father" value={v.family?.father?.family_name ? `${v.family.father.family_name}, ${v.family.father.given_names}` : undefined} />
        <ReviewRow label="Mother" value={v.family?.mother?.family_name ? `${v.family.mother.family_name}, ${v.family.mother.given_names}` : undefined} />
      </div>

      <div className="space-y-3 border-t pt-4">
        <h3 className="text-base font-semibold text-gray-700">Declaration & Signature</h3>
        <p className="text-sm text-gray-600">
          I certify that all the information I have given on this application is complete, truthful, and correct.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Signature (type your full legal name) <span className="text-red-600">*</span>
            </label>
            <input {...register("applicant_signature")} className={inp} />
            {errors.applicant_signature?.message && (
              <p className="mt-1 text-xs text-red-600">{errors.applicant_signature.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date <span className="text-red-600">*</span>
            </label>
            <input {...register("applicant_signature_date")} placeholder="YYYY-MM-DD" className={inp} />
            {errors.applicant_signature_date?.message && (
              <p className="mt-1 text-xs text-red-600">{errors.applicant_signature_date.message}</p>
            )}
          </div>
        </div>
      </div>

      {submitError && (
        <div className="rounded bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Submitting…" : "Submit Application"}
      </button>
    </div>
  );
}
