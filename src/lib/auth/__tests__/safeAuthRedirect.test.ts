import { afterEach, describe, expect, it } from "vitest";
import { resolveAuthRedirectUrl } from "../safeAuthRedirect";

describe("resolveAuthRedirectUrl", () => {
  const prevPublic = process.env.NEXT_PUBLIC_APP_URL;

  afterEach(() => {
    if (prevPublic === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = prevPublic;
    }
  });

  it("keeps relative paths", () => {
    expect(resolveAuthRedirectUrl("/dashboard", "http://localhost:3005")).toBe("/dashboard");
  });

  it("blocks absolute localhost when public app URL is set", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    expect(
      resolveAuthRedirectUrl("http://localhost:3005/", "http://localhost:3005")
    ).toBe("/");
  });

  it("allows same public origin", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
    expect(
      resolveAuthRedirectUrl(
        "https://app.example.com/admin",
        "http://localhost:3005"
      )
    ).toBe("https://app.example.com/admin");
  });
});
