import { describe, expect, it } from "vitest";
import { brokerProfilePatchSchema, normalizeBrokerOptionalUrl } from "./broker-profile-schema";

describe("normalizeBrokerOptionalUrl", () => {
  it("returns undefined for empty input", () => {
    expect(normalizeBrokerOptionalUrl("")).toBeUndefined();
    expect(normalizeBrokerOptionalUrl("  ")).toBeUndefined();
    expect(normalizeBrokerOptionalUrl(undefined)).toBeUndefined();
  });

  it("prefixes https when there is no scheme", () => {
    expect(normalizeBrokerOptionalUrl("www.example.com")).toBe("https://www.example.com");
    expect(normalizeBrokerOptionalUrl("example.com/path")).toBe("https://example.com/path");
  });

  it("leaves values that already include a scheme", () => {
    expect(normalizeBrokerOptionalUrl("http://a.b")).toBe("http://a.b");
    expect(normalizeBrokerOptionalUrl("https://a.b")).toBe("https://a.b");
  });

  it("normalizes protocol-relative URLs", () => {
    expect(normalizeBrokerOptionalUrl("//cdn.example/x")).toBe("https://cdn.example/x");
  });
});

describe("brokerProfilePatchSchema optional URLs", () => {
  const base = {
    companyName: "Co",
    jobTitle: "Role",
    isIndependent: false,
    pitch: "",
  };

  it("accepts website without scheme and stores https URL", () => {
    const r = brokerProfilePatchSchema.safeParse({
      ...base,
      websiteUrl: "www.foo.com",
      linkedinUrl: "",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.websiteUrl).toBe("https://www.foo.com");
      expect(r.data.linkedinUrl).toBeUndefined();
    }
  });

  it("rejects clearly invalid host", () => {
    const r = brokerProfilePatchSchema.safeParse({
      ...base,
      websiteUrl: "not a url",
      linkedinUrl: "",
    });
    expect(r.success).toBe(false);
  });
});
