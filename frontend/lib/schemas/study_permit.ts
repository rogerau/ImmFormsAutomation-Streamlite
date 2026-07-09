import { z } from "zod";

// ---- Shared ----
const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format")
  .or(z.literal(""));

// HTML <select> emits string "true"/"false" — coerce to boolean for the schema.
const boolFromString = z.preprocess(
  (v) => (v === "true" || v === true ? true : v === "false" || v === false ? false : v === "" || v == null ? null : v),
  z.boolean().nullable(),
);
const requiredBoolFromString = z.preprocess(
  (v) => (v === "true" || v === true ? true : v === "false" || v === false ? false : v),
  z.boolean({ required_error: "Required", invalid_type_error: "Required" }),
);

const yearStr = z.string().regex(/^\d{4}$/, "4-digit year").or(z.literal(""));
const monthStr = z.string().regex(/^\d{1,2}$/, "Month 1-12").or(z.literal(""));

// ---- Enums ----
export const MaritalStatusEnum = z.enum([
  "Annulled marriage",
  "Common-law",
  "Divorced",
  "Legally separated",
  "Married-physically present",
  "Married-not physically present",
  "Single",
  "Widowed",
]);
export type MaritalStatus = z.infer<typeof MaritalStatusEnum>;

export const SexEnum = z.enum(["Male", "Female"]);
export const LanguageEnum = z.enum(["English", "French", "Both", "Neither"]);
export const ServiceInEnum = z.enum(["English", "French"]);
export const ParentStatusEnum = z.enum(["Living", "Deceased"]);
// The 6 real IRCC IMM 1295 "type of work permit" LOV options (mirrors backend
// imm1295.schema.WorkPermitType / imm1295/filler.py's WORK_PERMIT_TYPE_LIC).
export const WorkPermitTypeEnum = z.enum([
  "Exemption from Labour Market Impact Assessment",
  "Labour Market Impact Assessment Stream",
  "Open Work Permit",
  "Other",
  "Seasonal Agricultural Workers Program",
  "Start-up Business Class",
]);
export const RepActionEnum = z.enum([
  "appointing",
  "updating",
  "cancelling",
  "cancelling_and_appointing",
  "withdrawing",
]);
export const RepTypeEnum = z.enum([
  "unpaid_friend_family",
  "unpaid_iccrc",
  "unpaid_other",
  "unpaid_law_society",
  "unpaid_chambre",
  "paid_iccrc",
  "paid_law_society",
  "paid_chambre",
]);

// ---- IMM 1294 sub-schemas ----
const addressSchema = z.object({
  unit: z.string().default(""),
  street_number: z.string().default(""),
  street_name: z.string().min(1, "Required"),
  city: z.string().min(1, "Required"),
  country: z.string().min(1, "Required"),
  province_state: z.string().default(""),
  postal_code: z.string().default(""),
  district: z.string().default(""),
});

// Relaxed variant for residential address — all fields optional (user may leave blank).
const residentialAddressSchema = z.object({
  unit: z.string().default(""),
  street_number: z.string().default(""),
  street_name: z.string().default(""),
  city: z.string().default(""),
  country: z.string().default(""),
  province_state: z.string().default(""),
  postal_code: z.string().default(""),
  district: z.string().default(""),
});

const residenceRowSchema = z.object({
  country: z.string().default(""),
  status: z.string().default(""),
  status_other: z.string().default(""),
  from_date: z.string().default(""),
  to_date: z.string().default(""),
});

const phoneSchema = z.object({
  phone_type: z.string().default(""),
  country_code: z.string().default(""),
  number: z.string().default(""),
  ext: z.string().default(""),
});

const passportSchema = z.object({
  passport_number: z.string().min(1, "Required"),
  country_of_issue: z.string().min(1, "Required"),
  issue_date: dateStr,
  expiry_date: dateStr,
});

const studyDetailsSchema = z.object({
  school_name: z.string().min(1, "Required"),
  level: z.string().min(1, "Required"),
  program: z.string().min(1, "Required"),
  city: z.string().min(1, "Required"),
  province_state: z.string().default(""),
  address: z.string().default(""),
  dli_number: z.string().min(1, "Required"),
  student_number: z.string().default(""),
  start_date: dateStr,
  end_date: dateStr,
  // Cost of studies
  tuition_amount: z.string().default(""),
  room_board_amount: z.string().default(""),
  other_amount: z.string().default(""),
  funds_available: z.string().default(""),
  expenses_paid_by: z.string().default(""),
  expenses_paid_by_other: z.string().default(""),
  // PAL / TAL
  pal_doc_number: z.string().default(""),
  pal_doc_expiry: z.string().default(""),
  // CAQ
  caq_cert_number: z.string().default(""),
  caq_cert_expiry: z.string().default(""),
});

