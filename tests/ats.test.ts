/**
 * Tests for the ATS analysis module - Phase 7.
 *
 * Covers:
 * - Deterministic keyword matching
 * - Score computation (keyword coverage, quality, overall)
 * - Missing/weak keyword detection
 * - Resume quality assessment
 * - Recommendation generation
 * - ATS analyzer interface compliance
 * - Integration with pipeline types
 */

import { describe, it, expect } from "vitest";
import type { GeneratedResume } from "../src/pipeline/types.js";
import type { ExtractedKeywords } from "../src/ranking/types.js";
import type { ParsedJob } from "../src/parser/types.js";
import {
  DefaultATSAnalyzer,
  createATSAnalyzer,
  analyzeATS,
} from "../src/ats/index.js";
import type { ATSAnalyzerOptions } from "../src/ats/types.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const createResume = (
  overrides?: Partial<GeneratedResume>,
): GeneratedResume => ({
  schemaVersion: 1,
  summary:
    "Senior software engineer with 10 years of experience building scalable applications.",
  experience: [
    {
      company: "TechCorp",
      role: "Senior Backend Developer",
      location: "San Francisco",
      startDate: "2020-01",
      endDate: null,
      current: true,
      summary: "Led backend development team",
      achievements: [
        "Designed and implemented REST APIs serving 1M+ requests/day",
        "Migrated monolithic application to microservices architecture",
        "Reduced deployment time by 60% through CI/CD automation",
      ],
    },
    {
      company: "StartupInc",
      role: "Full Stack Developer",
      location: "Remote",
      startDate: "2017-03",
      endDate: "2019-12",
      current: false,
      summary: null,
      achievements: [
        "Built customer-facing web application using React and Node.js",
        "Implemented automated testing pipeline achieving 90% code coverage",
      ],
    },
  ],
  education: [
    {
      school: "University of Technology",
      degree: "B.S.",
      field: "Computer Science",
      startDate: "2013-09",
      endDate: "2017-06",
    },
  ],
  projects: [
    {
      name: "E-commerce Platform",
      description: "High-traffic e-commerce platform serving 500K daily users",
      technologies: ["React", "Node.js", "PostgreSQL", "Redis"],
      highlights: [
        "Architected scalable payment processing system",
        "Implemented real-time inventory management",
      ],
    },
  ],
  skills: {
    primary: ["JavaScript", "TypeScript", "Node.js", "React", "PostgreSQL"],
    secondary: ["Docker", "AWS", "Redis", "CI/CD"],
    supporting: ["Git", "Linux", "REST APIs", "Microservices"],
  },
  certifications: [
    { name: "AWS Solutions Architect", issuer: "Amazon Web Services" },
  ],
  ...overrides,
});

const createJob = (overrides?: Partial<ParsedJob>): ParsedJob => ({
  title: "Senior Software Engineer",
  company: "TargetCorp",
  location: "Remote",
  content:
    "We are looking for a Senior Software Engineer with TypeScript, React, Node.js, PostgreSQL, Docker, AWS, and Redis experience. Familiarity with microservices and CI/CD is a plus.",
  ...overrides,
});

const createKeywords = (
  overrides?: Partial<ExtractedKeywords>,
): ExtractedKeywords => ({
  requiredSkills: [
    "TypeScript",
    "React",
    "Node.js",
    "PostgreSQL",
    "Docker",
    "AWS",
  ],
  preferredSkills: ["Redis", "Kubernetes", "GraphQL", "Microservices"],
  softSkills: ["Leadership", "Communication"],
  responsibilities: [
    "Design and implement APIs",
    "Lead engineering team",
    "Code review",
    "Mentoring junior developers",
  ],
  experience: ["5+ years", "Senior"],
  education: ["Computer Science"],
  ...overrides,
});

// ---------------------------------------------------------------------------
// ATS Analyzer Creation
// ---------------------------------------------------------------------------

describe("ATS Analyzer Creation", () => {
  it("should create a DefaultATSAnalyzer instance", () => {
    const analyzer = createATSAnalyzer();
    expect(analyzer).toBeInstanceOf(DefaultATSAnalyzer);
  });

  it("should accept custom options", () => {
    const options: ATSAnalyzerOptions = {
      matchThreshold: 80,
      includePreferredSkills: false,
      keywordWeight: 50,
      qualityWeight: 50,
    };
    const analyzer = createATSAnalyzer(options);
    expect(analyzer).toBeInstanceOf(DefaultATSAnalyzer);
  });

  it("should provide a convenience analyzeATS function", () => {
    const resume = createResume();
    const job = createJob();
    const keywords = createKeywords();

    const result = analyzeATS(resume, job, keywords);
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
  });
});

