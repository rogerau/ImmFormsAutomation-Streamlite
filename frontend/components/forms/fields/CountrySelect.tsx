import { forwardRef } from "react";
import { COUNTRIES } from "@/lib/data/countries";

type Props = React.SelectHTMLAttributes<HTMLSelectElement>;

export const CountrySelect = forwardRef<HTMLSelectElement, Props>(
  function CountrySelect(props, ref) {
    return (
      <select ref={ref} {...props}>
        <option value="">-- Select country --</option>
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.name}>
            {c.name}
          </option>
        ))}
      </select>
    );
  },
);
