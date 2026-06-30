"use client";
import { Control, FieldErrors, UseFormRegister, useFieldArray, useWatch } from "react-hook-form";
import type { StudyPermitData } from "@/lib/schemas/study_permit";
import { CountrySelect } from "@/components/forms/fields/CountrySelect";

interface Props {
  control: Control<StudyPermitData>;
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

const isYes = (v: unknown) => v === true || v === "true";
const EMPTY_EDU = { from_year: "", from_month: "", to_year: "", to_month: "", field_of_study: "", school: "", city: "", country: "", province_state: "" };
const EMPTY_OCC = { from_year: "", from_month: "", to_year: "", to_month: "", occupation: "", employer: "", city: "", country: "", province_state: "" };

// Full parity (Phase G): the spouse's own IMM 1294-style language, education,
// employment and background-question data — these used to be silently borrowed
// from the main applicant (see dependents_spouse.py's old _common_application_fields),
// which is wrong; the spouse answers these for themself, same questions, same wording.
export function DependentSpouseHistoryStep({ control, register, errors }: Props) {
  const sa = errors.family?.spouse_study_applicant as any;
  const e = (path: string) => sa?.[path]?.message as string | undefined;

  const { fields: eduFields, append: appendEdu, remove: removeEdu } = useFieldArray({ control, name: "family.spouse_study_applicant.education_history" as any });
  const { fields: occFields, append: appendOcc, remove: removeOcc } = useFieldArray({ control, name: "family.spouse_study_applicant.occupation_history" as any });
  const hasEducation = isYes(useWatch({ control, name: "family.spouse_study_applicant.has_education_history" as any }));
  const medical = useWatch({ control, name: "family.spouse_study_applicant.medical_condition" as any });
  const remained = useWatch({ control, name: "family.spouse_study_applicant.previously_remained_status" as any });
  const appliedCanada = useWatch({ control, name: "family.spouse_study_applicant.previously_applied_canada" as any });
  const refused = useWatch({ control, name: "family.spouse_study_applicant.previously_refused_visa" as any });
  const visaShowDetails = isYes(remained) || isYes(appliedCanada) || isYes(refused);
  const criminal = useWatch({ control, name: "family.spouse_study_applicant.criminal_record" as any });
  const military = useWatch({ control, name: "family.spouse_study_applicant.military_service" as any });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Spouse — Language & Background</h2>
        <p className="mt-1 text-sm text-gray-600">
          Your spouse / partner's own language, education, employment and background information for
          their IMM 1295 / IMM 5257 application — these are their own answers, not yours.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Language" error={e("language")}>
          <select {...register("family.spouse_study_applicant.language" as any)} className={inp}>
            <option value="English">English</option>
            <option value="French">French</option>
            <option value="Both">Both</option>
            <option value="Neither">Neither</option>
          </select>
        </Field>
        <Field label="Service In" error={e("service_in")}>
          <select {...register("family.spouse_study_applicant.service_in" as any)} className={inp}>
            <option value="English">English</option>
            <option value="French">French</option>
          </select>
        </Field>
      </div>

      {/* Education */}
      <div>
        <h3 className="text-base font-semibold text-gray-800 mb-3">Education History (IMM 1294)</h3>
        <p className="text-sm text-gray-500 mb-2">Has your spouse / partner ever attended or completed a post-secondary educational institution (e.g. university, college, vocational school)?</p>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Has post-secondary education?</label>
          <select {...register("family.spouse_study_applicant.has_education_history" as any)} className={inp + " max-w-xs"}>
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
              {[["from_year", "From Year"], ["from_month", "From Month"], ["to_year", "To Year"], ["to_month", "To Month"]].map(([k, lbl]) => (
                <Field key={k} label={lbl} error={(sa?.education_history?.[idx] as any)?.[k]?.message}>
                  <input {...register(`family.spouse_study_applicant.education_history.${idx}.${k}` as any)} placeholder={k.includes("year") ? "YYYY" : "MM"} className={inp} />
                </Field>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Field of Study" required error={sa?.education_history?.[idx]?.field_of_study?.message}>
                <input {...register(`family.spouse_study_applicant.education_history.${idx}.field_of_study` as any)} className={inp} />
              </Field>
              <Field label="Institution" required error={sa?.education_history?.[idx]?.school?.message}>
                <input {...register(`family.spouse_study_applicant.education_history.${idx}.school` as any)} className={inp} />
              </Field>
              <Field label="City" required error={sa?.education_history?.[idx]?.city?.message}>
                <input {...register(`family.spouse_study_applicant.education_history.${idx}.city` as any)} className={inp} />
              </Field>
              <Field label="Province / State" error={(sa?.education_history?.[idx] as any)?.province_state?.message}>
                <input {...register(`family.spouse_study_applicant.education_history.${idx}.province_state` as any)} className={inp} />
              </Field>
              <Field label="Country" required error={sa?.education_history?.[idx]?.country?.message}>
                <CountrySelect {...register(`family.spouse_study_applicant.education_history.${idx}.country` as any)} className={inp} />
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

      {/* Employment */}
      <div>
        <h3 className="text-base font-semibold text-gray-800 mb-3">Employment History (IMM 1294)</h3>
        <p className="text-sm text-gray-500 mb-2">
          Give details of your spouse / partner's employment for the past <strong>10 years</strong>, including if
          they have held any government positions (such as civil servant, judge, police officer, mayor, member
          of parliament, hospital administrator).
        </p>
        <p className="text-sm text-gray-500 mb-4">
          It's recommended to enter their employment from oldest to most recent. Self-employment may be
          included. Up to 3 entries on the PDF.
        </p>
        {occFields.map((field, idx) => (
          <div key={field.id} className="border border-gray-200 rounded p-4 mb-3 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Employment {idx + 1}</span>
              <button type="button" onClick={() => removeOcc(idx)} className="text-xs text-red-600 hover:underline">Remove</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[["from_year", "From Year"], ["from_month", "From Month"], ["to_year", "To Year"], ["to_month", "To Month"]].map(([k, lbl]) => (
                <Field key={k} label={lbl} error={(sa?.occupation_history?.[idx] as any)?.[k]?.message}>
                  <input {...register(`family.spouse_study_applicant.occupation_history.${idx}.${k}` as any)} placeholder={k.includes("year") ? "YYYY" : "MM"} className={inp} />
                </Field>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Occupation / Job Title" required error={sa?.occupation_history?.[idx]?.occupation?.message}>
                <input {...register(`family.spouse_study_applicant.occupation_history.${idx}.occupation` as any)} className={inp} />
              </Field>
              <Field label="Employer" required error={sa?.occupation_history?.[idx]?.employer?.message}>
                <input {...register(`family.spouse_study_applicant.occupation_history.${idx}.employer` as any)} className={inp} />
              </Field>
              <Field label="City" required error={sa?.occupation_history?.[idx]?.city?.message}>
                <input {...register(`family.spouse_study_applicant.occupation_history.${idx}.city` as any)} className={inp} />
              </Field>
              <Field label="Province / State" error={(sa?.occupation_history?.[idx] as any)?.province_state?.message}>
                <input {...register(`family.spouse_study_applicant.occupation_history.${idx}.province_state` as any)} className={inp} />
              </Field>
              <Field label="Country" required error={sa?.occupation_history?.[idx]?.country?.message}>
                <CountrySelect {...register(`family.spouse_study_applicant.occupation_history.${idx}.country` as any)} className={inp} />
              </Field>
            </div>
          </div>
        ))}
        {occFields.length < 3 && (
          <button type="button" onClick={() => appendOcc(EMPTY_OCC)} className="text-sm text-blue-600 hover:underline border border-blue-300 rounded px-3 py-1">
            + Add Employment
          </button>
        )}
      </div>

      {/* Background questions — verbatim IRCC wording, same as StudyDetailsStep */}
      <div>
        <h3 className="text-base font-semibold text-gray-800 mb-3">Background Information (IMM 1294)</h3>
        <p className="text-sm text-gray-500 mb-4">If you answer "Yes" to any of the following questions on your spouse / partner's behalf, provide the details in the space provided. (Wording is taken verbatim from the IMM 1294 form.)</p>
        <div className="space-y-4">
          <Field label='Within the past two years, have you or a family member ever had tuberculosis of the lungs or been in close contact with a person with tuberculosis?' required error={e("tuberculosis")}>
            <select {...register("family.spouse_study_applicant.tuberculosis" as any)} className={inp}>
              <option value="">-- Select --</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </Field>

          <div className="space-y-2">
            <Field label='Do you have any physical or mental disorder that would require social and/or health services, other than medication, during a stay in Canada?' required error={e("medical_condition")}>
              <select {...register("family.spouse_study_applicant.medical_condition" as any)} className={inp}>
                <option value="">-- Select --</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </Field>
            {isYes(medical) && (
              <Field label="Details" error={e("medical_condition_details")}>
                <textarea {...register("family.spouse_study_applicant.medical_condition_details" as any)} rows={4} maxLength={1500} className={inp} />
              </Field>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-xs text-gray-500 italic">Answer each of the next three questions. If you answer "Yes" to any of them, provide details in the box that appears below.</p>
            <Field label='a) Have you ever remained beyond the validity of your status, attended school without authorization or worked without authorization in Canada?' required error={e("previously_remained_status")}>
              <select {...register("family.spouse_study_applicant.previously_remained_status" as any)} className={inp}>
                <option value="">-- Select --</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </Field>
            <Field label='b) Have you previously applied to enter or remain in Canada?' required error={e("previously_applied_canada")}>
              <select {...register("family.spouse_study_applicant.previously_applied_canada" as any)} className={inp}>
                <option value="">-- Select --</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </Field>
            <Field label='c) Have you ever been refused a visa or permit, denied entry or ordered to leave Canada or any other country or territory?' required error={e("previously_refused_visa")}>
              <select {...register("family.spouse_study_applicant.previously_refused_visa" as any)} className={inp}>
                <option value="">-- Select --</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </Field>
            {visaShowDetails && (
              <Field label="Details (covers any 'Yes' answers above)" error={e("previously_refused_visa_details")}>
                <textarea {...register("family.spouse_study_applicant.previously_refused_visa_details" as any)} rows={4} maxLength={1500} className={inp} />
              </Field>
            )}
          </div>

          <div className="space-y-2">
            <Field label='Have you ever committed, been arrested for, or been charged with or convicted of any criminal offence in any country or territory?' required error={e("criminal_record")}>
              <select {...register("family.spouse_study_applicant.criminal_record" as any)} className={inp}>
                <option value="">-- Select --</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </Field>
            {isYes(criminal) && (
              <Field label="Details" error={e("criminal_record_details")}>
                <textarea {...register("family.spouse_study_applicant.criminal_record_details" as any)} rows={4} maxLength={1500} className={inp} />
              </Field>
            )}
          </div>

          <div className="space-y-2">
            <Field label='a) Did you serve in any military, militia, or civil defence unit or serve in a security organization or police force (including non obligatory national service, reserve or volunteer units)?' required error={e("military_service")}>
              <select {...register("family.spouse_study_applicant.military_service" as any)} className={inp}>
                <option value="">-- Select --</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </Field>
            {isYes(military) && (
              <Field label="b) If you answered yes to question 4a), please provide dates of service and countries or territories where you served." error={e("military_service_details")}>
                <textarea {...register("family.spouse_study_applicant.military_service_details" as any)} rows={4} maxLength={1500} className={inp} />
              </Field>
            )}
          </div>

          <Field label='Are you, or have you ever been a member or associated with any political party, or other group or organization which has engaged in or advocated violence as a means to achieving a political or religious objective, or which has been associated with criminal activity at any time?' required error={e("political_party")}>
            <select {...register("family.spouse_study_applicant.political_party" as any)} className={inp}>
              <option value="">-- Select --</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </Field>

          <Field label='Have you ever witnessed or participated in the ill treatment of prisoners or civilians, looting or desecration of religious buildings?' required error={e("war_crimes")}>
            <select {...register("family.spouse_study_applicant.war_crimes" as any)} className={inp}>
              <option value="">-- Select --</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </Field>

          <Field label="Do you consent to be contacted by CIC, or an organization at CIC's request, in the future? (Y/N)" required error={e("consent_to_contact")}>
            <select {...register("family.spouse_study_applicant.consent_to_contact" as any)} className={inp}>
              <option value="">-- Select --</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </Field>
        </div>
      </div>
    </div>
  );
}
