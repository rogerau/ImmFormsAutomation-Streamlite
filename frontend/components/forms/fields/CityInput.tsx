"use client";
import { forwardRef, useEffect, useId, useRef, useState } from "react";
import { codeFromName } from "@/lib/data/countries";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "list"> & {
  countryName?: string;
};

const GEONAMES_USER =
  process.env.NEXT_PUBLIC_GEONAMES_USERNAME || "rogerdt69";

export const CityInput = forwardRef<HTMLInputElement, Props>(
  function CityInput({ countryName, onChange, onFocus, ...rest }, ref) {
    const listId = useId();
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [query, setQuery] = useState("");
    const [error, setError] = useState<string>("");
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    async function fetchSuggestions(prefix: string) {
      const code = countryName ? codeFromName(countryName) : "";
      try {
        const params = new URLSearchParams({
          featureClass: "P",
          maxRows: "10",
          username: GEONAMES_USER,
        });
        // GeoNames requires at least one search param; when the user hasn't
        // typed yet we ask for the largest cities in the selected country.
        if (prefix) {
          params.set("name_startsWith", prefix);
        } else if (code) {
          params.set("orderby", "population");
        } else {
          setSuggestions([]);
          return;
        }
        if (code) params.set("country", code);
        const res = await fetch(
          `https://secure.geonames.org/searchJSON?${params.toString()}`,
          { cache: "no-store" },
        );
        if (!res.ok) {
          setError("Suggestions unavailable — free-text entry still works.");
          return;
        }
        const json = await res.json();
        if (json?.status?.message) {
          setError(`GeoNames: ${json.status.message}`);
          return;
        }
        setError("");
        const names: string[] = Array.isArray(json?.geonames)
          ? json.geonames.map((g: { name: string }) => g.name).filter(Boolean)
          : [];
        setSuggestions(Array.from(new Set(names)).slice(0, 10));
      } catch {
        /* free-text remains available */
      }
    }

    useEffect(() => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const q = (query || "").trim();
      debounceRef.current = setTimeout(() => {
        fetchSuggestions(q);
      }, 250);
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
          onFocus={(e) => {
            // Pre-load top cities for the country so the dropdown isn't empty.
            if (suggestions.length === 0) fetchSuggestions(e.currentTarget.value);
            onFocus?.(e);
          }}
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
        {error && (
          <p className="mt-1 text-xs text-amber-600">{error}</p>
        )}
      </>
    );
  },
);
