"use client";
import { useEffect } from "react";
import { FieldErrors, UseFormRegister, UseFormGetValues, UseFormWatch, UseFormSetValue } from "react-hook-form";
import type { StudyPermitData } from "@/lib/schemas/study_permit";

interface Props {
  register: UseFormRegister<StudyPermitData>;
  errors: FieldErrors<StudyPermitData>;
  getValues: UseFormGetValues<StudyPermitData>;
  watch: UseFormWatch<StudyPermitData>;
  setValue: UseFormSetValue<StudyPermitData>;
  isSubmitting: boolean;
  submitError: string | null;
  submitResult: any;
}

const inp = "block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";

function fmt(v: unknown): string {
  if (v === true || v === "true") return "Yes";
  if (v === false || v === "false") return "No";
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

const isYes = (v: unknown): boolean => v === true || v === "true";

function Row({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="flex gap-2 py-0.5">
      <span className="text-xs text-gray-500 w-48 shrink-0">{label}</span>
      <span className="text-xs text-gray-800 break-words">{fmt(value)}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-50 rounded border p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">{title}</h3>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

export function ReviewSignStep({ register, errors, getValues, watch, setValue, isSubmitting, submitError, submitResult }: Props) {
  const v = getValues();

  // Auto-fill the final declaration signature from the name entered in Step 1.
  const piFamily = watch("personal_info.family_name");
  const piGiven = watch("personal_info.given_name");
  useEffect(() => {
    const fullName = [piGiven, piFamily].filter(Boolean).join(" ");
    if (fullName) setValue("applicant_signature", fullName);
  }, [piFamily, piGiven, setValue]);

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

  const pi = v.personal_info ?? ({} as any);
  const p = v.passport ?? ({} as any);
  const nid = v.national_id ?? ({} as any);
  const us = v.us_pr_card ?? ({} as any);
  const c = v.contact ?? ({} as any);
  const a = c.mailing_address ?? {};
  const s = v.study ?? ({} as any);
  const f = v.family ?? ({} as any);
  const edu = v.education_history ?? [];
  const occ = v.occupation_history ?? [];
  const cl = v.common_law as any;
  const cust = v.custodian as any;
  const rep = v.representative as any;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-800">Review & Sign</h2>
      <p className="text-sm text-gray-600">
        Please review every section below. Click "Back" to correct any field before submitting.
      </p>

      <Section title="Personal Information (IMM 1294, IMM 5707)">
        <Row label="Family name" value={pi.family_name} />
        <Row label="Given name(s)" value={pi.given_name} />
        <Row label="Name in native language" value={pi.native_name} />
        <Row label="Alias family name" value={pi.alias_family_name} />
        <Row label="Alias given name" value={pi.alias_given_name} />
        <Row label="Sex" value={pi.sex} />
        <Row label="Date of birth" value={pi.date_of_birth} />
        <Row label="City of birth" value={pi.place_birth_city} />
        <Row label="Country of birth" value={pi.place_birth_country} />
        <Row label="Country of citizenship" value={pi.citizenship} />
        <Row label="Current country of residence" value={pi.current_country} />
        <Row label="Marital status" value={pi.marital_status} />
        <Row label="Language able to communicate in" value={pi.language} />
        <Row label="Most at ease in" value={(pi as any).language_most_at_ease} />
        <Row label="Taken English/French test" value={(pi as any).taken_language_test} />
        <Row label="I want service in" value={(pi as any).service_in} />
        <Row label="UCI / Client ID" value={pi.uci} />
      </Section>

      <Section title="Residence History (IMM 1294)">
        <Row label="Current — country" value={(pi as any).current_residence?.country} />
        <Row label="Current — status" value={(pi as any).current_residence?.status} />
        <Row label="Current — other status" value={(pi as any).current_residence?.status_other} />
        <Row label="Current — from" value={(pi as any).current_residence?.from_date} />
        <Row label="Current — to" value={(pi as any).current_residence?.to_date} />
        <Row label="Any previous residences?" value={(pi as any).has_previous_residence} />
        {((pi as any).previous_residences ?? []).map((r: any, i: number) => (
          <div key={i} className="border-t border-gray-200 pt-1 mt-1">
            <Row label={`Previous #${i + 1} country`} value={r?.country} />
            <Row label={`Previous #${i + 1} status`} value={r?.status} />
            <Row label={`Previous #${i + 1} from`} value={r?.from_date} />
            <Row label={`Previous #${i + 1} to`} value={r?.to_date} />
          </div>
        ))}
        <Row label="Applying from same country as current?" value={(pi as any).applying_country_same_as_current} />
        <Row label="Applying — country" value={(pi as any).applying_country?.country} />
        <Row label="Applying — status" value={(pi as any).applying_country?.status} />
      </Section>

      <Section title="Passport (IMM 1294)">
        <Row label="Passport number" value={p.passport_number} />
        <Row label="Country of issue" value={p.country_of_issue} />
        <Row label="Issue date" value={p.issue_date} />
        <Row label="Expiry date" value={p.expiry_date} />
        <Row label="Taiwan MOFA passport (Q5)" value={(pi as any).taiwan_passport} />
        <Row label="National Israeli passport (Q6)" value={(pi as any).israel_passport_not_valid} />
      </Section>

      <Section title="National Identity Document (IMM 1294)">
        <Row label="Has national ID document?" value={nid.has_document} />
        {isYes(nid.has_document) && (
          <>
            <Row label="Document number" value={nid.doc_number} />
            <Row label="Country of issue" value={nid.country_of_issue} />
            <Row label="Issue date" value={nid.issue_date} />
            <Row label="Expiry date" value={nid.expiry_date} />
          </>
        )}
      </Section>

      <Section title="U.S. Permanent Resident Card (IMM 1294)">
        <Row label="Has U.S. PR card?" value={us.has_card} />
        {isYes(us.has_card) && (
          <>
            <Row label="Document number" value={us.doc_number} />
            <Row label="USCIS number" value={us.uscis_number} />
            <Row label="Expiry date" value={us.expiry_date} />
          </>
        )}
      </Section>

      <Section title="Contact — Mailing Address (IMM 1294)">
        <Row label="Unit / Apt" value={a.unit} />
        <Row label="Street number" value={a.street_number} />
        <Row label="Street name" value={a.street_name} />
        <Row label="City" value={a.city} />
        <Row label="District" value={(a as any).district} />
        <Row label="Province / State" value={a.province_state} />
        <Row label="Country" value={a.country} />
        <Row label="Postal / ZIP code" value={a.postal_code} />
      </Section>

      <Section title="Contact — Residential Address (IMM 1294)">
        <Row label="Same as mailing?" value={(c as any).residential_address_same_as_mailing} />
        {!((c as any).residential_address_same_as_mailing === true || (c as any).residential_address_same_as_mailing === "true") && (
          <>
            <Row label="Unit / Apt" value={(c as any).residential_address?.unit} />
            <Row label="Street number" value={(c as any).residential_address?.street_number} />
            <Row label="Street name" value={(c as any).residential_address?.street_name} />
            <Row label="City" value={(c as any).residential_address?.city} />
            <Row label="District" value={(c as any).residential_address?.district} />
            <Row label="Province / State" value={(c as any).residential_address?.province_state} />
            <Row label="Country" value={(c as any).residential_address?.country} />
            <Row label="Postal / ZIP" value={(c as any).residential_address?.postal_code} />
          </>
        )}
      </Section>

      <Section title="Contact — Phone & Fax (IMM 1294)">
        <Row label="Primary phone" value={c.phone} />
        <Row label="Primary phone type" value={(c as any).primary_phone_type} />
        <Row label="Has alternate phone?" value={(c as any).has_alt_phone} />
        {((c as any).has_alt_phone === true || (c as any).has_alt_phone === "true") && (
          <>
            <Row label="Alt phone type" value={(c as any).alt_phone?.phone_type} />
            <Row label="Alt country code" value={(c as any).alt_phone?.country_code} />
            <Row label="Alt number" value={(c as any).alt_phone?.number} />
            <Row label="Alt ext" value={(c as any).alt_phone?.ext} />
          </>
        )}
        <Row label="Has fax?" value={(c as any).has_fax} />
        {((c as any).has_fax === true || (c as any).has_fax === "true") && (
          <>
            <Row label="Fax country code" value={(c as any).fax?.country_code} />
            <Row label="Fax number" value={(c as any).fax?.number} />
            <Row label="Fax ext" value={(c as any).fax?.ext} />
          </>
        )}
        <Row label="Email" value={c.email} />
      </Section>

      <Section title="Study Details (IMM 1294)">
        <Row label="School / Institution" value={s.school_name} />
        <Row label="Level of study" value={s.level} />
        <Row label="Program / Field" value={s.program} />
        <Row label="School city" value={s.city} />
        <Row label="School province / state" value={s.province_state} />
        <Row label="School address" value={s.address} />
        <Row label="DLI number" value={s.dli_number} />
        <Row label="Student ID" value={s.student_number} />
        <Row label="Start date" value={s.start_date} />
        <Row label="End date" value={s.end_date} />
        <Row label="Tuition (CAD)" value={s.tuition_amount} />
        <Row label="Room & board (CAD)" value={s.room_board_amount} />
        <Row label="Other (CAD)" value={s.other_amount} />
        <Row label="Funds available (CAD)" value={s.funds_available} />
        <Row label="Expenses paid by" value={s.expenses_paid_by} />
        <Row label="Expenses paid by (other)" value={s.expenses_paid_by_other} />
        <Row label="PAL / TAL doc number" value={s.pal_doc_number} />
        <Row label="PAL / TAL expiry" value={s.pal_doc_expiry} />
        <Row label="CAQ certificate number" value={s.caq_cert_number} />
        <Row label="CAQ expiry" value={s.caq_cert_expiry} />
      </Section>

      <Section title="Background Information (IMM 1294)">
        <Row label="Tuberculosis (Q86)" value={v.tuberculosis} />
        <Row label="Medical disorder (Q87)" value={v.medical_condition} />
        <Row label="Medical details" value={v.medical_condition_details} />
        <Row label="Remained beyond status (Q88a)" value={(v as any).previously_remained_status} />
        <Row label="Previously applied to Canada (Q88b)" value={(v as any).previously_applied_canada} />
        <Row label="Refused visa / denied entry (Q89)" value={v.previously_refused_visa} />
        <Row label="Q88/Q89 details" value={v.previously_refused_visa_details} />
        <Row label="Criminal record (Q90)" value={v.criminal_record} />
        <Row label="Criminal record details" value={v.criminal_record_details} />
        <Row label="Military / police service (Q4)" value={v.military_service} />
        <Row label="Military service details" value={v.military_service_details} />
        <Row label="Political party (Q5)" value={(v as any).political_party} />
        <Row label="War crimes / ill-treatment (Q6)" value={(v as any).war_crimes} />
        <Row label="Consent to be contacted by CIC" value={v.consent_to_contact} />
      </Section>

      <Section title="Family — About You (IMM 5707 / IMM 1294)">
        <Row label="Marital status" value={f.applicant_marital_status} />
        <Row label="Occupation" value={f.applicant_occupation} />
        <Row label="Date of marriage / common-law" value={(f as any).marriage_date} />
      </Section>

      <Section title="Previous Marriage / Common-law (IMM 1294)">
        <Row label="Had a previous marriage / common-law?" value={(f as any).previous_marriage?.had_previous} />
        {((f as any).previous_marriage?.had_previous === true || (f as any).previous_marriage?.had_previous === "true") && (
          <>
            <Row label="Family name" value={(f as any).previous_marriage?.family_name} />
            <Row label="Given names" value={(f as any).previous_marriage?.given_names} />
            <Row label="Date of birth" value={(f as any).previous_marriage?.date_of_birth} />
            <Row label="Type" value={(f as any).previous_marriage?.relationship_type} />
            <Row label="From" value={(f as any).previous_marriage?.from_date} />
            <Row label="To" value={(f as any).previous_marriage?.to_date} />
          </>
        )}
      </Section>

      {f.spouse ? (
        <Section title="Spouse / Common-law Partner (IMM 5707)">
          <Row label="Family name" value={f.spouse.family_name} />
          <Row label="Given names" value={f.spouse.given_names} />
          <Row label="Date of birth" value={f.spouse.date_of_birth} />
          <Row label="Country of birth" value={f.spouse.country_of_birth} />
          <Row label="Address" value={f.spouse.address} />
          <Row label="Occupation" value={f.spouse.occupation} />
          <Row label="Marital status" value={f.spouse.marital_status} />
          <Row label="Will accompany?" value={f.spouse.will_accompany} />
        </Section>
      ) : (
        <Section title="No Spouse / Partner Declaration (IMM 5707)">
          <Row label="Signature" value={f.no_spouse_signature} />
          <Row label="Date" value={f.no_spouse_date} />
        </Section>
      )}

      <Section title="Father (IMM 5707)">
        <Row label="Family name" value={f.father?.family_name} />
        <Row label="Given names" value={f.father?.given_names} />
        <Row label="Date of birth" value={f.father?.date_of_birth} />
        <Row label="Country of birth" value={f.father?.country_of_birth} />
        <Row label="Status" value={f.father?.status} />
        <Row label="Address" value={f.father?.address} />
        <Row label="Occupation" value={f.father?.occupation} />
        <Row label="Marital status" value={f.father?.marital_status} />
        <Row label="Will accompany?" value={f.father?.will_accompany} />
      </Section>

      <Section title="Mother (IMM 5707)">
        <Row label="Family name" value={f.mother?.family_name} />
        <Row label="Given names" value={f.mother?.given_names} />
        <Row label="Date of birth" value={f.mother?.date_of_birth} />
        <Row label="Country of birth" value={f.mother?.country_of_birth} />
        <Row label="Status" value={f.mother?.status} />
        <Row label="Address" value={f.mother?.address} />
        <Row label="Occupation" value={f.mother?.occupation} />
        <Row label="Marital status" value={f.mother?.marital_status} />
        <Row label="Will accompany?" value={f.mother?.will_accompany} />
      </Section>

      <Section title="Children (IMM 5707)">
        {(f.children ?? []).length === 0 ? (
          <>
            <Row label="Children" value="None" />
            <Row label="No-children signature" value={f.no_children_signature} />
            <Row label="No-children date" value={f.no_children_date} />
          </>
        ) : (
          (f.children ?? []).map((c: any, i: number) => (
            <div key={i} className="border-t border-gray-200 pt-1 mt-1 first:border-0 first:pt-0 first:mt-0">
              <Row label={`Child ${i + 1} — Relationship`} value={c.relationship} />
              <Row label={`Child ${i + 1} — Name`} value={`${c.family_name ?? ""}, ${c.given_names ?? ""}`} />
              <Row label={`Child ${i + 1} — DOB`} value={c.date_of_birth} />
              <Row label={`Child ${i + 1} — Country of birth`} value={c.country_of_birth} />
              <Row label={`Child ${i + 1} — Address`} value={c.address} />
              <Row label={`Child ${i + 1} — Marital status`} value={c.marital_status} />
              <Row label={`Child ${i + 1} — Occupation`} value={c.occupation} />
              <Row label={`Child ${i + 1} — Will accompany?`} value={c.will_accompany} />
            </div>
          ))
        )}
      </Section>

      <Section title="Section C — Certification (IMM 5707)">
        <Row label="Signature" value={f.section_c_signature} />
        <Row label="Date" value={f.section_c_date} />
      </Section>

      <Section title="Education History (IMM 1294)">
        <Row label="Has post-secondary education?" value={(v as any).has_education_history} />
        {edu.length === 0 ? (
          <Row label="Entries" value="None" />
        ) : (
          edu.map((e: any, i: number) => (
            <div key={i} className="border-t border-gray-200 pt-1 mt-1 first:border-0 first:pt-0 first:mt-0">
              <Row label={`#${i + 1} — School`} value={e.school} />
              <Row label={`#${i + 1} — Field of study`} value={e.field_of_study} />
              <Row label={`#${i + 1} — From`} value={`${e.from_year ?? ""}-${e.from_month ?? ""}`} />
              <Row label={`#${i + 1} — To`} value={`${e.to_year ?? ""}-${e.to_month ?? ""}`} />
              <Row label={`#${i + 1} — City`} value={e.city} />
              <Row label={`#${i + 1} — Province / State`} value={e.province_state} />
              <Row label={`#${i + 1} — Country`} value={e.country} />
            </div>
          ))
        )}
      </Section>

      <Section title="Employment History (IMM 1294)">
        {occ.length === 0 ? (
          <Row label="Entries" value="None" />
        ) : (
          occ.map((o: any, i: number) => (
            <div key={i} className="border-t border-gray-200 pt-1 mt-1 first:border-0 first:pt-0 first:mt-0">
              <Row label={`#${i + 1} — Employer`} value={o.employer} />
              <Row label={`#${i + 1} — Occupation`} value={o.occupation} />
              <Row label={`#${i + 1} — From`} value={`${o.from_year ?? ""}-${o.from_month ?? ""}`} />
              <Row label={`#${i + 1} — To`} value={`${o.to_year ?? ""}-${o.to_month ?? ""}`} />
              <Row label={`#${i + 1} — City`} value={o.city} />
              <Row label={`#${i + 1} — Province / State`} value={o.province_state} />
              <Row label={`#${i + 1} — Country`} value={o.country} />
            </div>
          ))
        )}
      </Section>

      {cl && (
        <Section title="Common-Law Declaration (IMM 5409)">
          <Row label="Applicant name" value={cl.applicant_name} />
          <Row label="Partner name" value={cl.partner_name} />
          <Row label="Jurisdiction country" value={cl.jurisdiction_country} />
          <Row label="Jurisdiction province" value={cl.jurisdiction_province} />
          <Row label="Cohabitation city" value={cl.cohabitation_city} />
          <Row label="Cohabitation country" value={cl.cohabitation_country} />
          <Row label="Years together" value={cl.years_together} />
          <Row label="Start date" value={cl.start_date} />
          <Row label="Declaration city" value={cl.declaration_city} />
          <Row label="Declaration date" value={`${cl.declaration_year}-${cl.declaration_month}-${cl.declaration_day}`} />
          <Row label="Applicant signature" value={cl.applicant_signature} />
          <Row label="Partner signature" value={cl.partner_signature} />
        </Section>
      )}

      {cust && (
        <Section title="Custodian Declaration (IMM 5646)">
          <Row label="Student name" value={`${cust.student_family_name}, ${cust.student_given_names}`} />
          <Row label="Student DOB" value={cust.student_dob} />
          <Row label="Custodian name" value={`${cust.custodian_family_name}, ${cust.custodian_given_names}`} />
          <Row label="Custodian phone" value={cust.custodian_phone} />
          <Row label="Custodian address" value={cust.custodian_address} />
          <Row label="Sworn city" value={cust.sworn_city} />
          <Row label="Sworn date" value={`${cust.sworn_year}-${cust.sworn_month}-${cust.sworn_day}`} />
        </Section>
      )}

      {rep && (
        <Section title="Use of Representative (IMM 5476)">
          <Row label="Rep type" value={rep.rep_type} />
          <Row label="Rep name" value={`${rep.rep_family_name}, ${rep.rep_given_name}`} />
          <Row label="ICCRC number" value={rep.iccrc_number} />
          <Row label="Provincial law society" value={rep.provincial_law_society} />
          <Row label="Organization" value={rep.organization_name} />
          <Row label="Email" value={rep.email} />
          <Row label="Phone" value={`+${rep.phone_country_code ?? ""} ${rep.phone_number ?? ""}`} />
          <Row label="Address" value={`${rep.street_number ?? ""} ${rep.street_name ?? ""}, ${rep.city ?? ""} ${rep.province ?? ""}, ${rep.country ?? ""} ${rep.postal_code ?? ""}`} />
          <Row label="Applicant signature" value={rep.applicant_signature} />
          <Row label="Applicant date signed" value={rep.applicant_date_signed} />
        </Section>
      )}

      <div className="space-y-3 border-t pt-4">
        <h3 className="text-base font-semibold text-gray-700">Declaration & Signature</h3>
        <p className="text-sm text-gray-600">
          I declare that the information I have given in this application is truthful, complete and correct.
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
