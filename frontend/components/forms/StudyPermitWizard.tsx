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
import { ReviewSignStep } from "./steps/ReviewSignStep";
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

// Steps requiring optional forms
const OPT_STEPS: Record<string, string> = {
  imm5409: "Common-law Declaration",
  imm5646: "Custodian Declaration",
  imm5476: "Representative",
};

export function StudyPermitWizard({ token, claims }: Props) {
  const optionalForms = claims.optional_forms ?? [];
  const activeOptSteps = Object.entries(OPT_STEPS).filter(([key]) => optionalForms.includes(key));
  const totalSteps = STEP_LABELS_BASE.length + activeOptSteps.length + 1; // +1 for review
  const stepLabels = [
    ...STEP_LABELS_BASE,
    ...activeOptSteps.map(([, label]) => label),
    STEP_LABEL_REVIEW,
  ];

  const [currentStep, setCurrentStep] = useState(1);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
        us_pr_card: { has_card: false as any, doc_number: "", expiry_date: "" },
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

  // Step-level field groups to validate on "Next"
  const STEP_FIELDS: Record<number, string[]> = {
    1: ["personal_info", "passport", "national_id", "us_pr_card", "contact"],
    2: ["study", "tuberculosis", "medical_condition", "previously_remained_status", "previously_applied_canada", "previously_refused_visa", "criminal_record", "military_service", "political_party", "war_crimes", "consent_to_contact"],
    3: ["family.applicant_marital_status", "family.applicant_occupation", "family.father", "family.mother", "family.section_c_signature", "family.section_c_date"],
    4: ["family.children", "family.no_children_signature"],
    5: [],  // education/occupation optional
    6: optionalForms.includes("imm5409") ? ["common_law"] : [],
    7: optionalForms.includes("imm5646") ? ["custodian"] : [],
    8: optionalForms.includes("imm5476") ? ["representative"] : [],
  };

  const handleNext = useCallback(async () => {
    const fields = STEP_FIELDS[currentStep] ?? [];
    const valid = fields.length === 0 ? true : await trigger(fields as any);
    if (valid) setCurrentStep((s) => Math.min(s + 1, totalSteps));
  }, [currentStep, totalSteps, trigger, STEP_FIELDS]);

  const handleBack = () => setCurrentStep((s) => Math.max(s - 1, 1));

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
        const err = await res.json().catch(() => ({ detail: "Unknown error" }));
        throw new Error(err.detail ?? `HTTP ${res.status}`);
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
    4: <ChildrenSiblingsStep control={control} register={register} errors={errors} />,
    5: <EmploymentHistoryStep control={control} register={register} errors={errors} />,
  };

  // Dynamically add optional steps
  let optIdx = 6;
  if (optionalForms.includes("imm5409")) {
    stepComponents[optIdx++] = <CommonLawStep register={register} errors={errors} />;
  }
  if (optionalForms.includes("imm5646")) {
    stepComponents[optIdx++] = <CustodianStep register={register} errors={errors} />;
  }
  if (optionalForms.includes("imm5476")) {
    stepComponents[optIdx++] = <RepresentativeStep register={register} errors={errors} getValues={getValues} setValue={setValue} />;
  }
  stepComponents[totalSteps] = (
    <ReviewSignStep
      register={register}
      errors={errors}
      getValues={getValues}
      isSubmitting={isSubmitting}
      submitError={submitError}
      submitResult={submitResult}
    />
  );

  const isLastStep = currentStep === totalSteps;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {!submitResult && (
        <WizardProgress
          currentStep={currentStep}
          totalSteps={totalSteps}
          stepLabels={stepLabels}
        />
      )}

      <div className="min-h-[400px]">
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
