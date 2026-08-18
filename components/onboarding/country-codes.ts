// Small curated list rather than a full ISO dataset — the picker only needs to
// cover where users actually are, and a 240-entry dropdown is worse UX.
export interface Country {
  code: string;
  dial: string;
  flag: string;
  name: string;
  placeholder: string;
}

export const COUNTRIES: Country[] = [
  { code: "US", dial: "+1", flag: "🇺🇸", name: "United States", placeholder: "(201) 555-0123" },
  { code: "CA", dial: "+1", flag: "🇨🇦", name: "Canada", placeholder: "(204) 555-0123" },
  { code: "IN", dial: "+91", flag: "🇮🇳", name: "India", placeholder: "98765 43210" },
  { code: "GB", dial: "+44", flag: "🇬🇧", name: "United Kingdom", placeholder: "7400 123456" },
  { code: "AU", dial: "+61", flag: "🇦🇺", name: "Australia", placeholder: "412 345 678" },
  { code: "DE", dial: "+49", flag: "🇩🇪", name: "Germany", placeholder: "1512 3456789" },
  { code: "FR", dial: "+33", flag: "🇫🇷", name: "France", placeholder: "6 12 34 56 78" },
  { code: "NL", dial: "+31", flag: "🇳🇱", name: "Netherlands", placeholder: "6 12345678" },
  { code: "SG", dial: "+65", flag: "🇸🇬", name: "Singapore", placeholder: "8123 4567" },
  { code: "AE", dial: "+971", flag: "🇦🇪", name: "United Arab Emirates", placeholder: "50 123 4567" },
  { code: "BR", dial: "+55", flag: "🇧🇷", name: "Brazil", placeholder: "11 96123 4567" },
  { code: "JP", dial: "+81", flag: "🇯🇵", name: "Japan", placeholder: "90 1234 5678" },
];

export function countryByCode(code: string): Country {
  return COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[0];
}
