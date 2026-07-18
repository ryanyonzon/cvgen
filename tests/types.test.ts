import { describe, it, expect } from "vitest";
import { DEFAULT_CONFIG, DEFAULT_ENVIRONMENT } from "../src/types/index.js";

describe("DEFAULT_CONFIG", () => {
  it("should have defaultProfile set to default", () => {
    expect(DEFAULT_CONFIG.defaultProfile).toBe("default");
  });

  it("should have defaultTemplate set to ats", () => {
    expect(DEFAULT_CONFIG.defaultTemplate).toBe("ats");
  });

  it("should have defaultOutput set to stdout", () => {
    expect(DEFAULT_CONFIG.defaultOutput).toBe("stdout");
  });

  it("should have temperature set to 0.2", () => {
    expect(DEFAULT_CONFIG.temperature).toBe(0.2);
  });

  it("should have maxTokens set to 8000", () => {
    expect(DEFAULT_CONFIG.maxTokens).toBe(8000);
  });

  it("should have history enabled", () => {
    expect(DEFAULT_CONFIG.history).toBe(true);
  });

  it("should have logging enabled", () => {
    expect(DEFAULT_CONFIG.logging).toBe(true);
  });

  it("should have promptVersion set to v1", () => {
    expect(DEFAULT_CONFIG.promptVersion).toBe("v1");
  });
});

describe("DEFAULT_ENVIRONMENT", () => {
  it("should have provider set to openrouter", () => {
    expect(DEFAULT_ENVIRONMENT.provider).toBe("openrouter");
  });

  it("should have a model configured", () => {
    expect(DEFAULT_ENVIRONMENT.model).toBeTruthy();
  });

  it("should have apiKey as empty string", () => {
    expect(DEFAULT_ENVIRONMENT.apiKey).toBe("");
  });

  it("should have baseUrl set to OpenRouter API", () => {
    expect(DEFAULT_ENVIRONMENT.baseUrl).toBe("https://openrouter.ai/api/v1");
  });
});
