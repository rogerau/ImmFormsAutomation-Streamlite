"use client";
import { Control, FieldErrors, UseFormRegister, useWatch } from "react-hook-form";
import type { StudyPermitData } from "@/lib/schemas/study_permit";
import { CountrySelect } from "@/components/forms/fields/CountrySelect";

interface Props {
  control: Control<StudyPermitData>;
  register: UseFormRegister<StudyPermitData>;
  errors: FieldErrors<StudyPermitData>;
}

const inp = "block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";
const STUDY_LEVELS = ["Primary / Elementary", "Secondary / High School"];

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

function ageFromDob(dob?: string): number | null {
  if (!dob || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const birth = new Date(dob + "T00:00:00");
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

export function DependentChildrenStep({ control, register, errors }: Props) {
  const children = useWatch({ control, name: "family.children" }) ?? [];
  const f = errors.family;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Dependent Children — Study Permit (IMM 1294)</h2>
        <p className="mt-1 text-sm text-gray-600">
          A school-age (K-12) minor child coming to Canada needs their own study permit. For each
          such child, tick the box and fill in the few extra details below. Their name, date of
          birth and country of birth are reused from the Children step — no need to re-enter them.
          No custodian declaration is needed here: the child is accompanied by you, the main
          applicant, as their parent.
        </p>
      </div>

      {children.length === 0 && (
        <p className="text-sm text-gray-500">
          No children were added in the Children step. Go back and add a child first if one is
          applying for a study permit.
        </p>
      )}

      {children.map((c, idx) => {
        const age = ageFromDob(c?.date_of_birth);
        const applying = c?.applying_study_permit === true || (c?.applying_study_permit as unknown) === "true";
        const ce = f?.children?.[idx]?.study_applicant;
        const label = [c?.given_names, c?.family_name].filter(Boolean).join(" ") || `Child ${idx + 1}`;
        return (
          <div key={idx} className="border border-gray-200 rounded p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
                <p className="text-xs text-gray-500">
                  {age == null ? "Age unknown (check DOB)" : `Age ${age}`}
                  {c?.relationship ? ` · ${c.relationship}` : ""}
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" {...register(`family.children.${idx}.applying_study_permit` as any)} />
                Applying for own study permit
              </label>
            </div>

            {age != null && age >= 18 && applying && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                This child is 18 or older — a study permit as a dependent minor may not apply. Confirm before submitting.
              </p>
            )}

            {applying && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Sex" required error={ce?.sex?.message}>
                    <select {...register(`family.children.${idx}.study_applicant.sex` as any)} className={inp}>
                      <option value="">-- Select --</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </Field>
                  <Field label="City of Birth" required error={ce?.place_birth_city?.message}>
                    <input {...register(`family.children.${idx}.study_applicant.place_birth_city` as any)} className={inp} />
                  </Field>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Passport</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Passport Number" required error={ce?.passport?.passport_number?.message}>
                      <input {...register(`family.children.${idx}.study_applicant.passport.passport_number` as any)} className={inp} />
                    </Field>
                    <Field label="Country of Issue" required error={ce?.passport?.country_of_issue?.message}>
                      <CountrySelect {...register(`family.children.${idx}.study_applicant.passport.country_of_issue` as any)} className={inp} />
                    </Field>
                    <Field label="Issue Date" error={(ce?.passport as any)?.issue_date?.message}>
                      <input {...register(`family.children.${idx}.study_applicant.passport.issue_date` as any)} placeholder="YYYY-MM-DD" className={inp} />
                    </Field>
                    <Field label="Expiry Date" error={(ce?.passport as any)?.expiry_date?.message}>
                      <input {...register(`family.children.${idx}.study_applicant.passport.expiry_date` as any)} placeholder="YYYY-MM-DD" className={inp} />
                    </Field>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">School in Canada</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="School Name" required error={ce?.study?.school_name?.message}>
                      <input {...register(`family.children.${idx}.study_applicant.study.school_name` as any)} className={inp} />
                    </Field>
                    <Field label="Level" required error={ce?.study?.level?.message}>
                      <select {...register(`family.children.${idx}.study_applicant.study.level` as any)} className={inp}>
                        <option value="">-- Select --</option>
                        {STUDY_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </Field>
                    <Field label="Grade / Program" required error={ce?.study?.program?.message}>
                      <input {...register(`family.children.${idx}.study_applicant.study.program` as any)} className={inp} />
                    </Field>
                    <Field label="DLI Number" required error={ce?.study?.dli_number?.message}>
                      <input {...register(`family.children.${idx}.study_applicant.study.dli_number` as any)} className={inp} />
                    </Field>
                    <Field label="City" error={(ce?.study as any)?.city?.message}>
                      <input {...register(`family.children.${idx}.study_applicant.study.city` as any)} className={inp} />
                    </Field>
                    <Field label="Province / State" error={(ce?.study as any)?.province_state?.message}>
                      <input {...register(`family.children.${idx}.study_applicant.study.province_state` as any)} className={inp} />
                    </Field>
                    <Field label="Start Date" required error={ce?.study?.start_date?.message}>
                      <input {...register(`family.children.${idx}.study_applicant.study.start_date` as any)} placeholder="YYYY-MM-DD" className={inp} />
                    </Field>
                    <Field label="End Date" required error={ce?.study?.end_date?.message}>
                      <input {...register(`family.children.${idx}.study_applicant.study.end_date` as any)} placeholder="YYYY-MM-DD" className={inp} />
                    </Field>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
