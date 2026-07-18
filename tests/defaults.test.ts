/**
 * Tests for default prompts and templates.
 */

import { describe, it, expect } from "vitest";
import { DEFAULT_PROFILE, DEFAULT_PROMPTS } from "../src/config/defaults.js";
import { DEFAULT_TEMPLATES } from "../src/config/templates.js";

describe("DEFAULT_PROFILE", () => {
  it("should have required structure", () => {
    expect(DEFAULT_PROFILE).toHaveProperty("name");
    expect(DEFAULT_PROFILE).toHaveProperty("contact");
    expect(DEFAULT_PROFILE).toHaveProperty("social");
    expect(DEFAULT_PROFILE).toHaveProperty("skills");
    expect(DEFAULT_PROFILE).toHaveProperty("experience");
    expect(DEFAULT_PROFILE).toHaveProperty("education");
    expect(DEFAULT_PROFILE).toHaveProperty("projects");
    expect(DEFAULT_PROFILE).toHaveProperty("certifications");
    expect(DEFAULT_PROFILE).toHaveProperty("languages");
  });

  it("should have empty name by default", () => {
    expect(DEFAULT_PROFILE.name).toBe("");
  });

  it("should have empty contact email by default", () => {
    expect(DEFAULT_PROFILE.contact.email).toBe("");
  });
});

describe("DEFAULT_PROMPTS", () => {
  it("should contain all required prompts", () => {
    const promptNames = Object.keys(DEFAULT_PROMPTS);
    expect(promptNames).toContain("system.md");
    expect(promptNames).toContain("resume.md");
    expect(promptNames).toContain("cover-letter.md");
    expect(promptNames).toContain("keyword-extraction.md");
    expect(promptNames).toContain("ats.md");
  });

  it("should have non-empty content for all prompts", () => {
    for (const [, content] of Object.entries(DEFAULT_PROMPTS)) {
      expect(content.length).toBeGreaterThan(0);
    }
  });

  it("system.md should contain AI behavior rules", () => {
    const system = DEFAULT_PROMPTS["system.md"];
    expect(system).toContain("NEVER fabricate");
    expect(system).toContain("valid JSON");
  });

  it("resume.md should reference JSON output schema", () => {
    const resume = DEFAULT_PROMPTS["resume.md"];
    expect(resume).toContain("Output Schema");
    expect(resume).toContain("JSON");
  });

  it("cover-letter.md should reference JSON output", () => {
    const cl = DEFAULT_PROMPTS["cover-letter.md"];
    expect(cl).toContain("Output Schema");
  });

  it("keyword-extraction.md should define extraction categories", () => {
    const ke = DEFAULT_PROMPTS["keyword-extraction.md"];
    expect(ke).toContain("requiredSkills");
    expect(ke).toContain("preferredSkills");
    expect(ke).toContain("softSkills");
  });

  it("ats.md should define analysis criteria", () => {
    const ats = DEFAULT_PROMPTS["ats.md"];
    expect(ats).toContain("Keyword Coverage");
    expect(ats).toContain("overallScore");
  });
});

describe("DEFAULT_TEMPLATES", () => {
  it("should contain all required templates", () => {
    const templateNames = Object.keys(DEFAULT_TEMPLATES);
    expect(templateNames).toContain("ats.md");
    expect(templateNames).toContain("classic.md");
    expect(templateNames).toContain("modern.md");
    expect(templateNames).toContain("minimal.md");
  });

  it("should have non-empty content for all templates", () => {
    for (const [, content] of Object.entries(DEFAULT_TEMPLATES)) {
      expect(content.length).toBeGreaterThan(0);
    }
  });

  it("ats.md should contain expected placeholders", () => {
    const template = DEFAULT_TEMPLATES["ats.md"];
    expect(template).toContain("{{name}}");
    expect(template).toContain("{{summary}}");
    expect(template).toContain("{{#each experience}}");
  });

  it("classic.md should contain expected sections", () => {
    const template = DEFAULT_TEMPLATES["classic.md"];
    expect(template).toContain("Professional Summary");
    expect(template).toContain("Work Experience");
  });

  it("modern.md should contain expected sections", () => {
    const template = DEFAULT_TEMPLATES["modern.md"];
    expect(template).toContain("About");
    expect(template).toContain("Stack:");
  });

  it("minimal.md should be concise", () => {
    const template = DEFAULT_TEMPLATES["minimal.md"];
    expect(template).toContain("{{name}}");
    expect(template).not.toContain("Certifications");
  });
});
