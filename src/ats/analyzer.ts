/**
 * Deterministic ATS analysis engine for cvgen.
 *
 * Performs keyword matching, score computation, resume quality assessment,
 * and recommendation generation without AI involvement.
 *
 * The analyzer is used in three contexts:
 *   1. As the deterministic fallback when AI-powered ATS analysis fails
 *   2. As a standalone analysis tool (e.g., `cvgen validate --ats`)
 *   3. As a pre-generation preview (e.g., `cvgen generate --dry-run`)
 */

import type { GeneratedResume } from "../pipeline/types.js";
import type { ParsedJob } from "../parser/types.js";
import type { ExtractedKeywords } from "../ranking/types.js";
import type {
  ATSAnalyzer,
  ATSAnalyzerOptions,
  ATSAnalysisResult,
  ResumeQualityFactors,
  KeywordMatchResult,
  KeywordMatchStatus,
} from "./types.js";

// ---------------------------------------------------------------------------
// Default Configuration
// ---------------------------------------------------------------------------

const DEFAULT_OPTIONS: Required<ATSAnalyzerOptions> = {
  matchThreshold: 70,
  includePreferredSkills: true,
  keywordWeight: 60,
  qualityWeight: 40,
};

// ---------------------------------------------------------------------------
// Keyword Helper
// ---------------------------------------------------------------------------

/**
 * Compute the Levenshtein distance between two strings.
 * Used for fuzzy keyword matching.
 */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = [];

  for (let i = 0; i <= m; i++) {
    dp[i] = [i];
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }

  return dp[m][n];
}

/**
 * Normalize a keyword for comparison.
 * Strips common variations and lowercases.
 */
