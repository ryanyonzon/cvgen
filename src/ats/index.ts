/**
 * ATS analysis module for cvgen.
 *
 * Provides deterministic ATS analysis including keyword matching,
 * score computation, resume quality assessment, and recommendations.
 *
 * @module ats
 */

export {
  DefaultATSAnalyzer,
  createATSAnalyzer,
  analyzeATS,
} from "./analyzer.js";
export type {
  ATSAnalyzer,
  ATSAnalyzerOptions,
  ATSAnalysisResult,
  ResumeQualityFactors,
  KeywordMatchResult,
  KeywordMatchStatus,
} from "./types.js";
