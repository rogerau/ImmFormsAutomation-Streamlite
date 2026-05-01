---
name: add-new-form
description: Recipe for extending the portal to support a new IRCC form (IMM 1294, IMM 5257, IMM 0008, etc.) — dump PDF fields, write schema + filler, add Zod schema and React form component.
---

# Add a new IRCC form

The portal is built so each form is a self-contained module. To add a new one, follow these six steps. Estimated effort: 2–4 hours per form depending on field count.

## 1. Get the empty PDF

Download the official PDF from canada.ca (search "IMM <number> form"). Save to:

```
backend/app/forms/<form>/template/<form>.pdf
```

## 2. Dump the field map

```bash
python tools/inspect_pdf_fields.py backend/app/forms/<form>/template/<form>.pdf > /tmp/<form>_fields.txt
```

This prints every AcroForm field path, type, current value, and the dropdown `/Opt` lists. Look for these PDF quirks (each form may differ):

- **Encryption.** If `# encrypted: True`, the filler must run `pikepdf` to strip it (see `forms/imm5645/filler.py::_decrypt_to_bytes`).
- **Radio "on" state.** Look at `/_States_` for buttons. IMM 5645 uses `/1`; other forms may use `/Yes`. Set `BTN_ON` accordingly.
- **Dropdowns.** The `/Opt` list maps export key → display label. The form must store the export key, not the label.

## 3. Write the Pydantic schema

Create `backend/app/forms/<form>/schema.py`. Use `forms/imm5645/schema.py` as a template. Key conventions:

- Use `Enum` for any dropdown so the dropdown export-value map can live alongside.
- All fields default to `""` rather than `None` for text — pypdf is happier with strings.
- A top-level `case_id` and optional `submission_id` are required for tenant routing.

## 4. Write the filler

Create `backend/app/forms/<form>/filler.py`. Pattern from `imm5645/filler.py`:

- One `build_field_dict(data) -> dict[str, str]` function. Each return key is a literal XFA path from step 2.
- One `fill_pdf(data) -> bytes` that strips encryption with pikepdf and runs `PdfWriter.update_page_form_field_values`.

Verify locally:

```python
from app.forms.<form>.filler import fill_pdf
open('/tmp/<form>_test.pdf', 'wb').write(fill_pdf(test_payload))
```

Open the PDF in a viewer and confirm every field rendered correctly.

## 5. Mirror in the frontend

- Add `frontend/lib/schemas/<form>.ts` mirroring the Pydantic schema with Zod. Use `superRefine` for cross-field rules (e.g. "if marital_status is partnered, spouse is required").
- Create `frontend/components/forms/<form>Form.tsx` modeled on `Imm5645Form.tsx`. Reuse `<Section>`, `<Field>`, `<MaritalSelect>`, `<BoolSelect>`, `<PersonFields>` if the same primitives apply.
- Update `frontend/app/apply/[token]/page.tsx` to dispatch on `claims.form_type`.

## 6. Wire the backend endpoint and Sheets row builders

- Add `POST /forms/<form>/fill` to `backend/app/main.py` mirroring the `imm5645_fill` handler. Use the same JWT verification and `tenant.filled_forms_folder_id`.
- Add `backend/app/integrations/sheets_<form>.py` with header lists and row builders. Decide whether the form needs the same parent/children/siblings PK/FK pattern, or just a flat `Submissions` table.
- Decide the per-tenant Sheet name (e.g. `IMM1294 Submissions`) and document it in `tenants.py`-shaped env config.

## 7. Test

Add a small integration test that builds the payload, fills the PDF in-memory, and asserts a few fields read back correctly via `pypdf`. See the smoke test pattern in this README's history.

## Things that go wrong (lessons from IMM 5645)

- **Field stored as `'/Off'` after fill.** Wrong button on-state — try `/1`, `/Yes`, or inspect `/_States_`.
- **Dropdown shows the label as plain text.** You wrote the label instead of the export key; check `/Opt`.
- **`PdfWriter(clone_from=...)` raises `block length` error.** PDF is encrypted; run `pikepdf` first.
- **Field values appear blank in some viewers but show in Acrobat.** pypdf doesn't always regenerate `/AS` widget appearances — usually fine for the fillable PDF that goes back to IRCC.
