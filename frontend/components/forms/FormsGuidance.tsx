"use client";

interface Props {
  activeOptionalForms: string[];
}

const GUIDANCE = [
  {
    code: "IMM 1294",
    title: "Application for Study Permit Made Outside of Canada",
    required: true,
    note: "Required for every study permit application made from outside Canada.",
  },
  {
    code: "IMM 5707",
    title: "Family Information",
    required: true,
    note: "Required for applicants 18 years of age or older, and for minors travelling to Canada alone.",
  },
  {
    code: "IMM 5409",
    title: "Statutory Declaration of Common-law Union",
    required: false,
    key: "imm5409",
    note:
      "Complete only if you are declaring a common-law partner. Refer to the responsible visa office for your region.",
  },
  {
    code: "IMM 5476",
    title: "Use of a Representative",
    required: false,
    key: "imm5476",
    note:
      "Complete only if you are using the services of an authorized representative, or if you are appointing or cancelling a representative.",
  },
  {
    code: "IMM 5475",
    title: "Authority to Release Personal Information to a Designated Individual",
    required: false,
    key: "imm5475",
    note:
      "Complete only if you authorize IRCC / CBSA to release information from your case file to someone other than yourself.",
    notImplemented: true,
  },
  {
    code: "IMM 5646",
    title: "Custodianship Declaration — Custodian for Minors Studying in Canada",
    required: false,
    key: "imm5646",
    note: "Complete only if the minor studying in Canada is less than 17 years old.",
  },
];

export function FormsGuidance({ activeOptionalForms }: Props) {
  return (
    <div className="mb-4 rounded border border-blue-200 bg-blue-50 p-4">
      <h3 className="text-sm font-semibold text-blue-900">
        Forms in this application package
      </h3>
      <p className="mt-1 text-xs text-blue-900">
        The wizard collects data for every form your lawyer has bundled with your case.
        Optional forms only appear in your wizard if they were enabled for you when the
        link was issued. The list below tells you when each form normally applies.
      </p>
      <ul className="mt-3 space-y-2 text-xs text-blue-900">
        {GUIDANCE.map((g) => {
          const enabled = g.required || (g.key && activeOptionalForms.includes(g.key));
          return (
            <li key={g.code} className="flex gap-2">
              <span
                className={
                  "shrink-0 rounded px-1.5 py-0.5 font-mono " +
                  (g.required
                    ? "bg-blue-600 text-white"
                    : enabled
                    ? "bg-blue-200 text-blue-900"
                    : "bg-gray-200 text-gray-700")
                }
              >
                {g.code}
              </span>
              <span>
                <strong>{g.title}</strong>
                {g.required && " — required."}
                {!g.required && enabled && " — included in your wizard."}
                {!g.required && !enabled && " — not included in your wizard."}
                {g.notImplemented && " (filling not yet automated; ask your lawyer.)"}
                <span className="block text-blue-800">{g.note}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
