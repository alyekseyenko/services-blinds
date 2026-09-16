/**
 * Branding & public URLs — safe defaults for the public repo.
 * Production overrides via .env.local on the server (never commit real values).
 */
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Blinds Technical Services";
export const APP_SHORT_NAME = process.env.NEXT_PUBLIC_APP_SHORT_NAME || "Blinds Pro";
export const COMPANY_WEBSITE =
  process.env.NEXT_PUBLIC_COMPANY_WEBSITE || "https://example.com";
export const COMPANY_LABEL =
  process.env.NEXT_PUBLIC_COMPANY_LABEL || "Blinds Technical Services";
export const LOGIN_EMAIL_PLACEHOLDER =
  process.env.NEXT_PUBLIC_LOGIN_EMAIL_PLACEHOLDER || "user@yourcompany.com";
export const HQ_LABEL = process.env.NEXT_PUBLIC_HQ_LABEL || "Headquarters";
export const MAP_HQ_TITLE = process.env.NEXT_PUBLIC_MAP_HQ_TITLE || "HQ";
