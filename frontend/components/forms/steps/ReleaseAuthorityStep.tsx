"use client";
import { useEffect } from "react";
import { FieldErrors, UseFormRegister, UseFormGetValues, UseFormSetValue } from "react-hook-form";
import type { StudyPermitData } from "@/lib/schemas/study_permit";
import { CountrySelect } from "@/components/forms/fields/CountrySelect";

interface Props {
  register: UseFormRegister<StudyPermitData>;
  errors: FieldErrors<StudyPermitData>;
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

export function ReleaseAuthorityStep({ register, errors, getValues, setValue }: Props) {
  const ra = errors.release_authority as any;

  // Auto-fill the applicant signature and signing location from data already entered.
  useEffect(() => {
    const pi = getValues("personal_info");
    const fullName = [pi?.family_name, pi?.given_name].filter(Boolean).join(" ");
    if (fullName) setValue("release_authority.applicant_signature", fullName);

    const mailing = getValues("contact.mailing_address");
    if (!getValues("release_authority.signed_city") && mailing?.city)
      setValue("release_authority.signed_city", mailing.city);
    if (!getValues("release_authority.signed_country") && mailing?.country)
      setValue("release_authority.signed_country", mailing.country);
  }, [getValues, setValue]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">
        Authority to Release Personal Information (IMM 5475)
      </h2>
      <div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <strong>When to complete:</strong> Only fill in this section if you
        authorize Immigration, Refugees and Citizenship Canada (IRCC) and the
        Canada Border Services Agency (CBSA) to release information from your
        case file to someone other than yourself.
      </div>

      <h3 className="text-base font-medium text-gray-700 border-b pb-1">
        Designated individual
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field
          label="Family Name"
          required
          error={ra?.designated_family_name?.message}
        >
          <input
            {...register("release_authority.designated_family_name")}
            className={inp}
          />
        </Field>
        <Field
          label="Given Name(s)"
          required
          error={ra?.designated_given_names?.message}
        >
          <input
            {...register("release_authority.designated_given_names")}
            className={inp}
          />
        </Field>
        <Field
          label="Relationship to applicant"
          error={ra?.designated_relationship?.message}
        >
          <input
            {...register("release_authority.designated_relationship")}
            placeholder="e.g. Spouse, Lawyer, Parent"
            className={inp}
          />
        </Field>
      </div>

      <h3 className="text-base font-medium text-gray-700 border-b pb-1 pt-2">
        Designated individual address
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Field label="Apt / Unit" error={ra?.designated_unit?.message}>
          <input
            {...register("release_authority.designated_unit")}
            className={inp}
          />
        </Field>
        <Field
          label="Street Number"
          error={ra?.designated_street_number?.message}
        >
          <input
            {...register("release_authority.designated_street_number")}
            className={inp}
          />
        </Field>
        <Field
          label="Street Name"
          error={ra?.designated_street_name?.message}
        >
          <input
            {...register("release_authority.designated_street_name")}
            className={inp}
          />
        </Field>
        <Field label="City" error={ra?.designated_city?.message}>
          <input
            {...register("release_authority.designated_city")}
            className={inp}
          />
        </Field>
        <Field
          label="Country / Territory"
          error={ra?.designated_country?.message}
        >
          <CountrySelect
            {...register("release_authority.designated_country")}
            className={inp}
          />
        </Field>
        <Field
          label="Province / State"
          error={ra?.designated_province_state?.message}
        >
          <input
            {...register("release_authority.designated_province_state")}
            className={inp}
          />
        </Field>
        <Field
          label="Postal / Zip code"
          error={ra?.designated_postal_code?.message}
        >
          <input
            {...register("release_authority.designated_postal_code")}
            className={inp}
          />
        </Field>
      </div>

      <h3 className="text-base font-medium text-gray-700 border-b pb-1 pt-2">
        Designated individual contact
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Field
          label="Phone country code"
          error={ra?.designated_phone_country_code?.message}
        >
          <input
            {...register("release_authority.designated_phone_country_code")}
            placeholder="1"
            className={inp}
          />
        </Field>
        <Field label="Phone number" error={ra?.designated_phone?.message}>
          <input
            {...register("release_authority.designated_phone")}
            className={inp}
          />
        </Field>
        <Field label="Email" error={ra?.designated_email?.message}>
          <input
            {...register("release_authority.designated_email")}
            type="email"
            className={inp}
          />
        </Field>
      </div>

      <Field
        label="Cancel previous designation?"
        error={ra?.cancel_previous?.message}
      >
        <select
          {...register("release_authority.cancel_previous")}
          className={inp}
        >
          <option value="">-- Select --</option>
          <option value="true">Yes — withdraw previous authorization</option>
          <option value="false">No — this is a new designation</option>
        </select>
      </Field>

      <h3 className="text-base font-medium text-gray-700 border-b pb-1 pt-2">
        Applicant declaration
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field
          label="Applicant signature (typed name)"
          required
          error={ra?.applicant_signature?.message}
        >
          <input
            {...register("release_authority.applicant_signature")}
            className={inp}
          />
        </Field>
        <Field
          label="Date signed (YYYY-MM-DD)"
          required
          error={ra?.signed_date?.message}
        >
          <input
            {...register("release_authority.signed_date")}
            placeholder="YYYY-MM-DD"
            className={inp}
          />
        </Field>
        <Field label="City signed" error={ra?.signed_city?.message}>
          <input
            {...register("release_authority.signed_city")}
            className={inp}
          />
        </Field>
        <Field label="Country signed" error={ra?.signed_country?.message}>
          <CountrySelect
            {...register("release_authority.signed_country")}
            className={inp}
          />
        </Field>
      </div>
    </div>
  );
}