const nationalIdSchema = z.object({
  has_document: requiredBoolFromString,
  doc_number: z.string().default(""),
  country_of_issue: z.string().default(""),
  issue_date: z.string().default(""),
  expiry_date: z.string().default(""),
});

const usCardSchema = z.object({
  has_card: requiredBoolFromString,
  doc_number: z.string().default(""),
  uscis_number: z.string().default(""),
  expiry_date: z.string().default(""),
});

// Lenient variants for dependents (child / spouse) — the has-flag is optional at
// the schema level (so a non-applying dependent never errors); requiredness is
// enforced by the master superRefine only when the dependent is actually filing.
const lenientNationalIdSchema = z.object({
  has_document: boolFromString.optional(),
  doc_number: z.string().default(""),
  country_of_issue: z.string().default(""),
  issue_date: z.string().default(""),
  expiry_date: z.string().default(""),
});

const lenientUsCardSchema = z.object({
  has_card: boolFromString.optional(),
  doc_number: z.string().default(""),
  uscis_number: z.string().default(""),
  expiry_date: z.string().default(""),
});

// A dependent's own parent (IMM 5707 Section A) — lenient; key fields required
// via superRefine when the dependent files their own forms.
const dependentParentSchema = z.object({
  family_name: z.string().default(""),
  given_names: z.string().default(""),
  native_name: z.string().default(""),
  date_of_birth: dateStr,
  country_of_birth: z.string().default(""),
  address: z.string().default(""),
  occupation: z.string().default(""),
  status: ParentStatusEnum.default("Living"),
  marital_status: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    MaritalStatusEnum.nullable().optional(),
  ),
  will_accompany: boolFromString.optional(),
});

// Previous-marriage block shared by child (n/a — Single) and spouse.
const prevMarriageBlock = {
  previously_married: boolFromString.optional(),
  prev_spouse_family_name: z.string().default(""),
  prev_spouse_given_name: z.string().default(""),
  prev_spouse_date_of_birth: z.string().default(""),
  prev_relationship_type: z.string().default(""),
  prev_relationship_from: z.string().default(""),
  prev_relationship_to: z.string().default(""),
};

// Residence-history block (current + previous + applying-from) shared by
// child and spouse — mirrors the main applicant's personal_info fields.
const residenceHistoryBlock = {
  current_residence: residenceRowSchema.nullable().optional(),
  has_previous_residence: boolFromString.optional(),
  previous_residences: z.array(residenceRowSchema).max(2).default([]),
  applying_country_same_as_current: boolFromString.optional(),
  applying_country: residenceRowSchema.nullable().optional(),
};

// IMM 1294 Page-4 background declarations — lenient (enforced via superRefine).
const backgroundDeclarationsBlock = {
  tuberculosis: boolFromString.optional(),
  medical_condition: boolFromString.optional(),
  medical_condition_details: z.string().default(""),
  previously_remained_status: boolFromString.optional(),
  previously_applied_canada: boolFromString.optional(),
  previously_refused_visa: boolFromString.optional(),
  previously_refused_visa_details: z.string().default(""),
  criminal_record: boolFromString.optional(),
  criminal_record_details: z.string().default(""),
  military_service: boolFromString.optional(),
  military_service_details: z.string().default(""),
  political_party: boolFromString.optional(),
  war_crimes: boolFromString.optional(),
  consent_to_contact: boolFromString.optional(),
};

const educationEntrySchema = z.object({
  from_year: yearStr,
  from_month: monthStr,
  to_year: yearStr,
  to_month: monthStr,
  field_of_study: z.string().min(1, "Required"),
  school: z.string().min(1, "Required"),
  city: z.string().min(1, "Required"),
  country: z.string().min(1, "Required"),
  province_state: z.string().default(""),
});

const occupationEntrySchema = z.object({
  from_year: yearStr,
  from_month: monthStr,
  to_year: yearStr,
  to_month: monthStr,
  occupation: z.string().min(1, "Required"),
  employer: z.string().min(1, "Required"),
  city: z.string().min(1, "Required"),
  country: z.string().min(1, "Required"),
  province_state: z.string().default(""),
});

// ---- IMM 5707 sub-schemas ----
const person5707Schema = z.object({
  family_name: z.string().min(1, "Required"),
  given_names: z.string().min(1, "Required"),
  native_name: z.string().default(""),
  date_of_birth: dateStr,
  country_of_birth: z.string().min(1, "Required"),
  // Address is derived from the household contact in the backend — not collected
  // here for spouse/children to avoid asking the same thing twice.
  address: z.string().default(""),
  occupation: z.string().min(1, "Required"),
  marital_status: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    MaritalStatusEnum.nullable().optional(),
  ),
  will_accompany: boolFromString.optional(),
});

