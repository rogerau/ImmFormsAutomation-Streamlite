"use client";
// Shared field blocks reused by the dependent (child / spouse) wizard steps —
// Phase X2. Each dependent must supply their OWN residence history, national ID,
// US PR card, background declarations, previous marriage and parents rather than
// inheriting the main applicant's. Bound to a `prefix` path so the same block
// serves "family.spouse_study_applicant" and "family.children.N.study_applicant".
import { Control, UseFormRegister, useWatch } from "react-hook-form";
import type { StudyPermitData } from "@/lib/schemas/study_permit";
import { CountrySelect } from "@/components/forms/fields/CountrySelect";
import { ResidenceRow } from "@/components/forms/steps/PersonalInfoStep";

const inp = "block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";
const isYes = (v: unknown) => v === true || v === "true";

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

function YesNo({ path, register }: { path: string; register: UseFormRegister<StudyPermitData> }) {
  return (
    <select {...register(path as any)} className={inp}>
      <option value="">-- Select --</option>
      <option value="true">Yes</option>
      <option value="false">No</option>
    </select>
  );
}

type BlockProps = {
  prefix: string;
  control: Control<StudyPermitData>;
  register: UseFormRegister<StudyPermitData>;
  errors: any;   // the react-hook-form errors sub-object at `prefix`
};

export function ResidenceHistory({ prefix, control, register, errors }: BlockProps) {
  const hasPrev = isYes(useWatch({ control, name: `${prefix}.has_previous_residence` as any }));
  const applyingSame = isYes(useWatch({ control, name: `${prefix}.applying_country_same_as_current` as any }));
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Country of Residence</h4>
      <ResidenceRow prefix={`${prefix}.current_residence`} register={register} errors={errors?.current_residence} />

      <Field label="Have you lived in any other country in the past 5 years (other than your current one)?">
        <YesNo path={`${prefix}.has_previous_residence`} register={register} />
      </Field>
      {hasPrev && (
        <div className="space-y-3">
          <ResidenceRow prefix={`${prefix}.previous_residences.0`} register={register} errors={errors?.previous_residences?.[0]} />
          <ResidenceRow prefix={`${prefix}.previous_residences.1`} register={register} errors={errors?.previous_residences?.[1]} />
        </div>
      )}

      <Field label="Country where applying — same as current country of residence?">
        <YesNo path={`${prefix}.applying_country_same_as_current`} register={register} />
      </Field>
      {!applyingSame && (
        <ResidenceRow prefix={`${prefix}.applying_country`} register={register} errors={errors?.applying_country} />
      )}
    </div>
  );
}

export function NationalIdBlock({ prefix, control, register, errors }: BlockProps) {
  const has = isYes(useWatch({ control, name: `${prefix}.national_id.has_document` as any }));
  const e = errors?.national_id;
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">National Identity Document</h4>
      <Field label="Do you have a national identity document?" required error={e?.has_document?.message}>
        <YesNo path={`${prefix}.national_id.has_document`} register={register} />
      </Field>
      {has && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Document Number" error={e?.doc_number?.message}>
            <input {...register(`${prefix}.national_id.doc_number` as any)} className={inp} />
          </Field>
          <Field label="Country of Issue" error={e?.country_of_issue?.message}>
            <CountrySelect {...register(`${prefix}.national_id.country_of_issue` as any)} className={inp} />
          </Field>
          <Field label="Issue Date" error={e?.issue_date?.message}>
            <input {...register(`${prefix}.national_id.issue_date` as any)} placeholder="YYYY-MM-DD" className={inp} />
          </Field>
          <Field label="Expiry Date" error={e?.expiry_date?.message}>
            <input {...register(`${prefix}.national_id.expiry_date` as any)} placeholder="YYYY-MM-DD" className={inp} />
          </Field>
        </div>
      )}
    </div>
  );
}

export function UsCardBlock({ prefix, control, register, errors }: BlockProps) {
  const has = isYes(useWatch({ control, name: `${prefix}.us_pr_card.has_card` as any }));
  const e = errors?.us_pr_card;
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">U.S. Permanent Resident Card</h4>
      <Field label="Do you have a U.S. Permanent Resident (green) card?" required error={e?.has_card?.message}>
        <YesNo path={`${prefix}.us_pr_card.has_card`} register={register} />
      </Field>
      {has && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Document Number" error={e?.doc_number?.message}>
            <input {...register(`${prefix}.us_pr_card.doc_number` as any)} className={inp} />
          </Field>
          <Field label="USCIS Number" error={e?.uscis_number?.message}>
            <input {...register(`${prefix}.us_pr_card.uscis_number` as any)} className={inp} />
          </Field>
          <Field label="Expiry Date" error={e?.expiry_date?.message}>
            <input {...register(`${prefix}.us_pr_card.expiry_date` as any)} placeholder="YYYY-MM-DD" className={inp} />
          </Field>
        </div>
      )}
    </div>
  );
}

