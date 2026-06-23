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

export interface IntakeAnswers {
  maritalStatus: MaritalStatus | "";
  dateOfBirth: string; // "YYYY-MM-DD", or "" = unanswered
  wantsReleaseAuthority: boolean | null; // null = unanswered (forced choice, no implicit default)
}

export const EMPTY_INTAKE_ANSWERS: IntakeAnswers = {
  maritalStatus: "",
  dateOfBirth: "",
  wantsReleaseAuthority: null,
};

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
  return forms;
}

/** Order-independent match against TEMPLATE_USE_CASES. Exhaustive by construction (8 cases = 2^3 combos). */
export function matchUseCase(answers: IntakeAnswers): TemplateUseCase | undefined {
  const target = [...deriveOptionalForms(answers)].sort().join(",");
  return TEMPLATE_USE_CASES.find((uc) => [...uc.optional_forms].sort().join(",") === target);
}

export function isIntakeComplete(answers: IntakeAnswers): boolean {
  return (
    answers.maritalStatus !== "" &&
    calculateAge(answers.dateOfBirth) !== null &&
    answers.wantsReleaseAuthority !== null
  );
}
