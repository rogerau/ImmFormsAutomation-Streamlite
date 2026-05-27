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
export const RepTypeEnum = z.enum(["paid_member", "paid_other", "unpaid", "cancel"]);

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
  address: z.string().min(1, "Required"),
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
});

const child5707Schema = person5707Schema.extend({
  relationship: z.string().min(1, "Required"),
  marital_status: MaritalStatusEnum,
  will_accompany: requiredBoolFromString,
});

// ---- IMM 5409 sub-schema ----
const commonLawSchema = z.object({
  jurisdiction_country: z.string().min(1, "Required"),
  jurisdiction_province: z.string().default(""),
  applicant_name: z.string().min(1, "Required"),
  partner_name: z.string().min(1, "Required"),
  cohabitation_city: z.string().min(1, "Required"),
  cohabitation_county: z.string().default(""),
  cohabitation_province: z.string().default(""),
  cohabitation_country: z.string().min(1, "Required"),
  years_together: z.string().min(1, "Required"),
  start_date: dateStr,
  end_date: z.string().default(""),
  section1_q1: z.boolean().default(true),
  section1_q2: z.boolean().default(true),
  section1_q3: z.boolean().default(true),
  section1_q4: z.boolean().default(true),
  has_children: z.boolean().default(false),
  previous_declaration: z.boolean().default(false),
  additional_details: z.string().default(""),
  declaration_city: z.string().min(1, "Required"),
  declaration_county: z.string().default(""),
  declaration_province: z.string().default(""),
  declaration_country: z.string().min(1, "Required"),
  declaration_day: z.string().min(1, "Required"),
  declaration_month: z.string().min(1, "Required"),
  declaration_year: z.string().min(1, "Required"),
  applicant_signature: z.string().min(1, "Required"),
  partner_signature: z.string().min(1, "Required"),
  admin_name: z.string().default(""),
  admin_signature: z.string().default(""),
});

// ---- IMM 5646 sub-schema ----
const custodianSchema = z.object({
  student_family_name: z.string().min(1, "Required"),
  student_given_names: z.string().min(1, "Required"),
  student_citizenship: z.string().min(1, "Required"),
  student_dob: dateStr,
  student_sex: z.enum(["Male", "Female"]),
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
  custodian_name_for_decl: z.string().min(1, "Required"),
  student_name_for_decl: z.string().min(1, "Required"),
  sworn_city: z.string().min(1, "Required"),
  sworn_province: z.string().default(""),
  sworn_country: z.string().min(1, "Required"),
  sworn_day: z.string().min(1, "Required"),
  sworn_month: z.string().min(1, "Required"),
  sworn_year: z.string().min(1, "Required"),
  parent_signature: z.string().min(1, "Required"),
  parent2_signature: z.string().default(""),
  parent1_name_decl: z.string().default(""),
  parent2_name_decl: z.string().default(""),
});

// ---- IMM 5476 sub-schema ----
const representativeSchema = z.object({
  applicant_family_name: z.string().min(1, "Required"),
  applicant_given_name: z.string().min(1, "Required"),
  applicant_dob: dateStr,
  uci_number: z.string().default(""),
  rep_type: RepTypeEnum.default("paid_member"),
  rep_family_name: z.string().min(1, "Required"),
  rep_given_name: z.string().min(1, "Required"),
  iccrc_number: z.string().default(""),
  provincial_law_society: z.string().default(""),
  membership_id: z.string().default(""),
  organization_name: z.string().default(""),
  lawyer_name: z.string().default(""),
  unit: z.string().default(""),
  street_number: z.string().default(""),
  street_name: z.string().min(1, "Required"),
  city: z.string().min(1, "Required"),
  province: z.string().default(""),
  country: z.string().min(1, "Required"),
  postal_code: z.string().default(""),
  phone_country_code: z.string().default("1"),
  phone_number: z.string().min(1, "Required"),
  fax_country_code: z.string().default(""),
  fax_number: z.string().default(""),
  email: z.string().email("Valid email required"),
  applicant_signature: z.string().min(1, "Required"),
  applicant_date_signed: dateStr,
  rep_signature: z.string().default(""),
  rep_date_signed: z.string().default(""),
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
  applicant_signature: z.string().min(1, "Required"),
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
  applicant_occupation: z.string().min(1, "Required"),
  marriage_date: z.string().default(""),
  spouse: person5707Schema.nullable().optional(),
  no_spouse_signature: z.string().default(""),
  no_spouse_date: z.string().default(""),
  previous_marriage: previousMarriageSchema.nullable().optional(),
  father: parent5707Schema,
  mother: parent5707Schema,
  section_a_signature: z.string().default(""),
  section_a_date: z.string().default(""),
  children: z.array(child5707Schema).max(4).default([]),
  no_children_signature: z.string().default(""),
  no_children_date: z.string().default(""),
  section_c_signature: z.string().min(1, "Type your full legal name to certify"),
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
      marital_status: z.string().min(1, "Required"),
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
  });

export type StudyPermitData = z.infer<typeof StudyPermitSchema>;
