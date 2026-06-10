"use client";
import { useState, useEffect } from "react";
import { FieldErrors, UseFormRegister, UseFormGetValues, UseFormSetValue, useWatch, Control } from "react-hook-form";
import type { StudyPermitData } from "@/lib/schemas/study_permit";
import { CountrySelect } from "@/components/forms/fields/CountrySelect";

interface Props {
  register: UseFormRegister<StudyPermitData>;
  errors: FieldErrors<StudyPermitData>;
  control?: Control<StudyPermitData>;
  getValues: UseFormGetValues<StudyPermitData>;
  setValue: UseFormSetValue<StudyPermitData>;
}

const inp = "block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500";

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
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

export function CustodianStep({ register, errors, control, getValues, setValue }: Props) {
  const c = errors.custodian as any;
  // UI-only gate; not persisted. When toggled on, parent2_* inputs reveal.
  const [hasParent2, setHasParent2] = useState(false);
  const childResidence = useWatch({ control, name: "custodian.child_residence" }) ?? "with_custodian";

  // The student is the applicant. Copy identity, and pre-fill parent/school defaults
  // (editable — a legal guardian may differ from the biological parents in Step 3).
  useEffect(() => {
    const pi = getValues("personal_info");
    const study = getValues("study");
    const father = getValues("family.father");
    const mother = getValues("family.mother");

    if (pi?.family_name) setValue("custodian.student_family_name", pi.family_name);
    if (pi?.given_name) setValue("custodian.student_given_names", pi.given_name);
    if (pi?.date_of_birth) setValue("custodian.student_dob", pi.date_of_birth);
    if (pi?.sex) setValue("custodian.student_sex", pi.sex);
    if (pi?.citizenship) setValue("custodian.student_citizenship", pi.citizenship);
    const studentName = [pi?.family_name, pi?.given_name].filter(Boolean).join(" ");
    if (studentName) setValue("custodian.student_name_for_decl", studentName);

    if (!getValues("custodian.school_address") && study?.school_name) {
      setValue(
        "custodian.school_address",
        [study.school_name, study.city, study.province_state].filter(Boolean).join(", "),
      );
    }
    if (father) {
      if (!getValues("custodian.parent1_family_name") && father.family_name) setValue("custodian.parent1_family_name", father.family_name);
      if (!getValues("custodian.parent1_given_names") && father.given_names) setValue("custodian.parent1_given_names", father.given_names);
      if (!getValues("custodian.parent1_dob") && father.date_of_birth) setValue("custodian.parent1_dob", father.date_of_birth);
      if (!getValues("custodian.parent1_address") && father.address) setValue("custodian.parent1_address", father.address);
    }
    if (mother) {
      if (!getValues("custodian.parent2_family_name") && mother.family_name) setValue("custodian.parent2_family_name", mother.family_name);
      if (!getValues("custodian.parent2_given_names") && mother.given_names) setValue("custodian.parent2_given_names", mother.given_names);
      if (!getValues("custodian.parent2_dob") && mother.date_of_birth) setValue("custodian.parent2_dob", mother.date_of_birth);
      if (!getValues("custodian.parent2_address") && mother.address) setValue("custodian.parent2_address", mother.address);
      // Reveal the second guardian block so the pre-filled data is visible, not hidden.
      if (mother.family_name || mother.given_names) setHasParent2(true);
    }
  }, [getValues, setValue]);

  // Declaration signatures mirror the names entered/derived on this step (reactive).
  const parent1Family = useWatch({ control, name: "custodian.parent1_family_name" });
  const parent1Given = useWatch({ control, name: "custodian.parent1_given_names" });
  const parent2Family = useWatch({ control, name: "custodian.parent2_family_name" });
  const parent2Given = useWatch({ control, name: "custodian.parent2_given_names" });
  const custFamily = useWatch({ control, name: "custodian.custodian_family_name" });
  const custGiven = useWatch({ control, name: "custodian.custodian_given_names" });
  useEffect(() => {
    const n = [parent1Family, parent1Given].filter(Boolean).join(" ");
    if (n) setValue("custodian.parent_signature", n);
  }, [parent1Family, parent1Given, setValue]);
  useEffect(() => {
    const n = [parent2Family, parent2Given].filter(Boolean).join(" ");
    if (n) setValue("custodian.parent2_signature", n);
  }, [parent2Family, parent2Given, setValue]);
  useEffect(() => {
    const n = [custFamily, custGiven].filter(Boolean).join(" ");
    if (n) setValue("custodian.custodian_name_for_decl", n);
  }, [custFamily, custGiven, setValue]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Custodian Declaration (IMM 5646)</h2>
      <div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <strong>When to complete:</strong> Only fill in this section if the minor studying
        in Canada is less than 17 years old. The custodian must be a Canadian citizen or
        permanent resident at least 19 years of age.
      </div>

      <h3 className="text-base font-medium text-gray-700 border-b pb-1">Student Information</h3>
      <p className="text-xs text-gray-500">The student is you — name, date of birth, sex and citizenship are carried over from your personal details. The school address is pre-filled from your study details; adjust if needed.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="School Address in Canada" required error={c?.school_address?.message}>
          <input {...register("custodian.school_address")} className={inp} />
        </Field>
        <Field label="Student's Address in Canada" required error={c?.student_address?.message}>
          <input {...register("custodian.student_address")} className={inp} />
        </Field>
      </div>

      <h3 className="text-base font-medium text-gray-700 border-b pb-1">Parent / Guardian 1</h3>
      <p className="text-xs text-gray-500">Pre-filled from your father&apos;s details in Step 3. Edit if the legal guardian is a different person.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Family Name" required error={c?.parent1_family_name?.message}>
          <input {...register("custodian.parent1_family_name")} className={inp} />
        </Field>
        <Field label="Given Name(s)" required error={c?.parent1_given_names?.message}>
          <input {...register("custodian.parent1_given_names")} className={inp} />
        </Field>
        <Field label="Date of Birth (YYYY-MM-DD)" required error={c?.parent1_dob?.message}>
          <input {...register("custodian.parent1_dob")} placeholder="YYYY-MM-DD" className={inp} />
        </Field>
        <Field label="Address" required error={c?.parent1_address?.message}>
          <input {...register("custodian.parent1_address")} className={inp} />
        </Field>
        <Field label="Phone" required error={c?.parent1_phone?.message}>
          <input {...register("custodian.parent1_phone")} className={inp} />
        </Field>
      </div>

      <div className="pt-2">
        <label className="inline-flex items-center text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            className="mr-2"
            checked={hasParent2}
            onChange={(e) => setHasParent2(e.target.checked)}
          />
          Add a second parent / guardian (optional)
        </label>
        <p className="text-xs text-gray-500 ml-6 mt-1">
          IMM 5646 lets you list two parents / guardians and capture both signatures on
          page 2. Leave unchecked if there is only one parent / guardian.
        </p>
      </div>
      {hasParent2 && (
        <>
          <h3 className="text-base font-medium text-gray-700 border-b pb-1">Parent / Guardian 2</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Family Name" error={c?.parent2_family_name?.message}>
              <input {...register("custodian.parent2_family_name")} className={inp} />
            </Field>
            <Field label="Given Name(s)" error={c?.parent2_given_names?.message}>
              <input {...register("custodian.parent2_given_names")} className={inp} />
            </Field>
            <Field label="Date of Birth (YYYY-MM-DD)" error={c?.parent2_dob?.message}>
              <input {...register("custodian.parent2_dob")} placeholder="YYYY-MM-DD" className={inp} />
            </Field>
            <Field label="Address" error={c?.parent2_address?.message}>
              <input {...register("custodian.parent2_address")} className={inp} />
            </Field>
            <Field label="Phone" error={c?.parent2_phone?.message}>
              <input {...register("custodian.parent2_phone")} className={inp} />
            </Field>
          </div>
        </>
      )}

      <h3 className="text-base font-medium text-gray-700 border-b pb-1">Custodian Information</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Custodian Family Name" required error={c?.custodian_family_name?.message}>
          <input {...register("custodian.custodian_family_name")} className={inp} />
        </Field>
        <Field label="Custodian Given Name(s)" required error={c?.custodian_given_names?.message}>
          <input {...register("custodian.custodian_given_names")} className={inp} />
        </Field>
        <Field label="Date of Birth" required error={c?.custodian_dob?.message}>
          <input {...register("custodian.custodian_dob")} placeholder="YYYY-MM-DD" className={inp} />
        </Field>
        <Field label="Status in Canada" required error={c?.custodian_status?.message}>
          <select {...register("custodian.custodian_status")} className={inp}>
            <option value="Canadian Citizen">Canadian Citizen</option>
            <option value="Permanent Resident">Permanent Resident</option>
          </select>
        </Field>
        <Field label="Address" required error={c?.custodian_address?.message}>
          <input {...register("custodian.custodian_address")} className={inp} />
        </Field>
        <Field label="Phone" required error={c?.custodian_phone?.message}>
          <input {...register("custodian.custodian_phone")} className={inp} />
        </Field>
      </div>

      <h3 className="text-base font-medium text-gray-700 border-b pb-1">My / Our child will reside</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Where will the child reside?" required>
          <select {...register("custodian.child_residence")} className={inp}>
            <option value="with_custodian">With the appointed custodian</option>
            <option value="school_dormitory">In the school dormitory</option>
            <option value="with_other">With another person</option>
          </select>
        </Field>
        {childResidence === "with_other" && (
          <Field label="Name and relationship of the other person" required error={c?.child_residence_other_name?.message}>
            <input {...register("custodian.child_residence_other_name")} className={inp} placeholder="e.g. Jane Doe — aunt" />
          </Field>
        )}
      </div>

      <h3 className="text-base font-medium text-gray-700 border-b pb-1">Declaration Details</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Custodian Name (as it appears in declaration)" required error={c?.custodian_name_for_decl?.message}>
          <input {...register("custodian.custodian_name_for_decl")} className={inp} />
        </Field>
        <Field label="Student Name (as it appears in declaration)" required error={c?.student_name_for_decl?.message}>
          <input {...register("custodian.student_name_for_decl")} className={inp} />
        </Field>
        <Field label="Sworn in City" required error={c?.sworn_city?.message}>
          <input {...register("custodian.sworn_city")} className={inp} />
        </Field>
        <Field label="Sworn in Province / State" error={c?.sworn_province?.message}>
          <input {...register("custodian.sworn_province")} className={inp} />
        </Field>
        <Field label="Sworn in Country" required error={c?.sworn_country?.message}>
          <CountrySelect {...register("custodian.sworn_country")} className={inp} />
        </Field>
        <Field label="Day" required error={c?.sworn_day?.message}>
          <input {...register("custodian.sworn_day")} placeholder="DD" className={inp} />
        </Field>
        <Field label="Month" required error={c?.sworn_month?.message}>
          <input {...register("custodian.sworn_month")} placeholder="MM" className={inp} />
        </Field>
        <Field label="Year" required error={c?.sworn_year?.message}>
          <input {...register("custodian.sworn_year")} placeholder="YYYY" className={inp} />
        </Field>
        <Field label="Parent / Guardian 1 Signature (type full name)" required error={c?.parent_signature?.message}>
          <input {...register("custodian.parent_signature")} className={inp} />
        </Field>
        {hasParent2 && (
          <Field label="Parent / Guardian 2 Signature (type full name)" error={c?.parent2_signature?.message}>
            <input {...register("custodian.parent2_signature")} className={inp} />
          </Field>
        )}
      </div>
    </div>
  );
}
