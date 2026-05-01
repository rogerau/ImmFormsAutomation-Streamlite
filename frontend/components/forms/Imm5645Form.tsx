"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Imm5645Schema, type Imm5645Data, MaritalStatus, ApplicationType } from "@/lib/schemas/imm5645";
import { backendUrl } from "@/lib/api";

const PARTNERED = ["Common-law", "Married-physically present", "Married-not physically present"];
const MARITAL_OPTIONS = MaritalStatus.options;
const APP_TYPE_OPTIONS = ApplicationType.options;

const blankPerson = {
  family_name: "",
  given_names: "",
  date_of_birth: "",
  country_of_birth: "",
  address: "",
  occupation: "",
};

const blankParent = { ...blankPerson, status: "Living" as const, marital_status: null, will_accompany: false };
const blankChild = { ...blankPerson, relationship: "", marital_status: "Single" as const, will_accompany: false };
const blankSibling = { ...blankPerson, marital_status: "Single" as const, will_accompany: false };

export function Imm5645Form({
  token,
  caseId,
  clientName,
}: {
  token: string;
  caseId: string;
  clientName: string;
}) {
  const [submitState, setSubmitState] = useState<
    { kind: "idle" } | { kind: "submitting" } | { kind: "ok"; pdfUrl?: string; submissionId: string } | { kind: "error"; message: string }
  >({ kind: "idle" });

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<Imm5645Data>({
    resolver: zodResolver(Imm5645Schema),
    defaultValues: {
      case_id: caseId,
      application_type: "Worker",
      applicant: { ...blankPerson, marital_status: "Single" } as any,
      spouse: null,
      no_spouse_signature: "",
      no_spouse_date: "",
      mother: { ...blankParent } as any,
      father: { ...blankParent } as any,
      children: [],
      no_children_signature: "",
      no_children_date: "",
      siblings: [],
      applicant_signature: "",
      applicant_signature_date: "",
    },
  });

  const childArray = useFieldArray({ control, name: "children" });
  const siblingArray = useFieldArray({ control, name: "siblings" });

  const applicantStatus = watch("applicant.marital_status");
  const showSpouse = PARTNERED.includes(applicantStatus);
  const motherStatus = watch("mother.status");
  const fatherStatus = watch("father.status");

  function ensureSpouse() {
    if (showSpouse) {
      const cur = (watch("spouse") as any) || null;
      if (!cur) {
        setValue("spouse", { ...blankPerson, marital_status: "Married-physically present", will_accompany: false } as any);
      }
    } else {
      setValue("spouse", null);
    }
  }

  async function onSubmit(data: Imm5645Data) {
    setSubmitState({ kind: "submitting" });
    try {
      const res = await fetch(`${backendUrl()}/forms/imm5645/fill`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t);
      }
      const json = await res.json();
      setSubmitState({ kind: "ok", pdfUrl: json.pdf_url, submissionId: json.submission_id });
    } catch (e: any) {
      setSubmitState({ kind: "error", message: e.message || "Submission failed" });
    }
  }

  if (submitState.kind === "ok") {
    return (
      <div className="rounded border border-green-300 bg-green-50 p-6">
        <h2 className="text-lg font-semibold text-green-900">Form submitted</h2>
        <p className="mt-2 text-sm">
          Your information has been recorded under submission ID{" "}
          <code className="rounded bg-white px-1">{submissionState(submitState).submissionId}</code>.
        </p>
        {submitState.pdfUrl && (
          <p className="mt-3 text-sm">
            <a className="text-blue-600 underline" href={submitState.pdfUrl} target="_blank" rel="noreferrer">
              View your filled IMM 5645 PDF →
            </a>
          </p>
        )}
        <p className="mt-3 text-xs text-gray-600">
          Your consultant will review and contact you with next steps.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      onChange={ensureSpouse}
      className="space-y-10"
    >
      <Section title="Application Type">
        <select
          {...register("application_type")}
          className="rounded border px-3 py-2"
        >
          {APP_TYPE_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </Section>

      <PersonFieldset
        title="Section A — About You (Applicant)"
        prefix="applicant"
        register={register}
        errors={errors}
        showMarital
        required
      />

      {showSpouse && (
        <PersonFieldset
          title="Spouse / Common-Law Partner"
          prefix="spouse"
          register={register}
          errors={errors}
          showMarital
          showAccompany
          required
        />
      )}

      {!showSpouse && (
        <Section title="No-Spouse Declaration">
          <p className="text-sm text-gray-600">
            Type your full legal name and today&apos;s date to confirm you have no
            spouse or common-law partner.
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Field label="Full name (signature)" required>
              <input className="input" {...register("no_spouse_signature")} />
              <Err msg={(errors as any).no_spouse_signature?.message} />
            </Field>
            <Field label="Date" required>
              <input type="date" className="input" {...register("no_spouse_date")} />
              <Err msg={(errors as any).no_spouse_date?.message} />
            </Field>
          </div>
        </Section>
      )}

      <ParentFieldset
        title="Mother"
        prefix="mother"
        register={register}
        errors={errors}
        status={motherStatus}
      />
      <ParentFieldset
        title="Father"
        prefix="father"
        register={register}
        errors={errors}
        status={fatherStatus}
      />

      <Section title="Section B — Children">
        <p className="text-sm text-gray-600">Add up to 4. Leave empty if you have no children.</p>
        <div className="mt-3 space-y-6">
          {childArray.fields.map((f, idx) => (
            <div key={f.id} className="rounded border p-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Child #{idx + 1}</h4>
                <button type="button" className="text-sm text-red-600" onClick={() => childArray.remove(idx)}>
                  Remove
                </button>
              </div>
              <PersonFields prefix={`children.${idx}`} register={register} errors={errors} />
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <Field label="Relationship" required>
                  <input className="input" placeholder="son / daughter / step / adopted" {...register(`children.${idx}.relationship` as const)} />
                  <Err msg={(errors as any).children?.[idx]?.relationship?.message} />
                </Field>
                <Field label="Marital status" required>
                  <MaritalSelect register={register} name={`children.${idx}.marital_status` as const} />
                </Field>
                <Field label="Accompanies to Canada" required>
                  <BoolSelect register={register} name={`children.${idx}.will_accompany` as const} />
                </Field>
              </div>
            </div>
          ))}
          {childArray.fields.length < 4 && (
            <button type="button" className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white" onClick={() => childArray.append(blankChild as any)}>
              + Add child
            </button>
          )}
        </div>

        {childArray.fields.length === 0 && (
          <div className="mt-4 rounded bg-gray-50 p-4">
            <p className="text-sm">
              Type your name and date to confirm you have no children.
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Field label="Full name (signature)" required>
                <input className="input" {...register("no_children_signature")} />
                <Err msg={(errors as any).no_children_signature?.message} />
              </Field>
              <Field label="Date" required>
                <input type="date" className="input" {...register("no_children_date")} />
                <Err msg={(errors as any).no_children_date?.message} />
              </Field>
            </div>
          </div>
        )}
      </Section>

      <Section title="Section C — Siblings">
        <p className="text-sm text-gray-600">Add up to 7. Leave empty if you have no siblings.</p>
        <div className="mt-3 space-y-6">
          {siblingArray.fields.map((f, idx) => (
            <div key={f.id} className="rounded border p-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Sibling #{idx + 1}</h4>
                <button type="button" className="text-sm text-red-600" onClick={() => siblingArray.remove(idx)}>
                  Remove
                </button>
              </div>
              <PersonFields prefix={`siblings.${idx}`} register={register} errors={errors} />
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Field label="Marital status" required>
                  <MaritalSelect register={register} name={`siblings.${idx}.marital_status` as const} />
                </Field>
                <Field label="Accompanies to Canada" required>
                  <BoolSelect register={register} name={`siblings.${idx}.will_accompany` as const} />
                </Field>
              </div>
            </div>
          ))}
          {siblingArray.fields.length < 7 && (
            <button type="button" className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white" onClick={() => siblingArray.append(blankSibling as any)}>
              + Add sibling
            </button>
          )}
        </div>
      </Section>

      <Section title="Declaration">
        <p className="text-sm text-gray-600">
          By typing your full legal name below, you certify that the information
          provided is accurate. Your consultant will review the completed PDF
          before any submission to IRCC.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Field label="Full legal name (signature)" required>
            <input className="input" {...register("applicant_signature")} />
            <Err msg={(errors as any).applicant_signature?.message} />
          </Field>
          <Field label="Date" required>
            <input type="date" className="input" {...register("applicant_signature_date")} />
            <Err msg={(errors as any).applicant_signature_date?.message} />
          </Field>
        </div>
      </Section>

      <div className="border-t pt-6">
        <button
          type="submit"
          className="rounded bg-blue-600 px-5 py-2.5 font-medium text-white disabled:opacity-50"
          disabled={isSubmitting || submitState.kind === "submitting"}
        >
          {submitState.kind === "submitting" ? "Submitting…" : "Submit form"}
        </button>
        {submitState.kind === "error" && (
          <p className="mt-3 text-sm text-red-600">{submitState.message}</p>
        )}
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          padding: 0.5rem 0.75rem;
          background: white;
        }
        .input:focus {
          outline: 2px solid #2563eb;
          outline-offset: -1px;
        }
      `}</style>
    </form>
  );
}

function submissionState(s: any) {
  return s as { submissionId: string; pdfUrl?: string };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold border-b pb-1 mb-3">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  required,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block text-sm">
      <span className={required ? "field-required font-medium" : "font-medium"}>{label}</span>
      {hint && <span className="ml-1 text-xs text-gray-500">{hint}</span>}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Err({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-red-600">{msg}</p>;
}

function MaritalSelect({ register, name }: { register: any; name: string }) {
  return (
    <select className="input" {...register(name)}>
      {MARITAL_OPTIONS.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function BoolSelect({ register, name }: { register: any; name: string }) {
  return (
    <select
      className="input"
      {...register(name, {
        setValueAs: (v: string) => v === "true",
      })}
    >
      <option value="true">Yes</option>
      <option value="false">No</option>
    </select>
  );
}

function PersonFields({
  prefix,
  register,
  errors,
}: {
  prefix: string;
  register: any;
  errors: any;
}) {
  const e = (path: string) => {
    return path.split(".").reduce((acc: any, k: string) => acc?.[k], errors);
  };
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Field label="Family name" required>
        <input className="input" {...register(`${prefix}.family_name`)} />
        <Err msg={e(`${prefix}.family_name`)?.message} />
      </Field>
      <Field label="Given names" required>
        <input className="input" {...register(`${prefix}.given_names`)} />
        <Err msg={e(`${prefix}.given_names`)?.message} />
      </Field>
      <Field label="Date of birth" required hint="YYYY-MM-DD">
        <input type="date" className="input" {...register(`${prefix}.date_of_birth`)} />
        <Err msg={e(`${prefix}.date_of_birth`)?.message} />
      </Field>
      <Field label="Country of birth" required>
        <input className="input" {...register(`${prefix}.country_of_birth`)} />
        <Err msg={e(`${prefix}.country_of_birth`)?.message} />
      </Field>
      <Field label="Present address" required>
        <input className="input" {...register(`${prefix}.address`)} />
        <Err msg={e(`${prefix}.address`)?.message} />
      </Field>
      <Field label="Occupation" required>
        <input className="input" {...register(`${prefix}.occupation`)} />
        <Err msg={e(`${prefix}.occupation`)?.message} />
      </Field>
    </div>
  );
}

function PersonFieldset({
  title,
  prefix,
  register,
  errors,
  showMarital,
  showAccompany,
  required,
}: {
  title: string;
  prefix: string;
  register: any;
  errors: any;
  showMarital?: boolean;
  showAccompany?: boolean;
  required?: boolean;
}) {
  return (
    <Section title={title}>
      <PersonFields prefix={prefix} register={register} errors={errors} />
      {(showMarital || showAccompany) && (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {showMarital && (
            <Field label="Marital status" required={required}>
              <MaritalSelect register={register} name={`${prefix}.marital_status`} />
            </Field>
          )}
          {showAccompany && (
            <Field label="Accompanies to Canada" required={required}>
              <BoolSelect register={register} name={`${prefix}.will_accompany`} />
            </Field>
          )}
        </div>
      )}
    </Section>
  );
}

function ParentFieldset({
  title,
  prefix,
  register,
  errors,
  status,
}: {
  title: string;
  prefix: "mother" | "father";
  register: any;
  errors: any;
  status: string;
}) {
  return (
    <Section title={title}>
      <div className="mb-3">
        <Field label="Status" required>
          <select className="input" {...register(`${prefix}.status`)}>
            <option value="Living">Living</option>
            <option value="Deceased">Deceased</option>
          </select>
        </Field>
      </div>
      <PersonFields prefix={prefix} register={register} errors={errors} />
      {status === "Deceased" && (
        <p className="mt-2 text-xs text-gray-500">
          For a deceased parent, the address field should contain the city,
          country, and date of death (e.g. &quot;Mexico City, Mexico — 2010-04-15&quot;). Occupation will be recorded as &quot;Deceased&quot;.
        </p>
      )}
    </Section>
  );
}
