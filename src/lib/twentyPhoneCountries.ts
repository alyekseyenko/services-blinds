export type TwentyPhoneCountry = {
  countryCode: string;
  callingCode: string;
  label: string;
  flag: string;
};

/** Países usados no Twenty CRM (indicativo + código ISO). */
export const TWENTY_PHONE_COUNTRIES: TwentyPhoneCountry[] = [
  { countryCode: "PT", callingCode: "+351", label: "Portugal", flag: "🇵🇹" },
  { countryCode: "ES", callingCode: "+34", label: "Espanha", flag: "🇪🇸" },
  { countryCode: "FR", callingCode: "+33", label: "França", flag: "🇫🇷" },
  { countryCode: "GB", callingCode: "+44", label: "Reino Unido", flag: "🇬🇧" },
  { countryCode: "DE", callingCode: "+49", label: "Alemanha", flag: "🇩🇪" },
  { countryCode: "BR", callingCode: "+55", label: "Brasil", flag: "🇧🇷" },
];

export function getTwentyPhoneCountry(countryCode: string): TwentyPhoneCountry {
  return (
    TWENTY_PHONE_COUNTRIES.find((c) => c.countryCode === countryCode) ??
    TWENTY_PHONE_COUNTRIES[0]
  );
}

export function formatTwentyPhoneNationalDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}
