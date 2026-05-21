import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";

countries.registerLocale(enLocale);

export type Country = { code: string; name: string };

const raw = countries.getNames("en", { select: "official" });

export const COUNTRIES: Country[] = Object.entries(raw)
  .map(([code, name]) => ({
    code,
    name: Array.isArray(name) ? name[0] : (name as string),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

export function nameFromCode(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.name ?? "";
}

export function codeFromName(name: string): string {
  return COUNTRIES.find((c) => c.name === name)?.code ?? "";
}
