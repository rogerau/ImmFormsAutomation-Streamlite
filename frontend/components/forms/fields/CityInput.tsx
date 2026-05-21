"use client";
import { forwardRef, useEffect, useId, useRef, useState } from "react";
import { codeFromName } from "@/lib/data/countries";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "list"> & {
  countryName?: string;
};

const GEONAMES_USER =
  process.env.NEXT_PUBLIC_GEONAMES_USERNAME || "rogerdt69";

export const CityInput = forwardRef<HTMLInputElement, Props>(
  function CityInput({ countryName, onChange, ...rest }, ref) {
    const listId = useId();
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [query, setQuery] = useState("");
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const q = (query || "").trim();
      if (q.length < 2) {
        setSuggestions([]);
        return;
      }
      const code = countryName ? codeFromName(countryName) : "";
      debounceRef.current = setTimeout(async () => {
        try {
          const params = new URLSearchParams({
            name_startsWith: q,
            featureClass: "P",
            maxRows: "10",
            username: GEONAMES_USER,
          });
          if (code) params.set("country", code);
          const res = await fetch(
            `https://secure.geonames.org/searchJSON?${params.toString()}`,
            { cache: "no-store" },
          );
          if (!res.ok) return;
          const json = await res.json();
          const names: string[] = Array.isArray(json?.geonames)
            ? json.geonames.map((g: { name: string }) => g.name).filter(Boolean)
            : [];
          // Dedupe while preserving order
          setSuggestions(Array.from(new Set(names)).slice(0, 10));
        } catch {
          /* free-text remains available */
        }
      }, 300);
      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
      };
    }, [query, countryName]);

    return (
      <>
        <input
          ref={ref}
          list={listId}
          autoComplete="off"
          onChange={(e) => {
            setQuery(e.currentTarget.value);
            onChange?.(e);
          }}
          {...rest}
        />
        <datalist id={listId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </>
    );
  },
);