function normalizeKeyword(keyword: string): string {
  return keyword
    .toLowerCase()
    .replace(/[^a-z0-9+#./-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Check if a keyword is explicitly present in a body of text.
 * Handles exact matches, normalized matches, and fuzzy matches.
 */
function findKeywordInText(
  keyword: string,
  text: string,
  threshold: number,
): { found: boolean; confidence: number } {
  const normalizedKeyword = normalizeKeyword(keyword);
  const normalizedText = normalizeKeyword(text);

  // Exact match after normalization
  if (normalizedText.includes(normalizedKeyword)) {
    return { found: true, confidence: 100 };
  }

  // Check individual words of the keyword
  const keywordWords = normalizedKeyword.split(" ");
  if (keywordWords.length > 1) {
    const allWordsFound = keywordWords.every((word) =>
      normalizedText.includes(word),
    );
    if (allWordsFound) {
      return { found: true, confidence: 85 };
    }
  }

  // Fuzzy match for single-word keywords (short keywords only, to avoid false positives)
  if (keywordWords.length === 1 && keywordWords[0].length > 2) {
    const textWords = normalizedText.split(/\s+/);
    for (const textWord of textWords) {
      const distance = levenshteinDistance(keywordWords[0], textWord);
      const maxLen = Math.max(keywordWords[0].length, textWord.length);
      const similarity = maxLen > 0 ? 1 - distance / maxLen : 0;

      if (similarity >= threshold / 100) {
        return { found: true, confidence: Math.round(similarity * 100) };
      }
    }
  }

  return { found: false, confidence: 0 };
}

// ---------------------------------------------------------------------------
// Resume Text Extractor
// ---------------------------------------------------------------------------

/**
 * Extract all text content from a generated resume for keyword scanning.
 */
function extractResumeText(resume: GeneratedResume): {
  fullText: string;
  sections: Record<string, string>;
} {
  const sections: Record<string, string> = {
    summary: resume.summary ?? "",
    skills: [
      ...(resume.skills?.primary ?? []),
      ...(resume.skills?.secondary ?? []),
      ...(resume.skills?.supporting ?? []),
    ].join(" "),
    experience: resume.experience
      .map(
        (e) =>
          `${e.role} ${e.company} ${e.summary ?? ""} ${(e.achievements ?? []).join(" ")}`,
      )
      .join(" "),
    education: resume.education
      .map((e) => `${e.school} ${e.degree} ${e.field ?? ""}`)
      .join(" "),
    projects: resume.projects
      .map(
        (p) =>
          `${p.name} ${p.description} ${(p.technologies ?? []).join(" ")} ${(p.highlights ?? []).join(" ")}`,
      )
      .join(" "),
    certifications: (resume.certifications ?? [])
      .map((c) => `${c.name} ${c.issuer}`)
      .join(" "),
  };

  const fullText = Object.values(sections).join(" ");

  return { fullText, sections };
}

/**
 * Determine where in the resume a keyword was found.
 */
function findKeywordLocation(
  keyword: string,
  sections: Record<string, string>,
  threshold: number,
): string | undefined {
  const locations: [string, number][] = [];

  for (const [sectionName, sectionText] of Object.entries(sections)) {
    const result = findKeywordInText(keyword, sectionText, threshold);
    if (result.found) {
      locations.push([sectionName, result.confidence]);
    }
  }

  if (locations.length === 0) return undefined;

  // Return the section with the highest confidence
  locations.sort((a, b) => b[1] - a[1]);
  return locations[0][0];
}

// ---------------------------------------------------------------------------
// ATS Analyzer Implementation
// ---------------------------------------------------------------------------

/**
 * Deterministic ATS analyzer.
 *
 * Performs keyword matching and resume quality scoring without AI.
 */
export class DefaultATSAnalyzer implements ATSAnalyzer {
  private readonly options: Required<ATSAnalyzerOptions>;

  constructor(options?: ATSAnalyzerOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Analyze a generated resume against job description keywords.
   */
  public analyze(
    resume: GeneratedResume,
    _job: ParsedJob,
    keywords: ExtractedKeywords,
  ): ATSAnalysisResult {
    // Match keywords
    const keywordDetails = this.matchKeywords(resume, keywords);

    // Categorize matches
    const matchedKeywords = keywordDetails
      .filter((k) => k.status === "matched")
      .map((k) => k.keyword);

    const weakKeywords = keywordDetails
      .filter((k) => k.status === "weak")
      .map((k) => k.keyword);

    const missingKeywords = keywordDetails
      .filter((k) => k.status === "missing")
      .map((k) => k.keyword);

    // Compute keyword coverage
    const totalKeywords = keywordDetails.length;
    const matchedCount = matchedKeywords.length;
    const partialCount = weakKeywords.length;
    const keywordCoverage =
      totalKeywords > 0
        ? Math.round(
            ((matchedCount + partialCount * 0.5) / totalKeywords) * 100,
          )
        : 100;

    // Assess resume quality
    const quality = this.assessQuality(resume);

    // Compute overall score
    const overallScore = Math.round(
      (keywordCoverage * this.options.keywordWeight +
        quality.qualityScore * this.options.qualityWeight) /
        100,
    );

    // Generate strengths and weaknesses
    const strengths = this.generateStrengths(
      matchedKeywords,
      quality,
      keywords,
    );
    const weaknesses = this.generateWeaknesses(
      missingKeywords,
      weakKeywords,
      quality,
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      missingKeywords,
      weakKeywords,
      quality,
      keywords,
    );

    return {
      overallScore,
      keywordCoverage,
      qualityScore: quality.qualityScore,
      matchedKeywords,
      missingKeywords,
      weakKeywords,
      keywordDetails,
      quality,
      recommendations,
      strengths,
      weaknesses,
    };
  }

  /**
   * Assess resume quality independently of job keywords.
   */
  public assessQuality(resume: GeneratedResume): ResumeQualityFactors {
    const hasSummary =
      typeof resume.summary === "string" && resume.summary.trim().length > 0;

    const experienceCount = resume.experience.length;
    const hasAchievements = resume.experience.some(
      (e) => (e.achievements?.length ?? 0) > 0,
    );

    const hasSkills =
      (resume.skills?.primary?.length ?? 0) > 0 ||
      (resume.skills?.secondary?.length ?? 0) > 0 ||
      (resume.skills?.supporting?.length ?? 0) > 0;

    const hasEducation =
      Array.isArray(resume.education) && resume.education.length > 0;

    const totalSkills =
      (resume.skills?.primary?.length ?? 0) +
      (resume.skills?.secondary?.length ?? 0) +
      (resume.skills?.supporting?.length ?? 0);

    const hasContactInfo = false; // Contact info comes from profile, not the generated resume

    // Calculate quality score
    let qualityScore = 0;
    const factors = [
      hasSummary ? 20 : 0,
      hasAchievements ? 20 : 0,
      Math.min(experienceCount * 8, 20), // Up to 3 experiences = 24, cap at 20
      hasSkills ? 15 : 0,
      hasEducation ? 10 : 0,
      Math.min(totalSkills * 2, 15), // Up to ~8 skills = 16, cap at 15
    ];

    qualityScore = factors.reduce((sum, f) => sum + f, 0);
    qualityScore = Math.min(qualityScore, 100);

    return {
      hasSummary,
      hasAchievements,
      experienceCount,
      hasSkills,
      hasEducation,
      totalSkills,
      hasContactInfo,
      qualityScore,
    };
  }

  /**
   * Compute keyword match details between resume and extracted keywords.
   */
  public matchKeywords(
    resume: GeneratedResume,
    keywords: ExtractedKeywords,
  ): KeywordMatchResult[] {
    const { sections } = extractResumeText(resume);
    const results: KeywordMatchResult[] = [];
    const threshold = this.options.matchThreshold;

    // Helper to add a keyword result
    const addResult = (
      keyword: string,
      category: "required" | "preferred",
    ): void => {
      const location = findKeywordLocation(keyword, sections, threshold);

      let status: KeywordMatchStatus;
      let confidence: number;

      if (location) {
        const locationResult = findKeywordInText(
          keyword,
          sections[location] ?? "",
          threshold,
        );
        confidence = locationResult.confidence;

        // Check if it's explicitly in the skills section (strong match)
        // vs. mentioned elsewhere (weak match)
        if (
          location === "skills" ||
          location === "certifications" ||
          location === "experience"
        ) {
          // Check if keyword is explicitly listed in the skills arrays
          const allSkillNames = [
            ...(resume.skills?.primary ?? []),
            ...(resume.skills?.secondary ?? []),
            ...(resume.skills?.supporting ?? []),
          ].map(normalizeKeyword);

          const normalizedKeyword = normalizeKeyword(keyword);
          const inSkillsList = allSkillNames.some((s) =>
            s.includes(normalizedKeyword),
          );

          if (inSkillsList || confidence >= 90) {
            status = "matched";
          } else if (confidence >= threshold) {
            status = "weak";
          } else {
            status = "missing";
            confidence = 0;
          }
        } else {
          status = "weak";
        }
      } else {
        status = "missing";
        confidence = 0;
      }

      results.push({
        keyword,
        category,
        status,
        location,
        confidence,
      });
    };

    // Process required skills
    for (const skill of keywords.requiredSkills) {
      addResult(skill, "required");
    }

    // Process preferred skills (if enabled)
    if (this.options.includePreferredSkills) {
      for (const skill of keywords.preferredSkills) {
        addResult(skill, "preferred");
      }
    }

    return results;
  }

  // -------------------------------------------------------------------
  // Private: Strengths, Weaknesses, Recommendations
  // -------------------------------------------------------------------

  /**
   * Generate resume strengths based on analysis.
   */
  private generateStrengths(
    matchedKeywords: string[],
    quality: ResumeQualityFactors,
    _keywords: ExtractedKeywords,
  ): string[] {
    const strengths: string[] = [];

    if (matchedKeywords.length > 0) {
      const topKeywords = matchedKeywords.slice(0, 5);
      strengths.push(`Strong keyword match for: ${topKeywords.join(", ")}`);
    }

    if (quality.hasSummary && quality.qualityScore >= 60) {
      strengths.push("Professional summary is well-crafted");
    }

    if (quality.hasAchievements) {
      strengths.push("Experience entries include measurable achievements");
    }

    if (quality.experienceCount >= 2) {
      strengths.push(
        `Relevant work experience (${quality.experienceCount} entries)`,
      );
    }

    if (quality.hasEducation) {
      strengths.push("Education section is complete");
    }

    if (quality.totalSkills >= 5) {
      strengths.push(
        `Comprehensive skill set with ${quality.totalSkills} technologies listed`,
      );
    }

    if (quality.hasSkills) {
      strengths.push("Skills are grouped by relevance for better ATS parsing");
    }

    return strengths;
  }

  /**
   * Generate resume weaknesses based on analysis.
   */
  private generateWeaknesses(
    missingKeywords: string[],
    weakKeywords: string[],
    quality: ResumeQualityFactors,
  ): string[] {
    const weaknesses: string[] = [];

    if (missingKeywords.length > 0) {
      const topMissing = missingKeywords.slice(0, 5);
      weaknesses.push(`Missing key skills: ${topMissing.join(", ")}`);
    }

    if (weakKeywords.length > 0) {
      const topWeak = weakKeywords.slice(0, 3);
      weaknesses.push(
        `Weak keyword presence: ${topWeak.join(", ")} - mentioned but not listed as a skill`,
      );
    }

    if (!quality.hasSummary) {
      weaknesses.push("No professional summary section");
    }

    if (!quality.hasAchievements && quality.experienceCount > 0) {
      weaknesses.push("Experience entries lack measurable achievements");
    }

    if (!quality.hasSkills) {
      weaknesses.push("No skills section in resume");
    }

    if (!quality.hasEducation) {
      weaknesses.push("No education section");
    }

    if (quality.experienceCount === 0) {
      weaknesses.push("No work experience entries");
    }

    if (quality.totalSkills < 5 && quality.totalSkills > 0) {
      weaknesses.push(
        `Only ${quality.totalSkills} skills listed - consider adding more relevant technologies`,
      );
    }

    return weaknesses;
  }

  /**
   * Generate actionable recommendations.
   */
  private generateRecommendations(
    missingKeywords: string[],
    weakKeywords: string[],
    quality: ResumeQualityFactors,
    keywords: ExtractedKeywords,
  ): string[] {
    const recommendations: string[] = [];

    // Missing keyword recommendations
    if (missingKeywords.length > 0) {
      const missingGroups = this.groupKeywordsByCategory(
        missingKeywords,
        keywords,
      );

      for (const [category, kws] of Object.entries(missingGroups)) {
        if (kws.length > 0) {
          const label =
            category === "required"
              ? "Required skills"
              : category === "preferred"
                ? "Preferred skills"
                : "Other keywords";
          recommendations.push(
            `Add missing ${label.toLowerCase()}: ${kws.join(", ")}`,
          );
        }
      }
    }

    // Weak keyword recommendations
    if (weakKeywords.length > 0) {
      recommendations.push(
        `Strengthen weak keyword matches by explicitly listing: ${weakKeywords.join(", ")} in the skills section`,
      );
    }

    // Quality-based recommendations
    if (!quality.hasSummary) {
      recommendations.push(
        "Add a professional summary that highlights relevant experience and key skills",
      );
    }

    if (!quality.hasAchievements && quality.experienceCount > 0) {
      recommendations.push(
        "Add specific, measurable achievements to each experience entry",
      );
    }

    if (!quality.hasSkills) {
      recommendations.push(
        "Include a dedicated skills section with relevant technologies grouped by proficiency",
      );
    }

    if (quality.totalSkills < 5) {
      recommendations.push(
        "Expand the skills section with more relevant technologies from your profile",
      );
    }

    if (
      quality.experienceCount > 0 &&
      weakKeywords.length > 0 &&
      quality.hasSkills
    ) {
      recommendations.push(
        "Ensure key technologies mentioned in experience descriptions also appear in the skills section for better ATS matching",
      );
    }

    return recommendations;
  }

  /**
   * Group keywords by their category (required vs preferred).
   */
  private groupKeywordsByCategory(
    keywords: string[],
    extracted: ExtractedKeywords,
  ): Record<string, string[]> {
    const required = extracted.requiredSkills.filter((k) =>
      keywords.includes(k),
    );
    const preferred = extracted.preferredSkills.filter((k) =>
      keywords.includes(k),
    );
    const other = keywords.filter(
      (k) => !required.includes(k) && !preferred.includes(k),
    );

    return { required, preferred, other };
  }
}

// ---------------------------------------------------------------------------
// Convenience Factory
// ---------------------------------------------------------------------------

/**
 * Create a new ATS analyzer instance with optional configuration.
 */
export function createATSAnalyzer(options?: ATSAnalyzerOptions): ATSAnalyzer {
  return new DefaultATSAnalyzer(options);
}

/**
 * Perform a complete ATS analysis in one call.
 *
 * Convenience wrapper around the ATS analyzer.
 *
 * @param resume - The generated resume
 * @param job - The parsed job description
 * @param keywords - Extracted keywords
 * @param options - Optional analyzer configuration
 * @returns Complete ATS analysis result
 */
export function analyzeATS(
  resume: GeneratedResume,
  job: ParsedJob,
  keywords: ExtractedKeywords,
  options?: ATSAnalyzerOptions,
): ATSAnalysisResult {
  const analyzer = createATSAnalyzer(options);
  return analyzer.analyze(resume, job, keywords);
}
