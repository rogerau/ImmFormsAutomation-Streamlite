import { MaritalStatusEnum, type MaritalStatus } from "@/lib/schemas/study_permit";

export interface TemplateUseCase {
  id: string;
  label: string;
  description: string;
  case_prefix: string;
  client_name: string;
  optional_forms: string[];
}

export const TEMPLATE_USE_CASES: TemplateUseCase[] = [
  {
    id: "standard",
    label: "Standard Applicant",
    description:
      "Single or married adult. No common-law declaration, no custodian, no info release.",
    case_prefix: "STANDARD",
    client_name: "Study Permit Applicant",
    optional_forms: ["imm5476"],
  },
  {
    id: "common-law",
    label: "Common-Law Applicant",
    description:
      "Adult in a common-law relationship (not legally married). Adds IMM 5409.",
    case_prefix: "COMMONLAW",
    client_name: "Study Permit Applicant",
    optional_forms: ["imm5476", "imm5409"],
  },
  {
    id: "minor-custodian",
    label: "Minor With Custodian",
    description:
      "Applicant is under 18 and needs a custodian in Canada. Adds IMM 5646.",
    case_prefix: "MINOR-CUSTODIAN",
    client_name: "Study Permit Applicant",
    optional_forms: ["imm5476", "imm5646"],
  },
  {
    id: "release-authority",
    label: "Authorizing Info Release",
    description:
      "Applicant wants IRCC to share case info with a third party. Adds IMM 5475.",
    case_prefix: "RELEASE-AUTHORITY",
    client_name: "Study Permit Applicant",
    optional_forms: ["imm5476", "imm5475"],
  },
  {
    id: "common-law-custodian",
    label: "Common-Law + Minor Custodian",
    description:
      "Uncommon: common-law applicant who is also a minor requiring a custodian.",
    case_prefix: "COMMONLAW-CUSTODIAN",
    client_name: "Study Permit Applicant",
    optional_forms: ["imm5476", "imm5409", "imm5646"],
  },
  {
    id: "common-law-release",
    label: "Common-Law + Info Release",
    description:
      "Common-law applicant who also wants info released to a third party.",
    case_prefix: "COMMONLAW-RELEASE",
    client_name: "Study Permit Applicant",
    optional_forms: ["imm5476", "imm5409", "imm5475"],
  },
  {
    id: "custodian-release",
    label: "Minor Custodian + Info Release",
    description:
      "Minor applicant with a custodian who also wants info released to a third party.",
    case_prefix: "CUSTODIAN-RELEASE",
    client_name: "Study Permit Applicant",
    optional_forms: ["imm5476", "imm5646", "imm5475"],
  },
  {
    id: "all-three",
    label: "Common-Law + Custodian + Info Release",
    description: "All three optional declarations apply.",
    case_prefix: "ALL-THREE",
    client_name: "Study Permit Applicant",
    optional_forms: ["imm5476", "imm5409", "imm5646", "imm5475"],
  },
];

// ---- Intake classifier ----
// Maps a few basic client-intake facts to the matching TemplateUseCase above,
// so the lawyer answers 3 questions instead of picking from a list of 8.

export const MARITAL_STATUS_OPTIONS = MaritalStatusEnum.options;

// Mirrors backend eligibility/data/dependents_eligibility.json's
// spouse.eligible_study_levels — the principal's program levels that qualify
// their spouse/common-law partner for an open work permit (IMM 1295) rather
// than a visitor visa (IMM 5257 + Schedule 1). Source of truth stays the JSON
// file; this is a small, deliberate client-side mirror (same pattern as the
// rest of deriveOptionalForms) so the intake page doesn't need a network call.
export const SPOUSE_OWP_ELIGIBLE_STUDY_LEVELS = [
  "doctoral",
  "masters_16_plus_months",
  "professional_degree",
  "pilot_program",
] as const;

// Marital statuses that imply an actual spouse/common-law partner exists.
// Mirrors FamilyBackgroundStep.tsx's `hasSpouse` check — the only statuses
// where it makes sense to ask "does your partner need their own application?"
export const PARTNERED_MARITAL_STATUSES: MaritalStatus[] = [
  "Common-law",
  "Married-physically present",
  "Married-not physically present",
];

export const STUDY_LEVEL_OPTIONS: { value: string; label: string }[] = [
  { value: "doctoral", label: "Doctoral (PhD)" },
  { value: "masters_16_plus_months", label: "Master's — 16+ months" },
  { value: "masters_under_16_months", label: "Master's — under 16 months" },
  { value: "professional_degree", label: "Professional degree (MD, JD, DDS, etc.)" },
  { value: "pilot_program", label: "Flight/pilot training program" },
  { value: "bachelors", label: "Bachelor's degree" },
  { value: "college_diploma", label: "College diploma" },
  { value: "certificate", label: "Certificate program" },
  { value: "language_program", label: "Language program" },
  { value: "other", label: "Other" },
];

