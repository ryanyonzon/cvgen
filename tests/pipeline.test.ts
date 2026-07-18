/**
 * Tests for the AI generation pipeline - Phase 5.
 *
 * Covers:
 * - Pipeline type definitions
 * - JSON validation (resume, cover letter, resume plan)
 * - Markdown fallback parsing
 * - Pipeline orchestration (with mocked provider)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { AIProvider } from "../src/ai/types.js";
import type { Profile } from "../src/types/profile.js";
import type { ParsedJob } from "../src/parser/types.js";
import type { cvgenConfig, EnvironmentConfig } from "../src/types/index.js";
import type { Logger } from "../src/logging/index.js";
import type {
  GeneratedResume,
  GeneratedCoverLetter,
} from "../src/pipeline/types.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockProfile: Profile = {
  name: "Test User",
  headline: "Senior Software Engineer",
  summary: "Experienced developer",
  contact: { email: "test@example.com" },
  skills: ["Laravel", "PHP", "Vue.js", "MySQL", "Docker"],
  experience: [
    {
      id: "exp-1",
      company: "TechCorp",
      role: "Senior Backend Developer",
      startDate: "2022-01",
      current: true,
      achievements: ["Designed REST APIs", "Led migration to microservices"],
      skills: ["Laravel", "PHP"],
      technologies: ["Laravel", "PHP", "MySQL", "Docker"],
      projects: [],
    },
  ],
  education: [
    {
      school: "University of Tech",
      degree: "B.S.",
      field: "Computer Science",
      endDate: "2016",
      achievements: [],
      skills: [],
    },
  ],
  projects: [
    {
      id: "proj-1",
      name: "CRM Platform",
      description: "Multi-tenant CRM",
      technologies: ["Laravel", "Vue.js"],
      skills: [],
      achievements: [],
    },
  ],
  certifications: [],
};

const mockJob: ParsedJob = {
  title: "Senior Laravel Developer",
  company: "NewTech Inc.",
  location: "Remote",
  content:
    "We need a Senior Laravel Developer with PHP, Vue.js, MySQL, Docker, and Git experience.",
};

const mockConfig: cvgenConfig = {
  defaultProfile: "default",
  defaultTemplate: "ats",
  defaultOutput: "stdout",
  temperature: 0.2,
  maxTokens: 8000,
  history: true,
  logging: true,
  promptVersion: "v1",
};

const mockEnv: EnvironmentConfig = {
  provider: "openrouter",
  model: "openai/gpt-4o",
  apiKey: "test-key",
  baseUrl: "https://openrouter.ai/api/v1",
};

const mockLogger: Logger = {
  info: vi.fn(),
  success: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  verbose: vi.fn(),
  debug: vi.fn(),
  step: vi.fn(),
} as unknown as Logger;

function createMockProvider(jsonResponse: Record<string, unknown>): AIProvider {
  return {
    name: () => "mock",
    models: () => Promise.resolve([]),
    capabilities: () =>
      Promise.resolve({
        streaming: false,
        jsonMode: true,
        reasoning: false,
        toolCalling: false,
        vision: false,
      }),
    generate: () =>
      Promise.resolve({
        content: JSON.stringify(jsonResponse),
        model: "mock-model",
        usage: { inputTokens: 50, outputTokens: 30, totalTokens: 80 },
        finished: true,
      }),
    stream: async function* () {
      // Intentionally empty for test interface compliance
    },
  };
}

// ---------------------------------------------------------------------------
// Pipeline Type Definitions
// ---------------------------------------------------------------------------

describe("Pipeline types", () => {
  it("should export pipeline orchestrator and validator functions", async () => {
    const { runPipeline } = await import("../src/pipeline/index.js");
    expect(typeof runPipeline).toBe("function");

    const {
      validateGeneratedResume,
      validateCoverLetter,
      parseMarkdownResume,
    } = await import("../src/pipeline/validator.js");
    expect(typeof validateGeneratedResume).toBe("function");
    expect(typeof validateCoverLetter).toBe("function");
    expect(typeof parseMarkdownResume).toBe("function");
  });

  it("should export pipeline stage functions", async () => {
    const stages = await import("../src/pipeline/stages.js");
    expect(typeof stages.extractKeywords).toBe("function");
    expect(typeof stages.generateResumePlan).toBe("function");
    expect(typeof stages.generateResume).toBe("function");
    expect(typeof stages.generateCoverLetter).toBe("function");
    expect(typeof stages.generateATSReport).toBe("function");
  });

  it("should create valid GeneratedResume from fixture", () => {
    const resume: GeneratedResume = {
      schemaVersion: 1,
      summary: "Experienced developer",
      experience: [
        {
          company: "TechCorp",
          role: "Developer",
          location: null,
          startDate: "2022-01",
          endDate: null,
          current: true,
          summary: null,
          achievements: ["Built APIs"],
        },
      ],
      education: [
        {
          school: "MIT",
          degree: "B.S.",
          field: "CS",
          startDate: null,
          endDate: "2020",
        },
      ],
      projects: [
        {
          name: "CRM",
          description: "A CRM",
          technologies: ["Laravel"],
          highlights: ["High performance"],
        },
      ],
      skills: { primary: ["Laravel"], secondary: ["PHP"], supporting: ["Git"] },
      certifications: [{ name: "AWS Cert", issuer: "Amazon" }],
    };
    expect(resume.schemaVersion).toBe(1);
    expect(resume.experience.length).toBe(1);
    expect(resume.skills.primary).toContain("Laravel");
  });

  it("should create valid GeneratedCoverLetter from fixture", () => {
    const letter: GeneratedCoverLetter = {
      greeting: "Dear Hiring Manager",
      introduction: "I am excited to apply...",
      body: ["I have experience with Laravel and PHP."],
      closing: "I look forward to hearing from you.",
      signature: "Sincerely, Test User",
    };
    expect(letter.greeting).toBeTruthy();
    expect(letter.body.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// JSON Validation
// ---------------------------------------------------------------------------

describe("JSON Validation", () => {
  it("should validate a correct generated resume", async () => {
    const { validateGeneratedResume } =
      await import("../src/pipeline/validator.js");
    const result = validateGeneratedResume({
      schemaVersion: 1,
      summary: "Experienced developer",
      experience: [
        {
          company: "TechCorp",
          role: "Developer",
          location: null,
          startDate: "2022-01",
          endDate: null,
          current: true,
          summary: null,
          achievements: ["Built APIs"],
        },
      ],
      education: [
        {
          school: "MIT",
          degree: "B.S.",
          field: "CS",
          startDate: null,
          endDate: "2020",
        },
      ],
      projects: [
        {
          name: "CRM",
          description: "A CRM",
          technologies: ["Laravel"],
          highlights: ["High perf"],
        },
      ],
      skills: { primary: ["Laravel"], secondary: ["PHP"], supporting: ["Git"] },
      certifications: [{ name: "AWS", issuer: "Amazon" }],
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("should reject resume with missing summary", async () => {
    const { validateGeneratedResume } =
      await import("../src/pipeline/validator.js");
    const result = validateGeneratedResume({
      schemaVersion: 1,
      summary: "",
      experience: [],
      education: [],
      projects: [],
      skills: { primary: [], secondary: [], supporting: [] },
      certifications: [],
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should reject non-object inputs", async () => {
    const { validateGeneratedResume } =
      await import("../src/pipeline/validator.js");
    expect(validateGeneratedResume(null).valid).toBe(false);
    expect(validateGeneratedResume("string").valid).toBe(false);
    expect(validateGeneratedResume(42).valid).toBe(false);
  });

  it("should validate a correct cover letter", async () => {
    const { validateCoverLetter } =
      await import("../src/pipeline/validator.js");
    const result = validateCoverLetter({
      greeting: "Dear Hiring Manager",
      introduction: "I am excited to apply for this role.",
      body: ["I have experience with Laravel and Vue.js."],
      closing: "I look forward to hearing from you.",
      signature: "Sincerely, Test User",
    });

    expect(result.valid).toBe(true);
  });

  it("should reject cover letter with missing greeting", async () => {
    const { validateCoverLetter } =
      await import("../src/pipeline/validator.js");
    const result = validateCoverLetter({
      greeting: "",
      introduction: "Intro",
      body: ["Body"],
      closing: "Closing",
      signature: "Signature",
    });

    expect(result.valid).toBe(false);
  });

  it("should reject cover letter with empty body", async () => {
    const { validateCoverLetter } =
      await import("../src/pipeline/validator.js");
    const result = validateCoverLetter({
      greeting: "Dear Hiring Manager",
      introduction: "Intro",
      body: [],
      closing: "Closing",
      signature: "Signature",
    });

    expect(result.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Markdown Fallback Parser
// ---------------------------------------------------------------------------

describe("Markdown fallback parser", () => {
  it("should parse JSON from code block", async () => {
    const { parseMarkdownResume } =
      await import("../src/pipeline/validator.js");
    const content =
      '```json\n{"schemaVersion":1,"summary":"Test","experience":[{"company":"C","role":"R","location":null,"startDate":"2020","endDate":null,"current":true,"summary":null,"achievements":["Did stuff"]}],"education":[],"projects":[],"skills":{"primary":["PHP"],"secondary":[],"supporting":[]},"certifications":[]}\n```';

    const result = parseMarkdownResume(content);
    expect(result).not.toBeNull();
    expect(result!.summary).toBe("Test");
  });

  it("should parse raw JSON response", async () => {
    const { parseMarkdownResume } =
      await import("../src/pipeline/validator.js");
    const content =
      '{"schemaVersion":1,"summary":"Test","experience":[],"education":[],"projects":[],"skills":{"primary":[],"secondary":[],"supporting":[]},"certifications":[]}';

    const result = parseMarkdownResume(content);
    expect(result).not.toBeNull();
    expect(result!.summary).toBe("Test");
  });

  it("should return null for unparseable content", async () => {
    const { parseMarkdownResume } =
      await import("../src/pipeline/validator.js");
    const result = parseMarkdownResume(
      "This is just plain text without any JSON.",
    );
    expect(result).toBeNull();
  });

  it("should parse cover letter from JSON code block", async () => {
    const { parseMarkdownCoverLetter } =
      await import("../src/pipeline/validator.js");
    const content =
      '```json\n{"greeting":"Dear HM","introduction":"Intro","body":["Para1"],"closing":"Closing","signature":"Sig"}\n```';

    const result = parseMarkdownCoverLetter(content);
    expect(result).not.toBeNull();
    expect(result!.greeting).toBe("Dear HM");
  });
});

// ---------------------------------------------------------------------------
// Pipeline Orchestration
// ---------------------------------------------------------------------------

describe("Pipeline orchestration", () => {
  it("should run a dry-run pipeline successfully", async () => {
    const { runPipeline } = await import("../src/pipeline/index.js");
    const provider = createMockProvider({});

    const result = await runPipeline({
      profile: mockProfile,
      job: mockJob,
      config: mockConfig,
      env: mockEnv,
      provider,
      logger: mockLogger,
      dryRun: true,
    });

    expect(result.keywords).toBeDefined();
    expect(result.ranking).toBeDefined();
    expect(result.ranking.experience.length).toBe(1);
    expect(result.metadata).toBeDefined();
  });

  it("should run a dry-run pipeline with explain mode", async () => {
    const { runPipeline } = await import("../src/pipeline/index.js");
    const provider = createMockProvider({});

    const result = await runPipeline({
      profile: mockProfile,
      job: mockJob,
      config: mockConfig,
      env: mockEnv,
      provider,
      logger: mockLogger,
      dryRun: true,
      explain: true,
    });

    expect(result.explanations).toBeDefined();
    expect(result.explanations!.experience.length).toBeGreaterThan(0);
    expect(result.explanations!.skills.length).toBeGreaterThan(0);
  });

  it("should include ranking results in dry-run mode", async () => {
    const { runPipeline } = await import("../src/pipeline/index.js");
    const provider = createMockProvider({});

    const result = await runPipeline({
      profile: mockProfile,
      job: mockJob,
      config: mockConfig,
      env: mockEnv,
      provider,
      logger: mockLogger,
      dryRun: true,
    });

    expect(result.ranking.experience.length).toBe(1);
    expect(result.ranking.skills.primary.length).toBeGreaterThan(0);
    expect(result.ranking.projects.length).toBe(1);
    expect(result.ranking.education.length).toBe(1);
  });
});
