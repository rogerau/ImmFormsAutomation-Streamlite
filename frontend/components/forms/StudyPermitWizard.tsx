"use client";
import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { StudyPermitSchema, type StudyPermitData } from "@/lib/schemas/study_permit";
import { WizardProgress } from "./WizardProgress";
import { PersonalInfoStep } from "./steps/PersonalInfoStep";
import { StudyDetailsStep } from "./steps/StudyDetailsStep";
import { FamilyBackgroundStep } from "./steps/FamilyBackgroundStep";
import { ChildrenSiblingsStep } from "./steps/ChildrenSiblingsStep";
import { EmploymentHistoryStep } from "./steps/EmploymentHistoryStep";
import { CommonLawStep } from "./steps/CommonLawStep";
import { CustodianStep } from "./steps/CustodianStep";
import { RepresentativeStep } from "./steps/RepresentativeStep";
import { ReleaseAuthorityStep } from "./steps/ReleaseAuthorityStep";
import { DependentChildrenStep } from "./steps/DependentChildrenStep";
import { DependentSpouseStep } from "./steps/DependentSpouseStep";
import { DependentSpouseHistoryStep } from "./steps/DependentSpouseHistoryStep";
import { ReviewSignStep } from "./steps/ReviewSignStep";
import { FormsGuidance } from "./FormsGuidance";
import type { TokenClaims } from "@/lib/token";

interface Props {
  token: string;
  claims: TokenClaims;
}

const BACKEND_URL =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080"
    : process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080";

const STEP_LABELS_BASE = [
  "Personal Info & Passport",
  "Study Details",
  "Family Background",
  "Children",
  "Education & Employment",
];
const STEP_LABEL_REVIEW = "Review & Sign";

// Sub-fields rendered by DependentSpouseStep ("Spouse — Work Permit" /
// "Spouse — Visitor Visa") — identity, passport, residence, address. Does
// NOT include language/education/employment/parents/previous-marriage,
// which live on the separate "Spouse — Background" step below even though
// both share the same "family.spouse_study_applicant" Zod object.
const SPOUSE_IDENTITY_FIELDS = [
  "family.spouse_study_applicant.sex",
  "family.spouse_study_applicant.place_birth_city",
  "family.spouse_study_applicant.citizenship",
  "family.spouse_study_applicant.current_country",
  "family.spouse_study_applicant.passport",
  "family.spouse_study_applicant.national_id",
  "family.spouse_study_applicant.us_pr_card",
  "family.spouse_study_applicant.current_residence",
  "family.spouse_study_applicant.has_previous_residence",
  "family.spouse_study_applicant.previous_residences",
  "family.spouse_study_applicant.applying_country_same_as_current",
  "family.spouse_study_applicant.applying_country",
  "family.spouse_study_applicant.address_same_as_main",
  "family.spouse_study_applicant.mailing_address",
];

// Sub-fields rendered by DependentSpouseHistoryStep ("Spouse — Background").
// Schedule 1 (visit_background) is visitor-only and appended separately.
const SPOUSE_BACKGROUND_FIELDS = [
  "family.spouse_study_applicant.language",
  "family.spouse_study_applicant.language_most_at_ease",
  "family.spouse_study_applicant.service_in",
  "family.spouse_study_applicant.has_education_history",
  "family.spouse_study_applicant.education_history",
  "family.spouse_study_applicant.occupation_history",
  "family.spouse_study_applicant.tuberculosis",
  "family.spouse_study_applicant.medical_condition",
  "family.spouse_study_applicant.medical_condition_details",
  "family.spouse_study_applicant.previously_remained_status",
  "family.spouse_study_applicant.previously_applied_canada",
  "family.spouse_study_applicant.previously_refused_visa",
  "family.spouse_study_applicant.previously_refused_visa_details",
  "family.spouse_study_applicant.criminal_record",
  "family.spouse_study_applicant.criminal_record_details",
  "family.spouse_study_applicant.military_service",
  "family.spouse_study_applicant.military_service_details",
  "family.spouse_study_applicant.political_party",
  "family.spouse_study_applicant.war_crimes",
  "family.spouse_study_applicant.consent_to_contact",
  "family.spouse_study_applicant.previously_married",
  "family.spouse_study_applicant.prev_spouse_family_name",
  "family.spouse_study_applicant.prev_spouse_given_name",
  "family.spouse_study_applicant.prev_spouse_date_of_birth",
  "family.spouse_study_applicant.prev_relationship_type",
  "family.spouse_study_applicant.prev_relationship_from",
  "family.spouse_study_applicant.prev_relationship_to",
  "family.spouse_study_applicant.father",
  "family.spouse_study_applicant.mother",
];

