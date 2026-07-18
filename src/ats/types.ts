/**
 * ATS-specific type definitions for cvgen.
 *
 * Defines data contracts for the deterministic ATS analysis engine
 * and the ATS analyzer interface.
 */

import type { GeneratedResume } from "../pipeline/types.js";
import type { ExtractedKeywords } from "../ranking/types.js";
import type { ParsedJob } from "../parser/types.js";

// ---------------------------------------------------------------------------
// ATS Analysis Result
// ---------------------------------------------------------------------------

/**
 * Categorization of how well a keyword is matched.
 */
export type KeywordMatchStatus = "matched" | "weak" | "missing";

/**
 * Detailed result for a single keyword match attempt.
 */
export interface KeywordMatchResult {
  /** The keyword being evaluated */
  keyword: string;
  /** Whether this was a required or preferred skill */
  category: "required" | "preferred";
  /** Match status */
  status: KeywordMatchStatus;
  /** Where in the resume the keyword was found (if matched) */
  location?: string;
  /** Confidence score for this match (0 = missing, 100 = explicit match) */
  confidence: number;
}

/**
 * Resume quality assessment factors.
 */
export interface ResumeQualityFactors {
  /** Whether a professional summary exists and is non-empty */
  hasSummary: boolean;
  /** Whether experience entries have achievements */
  hasAchievements: boolean;
  /** Number of experience entries */
  experienceCount: number;
  /** Whether skills are populated */
  hasSkills: boolean;
  /** Whether education is listed */
  hasEducation: boolean;
  /** Total number of unique skills listed */
  totalSkills: number;
  /** Whether contact info is present */
  hasContactInfo: boolean;
  /** Overall quality score (0-100) */
  qualityScore: number;
}

/**
 * Complete deterministic ATS analysis result.
 */
export interface ATSAnalysisResult {
  /** Overall ATS compatibility score (0-100) */
  overallScore: number;
  /** Keyword coverage percentage (0-100) */
  keywordCoverage: number;
  /** Resume quality score (0-100) */
  qualityScore: number;
  /** Keywords that are explicitly matched in the resume */
  matchedKeywords: string[];
  /** Keywords that are missing from the resume */
  missingKeywords: string[];
  /** Keywords that have weak/partial matches */
  weakKeywords: string[];
  /** Detailed keyword match results */
  keywordDetails: KeywordMatchResult[];
  /** Resume quality assessment */
  quality: ResumeQualityFactors;
  /** Actionable recommendations */
  recommendations: string[];
  /** Resume strengths */
  strengths: string[];
  /** Resume weaknesses */
  weaknesses: string[];
}

// ---------------------------------------------------------------------------
// ATS Analyzer Interface
// ---------------------------------------------------------------------------

/**
 * Options for configuring the ATS analyzer behavior.
 */
export interface ATSAnalyzerOptions {
  /** Minimum confidence threshold for a "matched" keyword (0-100) */
  matchThreshold?: number;
  /** Whether to include preferred skills in scoring */
  includePreferredSkills?: boolean;
  /** Weight of keyword coverage in overall score (0-100) */
  keywordWeight?: number;
  /** Weight of resume quality in overall score (0-100) */
  qualityWeight?: number;
}

/**
 * Deterministic ATS analyzer interface.
 *
 * Performs keyword matching, score computation, resume quality assessment,
 * and recommendation generation without AI involvement.
 */
export interface ATSAnalyzer {
  /**
   * Analyze a generated resume against job description keywords.
   *
   * @param resume - The generated resume to analyze
   * @param job - The parsed job description
   * @param keywords - Extracted keywords from the job description
   * @returns Complete ATS analysis result
   */
  analyze(
    resume: GeneratedResume,
    job: ParsedJob,
    keywords: ExtractedKeywords,
  ): ATSAnalysisResult;

  /**
   * Analyze resume quality independently of job keywords.
   *
   * @param resume - The generated resume to assess
   * @returns Quality factors and score
   */
  assessQuality(resume: GeneratedResume): ResumeQualityFactors;

  /**
   * Compute keyword match details between resume and extracted keywords.
   *
   * @param resume - The generated resume to analyze
   * @param keywords - Extracted keywords from the job description
   * @returns Detailed keyword match results
   */
  matchKeywords(
    resume: GeneratedResume,
    keywords: ExtractedKeywords,
  ): KeywordMatchResult[];
}
