/**
 * Project ranking engine.
 *
 * Ranks projects by relevance to the target job using technology
 * overlap, domain similarity, and job description keyword matching.
 */

import type { Profile, Project } from "../types/profile.js";
import type { ParsedJob } from "../parser/types.js";
import type { Ranker, RankedItem, ExtractedKeywords } from "./types.js";

/**
 * Weight configuration for project ranking factors.
 */
const WEIGHTS = {
  technologyMatch: 40,
  domainSimilarity: 25,
  descriptionRelevance: 20,
  recency: 15,
} as const;

/**
 * Project ranker.
 *
 * Scores each project based on how well it aligns with the target role.
 */
export class ProjectRanker implements Ranker<Project> {
  public readonly name = "ProjectRanker";

  /**
   * Rank projects by relevance.
   */
  public rank(
    profile: Profile,
    job: ParsedJob,
    keywords?: ExtractedKeywords,
  ): RankedItem<Project>[] {
    const projects = profile.projects ?? [];

    if (projects.length === 0) {
      return [];
    }

    const jobContent = job.content.toLowerCase();
    const requiredSkills =
      keywords?.requiredSkills.map((s) => s.toLowerCase()) ?? [];
    const preferredSkills =
      keywords?.preferredSkills.map((s) => s.toLowerCase()) ?? [];

    const ranked = projects.map((project) =>
      this.scoreProject(project, {
        jobContent,
        requiredSkills,
        preferredSkills,
        keywords,
      }),
    );

    return ranked.sort((a, b) => b.score - a.score);
  }

  /**
   * Score a single project.
   */
  private scoreProject(
    project: Project,
    context: {
      jobContent: string;
      requiredSkills: string[];
      preferredSkills: string[];
      keywords?: ExtractedKeywords;
    },
  ): RankedItem<Project> {
    const reasons: string[] = [];
    let score = 0;

    // 1. Technology match
    const techScore = this.computeTechnologyMatch(
      project,
      context.requiredSkills,
      context.preferredSkills,
      context.jobContent,
    );
    score += techScore.score;
    reasons.push(...techScore.reasons);

    // 2. Domain similarity
    const domainScore = this.computeDomainSimilarity(
      project,
      context.jobContent,
    );
    score += domainScore.score;
    reasons.push(...domainScore.reasons);

    // 3. Description relevance
    const descScore = this.computeDescriptionRelevance(
      project,
      context.jobContent,
      context.keywords,
    );
    score += descScore.score;
    reasons.push(...descScore.reasons);

    // Clamp score to 0-100
    const finalScore = Math.max(0, Math.min(100, Math.round(score)));

    return { item: project, score: finalScore, reasons };
  }

  /**
   * Compute technology match score.
   */
  private computeTechnologyMatch(
    project: Project,
    requiredSkills: string[],
    preferredSkills: string[],
    jobContent: string,
  ): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    const allTech = [
      ...project.technologies.map((t) => t.toLowerCase()),
      ...project.skills.map((s) => s.toLowerCase()),
    ];

    if (allTech.length === 0) {
      return { score: 0, reasons: [] };
    }

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

    const jobMatches = allTech.filter((tech) => jobContent.includes(tech));

    let score = 0;

    if (requiredMatches.length > 0) {
      const ratio = requiredMatches.length / Math.max(requiredSkills.length, 1);
      score += ratio * WEIGHTS.technologyMatch;
      reasons.push(
        `Matched required technologies: ${requiredMatches.slice(0, 5).join(", ")}`,
      );
    } else if (preferredMatches.length > 0) {
      const ratio =
        preferredMatches.length / Math.max(preferredSkills.length, 1);
      score += ratio * WEIGHTS.technologyMatch * 0.7;
      reasons.push(
        `Matched preferred technologies: ${preferredMatches.slice(0, 3).join(", ")}`,
      );
    } else if (jobMatches.length > 0) {
      score +=
        (jobMatches.length / Math.max(allTech.length, 1)) *
        WEIGHTS.technologyMatch *
        0.3;
      reasons.push(
        `Technologies mentioned in job: ${jobMatches.slice(0, 3).join(", ")}`,
      );
    }

    return { score, reasons };
  }

  /**
   * Compute domain similarity score.
   */
  private computeDomainSimilarity(
    project: Project,
    jobContent: string,
  ): { score: number; reasons: string[] } {
    const lowerName = project.name.toLowerCase();
    const lowerDesc = project.description.toLowerCase();

    const domainTerms = [
      "saas",
      "api",
      "web",
      "mobile",
      "cloud",
      "platform",
      "enterprise",
      "b2b",
      "b2c",
      "analytics",
      "dashboard",
      "automation",
      "crm",
      "erp",
      "e-commerce",
    ];

    const jobTerms = domainTerms.filter((term) => jobContent.includes(term));
    if (jobTerms.length === 0) {
      return { score: 0, reasons: [] };
    }

    const projectTerms = jobTerms.filter(
      (term) => lowerName.includes(term) || lowerDesc.includes(term),
    );

    if (projectTerms.length === 0) {
      return { score: 0, reasons: [] };
    }

    const ratio = projectTerms.length / jobTerms.length;
    return {
      score: Math.round(ratio * WEIGHTS.domainSimilarity),
      reasons: [`Domain alignment: ${projectTerms.slice(0, 3).join(", ")}`],
    };
  }

  /**
   * Compute description relevance score.
   */
  private computeDescriptionRelevance(
    project: Project,
    jobContent: string,
    keywords?: ExtractedKeywords,
  ): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    const lowerDesc = [
      project.description.toLowerCase(),
      ...project.achievements.map((a) => a.toLowerCase()),
    ].join(" ");

    // Count job content terms appearing in the description
    const jobWords = new Set(
      jobContent
        .split(/\s+/)
        .filter((w) => w.length > 3)
        .slice(0, 100),
    );

    const matchingWords = [...jobWords].filter((word) =>
      lowerDesc.includes(word),
    );

    if (matchingWords.length === 0) {
      return { score: 0, reasons: [] };
    }

    const ratio = matchingWords.length / Math.min(jobWords.size, 100);

    // Bonus for responsibility matches
    const responsibilities = keywords?.responsibilities ?? [];
    const matchedResponsibilities = responsibilities.filter((resp) =>
      lowerDesc.includes(resp.toLowerCase()),
    );

    let score = Math.round(ratio * WEIGHTS.descriptionRelevance);
    if (matchedResponsibilities.length > 0) {
      score = Math.min(WEIGHTS.descriptionRelevance, score + 10);
      reasons.push(
        `Matches responsibilities: ${matchedResponsibilities.slice(0, 2).join(", ")}`,
      );
    } else {
      reasons.push(`Relevant description`);
    }

    return { score, reasons };
  }
}