// Turn a field-path segment into a human label: "place_birth_city" -> "Place Birth City",
// "study_applicant" -> "Study Applicant", array index "0" -> "#1".
function humanizeSeg(seg: string): string {
  if (/^\d+$/.test(seg)) return `#${Number(seg) + 1}`;
  return seg
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

// Walk react-hook-form's nested error object and collect every leaf message
// with its full field path, so the client sees exactly which fields to fix.
function flattenErrors(node: any, path: string[] = []): { path: string[]; message: string }[] {
  const out: { path: string[]; message: string }[] = [];
  if (!node || typeof node !== "object") return out;
  if (typeof node.message === "string" && node.message.length > 0) {
    out.push({ path, message: node.message });
  }
  for (const key of Object.keys(node)) {
    if (key === "message" || key === "type" || key === "ref" || key === "types") continue;
    const child = node[key];
    if (child && typeof child === "object") {
      out.push(...flattenErrors(child, [...path, key]));
    }
  }
  return out;
}

const SECTION_LABELS: Record<string, string> = {
  personal_info: "Personal Info", passport: "Passport", contact: "Contact",
  national_id: "National ID", us_pr_card: "U.S. PR Card",
  study: "Study Details", family: "Family Background",
  education_history: "Education History", occupation_history: "Employment History",
  common_law: "Common-law Declaration",
  custodian: "Custodian Declaration", representative: "Representative",
  release_authority: "Authority to Release Info", applicant_signature: "Declaration & Signature",
  applicant_signature_date: "Declaration & Signature",
};

// Build a readable label for a field path, e.g. ["family","children","0","study_applicant","passport","passport_number"]
// -> "Family Background › Children › #1 › Study Applicant › Passport › Passport Number".
function labelForPath(path: (string | number)[]): string {
  if (path.length === 0) return "Form";
  const strPath = path.map(String);
  const [head, ...rest] = strPath;
  const headLabel = SECTION_LABELS[head] ?? humanizeSeg(head);
  return [headLabel, ...rest.map(humanizeSeg)].join(" › ");
}

// FastAPI/Pydantic error responses come in several shapes: a plain string,
// a single {msg} object, or (most commonly, on 422) a list of per-field
// validation errors with a `loc` path — e.g. {"loc": ["body","family","children",0,"sex"], "msg": "Field required"}.
// Format all of these into the same readable "Section › Field: message" style
// used for client-side errors, instead of letting them stringify to "[object Object]".
function formatApiErrorDetail(detail: unknown, status: number): string {
  if (typeof detail === "string" && detail.length > 0) return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const lines = detail.map((d: any) => {
      if (d && typeof d === "object") {
        const loc = Array.isArray(d.loc) ? d.loc.filter((p: any) => p !== "body") : [];
        const msg = typeof d.msg === "string" ? d.msg : JSON.stringify(d);
        return loc.length > 0 ? `• ${labelForPath(loc)}: ${msg}` : `• ${msg}`;
      }
      return `• ${String(d)}`;
    });
    return `The server rejected this submission:\n${lines.join("\n")}`;
  }
  if (detail && typeof detail === "object") {
    const msg = (detail as any).msg ?? (detail as any).message;
    if (typeof msg === "string" && msg.length > 0) return msg;
  }
  return `Submission failed (HTTP ${status}). Please try again or contact support.`;
}

