/**
 * Experience ranking engine.
 *
 * Ranks work experience entries by relevance to the target job.
 * Uses keyword matching, technology overlap, domain similarity,
 * recency, and role seniority to compute scores.
 */

import type { Profile, Experience } from "../types/profile.js";
import type { ParsedJob } from "../parser/types.js";
import type { Ranker, RankedItem, ExtractedKeywords } from "./types.js";

/**
 * Weight configuration for experience ranking factors.
 */
const WEIGHTS = {
  /** Matching required technologies */
  technologyMatch: 35,
  /** Matching preferred skills */
  preferredSkillMatch: 20,
  /** Domain/industry similarity */
  domainSimilarity: 15,
  /** Role seniority match */
  roleSeniority: 10,
  /** Recency of the experience */
  recency: 10,
  /** Leadership/mentoring relevance */
  leadership: 5,
  /** Length of experience */
  tenure: 5,
} as const;

/**
 * Experience ranker.
 *
 * Scores each work experience entry based on how well it aligns
 * with the job description requirements.
 */
export class ExperienceRanker implements Ranker<Experience> {
  public readonly name = "ExperienceRanker";

  /**
   * Rank work experience entries by relevance.
   */
  public rank(
    profile: Profile,
    job: ParsedJob,
    keywords?: ExtractedKeywords,
  ): RankedItem<Experience>[] {
    const experiences = profile.experience ?? [];

    if (experiences.length === 0) {
      return [];
    }

    const jobContent = job.content.toLowerCase();
    const requiredSkills =
      keywords?.requiredSkills.map((s) => s.toLowerCase()) ?? [];
    const preferredSkills =
      keywords?.preferredSkills.map((s) => s.toLowerCase()) ?? [];

    const ranked = experiences.map((exp) =>
      this.scoreExperience(exp, {
        jobContent,
        requiredSkills,
        preferredSkills,
        keywords,
      }),
    );

    // Sort by score descending, then by recency (current first, then most recent end date)
    return ranked.sort((a, b) => {
      const scoreDiff = b.score - a.score;
      if (scoreDiff !== 0) return scoreDiff;

      // Prefer current positions
      if (a.item.current && !b.item.current) return -1;
      if (!a.item.current && b.item.current) return 1;

      // Prefer more recent end dates
      const endA = a.item.endDate ?? "9999-12-31";
      const endB = b.item.endDate ?? "9999-12-31";
      return endB.localeCompare(endA);
    });
  }

  /**
   * Score a single experience entry.
   */
  private scoreExperience(
    exp: Experience,
    context: {
      jobContent: string;
      requiredSkills: string[];
      preferredSkills: string[];
      keywords?: ExtractedKeywords;
    },
  ): RankedItem<Experience> {
    const reasons: string[] = [];
    let score = 0;

    // 1. Technology match score
    const techScore = this.computeTechnologyMatchScore(
      exp,
      context.requiredSkills,
      context.preferredSkills,
      context.jobContent,
    );
    score += techScore.score;
    reasons.push(...techScore.reasons);

    // 2. Domain similarity (look for domain terms in summary/achievements)
    const domainScore = this.computeDomainSimilarity(
      exp,
      context.jobContent,
      context.keywords,
    );
    score += domainScore.score;
    reasons.push(...domainScore.reasons);

    // 3. Role seniority match
    const seniorityScore = this.computeSeniorityScore(
      exp.role,
      context.jobContent,
    );
    score += seniorityScore.score;
    reasons.push(...seniorityScore.reasons);

    // 4. Recency
    const recencyScore = this.computeRecencyScore(exp);
    score += recencyScore.score;
    if (recencyScore.score > 0) {
      reasons.push(...recencyScore.reasons);
    }

    // 5. Leadership relevance
    const leadershipScore = this.computeLeadershipScore(
      exp,
      context.jobContent,
    );
    score += leadershipScore.score;
    reasons.push(...leadershipScore.reasons);

    // 6. Tenure
    const tenureScore = this.computeTenureScore(exp);
    score += tenureScore.score;
    reasons.push(...tenureScore.reasons);

    // Clamp score to 0-100
    const finalScore = Math.max(0, Math.min(100, Math.round(score)));

    return { item: exp, score: finalScore, reasons };
  }

  /**
   * Compute technology match score.
   */
  private computeTechnologyMatchScore(
    exp: Experience,
    requiredSkills: string[],
    preferredSkills: string[],
    jobContent: string,
  ): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    const allTech = [
      ...exp.technologies.map((t) => t.toLowerCase()),
      ...exp.skills.map((s) => s.toLowerCase()),
    ];

    if (allTech.length === 0) {
      return { score: 0, reasons: [] };
    }

