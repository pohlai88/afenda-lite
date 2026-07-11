/** ISO 3166-1 alpha-2 codes for nationality and residence fields. */
export const ISO_COUNTRY_CODES = [
  "SG",
  "MY",
  "US",
  "GB",
  "AU",
  "CA",
  "DE",
  "FR",
  "JP",
  "CN",
  "HK",
  "IN",
  "ID",
  "TH",
  "VN",
  "PH",
  "NZ",
  "AE",
  "CH",
  "NL",
  "IE",
  "ES",
  "IT",
  "KR",
  "TW",
  "BR",
  "MX",
  "ZA",
] as const;

export type IsoCountryCode = (typeof ISO_COUNTRY_CODES)[number];

export const ISO_COUNTRY_LABELS: Record<IsoCountryCode, string> = {
  SG: "Singapore",
  MY: "Malaysia",
  US: "United States",
  GB: "United Kingdom",
  AU: "Australia",
  CA: "Canada",
  DE: "Germany",
  FR: "France",
  JP: "Japan",
  CN: "China",
  HK: "Hong Kong",
  IN: "India",
  ID: "Indonesia",
  TH: "Thailand",
  VN: "Vietnam",
  PH: "Philippines",
  NZ: "New Zealand",
  AE: "United Arab Emirates",
  CH: "Switzerland",
  NL: "Netherlands",
  IE: "Ireland",
  ES: "Spain",
  IT: "Italy",
  KR: "South Korea",
  TW: "Taiwan",
  BR: "Brazil",
  MX: "Mexico",
  ZA: "South Africa",
};

export function isIsoCountryCode(value: string): value is IsoCountryCode {
  return (ISO_COUNTRY_CODES as readonly string[]).includes(value);
}

export function countryLabel(code: string): string {
  if (isIsoCountryCode(code)) {
    return ISO_COUNTRY_LABELS[code];
  }
  return code;
}