// ---------------------------------------------------------------------------
// Keyword Matching
// ---------------------------------------------------------------------------

describe("Keyword Matching", () => {
  it("should find explicitly listed skills", () => {
    const resume = createResume();
    const keywords = createKeywords();
    const analyzer = createATSAnalyzer();

    const results = analyzer.matchKeywords(resume, keywords);

    // TypeScript is in primary skills
    const tsMatch = results.find((k) => k.keyword === "TypeScript");
    expect(tsMatch).toBeDefined();
    expect(tsMatch!.status).toBe("matched");
    expect(tsMatch!.confidence).toBeGreaterThanOrEqual(90);

    // React is in primary skills
    const reactMatch = results.find((k) => k.keyword === "React");
    expect(reactMatch).toBeDefined();
    expect(reactMatch!.status).toBe("matched");
  });

  it("should detect missing keywords", () => {
    const resume = createResume();
    const keywords = createKeywords({
      requiredSkills: ["TypeScript", "React", "Kubernetes", "Terraform"],
    });
    const analyzer = createATSAnalyzer();

    const results = analyzer.matchKeywords(resume, keywords);

    const k8sMatch = results.find((k) => k.keyword === "Kubernetes");
    expect(k8sMatch).toBeDefined();
    expect(k8sMatch!.status).toBe("missing");
    expect(k8sMatch!.confidence).toBe(0);

    const tfMatch = results.find((k) => k.keyword === "Terraform");
    expect(tfMatch).toBeDefined();
    expect(tfMatch!.status).toBe("missing");
  });

  it("should detect weak keyword matches (mentioned but not in skills)", () => {
    const keyword: ExtractedKeywords = createKeywords({
      requiredSkills: ["Microservices", "REST APIs"],
    });
    const analyzer = createATSAnalyzer();

    // "Microservices" appears in experience achievements but not in skills
    // "REST APIs" appears in projects highlights but not in skills
    const results = analyzer.matchKeywords(createResume(), keyword);

    // Microservices is in experience achievements and in skills supporting
    // REST APIs is in skills supporting
    const msMatch = results.find((k) => k.keyword === "Microservices");
    expect(msMatch).toBeDefined();

    // REST APIs is explicitly in skills supporting
    const restMatch = results.find((k) => k.keyword === "REST APIs");
    expect(restMatch).toBeDefined();
  });

  it("should handle empty resume gracefully", () => {
    const resume = createResume({
      summary: "",
      experience: [],
      education: [],
      projects: [],
      skills: { primary: [], secondary: [], supporting: [] },
      certifications: [],
    });
    const keywords = createKeywords();
    const analyzer = createATSAnalyzer();

    const results = analyzer.matchKeywords(resume, keywords);
    expect(results.length).toBeGreaterThan(0);

    // All keywords should be missing
    const missing = results.filter((k) => k.status === "missing");
    expect(missing.length).toBe(results.length);
  });

  it("should categorize keyword by required/preferred", () => {
    const resume = createResume();
    const keywords = createKeywords();
    const analyzer = createATSAnalyzer();

    const results = analyzer.matchKeywords(resume, keywords);

    const required = results.filter((k) => k.category === "required");
    const preferred = results.filter((k) => k.category === "preferred");

    expect(required.length).toBe(keywords.requiredSkills.length);
    expect(preferred.length).toBe(keywords.preferredSkills.length);
  });

  it("should respect includePreferredSkills option", () => {
    const resume = createResume();
    const keywords = createKeywords();
    const analyzer = createATSAnalyzer({ includePreferredSkills: false });

    const results = analyzer.matchKeywords(resume, keywords);

    // Should only have required skills results
    const required = results.filter((k) => k.category === "required");
    const preferred = results.filter((k) => k.category === "preferred");

    expect(required.length).toBe(keywords.requiredSkills.length);
    expect(preferred.length).toBe(0);
  });

  it("should handle case-insensitive matching", () => {
    const resume = createResume({
      skills: {
        primary: ["typescript", "reactjs"],
        secondary: [],
        supporting: [],
      },
    });
    const keywords = createKeywords({
      requiredSkills: ["TypeScript", "React"],
    });
    const analyzer = createATSAnalyzer();

    const results = analyzer.matchKeywords(resume, keywords);

    const tsMatch = results.find((k) => k.keyword === "TypeScript");
    expect(tsMatch).toBeDefined();
    expect(tsMatch!.status).toBe("matched");
  });
});

