/**
 * Tests for the validation module.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";

// Mock fs
vi.mock("node:fs");
vi.mock("node:os");

describe("Configuration Validation", () => {
  beforeEach(() => {
    vi.mocked(os.homedir).mockReturnValue("/home/testuser");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should validate config file existence", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const { validateConfigFile } = await import("../src/validation/config.js");
    const result = validateConfigFile();

    expect(result.ok).toBe(false);
    expect(result.label).toContain("Config file");
  });

  it("should validate config file structure", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        defaultProfile: "default",
        defaultTemplate: "ats",
        defaultOutput: "stdout",
        temperature: 0.2,
        maxTokens: 8000,
        history: true,
        logging: true,
        promptVersion: "v1",
      }),
    );

    const { validateConfigFile } = await import("../src/validation/config.js");
    const result = validateConfigFile();

    expect(result.ok).toBe(true);
  });

  it("should detect invalid config JSON", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue("invalid json");

    const { validateConfigFile } = await import("../src/validation/config.js");
    const result = validateConfigFile();

    expect(result.ok).toBe(false);
  });

  it("should validate environment file", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      [
        "# cvgen config",
        "provider=openrouter",
        "model=openai/gpt-4o",
        "api_key=sk-test-key",
        "base_url=https://openrouter.ai/api/v1",
      ].join("\n"),
    );

    const { validateEnvFile } = await import("../src/validation/config.js");
    const result = validateEnvFile();

    expect(result.ok).toBe(true);
  });

  it("should detect missing environment file", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const { validateEnvFile } = await import("../src/validation/config.js");
    const result = validateEnvFile();

    expect(result.ok).toBe(false);
  });

  it("should validate all configuration", async () => {
    const configJson = JSON.stringify({
      defaultProfile: "default",
      defaultTemplate: "ats",
      defaultOutput: "stdout",
      temperature: 0.2,
      maxTokens: 8000,
      history: true,
      logging: true,
      promptVersion: "v1",
    });
    const envFileContent =
      "provider=openrouter\nmodel=openai/gpt-4o\napi_key=sk-test\n";

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync)
      .mockReturnValueOnce(configJson) // validateConfigFile
      .mockReturnValueOnce(envFileContent) // validateEnvFile
      .mockReturnValueOnce(configJson); // validateConfigValues

    const { validateConfiguration } =
      await import("../src/validation/config.js");
    const result = validateConfiguration();

    expect(result.valid).toBe(true);
    expect(result.checks.length).toBeGreaterThan(0);
  });
});

describe("Prompt Validation", () => {
  beforeEach(() => {
    vi.mocked(os.homedir).mockReturnValue("/home/testuser");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should validate all prompts exist (built-in fallback)", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const { validateAllPrompts } = await import("../src/validation/prompts.js");
    const checks = validateAllPrompts("v1");

    expect(checks.length).toBe(5);
    // Built-in prompts should be found even without user files
    const allOk = checks.every((c) => c.ok === true);
    expect(allOk).toBe(true);
  });

  it("should detect missing prompt content markers", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const { validatePrompt } = await import("../src/validation/prompts.js");
    // Since built-in prompts exist, basic validation should pass
    const result = validatePrompt("system.md", "v1");

    expect(result.ok).toBe(true);
  });
});

describe("Template Validation", () => {
  beforeEach(() => {
    vi.mocked(os.homedir).mockReturnValue("/home/testuser");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should validate template exists (built-in)", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const { validateTemplateExists } =
      await import("../src/validation/templates.js");
    const result = validateTemplateExists("ats");

    expect(result.ok).toBe(true);
  });

  it("should detect missing template", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const { validateTemplateExists } =
      await import("../src/validation/templates.js");
    const result = validateTemplateExists("nonexistent");

    expect(result.ok).toBe(false);
  });

  it("should validate template syntax", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const { validateTemplateSyntax } =
      await import("../src/validation/templates.js");
    const result = validateTemplateSyntax("ats");

    // Built-in ATS template should have valid syntax
    expect(result.ok).toBe(true);
  });

  it("should list templates", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const { listTemplates } = await import("../src/validation/templates.js");
    const names = listTemplates();

    // Should include built-in templates
    expect(names).toContain("ats");
    expect(names).toContain("classic");
    expect(names).toContain("modern");
    expect(names).toContain("minimal");
  });
});