    // Count matches against required skills (higher weight)
    const requiredMatches = requiredSkills.filter((reqSkill) =>
      allTech.some(
        (tech) => tech.includes(reqSkill) || reqSkill.includes(tech),
      ),
    );

    const preferredMatches = preferredSkills.filter((prefSkill) =>
      allTech.some(
        (tech) => tech.includes(prefSkill) || prefSkill.includes(tech),
      ),
    );

    // Also count matches against job content keywords
    const jobTechMatches = allTech.filter((tech) => jobContent.includes(tech));

    const totalMatches = requiredMatches.length + preferredMatches.length;

    if (totalMatches === 0 && jobTechMatches.length === 0) {
      return { score: 0, reasons: [] };
    }

    let score = 0;

    if (requiredMatches.length > 0) {
      const ratio = requiredMatches.length / Math.max(requiredSkills.length, 1);
      score += ratio * WEIGHTS.technologyMatch;
      reasons.push(
        `Matched required skills: ${requiredMatches.slice(0, 5).join(", ")}`,
      );
    }

    if (preferredMatches.length > 0 && preferredSkills.length > 0) {
      const ratio = preferredMatches.length / preferredSkills.length;
      score += ratio * WEIGHTS.preferredSkillMatch;
      reasons.push(
        `Matched preferred skills: ${preferredMatches.slice(0, 3).join(", ")}`,
      );
    }

    // If no explicit keyword matches but implicit ones exist
    if (totalMatches === 0 && jobTechMatches.length > 0) {
      score = Math.min(
        WEIGHTS.technologyMatch * 0.3,
        (jobTechMatches.length / Math.max(allTech.length, 1)) *
          WEIGHTS.technologyMatch,
      );
      reasons.push(
        `Technologies appear in job description: ${jobTechMatches.slice(0, 3).join(", ")}`,
      );
    }

