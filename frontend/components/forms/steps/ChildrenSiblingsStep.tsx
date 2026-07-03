"use client";
import { useEffect } from "react";
import { Control, FieldErrors, UseFormRegister, UseFormGetValues, UseFormSetValue, useFieldArray } from "react-hook-form";
import type { StudyPermitData } from "@/lib/schemas/study_permit";
import { CountrySelect } from "@/components/forms/fields/CountrySelect";

const MARITAL_STATUSES = [
  "Annulled marriage", "Common-law", "Divorced", "Legally separated",
  "Married-physically present", "Married-not physically present", "Single", "Widowed",
];
const RELATIONSHIPS = [
  "Son", "Daughter", "Step-son", "Step-daughter", "Adopted son", "Adopted daughter", "Other",
];

interface Props {
  control: Control<StudyPermitData>;
  register: UseFormRegister<StudyPermitData>;
  errors: FieldErrors<StudyPermitData>;
  getValues: UseFormGetValues<StudyPermitData>;
  setValue: UseFormSetValue<StudyPermitData>;
}

const inp = "block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";

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

export function ChildrenSiblingsStep({ control, register, errors, getValues, setValue }: Props) {
  const { fields, append, remove } = useFieldArray({ control, name: "family.children" });
  const f = errors.family;
  const hasChildren = fields.length > 0;

  // Auto-fill the "no children" attestation from the name already entered in Step 1.
  useEffect(() => {
    const pi = getValues("personal_info");
    const fullName = [pi?.given_name, pi?.family_name].filter(Boolean).join(" ");
    if (fullName) setValue("family.no_children_signature", fullName);
  }, [getValues, setValue]);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-800">Children (IMM 5707)</h2>

      {fields.map((field, idx) => (
        <div key={field.id} className="border border-gray-200 rounded p-4 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-700">Child {idx + 1}</h3>
            <button type="button" onClick={() => remove(idx)} className="text-xs text-red-600 hover:underline">
              Remove
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Relationship" required error={f?.children?.[idx]?.relationship?.message}>
              <select {...register(`family.children.${idx}.relationship`)} className={inp}>
                <option value="">-- Select --</option>
                {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Family Name" required error={f?.children?.[idx]?.family_name?.message}>
              <input {...register(`family.children.${idx}.family_name`)} className={inp} />
            </Field>
            <Field label="Given Name(s)" required error={f?.children?.[idx]?.given_names?.message}>
              <input {...register(`family.children.${idx}.given_names`)} className={inp} />
            </Field>
            <Field label="Date of Birth" required error={f?.children?.[idx]?.date_of_birth?.message}>
              <input {...register(`family.children.${idx}.date_of_birth`)} placeholder="YYYY-MM-DD" className={inp} />
            </Field>
            <Field label="Country of Birth" required error={f?.children?.[idx]?.country_of_birth?.message}>
              <CountrySelect {...register(`family.children.${idx}.country_of_birth`)} className={inp} />
            </Field>
            <Field label="Occupation" required error={f?.children?.[idx]?.occupation?.message}>
              <input {...register(`family.children.${idx}.occupation`)} className={inp} />
            </Field>
            <Field label="Marital Status" required error={f?.children?.[idx]?.marital_status?.message}>
              <select {...register(`family.children.${idx}.marital_status`)} className={inp}>
                <option value="">-- Select --</option>
                {MARITAL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Will Accompany to Canada?" required error={f?.children?.[idx]?.will_accompany?.message}>
              <select {...register(`family.children.${idx}.will_accompany` as any)} className={inp}>
                <option value="">-- Select --</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </Field>
          </div>
        </div>
      ))}

      {fields.length < 4 && (
        <button
          type="button"
          onClick={() =>
            append({
              family_name: "", given_names: "", native_name: "", date_of_birth: "",
              country_of_birth: "", address: "", occupation: "",
              relationship: "", marital_status: "Single", will_accompany: false,
            })
          }
          className="text-sm text-blue-600 hover:underline border border-blue-300 rounded px-3 py-1"
        >
          + Add Child
        </button>
      )}

      {!hasChildren && (
        <div className="space-y-3 border-t pt-4">
          <p className="text-sm text-gray-600">If you have no children, sign below to confirm.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type your full name <span className="text-red-600">*</span>
              </label>
              <input {...register("family.no_children_signature")} className={inp} />
              {f?.no_children_signature?.message && (
                <p className="mt-1 text-xs text-red-600">{f.no_children_signature.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date <span className="text-red-600">*</span></label>
              <input {...register("family.no_children_date")} placeholder="YYYY-MM-DD" className={inp} />
              {f?.no_children_date?.message && (
                <p className="mt-1 text-xs text-red-600">{f.no_children_date.message}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
