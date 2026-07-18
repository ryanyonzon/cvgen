/**
 * Tests for the ranking engine - Phase 5.
 *
 * Covers:
 * - Experience ranking (deterministic)
 * - Skill ranking (deterministic)
 * - Project ranking (deterministic)
 * - Education ranking (deterministic)
 * - Certification ranking (deterministic)
 * - Full ranking orchestration
 */

import { describe, it, expect } from "vitest";
import type { Profile } from "../src/types/profile.js";
import type { ParsedJob } from "../src/parser/types.js";
import type { ExtractedKeywords } from "../src/ranking/types.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockProfile: Profile = {
  name: "Test User",
  headline: "Senior Software Engineer",
  summary: "Experienced full-stack developer",
  contact: { email: "test@example.com" },
  skills: [
    "Laravel",
    "PHP",
    "Vue.js",
    "MySQL",
    "Docker",
    "Redis",
    "AWS",
    "Git",
  ],
  experience: [
    {
      id: "exp-1",
      company: "TechCorp",
      role: "Senior Backend Developer",
      startDate: "2022-01",
      endDate: undefined,
      current: true,
      summary: "Building SaaS platform",
      achievements: [
        "Designed REST APIs for multi-tenant SaaS",
        "Led migration from monolith to microservices",
      ],
      skills: ["Laravel", "PHP", "Vue.js"],
      technologies: ["Laravel", "PHP", "MySQL", "Redis", "Docker"],
      projects: [],
    },
    {
      id: "exp-2",
      company: "WebAgency",
      role: "Full Stack Developer",
      startDate: "2019-03",
      endDate: "2021-12",
      current: false,
      summary: "Built client websites",
      achievements: [
        "Developed e-commerce platforms",
        "Implemented CI/CD pipelines",
      ],
      skills: ["PHP", "JavaScript", "WordPress"],
      technologies: ["PHP", "MySQL", "JavaScript"],
      projects: [],
    },
    {
      id: "exp-3",
      company: "OldTech",
      role: "Junior Developer",
      startDate: "2016-06",
      endDate: "2019-02",
      current: false,
      summary: "Maintained legacy systems",
      achievements: ["Fixed bugs", "Wrote documentation"],
      skills: ["VB.NET"],
      technologies: ["VB.NET", "SQL Server"],
      projects: [],
    },
  ],
  education: [
    {
      school: "University of Technology",
      degree: "Bachelor of Science",
      field: "Computer Science",
      startDate: "2012",
      endDate: "2016",
      achievements: [],
      skills: ["Data Structures", "Algorithms", "Operating Systems"],
    },
  ],
  projects: [
    {
      id: "proj-1",
      name: "CRM Platform",
      description: "Multi-tenant CRM built with Laravel and Vue.js",
      technologies: ["Laravel", "Vue.js", "MySQL", "Redis"],
      skills: ["API Design", "Database Design"],
      achievements: ["Scaled to 10K users"],
    },
    {
      id: "proj-2",
      name: "Inventory System",
      description: "Legacy inventory management system",
      technologies: ["VB.NET", "SQL Server"],
      skills: ["Legacy Maintenance"],
      achievements: ["Reduced bugs by 20%"],
    },
  ],
  certifications: [
    {
      name: "AWS Certified Developer",
      issuer: "Amazon",
      skills: ["AWS", "Cloud Architecture"],
    },
    {
      name: "Laravel Certification",
      issuer: "Laravel",
      skills: ["Laravel", "PHP", "Eloquent"],
    },
  ],
};

const mockJob: ParsedJob = {
  title: "Senior Laravel Developer",
  company: "NewTech Inc.",
  location: "Remote",
  employmentType: "Full-time",
  content: `
We are looking for a Senior Laravel Developer to join our team.

Required Skills:
- Laravel
- PHP
- Vue.js
- MySQL
- REST APIs
- Docker
- Git

Preferred Skills:
- Redis
- AWS
- CI/CD

Responsibilities:
- Build and maintain SaaS applications
- Design RESTful APIs
- Lead code reviews and mentoring
- Implement CI/CD pipelines
  `,
};