const parent5707Schema = person5707Schema.extend({
  status: ParentStatusEnum.default("Living"),
  will_accompany: requiredBoolFromString,
  // Parents' home address IS collected explicitly — re-assert required here.
  address: z.string().min(1, "Required"),
});

// ---- Dependant child study-permit (Phase X) ----
// Lenient by design: every field defaults, so a non-applying child never errors.
// When a child is flagged applying_study_permit AND optional_forms includes
// "child_study_permit", the master superRefine enforces the required fields.
const childPassportSchema = z.object({
  passport_number: z.string().default(""),
  country_of_issue: z.string().default(""),
  issue_date: dateStr,
  expiry_date: dateStr,
});

const childStudySchema = z.object({
  school_name: z.string().default(""),
  level: z.string().default(""),
  program: z.string().default(""),
  city: z.string().default(""),
  province_state: z.string().default(""),
  address: z.string().default(""),
  dli_number: z.string().default(""),
  start_date: dateStr,
  end_date: dateStr,
});

const childStudyApplicantSchema = z.object({
  sex: z.preprocess((v) => (v === "" || v == null ? null : v), SexEnum.nullable().optional()),
  place_birth_city: z.string().default(""),
  citizenship: z.string().default(""),   // defaults to the parent's on the backend if blank
  current_country: z.string().default(""),
  passport: childPassportSchema.default({ passport_number: "", country_of_issue: "", issue_date: "", expiry_date: "" }),
  study: childStudySchema.default({ school_name: "", level: "", program: "", city: "", province_state: "", address: "", dli_number: "", start_date: "", end_date: "" }),

  // Phase X2 — the child's own data (was inferred from the main applicant).
  language: LanguageEnum.default("English"),
  language_most_at_ease: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    LanguageEnum.nullable().optional(),
  ),
  service_in: ServiceInEnum.default("English"),
  national_id: lenientNationalIdSchema.default({ has_document: undefined, doc_number: "", country_of_issue: "", issue_date: "", expiry_date: "" }),
  us_pr_card: lenientUsCardSchema.default({ has_card: undefined, doc_number: "", uscis_number: "", expiry_date: "" }),
  ...residenceHistoryBlock,
  ...backgroundDeclarationsBlock,
});

const child5707Schema = person5707Schema.extend({
  relationship: z.string().min(1, "Required"),
  marital_status: MaritalStatusEnum,
  will_accompany: requiredBoolFromString,
  // Phase X — minor child filing their own study permit. No "unaccompanied"
  // flag: this child is a dependent of the main applicant, who is themself
  // the parent travelling to/residing in Canada — IRCC's custodian
  // requirement (IMM 5646) only applies when NO parent/guardian accompanies,
  // which can't happen in this flow. A genuinely unaccompanied minor (no
  // parent involved at all) is a different case type, out of scope here.
  applying_study_permit: boolFromString.optional(),
  study_applicant: childStudyApplicantSchema.nullable().optional(),
});

// ---- Dependant spouse work permit / visitor visa (Phase 2) ----
// Lenient by design: every field defaults, so a spouse not filing their own
// application never errors. When optional_forms includes "spouse_work_permit"
// or "spouse_visitor", the master superRefine enforces the required subset.
const spouseWorkDetailsSchema = z.object({
  work_permit_type: WorkPermitTypeEnum.default("Open Work Permit"),
  employer_name: z.string().default(""),
  employer_address: z.string().default(""),
  intended_province_state: z.string().default(""),
  intended_city_town: z.string().default(""),
  intended_address: z.string().default(""),
  job_title: z.string().default(""),
  position_description: z.string().default(""),
  // Not rendered anywhere in DependentSpouseStep.tsx's work-permit block —
  // dateStr alone (no .default) made these silently required despite never
  // being collected, which was the actual root cause of the "stuck on Next,
  // no error shown" bug report: react-hook-form never registers an input for
  // an unrendered field, so it stayed `undefined` and failed Zod's required
  // string check on every validation pass.
  how_long_from: dateStr.default(""),
  how_long_to: dateStr.default(""),
  lmia_number: z.string().default(""),
});

const spouseVisitDetailsSchema = z.object({
  purpose_of_visit: z.string().default("Visit"),
  purpose_other: z.string().default(""),
  how_long_from: dateStr,
  how_long_to: dateStr,
  funds_available: z.string().default(""),
  contact1_name: z.string().default(""),
  contact1_relationship: z.string().default(""),
  contact1_address_in_canada: z.string().default(""),
  contact2_name: z.string().default(""),
  contact2_relationship: z.string().default(""),
  contact2_address_in_canada: z.string().default(""),
});

const schedule1CategorySchema = z.object({
  has: boolFromString.default(false),
  details: z.array(z.string()).max(4).default([]),
});