export interface IntakeAnswers {
  maritalStatus: MaritalStatus | "";
  dateOfBirth: string; // "YYYY-MM-DD", or "" = unanswered
  wantsReleaseAuthority: boolean | null; // null = unanswered (forced choice, no implicit default)
  hasMinorChildrenStudying: boolean | null; // Phase X — minor child(ren) filing their own study permit
  hasSpouseAccompanying: boolean | null; // Phase 2 — spouse/partner filing their own work permit or visitor visa
  principalStudyLevel: string; // "" = unanswered; only required when hasSpouseAccompanying === true
}

export const EMPTY_INTAKE_ANSWERS: IntakeAnswers = {
  maritalStatus: "",
  dateOfBirth: "",
  wantsReleaseAuthority: null,
  hasMinorChildrenStudying: null,
  hasSpouseAccompanying: null,
  principalStudyLevel: "",
};

/** "child_study_permit" is an orthogonal add-on, not part of the 2^3 base use-case combos. */
export const DEPENDENT_CHILD_FORM = "child_study_permit";
/** Spouse axis (Phase 2) — also orthogonal, and mutually exclusive with itself
 * (deriveOptionalForms only ever pushes one of the two). */
export const SPOUSE_WORK_PERMIT_FORM = "spouse_work_permit";
export const SPOUSE_VISITOR_FORM = "spouse_visitor";

/** Age in whole years as of `asOf`. Returns null if dob is empty/unparseable. */
export function calculateAge(dob: string, asOf: Date = new Date()): number | null {
  if (!dob) return null;
  const birth = new Date(dob + "T00:00:00"); // force local-time parsing, avoid UTC day rollback
  if (Number.isNaN(birth.getTime())) return null;
  let age = asOf.getFullYear() - birth.getFullYear();
  const monthDiff = asOf.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && asOf.getDate() < birth.getDate())) age--;
  return age;
}

export function deriveOptionalForms(answers: IntakeAnswers): string[] {
  const forms = ["imm5476"];
  if (answers.maritalStatus === "Common-law") forms.push("imm5409");
  const age = calculateAge(answers.dateOfBirth);
  if (age !== null && age < 18) forms.push("imm5646");
  if (answers.wantsReleaseAuthority === true) forms.push("imm5475");
  if (answers.hasMinorChildrenStudying === true) forms.push(DEPENDENT_CHILD_FORM);
  const hasPartner = PARTNERED_MARITAL_STATUSES.includes(answers.maritalStatus as MaritalStatus);
  if (hasPartner && answers.hasSpouseAccompanying === true) {
    const eligible = (SPOUSE_OWP_ELIGIBLE_STUDY_LEVELS as readonly string[]).includes(
      answers.principalStudyLevel,
    );
    forms.push(eligible ? SPOUSE_WORK_PERMIT_FORM : SPOUSE_VISITOR_FORM);
  }
  return forms;
}

/** The principal-applicant-only forms (excludes the orthogonal dependent-child
 * and spouse add-ons), used to match a base TEMPLATE_USE_CASE for
 * labelling/case-prefix purposes. */
export function deriveBaseForms(answers: IntakeAnswers): string[] {
  return deriveOptionalForms(answers).filter(
    (f) => f !== DEPENDENT_CHILD_FORM && f !== SPOUSE_WORK_PERMIT_FORM && f !== SPOUSE_VISITOR_FORM,
  );
}

/** Match the base use case (ignoring the dependent-child axis). Exhaustive by
 * construction (8 cases = 2^3 combos), so this never returns undefined for complete answers. */
export function matchBaseUseCase(answers: IntakeAnswers): TemplateUseCase | undefined {
  const target = [...deriveBaseForms(answers)].sort().join(",");
  return TEMPLATE_USE_CASES.find((uc) => [...uc.optional_forms].sort().join(",") === target);
}

/** Order-independent match against TEMPLATE_USE_CASES. Returns undefined when the
 * dependent-child or spouse add-on applies (no pre-baked template covers either
 * — issue dynamically). */
export function matchUseCase(answers: IntakeAnswers): TemplateUseCase | undefined {
  const target = [...deriveOptionalForms(answers)].sort().join(",");
  return TEMPLATE_USE_CASES.find((uc) => [...uc.optional_forms].sort().join(",") === target);
}

export function isIntakeComplete(answers: IntakeAnswers): boolean {
  const hasPartner = PARTNERED_MARITAL_STATUSES.includes(answers.maritalStatus as MaritalStatus);
  return (
    answers.maritalStatus !== "" &&
    calculateAge(answers.dateOfBirth) !== null &&
    answers.wantsReleaseAuthority !== null &&
    answers.hasMinorChildrenStudying !== null &&
    // Only a partnered status can trigger the spouse question — anything else
    // (Single, Divorced, etc.) skips it entirely, no answer needed.
    (!hasPartner || answers.hasSpouseAccompanying !== null) &&
    (!hasPartner || answers.hasSpouseAccompanying === false || answers.principalStudyLevel !== "")
  );
}