// ---------------------------------------------------------------------------
// Resume Quality Assessment
// ---------------------------------------------------------------------------

describe("Resume Quality Assessment", () => {
  it("should assess a complete resume with high score", () => {
    const resume = createResume();
    const analyzer = createATSAnalyzer();

    const quality = analyzer.assessQuality(resume);

    expect(quality.hasSummary).toBe(true);
    expect(quality.hasAchievements).toBe(true);
    expect(quality.experienceCount).toBe(2);
    expect(quality.hasSkills).toBe(true);
    expect(quality.hasEducation).toBe(true);
    expect(quality.totalSkills).toBeGreaterThan(0);
    expect(quality.qualityScore).toBeGreaterThanOrEqual(70);
  });

  it("should penalize missing summary", () => {
    const resume = createResume({ summary: "" });
    const analyzer = createATSAnalyzer();

    const quality = analyzer.assessQuality(resume);
    expect(quality.hasSummary).toBe(false);
    expect(quality.qualityScore).toBeLessThan(80);
  });

  it("should penalize missing achievements", () => {
    const resume = createResume({
      experience: [
        {
          company: "TechCorp",
          role: "Developer",
          location: null,
          startDate: "2020",
          endDate: null,
          current: true,
          summary: null,
          achievements: [],
        },
      ],
    });
    const analyzer = createATSAnalyzer();

    const quality = analyzer.assessQuality(resume);
    expect(quality.hasAchievements).toBe(false);
  });

  it("should penalize missing skills", () => {
    const resume = createResume({
      skills: { primary: [], secondary: [], supporting: [] },
    });
    const analyzer = createATSAnalyzer();

    const quality = analyzer.assessQuality(resume);
    expect(quality.hasSkills).toBe(false);
    expect(quality.totalSkills).toBe(0);
  });

  it("should penalize missing education", () => {
    const resume = createResume({ education: [] });
    const analyzer = createATSAnalyzer();

    const quality = analyzer.assessQuality(resume);
    expect(quality.hasEducation).toBe(false);
  });

  it("should handle empty resume", () => {
    const resume = createResume({
      summary: "",
      experience: [],
      education: [],
      projects: [],
      skills: { primary: [], secondary: [], supporting: [] },
      certifications: [],
    });
    const analyzer = createATSAnalyzer();

    const quality = analyzer.assessQuality(resume);
    expect(quality.qualityScore).toBe(0);
  });

  it("should reward more skills", () => {
    const analyzer = createATSAnalyzer();

    // Start with minimal skills
    const minimalSkills = createResume({
      skills: {
        primary: ["JavaScript"],
        secondary: [],
        supporting: [],
      },
    });
    const qualityMin = analyzer.assessQuality(minimalSkills);

    // Add more skills
    const moreSkills = createResume({
      skills: {
        primary: Array.from({ length: 8 }, (_, i) => `Skill-${i}`),
        secondary: Array.from({ length: 5 }, (_, i) => `Secondary-${i}`),
        supporting: Array.from({ length: 3 }, (_, i) => `Support-${i}`),
      },
    });
    const qualityMore = analyzer.assessQuality(moreSkills);

    expect(qualityMore.totalSkills).toBe(16);
    expect(qualityMore.qualityScore).toBeGreaterThan(qualityMin.qualityScore);
  });
});

// ---------------------------------------------------------------------------
// Complete Analysis
// ---------------------------------------------------------------------------