const schedule1Schema = z.object({
  military_service: schedule1CategorySchema.default({ has: false, details: [] }),
  war_humanity_crimes: schedule1CategorySchema.default({ has: false, details: [] }),
  membership_association: schedule1CategorySchema.default({ has: false, details: [] }),
  government_positions: schedule1CategorySchema.default({ has: false, details: [] }),
  previous_travel: schedule1CategorySchema.default({ has: false, details: [] }),
});

const spouseStudyApplicantSchema = z.object({
  sex: z.preprocess((v) => (v === "" || v == null ? null : v), SexEnum.nullable().optional()),
  place_birth_city: z.string().default(""),
  citizenship: z.string().default(""),   // defaults to the main applicant's on the backend if blank
  current_country: z.string().default(""),
  passport: childPassportSchema.default({ passport_number: "", country_of_issue: "", issue_date: "", expiry_date: "" }),
  work: spouseWorkDetailsSchema.nullable().optional(),
  visit: spouseVisitDetailsSchema.nullable().optional(),
  visit_background: schedule1Schema.nullable().optional(),

  // Full parity (Phase G) — the spouse's own personal/background data,
  // collected the same way as the main applicant's (StudyDetailsStep /
  // EmploymentHistoryStep), never borrowed from the main applicant.
  language: LanguageEnum.default("English"),
  language_most_at_ease: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    LanguageEnum.nullable().optional(),
  ),
  service_in: ServiceInEnum.default("English"),
  has_education_history: boolFromString.optional(),
  education_history: z.array(educationEntrySchema).default([]),
  occupation_history: z.array(occupationEntrySchema).default([]),
  tuberculosis: boolFromString.optional(),
  medical_condition: boolFromString.optional(),
  medical_condition_details: z.string().default(""),
  previously_remained_status: boolFromString.optional(),
  previously_applied_canada: boolFromString.optional(),
  previously_refused_visa: boolFromString.optional(),
  previously_refused_visa_details: z.string().default(""),
  criminal_record: boolFromString.optional(),
  criminal_record_details: z.string().default(""),
  military_service: boolFromString.optional(),
  military_service_details: z.string().default(""),
  political_party: boolFromString.optional(),
  war_crimes: boolFromString.optional(),
  consent_to_contact: boolFromString.optional(),

  // Phase X2 — remaining spouse-own data (was inferred from the main applicant).
  national_id: lenientNationalIdSchema.default({ has_document: undefined, doc_number: "", country_of_issue: "", issue_date: "", expiry_date: "" }),
  us_pr_card: lenientUsCardSchema.default({ has_card: undefined, doc_number: "", uscis_number: "", expiry_date: "" }),
  ...residenceHistoryBlock,
  ...prevMarriageBlock,
  // The spouse's own address: same-as-main toggle (default yes → reuse the main
  // applicant's household address); full structured address only when different.
  address_same_as_main: boolFromString.optional(),
  mailing_address: residentialAddressSchema.nullable().optional(),
  residential_address_same_as_mailing: boolFromString.optional(),
  residential_address: residentialAddressSchema.nullable().optional(),
  // The spouse's own phone/alt phone/fax/email — always their own, unlike the
  // address above (never inferred from the main applicant's contact block).
  phone: z.string().default(""),
  primary_phone_type: z.string().default(""),
  primary_phone_country_code: z.string().default(""),
  primary_phone_ext: z.string().default(""),
  has_alt_phone: boolFromString.optional(),
  alt_phone: phoneSchema.nullable().optional(),
  has_fax: boolFromString.optional(),
  fax: phoneSchema.nullable().optional(),
  email: z.string().default(""),
  // The spouse's own parents for their IMM 5707.
  father: dependentParentSchema.nullable().optional(),
  mother: dependentParentSchema.nullable().optional(),
});

// ---- IMM 5409 sub-schema ----
const commonLawSchema = z.object({
  jurisdiction_country: z.string().min(1, "Required"),
  jurisdiction_province: z.string().default(""),
  applicant_name: z.string().default(""),       // derived from personal_info
  partner_name: z.string().default(""),         // derived from family.spouse
  cohabitation_city: z.string().min(1, "Required"),
  cohabitation_county: z.string().default(""),
  cohabitation_province: z.string().default(""),
  cohabitation_country: z.string().min(1, "Required"),
  years_together: z.string().min(1, "Required"),
  start_date: dateStr,
  end_date: z.string().default(""),
  // Section 1 — verbatim from IMM 5409 (Nov 2025), PDF order a..d.
  section1_joint_residential_agreement: boolFromString.default(true),
  section1_joint_property_ownership: boolFromString.default(true),
  section1_joint_financial_accounts: boolFromString.default(true),
  section1_declared_income_tax: boolFromString.default(true),
  life_insurance_on_applicant: boolFromString.default(false),
  partner_life_insurance: boolFromString.default(false),
  additional_details: z.string().default(""),
  declaration_city: z.string().min(1, "Required"),
  declaration_county: z.string().default(""),
  declaration_province: z.string().default(""),
  declaration_country: z.string().min(1, "Required"),
  declaration_day: z.string().min(1, "Required"),
  declaration_month: z.string().min(1, "Required"),
  declaration_year: z.string().min(1, "Required"),
  applicant_signature: z.string().default(""),  // derived from personal_info
  partner_signature: z.string().min(1, "Required"),
  admin_name: z.string().default(""),
  admin_signature: z.string().default(""),
});

