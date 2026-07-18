/**
 * Tests for profile schema validation.
 */

import { describe, it, expect } from "vitest";
import {
  validateProfile,
  isProfile,
  ProfileSchema,
} from "../src/schemas/profile.js";
import type { Profile } from "../src/types/profile.js";

function createMinimalProfile(): Partial<Profile> {
  return {
    name: "John Doe",
    contact: {
      email: "john@example.com",
    },
  };
}

describe("ProfileSchema", () => {
  it("should validate a valid minimal profile", () => {
    const result = ProfileSchema.safeParse(createMinimalProfile());
    expect(result.success).toBe(true);
  });

  it("should reject a profile without name", () => {
    const result = ProfileSchema.safeParse({
      contact: { email: "john@example.com" },
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid email", () => {
    const result = ProfileSchema.safeParse({
      name: "John",
      contact: { email: "not-an-email" },
    });
    expect(result.success).toBe(false);
  });

  it("should apply defaults for optional fields", () => {
    const result = ProfileSchema.safeParse(createMinimalProfile());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.skills).toBeUndefined();
      expect(result.data.experience).toBeUndefined();
      expect(result.data.education).toBeUndefined();
      expect(result.data.projects).toBeUndefined();
      expect(result.data.certifications).toBeUndefined();
      expect(result.data.languages).toBeUndefined();
    }
  });

  it("should validate a full profile with experience", () => {
    const profile: Partial<Profile> = {
      name: "Jane Doe",
      headline: "Senior Engineer",
      summary: "Experienced software engineer",
      contact: { email: "jane@example.com" },
      skills: ["TypeScript", "Node.js"],
      experience: [
        {
          id: "exp-1",
          company: "Acme Corp",
          role: "Engineer",
          startDate: "2020-01",
          current: true,
          achievements: ["Built APIs"],
          skills: ["TypeScript"],
          technologies: ["Node.js"],
          projects: [],
        },
      ],
      education: [
        {
          school: "MIT",
          degree: "BS",
          field: "Computer Science",
          achievements: [],
          skills: [],
        },
      ],
    };

    const result = ProfileSchema.safeParse(profile);
    expect(result.success).toBe(true);
  });

  it("should reject experience without company", () => {
    const result = ProfileSchema.safeParse({
      name: "John",
      contact: { email: "john@example.com" },
      experience: [
        {
          id: "exp-1",
          role: "Engineer",
          startDate: "2020-01",
          current: false,
          achievements: [],
          skills: [],
          technologies: [],
          projects: [],
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe("validateProfile", () => {
  it("should return valid for a minimal profile", () => {
    const result = validateProfile(createMinimalProfile());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should return warnings for missing fields", () => {
    const result = validateProfile(createMinimalProfile());
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    const warningMessages = result.warnings.map((w) => w.path);
    expect(warningMessages).toContain("skills");
    expect(warningMessages).toContain("experience");
    expect(warningMessages).toContain("education");
  });

  it("should return errors for invalid profiles", () => {
    const result = validateProfile({
      contact: { email: "invalid" },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe("isProfile", () => {
  it("should return true for a valid profile", () => {
    expect(isProfile(createMinimalProfile())).toBe(true);
  });

  it("should return false for an invalid profile", () => {
    expect(isProfile({})).toBe(false);
  });

  it("should return false for null", () => {
    expect(isProfile(null)).toBe(false);
  });

  it("should return false for undefined", () => {
    expect(isProfile(undefined)).toBe(false);
  });
});