    return { score, reasons };
  }

  /**
   * Compute domain similarity score.
   */
  private computeDomainSimilarity(
    exp: Experience,
    jobContent: string,
    keywords?: ExtractedKeywords,
  ): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    const textToMatch = [
      exp.summary ?? "",
      ...exp.achievements,
      exp.company,
      exp.role,
    ]
      .join(" ")
      .toLowerCase();

    // Extract domain terms from job content
    const domainTerms = this.extractDomainTerms(jobContent);

    if (domainTerms.length === 0) {
      return { score: 0, reasons: [] };
    }

    const matchedTerms = domainTerms.filter((term) =>
      textToMatch.includes(term.toLowerCase()),
    );

    if (matchedTerms.length === 0) {
      return { score: 0, reasons: [] };
    }

    // Check if responsibilities from keywords match
    const responsibilities = keywords?.responsibilities ?? [];
    const matchedResponsibilities = responsibilities.filter((resp) =>
      textToMatch.includes(resp.toLowerCase()),
    );

    const ratio = matchedTerms.length / domainTerms.length;
    let score = ratio * WEIGHTS.domainSimilarity;

    if (matchedResponsibilities.length > 0) {
      score = Math.min(
        WEIGHTS.domainSimilarity,
        score + (matchedResponsibilities.length / responsibilities.length) * 5,
      );
      reasons.push(
        `Matched domain: ${matchedResponsibilities.slice(0, 3).join(", ")}`,
      );
    } else {
      reasons.push(`Domain relevance: ${matchedTerms.slice(0, 3).join(", ")}`);
    }

    return { score, reasons };
  }

  /**
   * Extract meaningful domain terms from job content.
   */
  private extractDomainTerms(jobContent: string): string[] {
    const terms: string[] = [];
    const lower = jobContent.toLowerCase();

    // Industry/domain indicators
    const domainIndicators = [
      "saas",
      "b2b",
      "b2c",
      "enterprise",
      "e-commerce",
      "ecommerce",
      "fintech",
      "healthcare",
      "edtech",
      "devtools",
      "cloud",
      "startup",
      "platform",
      "marketplace",
      "crm",
      "erp",
      "api",
      "microservices",
    ];

    for (const indicator of domainIndicators) {
      if (lower.includes(indicator)) {
        terms.push(indicator);
      }
    }

    return terms;
  }

  /**
   * Compute seniority match score.
   */
  private computeSeniorityScore(
    role: string,
    jobContent: string,
  ): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    const lowerRole = role.toLowerCase();
    const lowerJob = jobContent.toLowerCase();

    // Seniority level indicators
    const seniorityLevels = [
      { level: "junior", weight: 0.3 },
      { level: "mid", weight: 0.5 },
      { level: "senior", weight: 0.7 },
      { level: "lead", weight: 0.9 },
      { level: "principal", weight: 0.9 },
      { level: "staff", weight: 0.85 },
      { level: "architect", weight: 0.95 },
      { level: "manager", weight: 0.7 },
      { level: "head of", weight: 1.0 },
      { level: "director", weight: 1.0 },
    ];

    // Detect seniority in both role and job description
    const roleSeniority = seniorityLevels.find((s) =>
      lowerRole.includes(s.level),
    );
    const jobSeniority = seniorityLevels.find((s) =>
      lowerJob.includes(s.level),
    );

    if (!roleSeniority && !jobSeniority) {
      return { score: 0, reasons: [] };
    }

    if (roleSeniority && jobSeniority) {
      // Both mention seniority - check alignment
      const diff = Math.abs(roleSeniority.weight - jobSeniority.weight);
      if (diff <= 0.2) {
        reasons.push(`Strong seniority match: ${roleSeniority.level}`);
        return { score: WEIGHTS.roleSeniority, reasons };
      }
      reasons.push(
        `Role seniority: ${roleSeniority.level} (job seeks ${jobSeniority.level})`,
      );
      return {
        score: Math.round(WEIGHTS.roleSeniority * (1 - diff)),
        reasons,
      };
    }

    if (roleSeniority) {
      reasons.push(`Role: ${roleSeniority.level}`);
      return {
        score: Math.round(WEIGHTS.roleSeniority * 0.6),
        reasons,
      };
    }

    return { score: 0, reasons: [] };
  }

  /**
   * Compute recency score.
   */
  private computeRecencyScore(exp: Experience): {
    score: number;
    reasons: string[];
  } {
    // Current positions get maximum recency score
    if (exp.current) {
      return { score: WEIGHTS.recency, reasons: ["Currently employed"] };
    }

    if (!exp.endDate) {
      return { score: 0, reasons: [] };
    }

    // Parse end date and compute years since
    const endYear = parseInt(exp.endDate.substring(0, 4), 10);
    if (isNaN(endYear)) {
      return { score: 0, reasons: [] };
    }

    const currentYear = new Date().getFullYear();
    const yearsAgo = currentYear - endYear;

    if (yearsAgo <= 1) {
      return { score: WEIGHTS.recency, reasons: ["Recent experience"] };
    }
    if (yearsAgo <= 3) {
      return {
        score: Math.round(WEIGHTS.recency * 0.7),
        reasons: ["Recent experience"],
      };
    }
    if (yearsAgo <= 5) {
      return {
        score: Math.round(WEIGHTS.recency * 0.4),
        reasons: [],
      };
    }

    return { score: 0, reasons: [] };
  }

  /**
   * Compute leadership/mentoring match score.
   */
  private computeLeadershipScore(
    exp: Experience,
    jobContent: string,
  ): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    const lowerJob = jobContent.toLowerCase();
    const lowerRole = exp.role.toLowerCase();
    const allText = [exp.summary ?? "", ...exp.achievements]
      .join(" ")
      .toLowerCase();

    const leadershipTerms = [
      "lead",
      "leadership",
      "mentor",
      "mentoring",
      "manage",
      "management",
      "managed",
      "team lead",
      "tech lead",
      "head of",
      "director",
      "supervise",
    ];

    // Check if job requires leadership
    const jobNeedsLeadership = leadershipTerms.some((term) =>
      lowerJob.includes(term),
    );

    if (!jobNeedsLeadership) {
      return { score: 0, reasons: [] };
    }

    // Check if role or achievements show leadership
    const hasLeadership = leadershipTerms.some(
      (term) => lowerRole.includes(term) || allText.includes(term),
    );

    if (hasLeadership) {
      reasons.push("Leadership/mentoring experience");
      return { score: WEIGHTS.leadership, reasons };
    }

    return { score: 0, reasons: [] };
  }

  /**
   * Compute tenure score (longer tenure = more stability).
   */
  private computeTenureScore(exp: Experience): {
    score: number;
    reasons: string[];
  } {
    if (!exp.startDate) {
      return { score: 0, reasons: [] };
    }

    const startYear = parseInt(exp.startDate.substring(0, 4), 10);
    if (isNaN(startYear)) {
      return { score: 0, reasons: [] };
    }

    const endYear = exp.current
      ? new Date().getFullYear()
      : exp.endDate
        ? parseInt(exp.endDate.substring(0, 4), 10)
        : startYear;

    if (isNaN(endYear)) {
      return { score: 0, reasons: [] };
    }

    const tenureYears = endYear - startYear;

    if (tenureYears >= 5) {
      return {
        score: Math.round(WEIGHTS.tenure),
        reasons: [`${tenureYears}+ year tenure`],
      };
    }
    if (tenureYears >= 3) {
      return {
        score: Math.round(WEIGHTS.tenure * 0.7),
        reasons: [],
      };
    }
    if (tenureYears >= 1) {
      return {
        score: Math.round(WEIGHTS.tenure * 0.3),
        reasons: [],
      };
    }

    return { score: 0, reasons: [] };
  }
}