// ---- IMM 5646 sub-schema ----
const custodianSchema = z.object({
  student_family_name: z.string().default(""),   // derived from personal_info (student = applicant)
  student_given_names: z.string().default(""),    // derived from personal_info
  student_citizenship: z.string().default(""),    // derived from personal_info
  student_dob: dateStr,
  student_sex: z.union([z.enum(["Male", "Female"]), z.literal("")]).default(""),
  school_address: z.string().min(1, "Required"),
  student_address: z.string().min(1, "Required"),
  parent1_family_name: z.string().min(1, "Required"),
  parent1_given_names: z.string().min(1, "Required"),
  parent1_dob: dateStr,
  parent1_address: z.string().min(1, "Required"),
  parent1_phone: z.string().min(1, "Required"),
  parent2_family_name: z.string().default(""),
  parent2_given_names: z.string().default(""),
  parent2_dob: z.string().default(""),
  parent2_address: z.string().default(""),
  parent2_phone: z.string().default(""),
  custodian_family_name: z.string().min(1, "Required"),
  custodian_given_names: z.string().min(1, "Required"),
  custodian_status: z.string().default("Canadian Citizen"),
  custodian_dob: dateStr,
  custodian_address: z.string().min(1, "Required"),
  custodian_phone: z.string().min(1, "Required"),
  custodian_name_for_decl: z.string().default(""),  // derived from custodian name
  student_name_for_decl: z.string().default(""),    // derived from personal_info
  sworn_city: z.string().min(1, "Required"),
  sworn_province: z.string().default(""),
  sworn_country: z.string().min(1, "Required"),
  sworn_day: z.string().min(1, "Required"),
  sworn_month: z.string().min(1, "Required"),
  sworn_year: z.string().min(1, "Required"),
  parent_signature: z.string().default(""),       // derived from parent/guardian 1 name
  parent2_signature: z.string().default(""),
  parent1_name_decl: z.string().default(""),
  parent2_name_decl: z.string().default(""),
  child_residence: z.enum(["with_custodian", "school_dormitory", "with_other"]).default("with_custodian"),
  child_residence_other_name: z.string().default(""),
});

// ---- IMM 5476 sub-schema ----
const representativeSchema = z.object({
  applicant_family_name: z.string().min(1, "Required"),
  applicant_given_name: z.string().min(1, "Required"),
  applicant_dob: dateStr,
  uci_number: z.string().default(""),
  applicant_email: z.string().default(""),
  type_of_application: z.string().default("Study Permit (Outside Canada)"),
  rep_action: RepActionEnum.default("appointing"),
  rep_type: RepTypeEnum.default("paid_iccrc"),
  rep_family_name: z.string().default(""),
  rep_given_name: z.string().default(""),
  iccrc_number: z.string().default(""),
  provincial_law_society: z.string().default(""),
  membership_id: z.string().default(""),
  unpaid_other_specify: z.string().default(""),
  organization_name: z.string().default(""),
  lawyer_name: z.string().default(""),
  unit: z.string().default(""),
  street_number: z.string().default(""),
  street_name: z.string().default(""),
  city: z.string().default(""),
  province: z.string().default(""),
  country: z.string().default(""),
  postal_code: z.string().default(""),
  phone_country_code: z.string().default("1"),
  phone_number: z.string().default(""),
  fax_country_code: z.string().default(""),
  fax_number: z.string().default(""),
  email: z.string().default(""),
  applicant_signature: z.string().min(1, "Required"),
  applicant_date_signed: dateStr,
});

// ---- IMM 5475 — Authority to Release Personal Information ----
const releaseAuthoritySchema = z.object({
  designated_family_name: z.string().min(1, "Required"),
  designated_given_names: z.string().min(1, "Required"),
  designated_relationship: z.string().default(""),
  designated_unit: z.string().default(""),
  designated_street_number: z.string().default(""),
  designated_street_name: z.string().default(""),
  designated_city: z.string().default(""),
  designated_province_state: z.string().default(""),
  designated_country: z.string().default(""),
  designated_postal_code: z.string().default(""),
  designated_phone_country_code: z.string().default(""),
  designated_phone: z.string().default(""),
  designated_email: z.string().default(""),
  cancel_previous: boolFromString.optional(),
  applicant_signature: z.string().default(""),  // derived from personal_info
  signed_date: dateStr,
  signed_city: z.string().default(""),
  signed_country: z.string().default(""),
});