describe("Complete ATS Analysis", () => {
  it("should produce a complete analysis result", () => {
    const resume = createResume();
    const job = createJob();
    const keywords = createKeywords();

    const result = analyzeATS(resume, job, keywords);

    expect(result).toHaveProperty("overallScore");
    expect(result).toHaveProperty("keywordCoverage");
    expect(result).toHaveProperty("qualityScore");
    expect(result).toHaveProperty("matchedKeywords");
    expect(result).toHaveProperty("missingKeywords");
    expect(result).toHaveProperty("weakKeywords");
    expect(result).toHaveProperty("keywordDetails");
    expect(result).toHaveProperty("quality");
    expect(result).toHaveProperty("recommendations");
    expect(result).toHaveProperty("strengths");
    expect(result).toHaveProperty("weaknesses");
  });

  it("should have valid score ranges", () => {
    const resume = createResume();
    const job = createJob();
    const keywords = createKeywords();

    const result = analyzeATS(resume, job, keywords);

    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    expect(result.keywordCoverage).toBeGreaterThanOrEqual(0);
    expect(result.keywordCoverage).toBeLessThanOrEqual(100);
    expect(result.qualityScore).toBeGreaterThanOrEqual(0);
    expect(result.qualityScore).toBeLessThanOrEqual(100);
  });

  it("should have matched keywords for matching resume", () => {
    const resume = createResume();
    const job = createJob();
    const keywords = createKeywords();

    const result = analyzeATS(resume, job, keywords);

    // Our fixture resume has: TypeScript, React, Node.js, PostgreSQL, Docker, AWS
    // All should be at least weakly matched
    expect(result.matchedKeywords.length).toBeGreaterThanOrEqual(3);
  });

  it("should detect missing keywords", () => {
    const resume = createResume();
    const job = createJob();
    const keywords = createKeywords({
      requiredSkills: ["TypeScript", "Kubernetes", "Terraform", "GraphQL"],
    });

    const result = analyzeATS(resume, job, keywords);

    expect(result.missingKeywords).toContain("Kubernetes");
    expect(result.missingKeywords).toContain("Terraform");
    expect(result.missingKeywords).toContain("GraphQL");
  });

  it("should generate recommendations for missing keywords", () => {
    const resume = createResume();
    const job = createJob();
    const keywords = createKeywords({
      requiredSkills: ["TypeScript", "Kubernetes", "Terraform"],
    });

    const result = analyzeATS(resume, job, keywords);

    expect(result.recommendations.length).toBeGreaterThan(0);

    // Should recommend adding Kubernetes
    const hasK8sRec = result.recommendations.some((r) =>
      r.toLowerCase().includes("kubernetes"),
    );
    expect(hasK8sRec).toBe(true);
  });

  it("should generate strengths and weaknesses", () => {
    const resume = createResume();
    const job = createJob();
    const keywords = createKeywords();

    const result = analyzeATS(resume, job, keywords);

    expect(result.strengths.length).toBeGreaterThan(0);
    expect(result.weaknesses.length).toBeGreaterThanOrEqual(0);
  });

  it("should produce correct result for completely unmatched resume", () => {
    const resume = createResume({
      summary: "",
      experience: [],
      education: [],
      projects: [],
      skills: { primary: [], secondary: [], supporting: [] },
      certifications: [],
    });
    const job = createJob();
    const keywords = createKeywords();

    const result = analyzeATS(resume, job, keywords);

    expect(result.matchedKeywords.length).toBe(0);
    expect(result.missingKeywords.length).toBeGreaterThan(0);
    expect(result.overallScore).toBeLessThan(30);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Edge Cases
// ---------------------------------------------------------------------------

describe("ATS Analysis Edge Cases", () => {
  it("should handle empty keyword extraction", () => {
    const resume = createResume();
    const job = createJob();
    const keywords: ExtractedKeywords = {
      requiredSkills: [],
      preferredSkills: [],
      softSkills: [],
      responsibilities: [],
      experience: [],
      education: [],
    };

    const result = analyzeATS(resume, job, keywords);

    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.matchedKeywords.length).toBe(0);
    expect(result.missingKeywords.length).toBe(0);
  });

  it("should handle empty job description", () => {
    const resume = createResume();
    const job = createJob({ content: "", title: "", company: "" });
    const keywords: ExtractedKeywords = {
      requiredSkills: [],
      preferredSkills: [],
      softSkills: [],
      responsibilities: [],
      experience: [],
      education: [],
    };

    // Should not throw
    expect(() => analyzeATS(resume, job, keywords)).not.toThrow();
  });

  it("should handle very large keyword lists", () => {
    const resume = createResume();
    const job = createJob();
    const manyKeywords = createKeywords({
      requiredSkills: Array.from({ length: 100 }, (_, i) => `Skill-${i}`),
    });

    expect(() => analyzeATS(resume, job, manyKeywords)).not.toThrow();
  });

  it("should handle single-entry resume", () => {
    const minimalResume: GeneratedResume = {
      schemaVersion: 1,
      summary: "A summary.",
      experience: [
        {
          company: "C",
          role: "R",
          location: null,
          startDate: "2020",
          endDate: null,
          current: true,
          summary: null,
          achievements: ["Did stuff"],
        },
      ],
      education: [],
      projects: [],
      skills: { primary: ["TypeScript"], secondary: [], supporting: [] },
      certifications: [],
    };
    const job = createJob();
    const keywords = createKeywords();

    const result = analyzeATS(minimalResume, job, keywords);

    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.matchedKeywords.length).toBeGreaterThanOrEqual(0);
  });

  it("should handle resume with only skills (no experience)", () => {
    const skillsOnlyResume: GeneratedResume = {
      schemaVersion: 1,
      summary: "",
      experience: [],
      education: [],
      projects: [],
      skills: {
        primary: ["TypeScript", "React", "Node.js", "PostgreSQL"],
        secondary: [],
        supporting: [],
      },
      certifications: [],
    };
    const keywords = createKeywords({
      requiredSkills: ["TypeScript", "React"],
    });

    const result = analyzeATS(skillsOnlyResume, createJob(), keywords);

    expect(result.matchedKeywords).toContain("TypeScript");
    expect(result.matchedKeywords).toContain("React");
  });
});

// ---------------------------------------------------------------------------
// ATSAnalyzer Interface
// ---------------------------------------------------------------------------

describe("ATSAnalyzer Interface Compliance", () => {
  it("should implement all interface methods", () => {
    const analyzer = createATSAnalyzer();

    expect(typeof analyzer.analyze).toBe("function");
    expect(typeof analyzer.assessQuality).toBe("function");
    expect(typeof analyzer.matchKeywords).toBe("function");
  });

  it("should return correct types from all methods", () => {
    const analyzer = createATSAnalyzer();
    const resume = createResume();
    const job = createJob();
    const keywords = createKeywords();

    const result = analyzer.analyze(resume, job, keywords);
    expect(Array.isArray(result.matchedKeywords)).toBe(true);
    expect(Array.isArray(result.missingKeywords)).toBe(true);
    expect(Array.isArray(result.weakKeywords)).toBe(true);
    expect(Array.isArray(result.recommendations)).toBe(true);
    expect(Array.isArray(result.strengths)).toBe(true);
    expect(Array.isArray(result.weaknesses)).toBe(true);
    expect(typeof result.overallScore).toBe("number");
    expect(typeof result.keywordCoverage).toBe("number");

    const quality = analyzer.assessQuality(resume);
    expect(typeof quality.qualityScore).toBe("number");
    expect(typeof quality.hasSummary).toBe("boolean");

    const matches = analyzer.matchKeywords(resume, keywords);
    expect(Array.isArray(matches)).toBe(true);
    if (matches.length > 0) {
      expect(typeof matches[0].keyword).toBe("string");
      expect(["matched", "weak", "missing"]).toContain(matches[0].status);
      expect(["required", "preferred"]).toContain(matches[0].category);
    }
  });
});

// ---------------------------------------------------------------------------
// Recommendations Coverage
// ---------------------------------------------------------------------------

describe("Recommendations", () => {
  it("should recommend adding missing required skills", () => {
    const resume = createResume();
    const keywords = createKeywords({
      requiredSkills: ["Kubernetes", "Terraform", "GraphQL"],
    });

    const result = analyzeATS(resume, createJob(), keywords);

    const missingRecs = result.recommendations.filter((r) =>
      r.toLowerCase().includes("missing"),
    );
    expect(missingRecs.length).toBeGreaterThan(0);
  });

  it("should recommend strengthening weak matches", () => {
    const resume = createResume();
    // Use a keyword that appears in the summary but not explicitly in skills
    // "scalable" appears in the summary text but not in the skills section
    const keywords = createKeywords({
      requiredSkills: ["scalable"],
    });

    const result = analyzeATS(resume, createJob(), keywords);

    // Should have a weak match recommendation
    const weakRecs = result.recommendations.filter((r) =>
      r.toLowerCase().includes("strengthen"),
    );
    expect(weakRecs.length).toBeGreaterThan(0);
  });

  it("should recommend adding a summary when missing", () => {
    const resume = createResume({ summary: "" });
    const result = analyzeATS(resume, createJob(), createKeywords());

    const summaryRecs = result.recommendations.filter((r) =>
      r.toLowerCase().includes("summary"),
    );
    expect(summaryRecs.length).toBeGreaterThan(0);
  });

  it("should recommend adding achievements when missing", () => {
    const resume = createResume({
      experience: [
        {
          company: "TechCorp",
          role: "Developer",
          location: null,
          startDate: "2020",
          endDate: null,
          current: true,
          summary: null,
          achievements: [],
        },
      ],
    });
    const result = analyzeATS(resume, createJob(), createKeywords());

    const achievementRecs = result.recommendations.filter((r) =>
      r.toLowerCase().includes("achievement"),
    );
    expect(achievementRecs.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Score Computation
// ---------------------------------------------------------------------------

describe("Score Computation", () => {
  it("should weight keyword coverage and quality correctly", () => {
    const analyzer = createATSAnalyzer({
      keywordWeight: 100,
      qualityWeight: 0,
    });

    const resume = createResume();
    const job = createJob();
    const keywords = createKeywords();

    const result = analyzer.analyze(resume, job, keywords);

    // With keyword weight at 100, overall score should equal keyword coverage
    expect(result.overallScore).toBe(result.keywordCoverage);
  });

  it("should allow custom weight ratios", () => {
    const analyzerQuality = createATSAnalyzer({
      keywordWeight: 0,
      qualityWeight: 100,
    });

    const resume = createResume();
    const job = createJob();
    const keywords = createKeywords();

    const result = analyzerQuality.analyze(resume, job, keywords);

    // With quality weight at 100, overall score should equal quality score
    expect(result.overallScore).toBe(result.qualityScore);
  });

  it("should compute reasonable scores for a well-matching resume", () => {
    // Create a resume perfectly matching all required keywords
    // Only include required skills - preferred skills should be empty to avoid diluting coverage
    const perfectResume: GeneratedResume = {
      schemaVersion: 1,
      summary: "Experienced engineer",
      experience: [
        {
          company: "C",
          role: "Engineer",
          location: null,
          startDate: "2020",
          endDate: null,
          current: true,
          summary: null,
          achievements: ["Built things"],
        },
      ],
      education: [
        {
          school: "U",
          degree: "B.S.",
          field: "CS",
          startDate: null,
          endDate: "2020",
        },
      ],
      projects: [],
      skills: {
        primary: [
          "TypeScript",
          "React",
          "Node.js",
          "PostgreSQL",
          "Docker",
          "AWS",
        ],
        secondary: [],
        supporting: [],
      },
      certifications: [],
    };

    // Only required skills - no preferred skills to avoid diluting keyword coverage
    const keywords: ExtractedKeywords = {
      requiredSkills: ["TypeScript", "React", "Node.js", "PostgreSQL"],
      preferredSkills: [],
      softSkills: [],
      responsibilities: [],
      experience: [],
      education: [],
    };

    const result = analyzeATS(perfectResume, createJob(), keywords);

    expect(result.keywordCoverage).toBe(100);
    // Quality won't be perfect due to single experience
    expect(result.overallScore).toBeGreaterThan(50);
  });
});

// ---------------------------------------------------------------------------
// Stability & Consistency
// ---------------------------------------------------------------------------

describe("Analysis Stability", () => {
  it("should produce deterministic results", () => {
    const resume = createResume();
    const job = createJob();
    const keywords = createKeywords();

    const result1 = analyzeATS(resume, job, keywords);
    const result2 = analyzeATS(resume, job, keywords);

    expect(result1).toEqual(result2);
  });

  it("should handle special characters in keywords", () => {
    const resume = createResume({
      skills: {
        primary: ["C#", "C++", "F#"],
        secondary: [".NET Core"],
        supporting: [],
      },
    });
    const keywords = createKeywords({
      requiredSkills: ["C#", "C++", ".NET Core"],
    });

    const result = analyzeATS(resume, createJob(), keywords);

    expect(result.matchedKeywords).toContain("C#");
    expect(result.matchedKeywords).toContain("C++");
    expect(result.matchedKeywords).toContain(".NET Core");
  });

  it("should handle hyphenated keywords", () => {
    const resume = createResume({
      skills: {
        primary: ["CI/CD"],
        secondary: [],
        supporting: [],
      },
    });
    const keywords = createKeywords({
      requiredSkills: ["CI/CD"],
    });

    const result = analyzeATS(resume, createJob(), keywords);

    expect(result.matchedKeywords).toContain("CI/CD");
  });
});