export function PrevMarriageBlock({ prefix, control, register, errors }: BlockProps) {
  const had = isYes(useWatch({ control, name: `${prefix}.previously_married` as any }));
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Previous Marriage / Common-law</h4>
      <Field label="Have you previously been married or in a common-law relationship?" required error={errors?.previously_married?.message}>
        <YesNo path={`${prefix}.previously_married`} register={register} />
      </Field>
      {had && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Previous Partner — Family Name" error={errors?.prev_spouse_family_name?.message}>
            <input {...register(`${prefix}.prev_spouse_family_name` as any)} className={inp} />
          </Field>
          <Field label="Previous Partner — Given Name" error={errors?.prev_spouse_given_name?.message}>
            <input {...register(`${prefix}.prev_spouse_given_name` as any)} className={inp} />
          </Field>
          <Field label="Previous Partner — Date of Birth" error={errors?.prev_spouse_date_of_birth?.message}>
            <input {...register(`${prefix}.prev_spouse_date_of_birth` as any)} placeholder="YYYY-MM-DD" className={inp} />
          </Field>
          <Field label="Type of Relationship" error={errors?.prev_relationship_type?.message}>
            <select {...register(`${prefix}.prev_relationship_type` as any)} className={inp}>
              <option value="">-- Select --</option>
              <option value="Married">Married</option>
              <option value="Common-law">Common-law</option>
            </select>
          </Field>
          <Field label="From (YYYY-MM-DD)" error={errors?.prev_relationship_from?.message}>
            <input {...register(`${prefix}.prev_relationship_from` as any)} placeholder="YYYY-MM-DD" className={inp} />
          </Field>
          <Field label="To (YYYY-MM-DD)" error={errors?.prev_relationship_to?.message}>
            <input {...register(`${prefix}.prev_relationship_to` as any)} placeholder="YYYY-MM-DD" className={inp} />
          </Field>
        </div>
      )}
    </div>
  );
}

export function ParentBlock({
  prefix, register, errors, label,
}: { prefix: string; register: UseFormRegister<StudyPermitData>; errors: any; label: string }) {
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Family Name" required error={errors?.family_name?.message}>
          <input {...register(`${prefix}.family_name` as any)} className={inp} />
        </Field>
        <Field label="Given Name(s)" error={errors?.given_names?.message}>
          <input {...register(`${prefix}.given_names` as any)} className={inp} />
        </Field>
        <Field label="Date of Birth" error={errors?.date_of_birth?.message}>
          <input {...register(`${prefix}.date_of_birth` as any)} placeholder="YYYY-MM-DD" className={inp} />
        </Field>
        <Field label="Country of Birth" error={errors?.country_of_birth?.message}>
          <CountrySelect {...register(`${prefix}.country_of_birth` as any)} className={inp} />
        </Field>
        <Field label="Status" error={errors?.status?.message}>
          <select {...register(`${prefix}.status` as any)} className={inp}>
            <option value="Living">Living</option>
            <option value="Deceased">Deceased</option>
          </select>
        </Field>
        <Field label="Occupation" error={errors?.occupation?.message}>
          <input {...register(`${prefix}.occupation` as any)} className={inp} />
        </Field>
        <Field label="Address" error={errors?.address?.message}>
          <input {...register(`${prefix}.address` as any)} className={inp} />
        </Field>
        <Field label="Accompanying to Canada?" error={errors?.will_accompany?.message}>
          <YesNo path={`${prefix}.will_accompany`} register={register} />
        </Field>
      </div>
    </div>
  );
}