// ---- Previous marriage (IMM 1294 subsection 11) ----
const previousMarriageSchema = z.object({
  had_previous: requiredBoolFromString,
  family_name: z.string().default(""),
  given_names: z.string().default(""),
  date_of_birth: z.string().default(""),
  relationship_type: z.string().default(""),
  from_date: z.string().default(""),
  to_date: z.string().default(""),
});

// ---- FamilyInfo ----
const familyInfoSchema = z.object({
  applicant_marital_status: MaritalStatusEnum,
  applicant_occupation: z.string().default(""),  // derived from the most recent occupation_history entry (see EmploymentHistoryStep)
  marriage_date: z.string().default(""),
  spouse: person5707Schema.nullable().optional(),
  no_spouse_signature: z.string().default(""),
  no_spouse_date: z.string().default(""),
  // Phase 2 — spouse filing their own work permit / visitor visa
  spouse_study_applicant: spouseStudyApplicantSchema.nullable().optional(),
  previous_marriage: previousMarriageSchema.nullable().optional(),
  father: parent5707Schema,
  mother: parent5707Schema,
  section_a_signature: z.string().default(""),
  section_a_date: z.string().default(""),
  children: z.array(child5707Schema).max(4).default([]),
  no_children_signature: z.string().default(""),
  no_children_date: z.string().default(""),
  section_c_signature: z.string().default(""),  // derived from personal_info
  section_c_date: dateStr.refine((s) => s.length > 0, "Required"),
});

