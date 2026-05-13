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

const isYes = (v: unknown) => v === true || v === "true";

const PAID_BY_OPTIONS = [
  "Myself", "Parents", "Other family member", "Employer", "Government", "Sponsor", "Other",
];

export function StudyDetailsStep({ register, errors, watch }: Props) {
  const s = errors.study as any;
  const tb = watch("tuberculosis");
  const medical = watch("medical_condition");
  const remained = watch("previously_remained_status");
  const appliedCanada = watch("previously_applied_canada");
  const refused = watch("previously_refused_visa");
  const visaShowDetails = isYes(remained) || isYes(appliedCanada) || isYes(refused);
  const criminal = watch("criminal_record");
  const military = watch("military_service");
  const paidBy = watch("study.expenses_paid_by");
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

      <h2 className="text-lg font-semibold text-gray-800 pt-4">Cost of Studies</h2>
      <p className="text-sm text-gray-500">Enter the cost of your studies and how your expenses will be paid. Amounts in CAD.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Tuition" error={s?.tuition_amount?.message}>
          <input {...register("study.tuition_amount")} placeholder="20000" className={inp} />
        </Field>
        <Field label="Room and Board" error={s?.room_board_amount?.message}>
          <input {...register("study.room_board_amount")} placeholder="12000" className={inp} />
        </Field>
        <Field label="Other" error={s?.other_amount?.message}>
          <input {...register("study.other_amount")} placeholder="3000" className={inp} />
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Funds available for my stay (CAD)" error={s?.funds_available?.message}>
          <input {...register("study.funds_available")} className={inp} />
        </Field>
        <Field label="My expenses in Canada will be paid by" error={s?.expenses_paid_by?.message}>
          <select {...register("study.expenses_paid_by")} className={inp}>
            <option value="">-- Select --</option>
            {PAID_BY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
        {paidBy === "Other" && (
          <Field label="Other (specify)" error={s?.expenses_paid_by_other?.message}>
            <input {...register("study.expenses_paid_by_other")} className={inp} />
          </Field>
        )}
      </div>

      <h2 className="text-lg font-semibold text-gray-800 pt-4">Provincial Attestation Letter (PAL/TAL)</h2>
      <p className="text-sm text-gray-500">If you have been issued a Provincial Attestation Letter (PAL) or Territorial Attestation Letter (TAL), provide the details.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Document Number" error={s?.pal_doc_number?.message}>
          <input {...register("study.pal_doc_number")} className={inp} />
        </Field>
        <Field label="Expiry Date" error={s?.pal_doc_expiry?.message}>
          <input {...register("study.pal_doc_expiry")} placeholder="YYYY-MM-DD" className={inp} />
        </Field>
      </div>

      <h2 className="text-lg font-semibold text-gray-800 pt-4">Quebec Acceptance Certificate (CAQ)</h2>
      <p className="text-sm text-gray-500">If you have been issued a Quebec Acceptance Certificate (CAQ), provide the details.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Certificate Number" error={s?.caq_cert_number?.message}>
          <input {...register("study.caq_cert_number")} className={inp} />
        </Field>
        <Field label="Expiry Date" error={s?.caq_cert_expiry?.message}>
          <input {...register("study.caq_cert_expiry")} placeholder="YYYY-MM-DD" className={inp} />
        </Field>
      </div>

      <h2 className="text-lg font-semibold text-gray-800 pt-4">Background Information</h2>
      <p className="text-sm text-gray-500">If you answer "Yes" to any of the following questions, provide the details in the space provided. (Wording is taken verbatim from the IMM 1294 form.)</p>
      <div className="space-y-4">
        {/* Q86 — TB (no textbox) */}
        <Field label='Within the past two years, have you or a family member ever had tuberculosis of the lungs or been in close contact with a person with tuberculosis?' required error={e?.tuberculosis?.message}>
          <select {...register("tuberculosis")} className={inp}>
            <option value="">-- Select --</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </Field>

        {/* Q87 — medical disorder (with textbox) */}
        <div className="space-y-2">
          <Field label='Do you have any physical or mental disorder that would require social and/or health services, other than medication, during a stay in Canada?' required error={e?.medical_condition?.message}>
            <select {...register("medical_condition")} className={inp}>
              <option value="">-- Select --</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </Field>
          {isYes(medical) && (
            <Field label="Details" error={e?.medical_condition_details?.message}>
              <textarea {...register("medical_condition_details")} rows={4} maxLength={1500} className={inp} />
            </Field>
          )}
        </div>

        {/* Q88 a/b + Q89 — three independent Y/N; shared details textbox shown if any "Yes" */}
        <div className="space-y-3">
          <p className="text-xs text-gray-500 italic">Answer each of the next three questions. If you answer "Yes" to any of them, provide details in the box that appears below.</p>
          <Field label='a) Have you ever remained beyond the validity of your status, attended school without authorization or worked without authorization in Canada?' required error={e?.previously_remained_status?.message}>
            <select {...register("previously_remained_status")} className={inp}>
              <option value="">-- Select --</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </Field>
          <Field label='b) Have you previously applied to enter or remain in Canada?' required error={e?.previously_applied_canada?.message}>
            <select {...register("previously_applied_canada")} className={inp}>
              <option value="">-- Select --</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </Field>
          <Field label='c) Have you ever been refused a visa or permit, denied entry or ordered to leave Canada or any other country or territory?' required error={e?.previously_refused_visa?.message}>
            <select {...register("previously_refused_visa")} className={inp}>
              <option value="">-- Select --</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </Field>
          {visaShowDetails && (
            <Field label="Details (covers any 'Yes' answers above)" error={e?.previously_refused_visa_details?.message}>
              <textarea {...register("previously_refused_visa_details")} rows={4} maxLength={1500} className={inp} />
            </Field>
          )}
        </div>

        {/* Q90 — criminal record (with textbox) */}
        <div className="space-y-2">
          <Field label='Have you ever committed, been arrested for, or been charged with or convicted of any criminal offence in any country or territory?' required error={e?.criminal_record?.message}>
            <select {...register("criminal_record")} className={inp}>
              <option value="">-- Select --</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </Field>
          {isYes(criminal) && (
            <Field label="Details" error={e?.criminal_record_details?.message}>
              <textarea {...register("criminal_record_details")} rows={4} maxLength={1500} className={inp} />
            </Field>
          )}
        </div>

        {/* Q4 — Military / police / security service (a + b) */}
        <div className="space-y-2">
          <Field label='a) Did you serve in any military, militia, or civil defence unit or serve in a security organization or police force (including non obligatory national service, reserve or volunteer units)?' required error={e?.military_service?.message}>
            <select {...register("military_service")} className={inp}>
              <option value="">-- Select --</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </Field>
          {isYes(military) && (
            <Field label="b) If you answered yes to question 4a), please provide dates of service and countries or territories where you served." error={e?.military_service_details?.message}>
              <textarea {...register("military_service_details")} rows={4} maxLength={1500} className={inp} />
            </Field>
          )}
        </div>

        {/* Q5 — political party affiliation */}
        <Field label='Are you, or have you ever been a member or associated with any political party, or other group or organization which has engaged in or advocated violence as a means to achieving a political or religious objective, or which has been associated with criminal activity at any time?' required error={e?.political_party?.message}>
          <select {...register("political_party")} className={inp}>
            <option value="">-- Select --</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </Field>

        {/* Q6 — war crimes / ill-treatment */}
        <Field label='Have you ever witnessed or participated in the ill treatment of prisoners or civilians, looting or desecration of religious buildings?' required error={e?.war_crimes?.message}>
          <select {...register("war_crimes")} className={inp}>
            <option value="">-- Select --</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </Field>

        {/* Q101 — consent */}
        <div className="space-y-2">
          <p className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-3 leading-relaxed">
            Citizenship and Immigration Canada (CIC), or an organization at CIC's request, may want to contact
            you in the future to ask you about any services you received from CIC prior to the application
            process (such as participation in an information forum), during the application process (including
            the application process itself as well as orientation or accreditation services), and services
            received after arriving in Canada (including settlement, integration and citizenship). CIC will use
            this information, along with the information provided by other individuals, for research,
            performance measurement or evaluation purposes. CIC will not use this information to make any
            decisions about you personally.
          </p>
          <Field label="Do you consent to be contacted by CIC, or an organization at CIC's request, in the future? (Y/N)" required error={e?.consent_to_contact?.message}>
            <select {...register("consent_to_contact")} className={inp}>
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
