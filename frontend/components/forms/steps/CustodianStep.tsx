"use client";
import { FieldErrors, UseFormRegister } from "react-hook-form";
import type { StudyPermitData } from "@/lib/schemas/study_permit";
import { CountrySelect } from "@/components/forms/fields/CountrySelect";

interface Props {
  register: UseFormRegister<StudyPermitData>;
  errors: FieldErrors<StudyPermitData>;
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

export function CustodianStep({ register, errors }: Props) {
  const c = errors.custodian as any;
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Custodian Declaration (IMM 5646)</h2>
      <p className="text-sm text-gray-500">Required when a minor will study in Canada without their parents.</p>

      <h3 className="text-base font-medium text-gray-700 border-b pb-1">Student Information</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Student Family Name" required error={c?.student_family_name?.message}>
          <input {...register("custodian.student_family_name")} className={inp} />
        </Field>
        <Field label="Student Given Name(s)" required error={c?.student_given_names?.message}>
          <input {...register("custodian.student_given_names")} className={inp} />
        </Field>
        <Field label="Student Date of Birth" required error={c?.student_dob?.message}>
          <input {...register("custodian.student_dob")} placeholder="YYYY-MM-DD" className={inp} />
        </Field>
        <Field label="Citizenship" required error={c?.student_citizenship?.message}>
          <input {...register("custodian.student_citizenship")} className={inp} />
        </Field>
        <Field label="Sex" required error={c?.student_sex?.message}>
          <select {...register("custodian.student_sex")} className={inp}>
            <option value="">-- Select --</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </Field>
        <Field label="School Address in Canada" required error={c?.school_address?.message}>
          <input {...register("custodian.school_address")} className={inp} />
        </Field>
        <Field label="Student's Address in Canada" required error={c?.student_address?.message}>
          <input {...register("custodian.student_address")} className={inp} />
        </Field>
      </div>

      <h3 className="text-base font-medium text-gray-700 border-b pb-1">Parent / Guardian 1</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[["parent1_family_name","Family Name"],["parent1_given_names","Given Name(s)"],["parent1_dob","Date of Birth (YYYY-MM-DD)"],["parent1_address","Address"],["parent1_phone","Phone"]].map(([k, lbl]) => (
          <Field key={k} label={lbl} required error={c?.[k]?.message}>
            <input {...register(`custodian.${k}` as any)} className={inp} />
          </Field>
        ))}
      </div>

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
        <Field label="Status in Canada" error={c?.custodian_status?.message}>
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
        <Field label="Sworn in Country" required error={c?.sworn_country?.message}>
          <CountrySelect {...register("custodian.sworn_country")} className={inp} />
        </Field>
        <Field label="Day" required error={c?.sworn_day?.message}><input {...register("custodian.sworn_day")} placeholder="DD" className={inp} /></Field>
        <Field label="Month" required error={c?.sworn_month?.message}><input {...register("custodian.sworn_month")} placeholder="MM" className={inp} /></Field>
        <Field label="Year" required error={c?.sworn_year?.message}><input {...register("custodian.sworn_year")} placeholder="YYYY" className={inp} /></Field>
        <Field label="Parent Signature (type full name)" required error={c?.parent_signature?.message}>
          <input {...register("custodian.parent_signature")} className={inp} />
        </Field>
      </div>
    </div>
  );
}