// ---- Master schema ----
export const StudyPermitSchema = z
  .object({
    case_id: z.string().min(1),
    optional_forms: z.array(z.string()).default([]),

    // Step 1: Personal info
    personal_info: z.object({
      family_name: z.string().min(1, "Required"),
      given_name: z.string().min(1, "Required"),
      native_name: z.string().default(""),
      alias_family_name: z.string().default(""),
      alias_given_name: z.string().default(""),
      sex: SexEnum,
      date_of_birth: dateStr,
      place_birth_city: z.string().min(1, "Required"),
      place_birth_country: z.string().min(1, "Required"),
      citizenship: z.string().min(1, "Required"),
      current_country: z.string().min(1, "Required"),
      marital_status: z.string().default(""),  // consolidated — derived from family.applicant_marital_status
      language: LanguageEnum.default("English"),
      language_most_at_ease: z.preprocess(
        (v) => (v === "" || v == null ? null : v),
        LanguageEnum.nullable().optional(),
      ),
      taken_language_test: boolFromString.optional(),
      uci: z.string().default(""),
      service_in: ServiceInEnum.default("English"),
      // Residence history (subsections 7, 8, 9)
      current_residence: residenceRowSchema.nullable().optional(),
      has_previous_residence: boolFromString.optional(),
      previous_residences: z.array(residenceRowSchema).max(2).default([]),
      applying_country_same_as_current: boolFromString.optional(),
      applying_country: residenceRowSchema.nullable().optional(),
      // Passport extras
      taiwan_passport: boolFromString.optional(),
      israel_passport_not_valid: boolFromString.optional(),
    }),

    // Step 2: Passport + contact
    passport: passportSchema,
    national_id: nationalIdSchema.default({ has_document: false, doc_number: "", country_of_issue: "", issue_date: "", expiry_date: "" }),
    us_pr_card: usCardSchema.default({ has_card: false, doc_number: "", expiry_date: "" }),
    contact: z.object({
      mailing_address: addressSchema,
      residential_address_same_as_mailing: boolFromString.optional(),
      residential_address: residentialAddressSchema.nullable().optional(),
      phone: z.string().min(1, "Required"),
      primary_phone_type: z.string().default(""),
      primary_phone_country_code: z.string().default(""),
      primary_phone_ext: z.string().default(""),
      has_alt_phone: boolFromString.optional(),
      alt_phone: phoneSchema.nullable().optional(),
      has_fax: boolFromString.optional(),
      fax: phoneSchema.nullable().optional(),
      email: z.string().email("Valid email required"),
    }),

    // Step 3: Study details
    study: studyDetailsSchema,

    // Step 6: History
    has_education_history: boolFromString.optional(),
    education_history: z.array(educationEntrySchema).default([]),
    occupation_history: z.array(occupationEntrySchema).default([]),

    // Steps 4-5: Family
    family: familyInfoSchema,

    // Background — IRCC IMM 1294 Page 4 verbatim questions
    tuberculosis: requiredBoolFromString,
    medical_condition: requiredBoolFromString,
    medical_condition_details: z.string().max(1500, "Max 1500 characters").default(""),
    previously_remained_status: requiredBoolFromString,
    previously_applied_canada: requiredBoolFromString,
    previously_refused_visa: requiredBoolFromString,
    previously_refused_visa_details: z.string().max(1500, "Max 1500 characters").default(""),
    criminal_record: requiredBoolFromString,
    criminal_record_details: z.string().max(1500, "Max 1500 characters").default(""),
    military_service: requiredBoolFromString,
    military_service_details: z.string().max(1500, "Max 1500 characters").default(""),
    political_party: requiredBoolFromString,
    war_crimes: requiredBoolFromString,
    consent_to_contact: requiredBoolFromString,

    // Signatures
    applicant_signature: z.string().min(1, "Type your full legal name"),
    applicant_signature_date: dateStr,

    // Optional forms
    common_law: commonLawSchema.nullable().optional(),
    custodian: custodianSchema.nullable().optional(),
    representative: representativeSchema.nullable().optional(),
    release_authority: releaseAuthoritySchema.nullable().optional(),
  })
  .superRefine((d, ctx) => {
    // Phase X2 obs #1 — the current country of residence section is mandatory.
    // Previously it was optional, so a client could submit it blank and the
    // Sheet/PDF diverged. Require country + status + from-date.
    const cr = d.personal_info.current_residence;
    if (!cr?.country) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["personal_info", "current_residence", "country"] });
    }
    if (!cr?.status) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["personal_info", "current_residence", "status"] });
    }
    if (!cr?.from_date) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["personal_info", "current_residence", "from_date"] });
    }

    const partnered = [
      "Common-law",
      "Married-physically present",
      "Married-not physically present",
    ].includes(d.family.applicant_marital_status);

    if (partnered && !d.family.spouse) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Spouse / partner info is required for this marital status.",
        path: ["family", "spouse"],
      });
    }
    if (!partnered && !d.family.no_spouse_signature) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Type your name to confirm you have no spouse / partner.",
        path: ["family", "no_spouse_signature"],
      });
    }
    if (d.family.children.length === 0 && !d.family.no_children_signature) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Type your name to confirm you have no children.",
        path: ["family", "no_children_signature"],
      });
    }

    // Phase X — when a minor child files their own study permit, require the
    // child-specific identity/passport/study fields the IMM 1294 needs.
    if (d.optional_forms.includes("child_study_permit")) {
      d.family.children.forEach((c, i) => {
        if (!c.applying_study_permit) return;
        const sa = c.study_applicant;
        const need = (ok: unknown, msg: string, ...path: (string | number)[]) => {
          if (!ok) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: msg,
              path: ["family", "children", i, "study_applicant", ...path],
            });
          }
        };
        const needAns = (ok: unknown, msg: string, ...path: (string | number)[]) => {
          if (ok === undefined || ok === null) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: msg,
              path: ["family", "children", i, "study_applicant", ...path],
            });
          }
        };
        need(sa?.sex, "Required", "sex");
        need(sa?.place_birth_city, "Required", "place_birth_city");
        need(sa?.passport?.passport_number, "Required", "passport", "passport_number");
        need(sa?.passport?.country_of_issue, "Required", "passport", "country_of_issue");
        need(sa?.study?.school_name, "Required", "study", "school_name");
        need(sa?.study?.level, "Required", "study", "level");
        need(sa?.study?.program, "Required", "study", "program");
        need(sa?.study?.dli_number, "Required", "study", "dli_number");
        need(sa?.study?.start_date, "Required", "study", "start_date");
        need(sa?.study?.end_date, "Required", "study", "end_date");
        // Phase X2 obs #3 — the child's own residence + national ID answer +
        // background declarations (was inferred from the parent).
        need(sa?.current_residence?.country, "Required", "current_residence", "country");
        need(sa?.current_residence?.status, "Required", "current_residence", "status");
        need(sa?.current_residence?.from_date, "Required", "current_residence", "from_date");
        needAns(sa?.national_id?.has_document, "Required", "national_id", "has_document");
        needAns(sa?.us_pr_card?.has_card, "Required", "us_pr_card", "has_card");
        needAns(sa?.tuberculosis, "Required", "tuberculosis");
        needAns(sa?.medical_condition, "Required", "medical_condition");
        needAns(sa?.previously_remained_status, "Required", "previously_remained_status");
        needAns(sa?.previously_applied_canada, "Required", "previously_applied_canada");
        needAns(sa?.previously_refused_visa, "Required", "previously_refused_visa");
        needAns(sa?.criminal_record, "Required", "criminal_record");
        needAns(sa?.military_service, "Required", "military_service");
        needAns(sa?.political_party, "Required", "political_party");
        needAns(sa?.war_crimes, "Required", "war_crimes");
        needAns(sa?.consent_to_contact, "Required", "consent_to_contact");
      });
    }

    // Phase 2 — when the spouse files their own work permit / visitor visa,
    // require the spouse-specific identity/passport fields plus the
    // path-specific block IRCC's IMM 1295 / IMM 5257 needs.
    const wantsSpouseWork = d.optional_forms.includes("spouse_work_permit");
    const wantsSpouseVisit = d.optional_forms.includes("spouse_visitor");
    if (wantsSpouseWork || wantsSpouseVisit) {
      const sa = d.family.spouse_study_applicant;
      const need = (ok: unknown, msg: string, ...path: (string | number)[]) => {
        if (!ok) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: msg,
            path: ["family", "spouse_study_applicant", ...path],
          });
        }
      };
      // Boolean Y/N answers: `false` is a legitimate "No" — only flag truly
      // unanswered (undefined/null), unlike `need()`'s falsy check above.
      const needAnswered = (ok: unknown, msg: string, ...path: (string | number)[]) => {
        if (ok === undefined || ok === null) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: msg,
            path: ["family", "spouse_study_applicant", ...path],
          });
        }
      };
      need(d.family.spouse, "Spouse / partner info is required for this application.");
      need(sa?.sex, "Required", "sex");
      need(sa?.place_birth_city, "Required", "place_birth_city");
      need(sa?.passport?.passport_number, "Required", "passport", "passport_number");
      need(sa?.passport?.country_of_issue, "Required", "passport", "country_of_issue");
      // The spouse's own phone/email — always theirs, never the main
      // applicant's (unlike address, which can be toggled to "same").
      need(sa?.phone, "Required", "phone");
      need(sa?.email, "Required", "email");
      // Full parity (Phase G) — the spouse's own IMM 1294-style background
      // questions, mirrored from the top-level required set above.
      needAnswered(sa?.tuberculosis, "Required", "tuberculosis");
      needAnswered(sa?.medical_condition, "Required", "medical_condition");
      needAnswered(sa?.previously_remained_status, "Required", "previously_remained_status");
      needAnswered(sa?.previously_applied_canada, "Required", "previously_applied_canada");
      needAnswered(sa?.previously_refused_visa, "Required", "previously_refused_visa");
      needAnswered(sa?.criminal_record, "Required", "criminal_record");
      needAnswered(sa?.military_service, "Required", "military_service");
      needAnswered(sa?.political_party, "Required", "political_party");
      needAnswered(sa?.war_crimes, "Required", "war_crimes");
      needAnswered(sa?.consent_to_contact, "Required", "consent_to_contact");
      // Phase X2 obs #5 — the spouse's own residence, national ID answer, prior
      // marriage answer, and their own parents on IMM 5707.
      need(sa?.current_residence?.country, "Required", "current_residence", "country");
      need(sa?.current_residence?.status, "Required", "current_residence", "status");
      need(sa?.current_residence?.from_date, "Required", "current_residence", "from_date");
      needAnswered(sa?.national_id?.has_document, "Required", "national_id", "has_document");
      needAnswered(sa?.us_pr_card?.has_card, "Required", "us_pr_card", "has_card");
      needAnswered(sa?.previously_married, "Required", "previously_married");
      need(sa?.father?.family_name, "Required", "father", "family_name");
      need(sa?.mother?.family_name, "Required", "mother", "family_name");
      // obs #6 — Schedule 1 categories are collected in the UI and stored; each
      // defaults to "No" (IRCC-valid), so no explicit-answer gate is enforced.
      if (wantsSpouseWork) {
        need(sa?.work?.work_permit_type, "Required", "work", "work_permit_type");
        // Open Work Permit's job_title/position_description/employer are
        // hardcoded to "OPEN"/blank (see DependentSpouseStep.tsx), not
        // user-entered — every other work permit type is tied to a specific
        // job, so those become required instead.
        if (sa?.work?.work_permit_type && sa.work.work_permit_type !== "Open Work Permit") {
          need(sa?.work?.employer_name, "Required", "work", "employer_name");
          need(sa?.work?.job_title, "Required", "work", "job_title");
          need(sa?.work?.position_description, "Required", "work", "position_description");
        }
      }
      if (wantsSpouseVisit) {
        need(sa?.visit?.purpose_of_visit, "Required", "visit", "purpose_of_visit");
        need(sa?.visit?.how_long_from, "Required", "visit", "how_long_from");
        need(sa?.visit?.how_long_to, "Required", "visit", "how_long_to");
      }
    }
  });

export type StudyPermitData = z.infer<typeof StudyPermitSchema>;
