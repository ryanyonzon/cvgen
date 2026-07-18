/**
 * Skill ranking engine.
 *
 * Groups skills by relevance to the target job using keyword matching
 * and frequency analysis. Produces primary, secondary, and supporting
 * skill groups.
 */

import type { Profile } from "../types/profile.js";
import type { ParsedJob } from "../parser/types.js";
import type {
  Ranker,
  RankedItem,
  ExtractedKeywords,
  RankedSkillGroup,
} from "./types.js";

/**
 * Skill ranker.
 *
 * Scores and groups skills based on their relevance to the job description.
 * Skills are classified as primary (core), secondary (moderate),
 * supporting (some), or omitted (low/no relevance).
 */
export class SkillRanker implements Ranker<string> {
  public readonly name = "SkillRanker";

  /**
   * Rank and group skills by relevance.
   *
   * Note: This implements the Ranker interface for type compatibility,
   * but the primary output is the full RankingResult. The rank() method
   * returns individual skill scores; use groupSkills() for grouping.
   */
  public rank(
    profile: Profile,
    job: ParsedJob,
    keywords?: ExtractedKeywords,
  ): RankedItem<string>[] {
    const skills = profile.skills ?? [];

    if (skills.length === 0) {
      return [];
    }

    const jobContent = job.content.toLowerCase();
    const requiredSkills =
      keywords?.requiredSkills.map((s) => s.toLowerCase()) ?? [];
    const preferredSkills =
      keywords?.preferredSkills.map((s) => s.toLowerCase()) ?? [];

    const ranked = skills.map((skill) => {
      const lowerSkill = skill.toLowerCase();

      // Check direct match against required skills
      const isRequired = requiredSkills.some(
        (rs) => rs.includes(lowerSkill) || lowerSkill.includes(rs),
      );

      // Check direct match against preferred skills
      const isPreferred = preferredSkills.some(
        (ps) => ps.includes(lowerSkill) || lowerSkill.includes(ps),
      );

      // Check appearance in job content
      const appearsInJob = jobContent.includes(lowerSkill);

      // Compute score
      let score = 0;
      const reasons: string[] = [];

      if (isRequired) {
        score += 90;
        reasons.push("Required skill in job description");
      } else if (isPreferred) {
        score += 70;
        reasons.push("Preferred skill in job description");
      }

      if (appearsInJob && !isRequired && !isPreferred) {
        score += 40;
        reasons.push("Mentioned in job description");
      } else if (appearsInJob) {
        score += 10; // Bonus for appearing even if already matched
      }

      // Frequency bonus - count occurrences in job content
      const occurrences = (jobContent.match(new RegExp(lowerSkill, "gi")) ?? [])
        .length;
      if (occurrences > 1) {
        const freqBonus = Math.min(occurrences * 2, 20);
        score += freqBonus;
      }

      return {
        item: skill,
        score: Math.min(100, score),
        reasons,
      };
    });

    // Sort by score descending
    return ranked.sort((a, b) => b.score - a.score);
  }

  /**
   * Group skills into primary, secondary, and supporting categories.
   *
   * This is the primary method for pipeline consumption.
   */
  public groupSkills(
    profile: Profile,
    job: ParsedJob,
    keywords?: ExtractedKeywords,
  ): RankedSkillGroup {
    const ranked = this.rank(profile, job, keywords);

    const primary: string[] = [];
    const secondary: string[] = [];
    const supporting: string[] = [];
    const omitted: string[] = [];

    for (const r of ranked) {
      if (r.score >= 70) {
        primary.push(r.item);
      } else if (r.score >= 40) {
        secondary.push(r.item);
      } else if (r.score >= 20) {
        supporting.push(r.item);
      } else {
        omitted.push(r.item);
      }
    }

    return { primary, secondary, supporting, omitted };
  }
}

/**
 * Experience-level skill ranker.
 *
 * Ranks skills aggregated from experience entries, giving weight
 * to skills used in more relevant (high-scoring) experiences.
 */
export class ExperienceSkillRanker {
  public readonly name = "ExperienceSkillRanker";

  /**
   * Aggregate skills from experiences and rank them.
   * Skills from higher-scoring experiences get a boost.
   */
  public rankFromExperience(
    rankedExperiences: RankedItem<import("../types/profile.js").Experience>[],
    job: ParsedJob,
    keywords?: ExtractedKeywords,
  ): RankedItem<string>[] {
    const skillScores = new Map<
      string,
      {
        totalScore: number;
        count: number;
        maxExpScore: number;
        reasons: string[];
      }
    >();

    for (const rankedExp of rankedExperiences) {
      const allSkills = [
        ...rankedExp.item.technologies,
        ...rankedExp.item.skills,
      ];

      for (const skill of allSkills) {
        const existing = skillScores.get(skill) ?? {
          totalScore: 0,
          count: 0,
          maxExpScore: 0,
          reasons: [],
        };

        existing.totalScore += rankedExp.score;
        existing.count += 1;
        existing.maxExpScore = Math.max(existing.maxExpScore, rankedExp.score);

        skillScores.set(skill, existing);
      }
    }

    const jobContent = job.content.toLowerCase();
    const requiredSkills =
      keywords?.requiredSkills.map((s) => s.toLowerCase()) ?? [];
    const preferredSkills =
      keywords?.preferredSkills.map((s) => s.toLowerCase()) ?? [];

    const ranked: RankedItem<string>[] = [];

    for (const [skill, data] of skillScores) {
      const lowerSkill = skill.toLowerCase();
      let score = 0;
      const reasons: string[] = [];

      // Base score from experience relevance
      const avgExpScore = data.totalScore / data.count;
      score += avgExpScore * 0.4;

      // Boost from appearing in multiple experiences
      if (data.count > 1) {
        score += Math.min(data.count * 5, 15);
      }

      // Match against required skills
      const isRequired = requiredSkills.some(
        (rs) => rs.includes(lowerSkill) || lowerSkill.includes(rs),
      );
      if (isRequired) {
        score += 30;
        reasons.push("Required skill");
      }

      // Match against preferred skills
      const isPreferred = preferredSkills.some(
        (ps) => ps.includes(lowerSkill) || lowerSkill.includes(ps),
      );
      if (isPreferred) {
        score += 20;
        reasons.push("Preferred skill");
      }

      // Job content mention
      if (jobContent.includes(lowerSkill)) {
        score += 10;
      }

      ranked.push({
        item: skill,
        score: Math.min(100, Math.round(score)),
        reasons,
      });
    }

    return ranked.sort((a, b) => b.score - a.score);
  }
}
