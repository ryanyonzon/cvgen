/**
 * Education ranking engine.
 *
 * Ranks education entries by relevance to the target job.
 * Uses degree match, field of study alignment, and skill overlap.
 */

import type { Profile, Education } from "../types/profile.js";
import type { ParsedJob } from "../parser/types.js";
import type { Ranker, RankedItem, ExtractedKeywords } from "./types.js";

/**
 * Weight configuration for education ranking factors.
 */
const WEIGHTS = {
  degreeMatch: 30,
  fieldAlignment: 30,
  skillOverlap: 25,
  recency: 15,
} as const;

/**
 * Degree hierarchy for determining degree level match.
 */
const DEGREE_LEVELS: Record<string, number> = {
  "phd": 5,
  "doctorate": 5,
  "ph.d": 5,
  "master": 4,
  "masters": 4,
  "m.s.": 4,
  "m.a.": 4,
  "mba": 4,
  "graduate": 3,
  "bachelor": 3,
  "bachelors": 3,
  "b.s.": 3,
  "b.a.": 3,
  "undergraduate": 2,
  "associate": 2,
  "a.s.": 2,
  "a.a.": 2,
  "high school": 1,
  "diploma": 1,
  "certificate": 1,
};

/**
 * Education ranker.
 *
 * Scores education entries based on how well they align
 * with the job requirements.
 */
export class EducationRanker implements Ranker<Education> {
  public readonly name = "EducationRanker";

  /**
   * Rank education entries by relevance.
   */
  public rank(
    profile: Profile,
    job: ParsedJob,
    keywords?: ExtractedKeywords,
  ): RankedItem<Education>[] {
    const education = profile.education ?? [];

    if (education.length === 0) {
      return [];
    }

    const jobContent = job.content.toLowerCase();
    const jobEducation = keywords?.education.map((e) => e.toLowerCase()) ?? [];

    const ranked = education.map((edu) =>
      this.scoreEducation(edu, { jobContent, jobEducation }),
    );

    return ranked.sort((a, b) => b.score - a.score);
  }

  /**
   * Score a single education entry.
   */
  private scoreEducation(
    edu: Education,
    context: { jobContent: string; jobEducation: string[] },
  ): RankedItem<Education> {
    const reasons: string[] = [];
    let score = 0;

    // 1. Degree match
    const degreeScore = this.computeDegreeMatch(edu, context);
    score += degreeScore.score;
    reasons.push(...degreeScore.reasons);

    // 2. Field alignment
    const fieldScore = this.computeFieldAlignment(edu, context);
    score += fieldScore.score;
    reasons.push(...fieldScore.reasons);

    // 3. Skill overlap
    const skillScore = this.computeSkillOverlap(edu, context);
    score += skillScore.score;
    reasons.push(...skillScore.reasons);

    // 4. Recency
    const recencyScore = this.computeRecencyScore(edu);
    score += recencyScore.score;
    reasons.push(...recencyScore.reasons);

    const finalScore = Math.max(0, Math.min(100, Math.round(score)));

    return { item: edu, score: finalScore, reasons };
  }

  /**
   * Compute degree match score.
   */
  private computeDegreeMatch(
    edu: Education,
    context: { jobContent: string; jobEducation: string[] },
  ): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    const lowerDegree = edu.degree.toLowerCase();

    // Check if job mentions education requirements
    const eduTerms = [
      "bachelor",
      "master",
      "phd",
      "degree",
      "computer science",
      "engineering",
      "b.s.",
      "m.s.",
      "b.a.",
      "m.a.",
    ];

    const jobMentionsEdu = eduTerms.some((term) =>
      context.jobContent.includes(term),
    );

    if (!jobMentionsEdu && context.jobEducation.length === 0) {
      // Job doesn't emphasize education - give moderate default
      return { score: Math.round(WEIGHTS.degreeMatch * 0.5), reasons: [] };
    }

    // Check degree level against job requirements
    const jobEducationLower = context.jobEducation.map((e) => e.toLowerCase());
    const degreeInJob = jobEducationLower.some(
      (je) => je.includes(lowerDegree) || lowerDegree.includes(je),
    );

