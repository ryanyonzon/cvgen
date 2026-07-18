/**
 * Core type definitions for the ranking engine.
 *
 * All rankers (experience, skills, projects, education) share
 * a common interface and produce ranked items with scores.
 */

import type { Profile } from "../types/profile.js";
import type { ParsedJob } from "../parser/types.js";

/**
 * A ranked item with a relevance score and reasoning.
 */
export interface RankedItem<T> {
  /** The original item being ranked */
  item: T;
  /** Relevance score from 0 (irrelevant) to 100 (perfect match) */
  score: number;
  /** Human-readable reasons for the score */
  reasons: string[];
}

/**
 * Extracted keywords and signals from a job description.
 */
export interface ExtractedKeywords {
  /** Technologies, tools, and frameworks explicitly required */
  requiredSkills: string[];
  /** Technologies and skills listed as preferred or nice-to-have */
  preferredSkills: string[];
  /** Interpersonal and professional qualities mentioned */
  softSkills: string[];
  /** Key duties and expectations for the role */
  responsibilities: string[];
  /** Years of experience, seniority level, and domain expertise */
  experience: string[];
  /** Required or preferred educational background */
  education: string[];
}

/**
 * Generic ranking engine interface.
 *
 * Every ranker takes a profile and a parsed job description
 * and returns ranked items with scores and reasoning.
 */
export interface Ranker<T> {
  /** Human-readable ranker name */
  readonly name: string;

  /**
   * Rank items from the profile against the job description.
   *
   * @param profile - The candidate profile containing items to rank
   * @param job - The parsed job description
   * @param keywords - Extracted keywords for scoring (optional)
   * @returns Ranked items sorted by score (highest first)
   */
  rank(
    profile: Profile,
    job: ParsedJob,
    keywords?: ExtractedKeywords,
  ): RankedItem<T>[];
}

/**
 * Result of a ranking operation.
 */
export interface RankingResult {
  /** Ranked work experience entries */
  experience: RankedItem<import("../types/profile.js").Experience>[];
  /** Ranked skills grouped by relevance */
  skills: RankedSkillGroup;
  /** Ranked projects */
  projects: RankedItem<import("../types/profile.js").Project>[];
  /** Ranked education entries */
  education: RankedItem<import("../types/profile.js").Education>[];
  /** Ranked certifications */
  certifications: RankedItem<import("../types/profile.js").Certification>[];
}

/**
 * Skill groups determined by relevance scoring.
 */
export interface RankedSkillGroup {
  /** Core skills most relevant to the target role */
  primary: string[];
  /** Secondary skills with moderate relevance */
  secondary: string[];
  /** Supporting skills with some relevance */
  supporting: string[];
  /** Skills that were omitted due to low relevance */
  omitted: string[];
}