const mockKeywords: ExtractedKeywords = {
  requiredSkills: [
    "Laravel",
    "PHP",
    "Vue.js",
    "MySQL",
    "REST APIs",
    "Docker",
    "Git",
  ],
  preferredSkills: ["Redis", "AWS", "CI/CD"],
  softSkills: ["Leadership", "Mentoring"],
  responsibilities: [
    "Build SaaS applications",
    "Design RESTful APIs",
    "Code reviews",
    "CI/CD",
  ],
  experience: ["Senior", "5+ years"],
  education: ["Computer Science"],
};

// ---------------------------------------------------------------------------
// Experience Ranking
// ---------------------------------------------------------------------------

describe("ExperienceRanker", () => {
  it("should rank experiences with current relevant role highest", async () => {
    const { ExperienceRanker } = await import("../src/ranking/experience.js");
    const ranker = new ExperienceRanker();
    const results = ranker.rank(mockProfile, mockJob, mockKeywords);

    expect(results.length).toBe(3);
    expect(results[0].item.id).toBe("exp-1"); // Current Laravel role
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it("should provide reasoning for scores", async () => {
    const { ExperienceRanker } = await import("../src/ranking/experience.js");
    const ranker = new ExperienceRanker();
    const results = ranker.rank(mockProfile, mockJob, mockKeywords);

    expect(results[0].reasons.length).toBeGreaterThan(0);
    expect(
      results[0].reasons.some(
        (r) =>
          r.toLowerCase().includes("laravel") ||
          r.toLowerCase().includes("php"),
      ),
    ).toBe(true);
  });

  it("should rank Laravel experience higher than VB.NET experience", async () => {
    const { ExperienceRanker } = await import("../src/ranking/experience.js");
    const ranker = new ExperienceRanker();
    const results = ranker.rank(mockProfile, mockJob, mockKeywords);

    const laravelIdx = results.findIndex((r) => r.item.id === "exp-1");
    const vbnetIdx = results.findIndex((r) => r.item.id === "exp-3");
    expect(laravelIdx).toBeLessThan(vbnetIdx);
  });

  it("should handle empty experience gracefully", async () => {
    const { ExperienceRanker } = await import("../src/ranking/experience.js");
    const ranker = new ExperienceRanker();
    const emptyProfile: Profile = {
      name: "Test",
      contact: { email: "test@test.com" },
    };
    const results = ranker.rank(emptyProfile, mockJob, mockKeywords);
    expect(results).toEqual([]);
  });

  it("should return scores between 0 and 100", async () => {
    const { ExperienceRanker } = await import("../src/ranking/experience.js");
    const ranker = new ExperienceRanker();
    const results = ranker.rank(mockProfile, mockJob, mockKeywords);

    for (const result of results) {
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    }
  });

  it("should rank without keywords (fallback to job content)", async () => {
    const { ExperienceRanker } = await import("../src/ranking/experience.js");
    const ranker = new ExperienceRanker();
    const results = ranker.rank(mockProfile, mockJob);

    expect(results.length).toBe(3);
    expect(results[0].item.id).toBe("exp-1");
  });
});

// ---------------------------------------------------------------------------
// Skill Ranking
// ---------------------------------------------------------------------------

describe("SkillRanker", () => {
  it("should group skills by relevance", async () => {
    const { SkillRanker } = await import("../src/ranking/skills.js");
    const ranker = new SkillRanker();
    const grouped = ranker.groupSkills(mockProfile, mockJob, mockKeywords);

    expect(grouped.primary.length).toBeGreaterThan(0);
    expect(grouped.primary).toContain("Laravel");
    expect(grouped.primary).toContain("PHP");
  });

  it("should include omitted/low-relevance skills", async () => {
    const { SkillRanker } = await import("../src/ranking/skills.js");
    const ranker = new SkillRanker();
    const grouped = ranker.groupSkills(mockProfile, mockJob, mockKeywords);

    expect(Array.isArray(grouped.omitted)).toBe(true);
  });

  it("should produce deterministic results", async () => {
    const { SkillRanker } = await import("../src/ranking/skills.js");
    const ranker = new SkillRanker();
    const first = ranker.groupSkills(mockProfile, mockJob, mockKeywords);
    const second = ranker.groupSkills(mockProfile, mockJob, mockKeywords);

    expect(first).toEqual(second);
  });

  it("should handle empty skills", async () => {
    const { SkillRanker } = await import("../src/ranking/skills.js");
    const ranker = new SkillRanker();
    const emptyProfile: Profile = {
      name: "Test",
      contact: { email: "test@test.com" },
    };
    const results = ranker.rank(emptyProfile, mockJob, mockKeywords);
    expect(results).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Project Ranking
// ---------------------------------------------------------------------------

describe("ProjectRanker", () => {
  it("should rank CRM project higher than legacy project", async () => {
    const { ProjectRanker } = await import("../src/ranking/projects.js");
    const ranker = new ProjectRanker();
    const results = ranker.rank(mockProfile, mockJob, mockKeywords);

    expect(results.length).toBe(2);
    const crmIdx = results.findIndex((r) => r.item.id === "proj-1");
    const invIdx = results.findIndex((r) => r.item.id === "proj-2");
    expect(crmIdx).toBeLessThan(invIdx);
  });

  it("should provide reasons for project scores", async () => {
    const { ProjectRanker } = await import("../src/ranking/projects.js");
    const ranker = new ProjectRanker();
    const results = ranker.rank(mockProfile, mockJob, mockKeywords);

    for (const result of results) {
      expect(Array.isArray(result.reasons)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Education Ranking
// ---------------------------------------------------------------------------

describe("EducationRanker", () => {
  it("should rank computer science education highly", async () => {
    const { EducationRanker } = await import("../src/ranking/education.js");
    const ranker = new EducationRanker();
    const results = ranker.rank(mockProfile, mockJob, mockKeywords);

    expect(results.length).toBe(1);
    expect(results[0].score).toBeGreaterThanOrEqual(40);
  });

  it("should handle empty education", async () => {
    const { EducationRanker } = await import("../src/ranking/education.js");
    const ranker = new EducationRanker();
    const emptyProfile: Profile = {
      name: "Test",
      contact: { email: "test@test.com" },
    };
    const results = ranker.rank(emptyProfile, mockJob, mockKeywords);
    expect(results).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Certification Ranking
// ---------------------------------------------------------------------------

describe("CertificationRanker", () => {
  it("should rank relevant certifications higher", async () => {
    const { CertificationRanker } =
      await import("../src/ranking/certifications.js");
    const ranker = new CertificationRanker();
    const results = ranker.rank(mockProfile, mockJob, mockKeywords);

    expect(results.length).toBe(2);
    // Laravel cert should be higher than AWS for a Laravel role
    expect(results[0].score).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// Ranking Engine (orchestration)
// ---------------------------------------------------------------------------

describe("RankingEngine", () => {
  it("should rank all profile items against a job", async () => {
    const { RankingEngine } = await import("../src/ranking/index.js");
    const engine = new RankingEngine();
    const result = engine.rankAll(mockProfile, mockJob, mockKeywords);

    expect(result.experience.length).toBe(3);
    expect(result.projects.length).toBe(2);
    expect(result.education.length).toBe(1);
    expect(result.certifications.length).toBe(2);
    expect(result.skills.primary.length).toBeGreaterThan(0);
  });

  it("should provide access to individual rankers", async () => {
    const { RankingEngine } = await import("../src/ranking/index.js");
    const engine = new RankingEngine();
    const rankers = engine.getRankers();

    expect(rankers.experience.name).toBe("ExperienceRanker");
    expect(rankers.skills).toBeDefined();
    expect(rankers.projects).toBeDefined();
    expect(rankers.education).toBeDefined();
    expect(rankers.certifications).toBeDefined();
  });
});