// IMM 1294 Page-4 background declarations — verbatim IRCC wording, reused by the
// child step (spouse uses its own copy in DependentSpouseHistoryStep).
export function BackgroundQuestions({ prefix, control, register, errors }: BlockProps) {
  const medical = useWatch({ control, name: `${prefix}.medical_condition` as any });
  const remained = useWatch({ control, name: `${prefix}.previously_remained_status` as any });
  const applied = useWatch({ control, name: `${prefix}.previously_applied_canada` as any });
  const refused = useWatch({ control, name: `${prefix}.previously_refused_visa` as any });
  const criminal = useWatch({ control, name: `${prefix}.criminal_record` as any });
  const military = useWatch({ control, name: `${prefix}.military_service` as any });
  const visaShowDetails = isYes(remained) || isYes(applied) || isYes(refused);
  const e = errors || {};

  return (
    <div className="space-y-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Background Information (IMM 1294)</h4>
      <p className="text-xs text-gray-500">If you answer "Yes" to any question, provide details where prompted. (Wording is verbatim from the IMM 1294 form.)</p>

      <Field label="Within the past two years, have you or a family member ever had tuberculosis of the lungs or been in close contact with a person with tuberculosis?" required error={e.tuberculosis?.message}>
        <YesNo path={`${prefix}.tuberculosis`} register={register} />
      </Field>

      <div className="space-y-2">
        <Field label="Do you have any physical or mental disorder that would require social and/or health services, other than medication, during a stay in Canada?" required error={e.medical_condition?.message}>
          <YesNo path={`${prefix}.medical_condition`} register={register} />
        </Field>
        {isYes(medical) && (
          <Field label="Details" error={e.medical_condition_details?.message}>
            <textarea {...register(`${prefix}.medical_condition_details` as any)} rows={3} maxLength={1500} className={inp} />
          </Field>
        )}
      </div>

      <div className="space-y-3">
        <Field label="a) Have you ever remained beyond the validity of your status, attended school without authorization or worked without authorization in Canada?" required error={e.previously_remained_status?.message}>
          <YesNo path={`${prefix}.previously_remained_status`} register={register} />
        </Field>
        <Field label="b) Have you previously applied to enter or remain in Canada?" required error={e.previously_applied_canada?.message}>
          <YesNo path={`${prefix}.previously_applied_canada`} register={register} />
        </Field>
        <Field label="c) Have you ever been refused a visa or permit, denied entry or ordered to leave Canada or any other country or territory?" required error={e.previously_refused_visa?.message}>
          <YesNo path={`${prefix}.previously_refused_visa`} register={register} />
        </Field>
        {visaShowDetails && (
          <Field label="Details (covers any 'Yes' answers above)" error={e.previously_refused_visa_details?.message}>
            <textarea {...register(`${prefix}.previously_refused_visa_details` as any)} rows={3} maxLength={1500} className={inp} />
          </Field>
        )}
      </div>

      <div className="space-y-2">
        <Field label="Have you ever committed, been arrested for, or been charged with or convicted of any criminal offence in any country or territory?" required error={e.criminal_record?.message}>
          <YesNo path={`${prefix}.criminal_record`} register={register} />
        </Field>
        {isYes(criminal) && (
          <Field label="Details" error={e.criminal_record_details?.message}>
            <textarea {...register(`${prefix}.criminal_record_details` as any)} rows={3} maxLength={1500} className={inp} />
          </Field>
        )}
      </div>

      <div className="space-y-2">
        <Field label="Did you serve in any military, militia, or civil defence unit or serve in a security organization or police force (including non obligatory national service, reserve or volunteer units)?" required error={e.military_service?.message}>
          <YesNo path={`${prefix}.military_service`} register={register} />
        </Field>
        {isYes(military) && (
          <Field label="Provide dates of service and countries or territories where you served." error={e.military_service_details?.message}>
            <textarea {...register(`${prefix}.military_service_details` as any)} rows={3} maxLength={1500} className={inp} />
          </Field>
        )}
      </div>

      <Field label="Are you, or have you ever been a member or associated with any political party, or other group or organization which has engaged in or advocated violence as a means to achieving a political or religious objective, or which has been associated with criminal activity at any time?" required error={e.political_party?.message}>
        <YesNo path={`${prefix}.political_party`} register={register} />
      </Field>

      <Field label="Have you ever witnessed or participated in the ill treatment of prisoners or civilians, looting or desecration of religious buildings?" required error={e.war_crimes?.message}>
        <YesNo path={`${prefix}.war_crimes`} register={register} />
      </Field>

      <Field label="Do you consent to be contacted by CIC, or an organization at CIC's request, in the future? (Y/N)" required error={e.consent_to_contact?.message}>
        <YesNo path={`${prefix}.consent_to_contact`} register={register} />
      </Field>
    </div>
  );
}

// Schedule 1 (IMM 5257 SCH1) — five yes/no background categories with up to 4
// free-text detail lines each. Visitor path only.
const SCHED1_CATEGORIES: { key: string; label: string }[] = [
  { key: "military_service", label: "Military / paramilitary / civil defence / police service" },
  { key: "war_humanity_crimes", label: "Association with a government/group that used/uses armed force, or committed war crimes / crimes against humanity" },
  { key: "membership_association", label: "Membership or association with any organization (political, social, youth, student, etc.)" },
  { key: "government_positions", label: "Held any government positions (civil servant, judge, police, military officer, elected official, etc.)" },
  { key: "previous_travel", label: "Travelled outside your country of origin/residence in the past (other than to Canada)" },
];

export function Schedule1Block({ prefix, control, register, errors }: BlockProps) {
  return (
    <div className="space-y-4">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Schedule 1 — Background Declaration (IMM 5257)</h4>
      <p className="text-xs text-gray-500">Answer each question. If "Yes", list the details (one entry per line).</p>
      {SCHED1_CATEGORIES.map((cat) => (
        <Schedule1Category key={cat.key} prefix={prefix} catKey={cat.key} label={cat.label} control={control} register={register} errors={errors} />
      ))}
    </div>
  );
}

function Schedule1Category({
  prefix, catKey, label, control, register,
}: { prefix: string; catKey: string; label: string; control: Control<StudyPermitData>; register: UseFormRegister<StudyPermitData>; errors: any }) {
  const has = isYes(useWatch({ control, name: `${prefix}.visit_background.${catKey}.has` as any }));
  return (
    <div className="space-y-2 border-b border-gray-100 pb-3">
      <Field label={label}>
        <YesNo path={`${prefix}.visit_background.${catKey}.has`} register={register} />
      </Field>
      {has && (
        <div className="grid grid-cols-1 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <input
              key={i}
              {...register(`${prefix}.visit_background.${catKey}.details.${i}` as any)}
              placeholder={`Detail ${i + 1}`}
              className={inp}
            />
          ))}
        </div>
      )}
    </div>
  );
}