export function StudyPermitWizard({ token, claims }: Props) {
  const optionalForms = claims.optional_forms ?? [];

  const [currentStep, setCurrentStep] = useState(1);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // True once the user has clicked "Next" on the current step at least once —
  // gates the inline error banner so it doesn't show before any attempt.
  const [attemptedNext, setAttemptedNext] = useState(false);

  const DRAFT_KEY = `study_permit_draft_${token.slice(-12)}`;

  const {
    control, register, handleSubmit, trigger, watch, setValue, getValues,
    formState: { errors, isSubmitting },
  } = useForm<StudyPermitData>({
    resolver: zodResolver(StudyPermitSchema),
    defaultValues: (() => {
      try {
        const saved = localStorage.getItem(DRAFT_KEY);
        if (saved) return JSON.parse(saved);
      } catch {}
      return {
        case_id: claims.case_id,
        optional_forms: optionalForms,
        personal_info: { language: "English", sex: undefined as any, marital_status: "", service_in: "English" },
        family: {
          applicant_marital_status: undefined as any,
          applicant_occupation: "",
          father: { status: "Living" },
          mother: { status: "Living" },
          children: [],
          section_c_signature: "",
          section_c_date: "",
        },
        education_history: [],
        occupation_history: [],
        medical_condition_details: "",
        previously_refused_visa_details: "",
        criminal_record_details: "",
        military_service_details: "",
        consent_to_contact: true as any,
        national_id: { has_document: false as any, doc_number: "", country_of_issue: "", issue_date: "", expiry_date: "" },
        us_pr_card: { has_card: false as any, doc_number: "", uscis_number: "", expiry_date: "" },
        contact: {
          mailing_address: { unit: "", street_number: "", street_name: "", city: "", country: "", province_state: "", postal_code: "", district: "" },
          residential_address_same_as_mailing: true as any,
          residential_address: null,
          phone: "",
          primary_phone_type: "",
          primary_phone_country_code: "",
          primary_phone_ext: "",
          has_alt_phone: false as any,
          alt_phone: null,
          has_fax: false as any,
          fax: null,
          email: "",
        },
        has_education_history: false as any,
      };
    })(),
    mode: "onTouched",
  });

  // Auto-save draft to localStorage
  useEffect(() => {
    const subscription = watch((values) => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(values)); } catch {}
    });
    return () => subscription.unsubscribe();
  }, [watch, DRAFT_KEY]);

  // Single source of truth for every optional-form-driven step: its label,
  // the RHF field paths "Next" should validate, and the rendered component.
  // Steps fill slots 6, 7, 8, ... in this fixed priority order, but ONLY for
  // forms that are actually active in optionalForms — labels/totalSteps,
  // STEP_FIELDS and stepComponents used to be computed independently from
  // three different hardcoded sources (an OPT_STEPS label map, a literal
  // step-number → fields map, and a separate if-chain), which could drift out
  // of sync whenever a sparse subset of optional forms was active: e.g. a
  // representative (imm5476) but no common-law declaration (imm5409) would
  // render RepresentativeStep at step 6 while STEP_FIELDS[6] still checked
  // for imm5409, silently skipping "Next" validation on that step. Deriving
  // labels, fields, and the rendered component from one ordered array makes
  // that drift structurally impossible — there's only one place position is
  // ever assigned.
  const optStepConfigs: { key: string; label: string; fields: string[]; render: () => React.ReactNode }[] = [
    {
      key: "imm5409",
      label: "Common-law Declaration",
      fields: ["common_law"],
      render: () => <CommonLawStep register={register} errors={errors} getValues={getValues} setValue={setValue} />,
    },
    {
      key: "imm5646",
      label: "Custodian Declaration",
      fields: ["custodian"],
      render: () => <CustodianStep register={register} errors={errors} control={control} getValues={getValues} setValue={setValue} />,
    },
    {
      key: "imm5476",
      label: "Representative",
      fields: ["representative"],
      render: () => <RepresentativeStep register={register} errors={errors} getValues={getValues} setValue={setValue} control={control} />,
    },
    {
      key: "imm5475",
      label: "Authority to Release Info",
      fields: ["release_authority"],
      render: () => <ReleaseAuthorityStep register={register} errors={errors} getValues={getValues} setValue={setValue} />,
    },
    {
      key: "child_study_permit",
      label: "Dependent Children",
      fields: ["family.children"],
      render: () => <DependentChildrenStep control={control} register={register} errors={errors} />,
    },
    // Mutually exclusive (intake derives exactly one, never both) — whichever
    // is active fills this slot with its own label.
    //
    // NOTE: this step and "Spouse — Background" below both edit the same
    // "family.spouse_study_applicant" Zod object, but they render different
    // sub-fields (this one: identity/passport/residence/address/work-or-visit;
    // Background: language/education/employment/previous-marriage/parents/
    // Schedule 1). `fields` must list only the sub-paths each step actually
    // renders — validating the whole shared object here would surface
    // Background-step required errors (e.g. father/mother) while the user is
    // still on this step, before those fields even exist on the page.
    {
      key: "spouse_work_permit",
      label: "Spouse — Work Permit",
      fields: SPOUSE_IDENTITY_FIELDS.concat(["family.spouse_study_applicant.work"]),
      render: () => <DependentSpouseStep control={control} register={register} errors={errors} setValue={setValue} optionalForms={optionalForms} />,
    },
    {
      key: "spouse_visitor",
      label: "Spouse — Visitor Visa",
      fields: SPOUSE_IDENTITY_FIELDS.concat(["family.spouse_study_applicant.visit"]),
      render: () => <DependentSpouseStep control={control} register={register} errors={errors} setValue={setValue} optionalForms={optionalForms} />,
    },
    // Full parity (Phase G) — the spouse's own language/education/employment/
    // background data, same key as above so it's included alongside whichever
    // spouse path is active; same "family.spouse_study_applicant" object as
    // the step above, but a disjoint set of sub-fields (see note above).
    {
      key: "spouse_work_permit",
      label: "Spouse — Background",
      fields: SPOUSE_BACKGROUND_FIELDS,
      render: () => <DependentSpouseHistoryStep control={control} register={register} errors={errors} optionalForms={optionalForms} />,
    },
    {
      key: "spouse_visitor",
      label: "Spouse — Background",
      fields: SPOUSE_BACKGROUND_FIELDS.concat(["family.spouse_study_applicant.visit_background"]),
      render: () => <DependentSpouseHistoryStep control={control} register={register} errors={errors} optionalForms={optionalForms} />,
    },
  ];
  const activeOptSteps = optStepConfigs.filter((c) => optionalForms.includes(c.key));

  const totalSteps = STEP_LABELS_BASE.length + activeOptSteps.length + 1; // +1 for review
  const stepLabels = [
    ...STEP_LABELS_BASE,
    ...activeOptSteps.map((c) => c.label),
    STEP_LABEL_REVIEW,
  ];

  // Step-level field groups to validate on "Next"
  const STEP_FIELDS: Record<number, string[]> = {
    1: ["personal_info", "passport", "national_id", "us_pr_card", "contact"],
    2: ["study", "tuberculosis", "medical_condition", "previously_remained_status", "previously_applied_canada", "previously_refused_visa", "criminal_record", "military_service", "political_party", "war_crimes", "consent_to_contact"],
    3: ["family.applicant_marital_status", "family.father", "family.mother", "family.section_c_signature", "family.section_c_date"],
    4: ["family.children", "family.no_children_signature"],
    5: [],  // education/occupation optional
  };
  activeOptSteps.forEach((c, i) => {
    STEP_FIELDS[6 + i] = c.fields;
  });

  const handleNext = useCallback(async () => {
    const fields = STEP_FIELDS[currentStep] ?? [];
    const valid = fields.length === 0 ? true : await trigger(fields as any);
    if (valid) {
      setAttemptedNext(false);
      setCurrentStep((s) => Math.min(s + 1, totalSteps));
    } else {
      // trigger() resolves after react-hook-form's internal formState updates,
      // but this render's `errors` closure may still be stale — re-rendering
      // via attemptedNext lets the banner below read fresh `errors` instead.
      setAttemptedNext(true);
    }
  }, [currentStep, totalSteps, trigger, STEP_FIELDS]);

  const handleBack = () => {
    setAttemptedNext(false);
    setCurrentStep((s) => Math.max(s - 1, 1));
  };

  // Build a readable "fix these fields" message for just the current step's
  // fields, reusing the same flattenErrors/labelForPath machinery as the
  // final submit's onInvalid — so an intermediate "Next" failure is no longer
  // silent (previously this swallowed every validation error with no
  // indication, e.g. the spouse work-permit step getting stuck with no
  // visible reason).
  function currentStepErrorMessage(): string | null {
    const fields = STEP_FIELDS[currentStep] ?? [];
    const items = fields.flatMap((f) => {
      const node = f.split(".").reduce((acc: any, seg) => (acc == null ? acc : acc[seg]), errors as any);
      return flattenErrors(node, f.split("."));
    });
    if (items.length === 0) return null;
    const lines = items.map((it) => `• ${labelForPath(it.path)}: ${it.message}`);
    return `Please fix the following before continuing:\n${lines.join("\n")}`;
  }

  // Surface validation failures instead of silently doing nothing — react-hook-form
  // won't call onSubmit if any field (even on a non-visible step) fails Zod, which
  // otherwise looks like a dead "Submit" button.
  const onInvalid = (errs: Record<string, unknown>) => {
    const items = flattenErrors(errs);
    if (items.length === 0) {
      setSubmitError("Some fields are missing or invalid. Please review the form and try again.");
      return;
    }
    const lines = items.map((it) => `• ${labelForPath(it.path)}: ${it.message}`);
    const header =
      `Please fix the following ${items.length} ${items.length === 1 ? "field" : "fields"} ` +
      `before submitting (go back to the relevant step to correct each one):`;
    setSubmitError(`${header}\n${lines.join("\n")}`);
  };

  const onSubmit = async (data: StudyPermitData) => {
    setSubmitError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/forms/study_permit/fill`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: null }));
        throw new Error(formatApiErrorDetail(err.detail, res.status));
      }
      const result = await res.json();
      setSubmitResult(result);
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
    } catch (e: any) {
      setSubmitError(e.message ?? "Submission failed. Please try again.");
    }
  };

  // Map step number to component
  const stepComponents: Record<number, React.ReactNode> = {
    1: <PersonalInfoStep register={register} errors={errors} watch={watch} />,
    2: <StudyDetailsStep register={register} errors={errors} watch={watch} />,
    3: <FamilyBackgroundStep register={register} errors={errors} watch={watch} setValue={setValue} />,
    4: <ChildrenSiblingsStep control={control} register={register} errors={errors} getValues={getValues} setValue={setValue} />,
    5: <EmploymentHistoryStep control={control} register={register} errors={errors} watch={watch} setValue={setValue} />,
  };

  // Dynamically add optional steps — same activeOptSteps order as labels/STEP_FIELDS above.
  activeOptSteps.forEach((c, i) => {
    stepComponents[6 + i] = c.render();
  });
  stepComponents[totalSteps] = (
    <ReviewSignStep
      register={register}
      errors={errors}
      getValues={getValues}
      watch={watch}
      setValue={setValue}
      isSubmitting={isSubmitting}
      submitError={submitError}
      submitResult={submitResult}
    />
  );

  const isLastStep = currentStep === totalSteps;

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate>
      {!submitResult && (
        <WizardProgress
          currentStep={currentStep}
          totalSteps={totalSteps}
          stepLabels={stepLabels}
        />
      )}

      <div className="min-h-[400px]">
        {currentStep === 1 && !submitResult && (
          <FormsGuidance activeOptionalForms={optionalForms} />
        )}
        {attemptedNext && !submitResult && currentStepErrorMessage() && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 whitespace-pre-line">
            {currentStepErrorMessage()}
          </div>
        )}
        {stepComponents[currentStep] ?? (
          <p className="text-gray-500 text-sm">Step not found.</p>
        )}
      </div>

      {!submitResult && (
        <div className="flex justify-between mt-8 pt-4 border-t">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="px-4 py-2 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            ← Back
          </button>

          {!isLastStep ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              Next →
            </button>
          ) : (
            <span /> // submit button is inside ReviewSignStep
          )}
        </div>
      )}
    </form>
  );
}
