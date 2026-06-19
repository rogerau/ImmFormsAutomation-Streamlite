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