    // Check if any of the job's education requirements mention the degree level
    const eduLevel =
      Object.entries(DEGREE_LEVELS).find(([level]) =>
        lowerDegree.includes(level),
      )?.[1] ?? 0;

    if (degreeInJob || context.jobEducation.length === 0) {
      reasons.push(
        `Degree: ${edu.degree}${edu.field ? ` in ${edu.field}` : ""}`,
      );
      return { score: WEIGHTS.degreeMatch, reasons };
    }

    if (eduLevel >= 3) {
      // Has at least a bachelor's - moderately relevant
      reasons.push(`Relevant degree level: ${edu.degree}`);
      return {
        score: Math.round(WEIGHTS.degreeMatch * 0.7),
        reasons,
      };
    }

    return { score: 0, reasons: [] };
  }

  /**
   * Compute field of study alignment score.
   */
  private computeFieldAlignment(
    edu: Education,
    context: { jobContent: string; jobEducation: string[] },
  ): { score: number; reasons: string[] } {
    if (!edu.field) {
      return { score: 0, reasons: [] };
    }

    const lowerField = edu.field.toLowerCase();
    const lowerJob = context.jobContent.toLowerCase();

    // Tech-related fields
    const techFields = [
      "computer science",
      "software engineering",
      "computer engineering",
      "information technology",
      "information systems",
      "data science",
      "artificial intelligence",
      "machine learning",
      "cybersecurity",
      "electrical engineering",
      "mathematics",
      "physics",
    ];

    const isTechField = techFields.some(
      (tf) => lowerField.includes(tf) || tf.includes(lowerField),
    );

    const fieldMentionsJob = context.jobEducation.some((je) =>
      je.includes(lowerField),
    );

    if (fieldMentionsJob || (isTechField && this.isTechRole(lowerJob))) {
      return {
        score: WEIGHTS.fieldAlignment,
        reasons: [`Field: ${edu.field}`],
      };
    }

    if (isTechField) {
      return {
        score: Math.round(WEIGHTS.fieldAlignment * 0.6),
        reasons: [`Technical field: ${edu.field}`],
      };
    }

    return { score: 0, reasons: [] };
  }

  /**
   * Check if the job description indicates a technical role.
   */
  private isTechRole(jobContent: string): boolean {
    const techIndicators = [
      "software",
      "engineer",
      "developer",
      "programmer",
      "devops",
      "backend",
      "frontend",
      "full stack",
      "full-stack",
      "data",
      "cloud",
      "infrastructure",
      "technical",
      "coding",
      "programming",
    ];

    return techIndicators.some((indicator) => jobContent.includes(indicator));
  }

  /**
   * Compute skill overlap between education and job.
   */
  private computeSkillOverlap(
    edu: Education,
    context: { jobContent: string },
  ): { score: number; reasons: string[] } {
    const eduSkills = edu.skills ?? [];

    if (eduSkills.length === 0) {
      return { score: 0, reasons: [] };
    }

    const lowerJob = context.jobContent.toLowerCase();
    const matchedSkills = eduSkills.filter((skill) =>
      lowerJob.includes(skill.toLowerCase()),
    );

    if (matchedSkills.length === 0) {
      return { score: 0, reasons: [] };
    }

    const ratio = matchedSkills.length / eduSkills.length;
    return {
      score: Math.round(ratio * WEIGHTS.skillOverlap),
      reasons: [
        `Skills from education match job: ${matchedSkills.slice(0, 3).join(", ")}`,
      ],
    };
  }

  /**
   * Compute recency score based on graduation year.
   */
  private computeRecencyScore(edu: Education): {
    score: number;
    reasons: string[];
  } {
    if (!edu.endDate) {
      return { score: 0, reasons: [] };
    }

    const endYear = parseInt(edu.endDate.substring(0, 4), 10);
    if (isNaN(endYear)) {
      return { score: 0, reasons: [] };
    }

    const currentYear = new Date().getFullYear();
    const yearsAgo = currentYear - endYear;

    if (yearsAgo <= 3) {
      return {
        score: WEIGHTS.recency,
        reasons: ["Recent graduate"],
      };
    }
    if (yearsAgo <= 7) {
      return {
        score: Math.round(WEIGHTS.recency * 0.6),
        reasons: [],
      };
    }

    return { score: 0, reasons: [] };
  }
}
