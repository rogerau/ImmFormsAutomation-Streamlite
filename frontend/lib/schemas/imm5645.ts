import { z } from "zod";

export const MaritalStatus = z.enum([
  "Annulled marriage",
  "Common-law",
  "Divorced",
  "Legally separated",
  "Married-physically present",
  "Married-not physically present",
  "Single",
  "Widowed",
]);
export type MaritalStatus = z.infer<typeof MaritalStatus>;

export const ApplicationType = z.enum(["Visitor", "Worker", "Student", "Other"]);
export type ApplicationType = z.infer<typeof ApplicationType>;

export const ParentStatus = z.enum(["Living", "Deceased"]);

const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .or(z.literal(""));

const personBase = z.object({
  family_name: z.string().min(1, "Required"),
  given_names: z.string().min(1, "Required"),
  date_of_birth: dateStr,
  country_of_birth: z.string().min(1, "Required"),
  address: z.string().min(1, "Required"),
  occupation: z.string().min(1, "Required"),
  marital_status: MaritalStatus.optional().nullable(),
  will_accompany: z.boolean().optional().nullable(),
});

const applicantSchema = personBase.extend({
  marital_status: MaritalStatus,
});

const spouseSchema = personBase.extend({
  marital_status: MaritalStatus,
  will_accompany: z.boolean(),
});

const parentSchema = personBase.extend({
  status: ParentStatus,
  marital_status: MaritalStatus.optional().nullable(),
  will_accompany: z.boolean().optional().nullable(),
});

const childSchema = personBase.extend({
  relationship: z.string().min(1, "Required (e.g. son, daughter, step, adopted)"),
  marital_status: MaritalStatus,
  will_accompany: z.boolean(),
});

const siblingSchema = personBase.extend({
  marital_status: MaritalStatus,
  will_accompany: z.boolean(),
});

export const Imm5645Schema = z
  .object({
    case_id: z.string().min(1),
    application_type: ApplicationType,

    applicant: applicantSchema,
    spouse: spouseSchema.optional().nullable(),
    no_spouse_signature: z.string().default(""),
    no_spouse_date: dateStr.default(""),

    mother: parentSchema,
    father: parentSchema,

    children: z.array(childSchema).max(4),
    no_children_signature: z.string().default(""),
    no_children_date: dateStr.default(""),

    siblings: z.array(siblingSchema).max(7),

    applicant_signature: z.string().min(1, "Type your full legal name"),
    applicant_signature_date: dateStr.refine((v) => v.length > 0, "Required"),
  })
  .superRefine((d, ctx) => {
    const partnered = ["Common-law", "Married-physically present", "Married-not physically present"].includes(
      d.applicant.marital_status,
    );
    if (partnered && !d.spouse) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Spouse / partner information is required.",
        path: ["spouse"],
      });
    }
    if (!partnered) {
      if (!d.no_spouse_signature) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Type your name to confirm you have no spouse / partner.",
          path: ["no_spouse_signature"],
        });
      }
      if (!d.no_spouse_date) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Date is required.",
          path: ["no_spouse_date"],
        });
      }
    }
    if (d.children.length === 0) {
      if (!d.no_children_signature) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Type your name to confirm you have no children.",
          path: ["no_children_signature"],
        });
      }
      if (!d.no_children_date) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Date is required.",
          path: ["no_children_date"],
        });
      }
    }
    for (const key of ["mother", "father"] as const) {
      const p = d[key];
      if (p.status === "Deceased" && !p.address) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "For a deceased parent, enter city, country, and date of death.",
          path: [key, "address"],
        });
      }
    }
  });

export type Imm5645Data = z.infer<typeof Imm5645Schema>;
