import { describe, expect, it } from "vitest";
import {
  extractPhonesFromTwenty,
  formatPhoneEntry,
  getPrimaryPhone,
  toTelHref,
} from "../phones";

describe("phones helpers", () => {
  it("formats primary and additional phones without duplicates", () => {
    const phones = extractPhonesFromTwenty({
      primaryPhoneNumber: "910799500",
      primaryPhoneCallingCode: "+351",
      additionalPhones: [
        { number: "920988100", callingCode: "+351", countryCode: "PT" },
        { number: "910799500", callingCode: "+351", countryCode: "PT" },
      ],
    });

    expect(phones).toEqual(["+351 910799500", "+351 920988100"]);
    expect(getPrimaryPhone(phones)).toBe("+351 910799500");
  });

  it("returns empty list when phones are missing", () => {
    expect(extractPhonesFromTwenty(null)).toEqual([]);
    expect(extractPhonesFromTwenty(undefined)).toEqual([]);
  });

  it("builds tel links without spaces", () => {
    expect(formatPhoneEntry("912345678", "+351")).toBe("+351 912345678");
    expect(toTelHref("+351 912345678")).toBe("tel:+351912345678");
  });
});
