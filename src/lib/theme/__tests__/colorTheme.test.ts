import { describe, expect, it } from "vitest";
import { COLOR_THEME_STORAGE_KEY } from "@/lib/theme/colorTheme";
import { CLIENT_PREF_KEYS } from "@/lib/clientPreferences";

describe("colorTheme", () => {
  it("usa a mesma chave de preferência do cliente", () => {
    expect(COLOR_THEME_STORAGE_KEY).toBe(CLIENT_PREF_KEYS.COLOR_THEME);
  });
});
