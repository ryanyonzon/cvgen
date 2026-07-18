/**
 * Core type definitions for the AI generation pipeline.
 *
 * Defines the data contracts between pipeline stages:
 *   Keyword Extraction → Ranking → Resume Planning → Generation → Validation → Rendering
 */

import type { Profile } from "../types/profile.js";
import type { ParsedJob } from "../parser/types.js";
import type { cvgenConfig, EnvironmentConfig } from "../types/index.js";
import type { AIProvider } from "../ai/types.js";
import type { Logger } from "../logging/index.js";
import type { ExtractedKeywords, RankingResult } from "../ranking/types.js";

// ---------------------------------------------------------------------------
// Pipeline Options
// ---------------------------------------------------------------------------

/**
 * Options passed to the pipeline orchestrator.
 */
export interface PipelineOptions {
  /** The candidate profile to use */
  profile: Profile;
  /** The parsed job description */
  job: ParsedJob;
  /** Application configuration */
  config: cvgenConfig;
  /** Environment configuration (provider, model, etc.) */
  env: EnvironmentConfig;
  /** AI provider instance for generation calls */
  provider: AIProvider | null;
  /** Logger instance */
  logger: Logger;
  /** If true, skip AI generation and show analysis only */
  dryRun?: boolean;
  /** If true, include reasoning for decisions */
  explain?: boolean;
  /** Optional user-supplied context injected into the cover letter prompt */
  coverNote?: string;
}

// ---------------------------------------------------------------------------
// Resume Plan
// ---------------------------------------------------------------------------

/**
 * Resume plan produced before content generation.
 *
 * This planning step improves consistency by explicitly selecting
 * which items to include before generating text.
 */
export interface ResumePlan {
  /** Focus area for the summary */
  summaryFocus: string;
  /** IDs of selected experience entries */
  selectedExperience: string[];
  /** IDs of selected projects */
  selectedProjects: string[];
  /** Selected skill names */
  selectedSkills: string[];
  /** Indices of selected education entries */
  selectedEducation: string[];
  /** Names of selected certifications */
  selectedCertifications: string[];
}

// ---------------------------------------------------------------------------
// Generated Resume
// ---------------------------------------------------------------------------

/**
 * A single generated experience entry.
 */
export interface GeneratedExperience {
  company: string;
  role: string;
  location: string | null;
  startDate: string;
  endDate: string | null;
  current: boolean;
  summary: string | null;
  achievements: string[];
}

/**
 * A single generated education entry.
 */
export interface GeneratedEducation {
  school: string;
  degree: string;
  field: string | null;
  startDate: string | null;
  endDate: string | null;
}

/**
 * A single generated project entry.
 */
export interface GeneratedProject {
  name: string;
  description: string;
  technologies: string[];
  highlights: string[];
}

/**
 * Grouped skills in the generated resume.
 */
export interface GeneratedSkillGroup {
  primary: string[];
  secondary: string[];
  supporting: string[];
}

/**
 * A single generated certification entry.
 */
export interface GeneratedCertification {
  name: string;
  issuer: string;
}

/**
 * Complete generated resume document.
 *
 * This is the canonical output of the AI generation pipeline
 * before rendering. The renderer consumes this structure.
 */
export interface GeneratedResume {
  /** Schema version for backward compatibility */
  schemaVersion: number;
  /** Professional summary tailored to the target role */
  summary: string;
  /** Selected and rewritten work experience */
  experience: GeneratedExperience[];
  /** Selected education entries */
  education: GeneratedEducation[];
  /** Selected projects with highlights */
  projects: GeneratedProject[];
  /** Skills grouped by relevance */
  skills: GeneratedSkillGroup;
  /** Relevant certifications */
  certifications: GeneratedCertification[];
}

// ---------------------------------------------------------------------------
// Cover Letter
// ---------------------------------------------------------------------------

/**
 * Generated cover letter with structured sections.
 */
export interface GeneratedCoverLetter {
  greeting: string;
  introduction: string;
  body: string[];
  closing: string;
  signature: string;
}

// ---------------------------------------------------------------------------
// ATS Report
// ---------------------------------------------------------------------------

/**
 * ATS analysis report.
 */
export interface ATSReport {
  overallScore: number;
  keywordCoverage: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  recommendations: string[];
  strengths: string[];
  weaknesses: string[];
}

// ---------------------------------------------------------------------------
// Generation Metadata
// ---------------------------------------------------------------------------

/**
 * Metadata for a single generation run.
 */
export interface GenerationMetadata {
  timestamp: string;
  provider: string;
  model: string;
  promptVersion: string;
  template: string;
  duration: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number | undefined;
}

// ---------------------------------------------------------------------------
// Pipeline Result
// ---------------------------------------------------------------------------

/**
 * Complete result from the generation pipeline.
 */
export interface PipelineResult {
  /** The generated resume */
  resume: GeneratedResume;
  /** The generated cover letter */
  coverLetter: GeneratedCoverLetter;
  /** ATS analysis report */
  atsReport: ATSReport;
  /** Keywords extracted from the job description */
  keywords: ExtractedKeywords;
  /** Ranking results */
  ranking: RankingResult;
  /** Resume plan used for generation */
  plan: ResumePlan;
  /** Generation metadata */
  metadata: GenerationMetadata;
  /** Reasoning for explain mode (if enabled) */
  explanations?: PipelineExplanations;
}

// ---------------------------------------------------------------------------
// Pipeline Explanations (for --explain mode)
// ---------------------------------------------------------------------------

/**
 * Reasoning data for explain mode.
 */
export interface PipelineExplanations {
  /** Why each experience was selected or omitted */
  experience: { id: string; score: number; reasons: string[] }[];
  /** Why skills were grouped as they were */
  skills: { name: string; score: number; reasons: string[] }[];
  /** Summary reasoning */
  summary: { focus: string; reason: string };
}

// ---------------------------------------------------------------------------
// Pipeline Stage Status
// ---------------------------------------------------------------------------

/**
 * Status of a pipeline stage.
 */
export type StageStatus =
  "pending" | "running" | "completed" | "failed" | "skipped";

/**
 * Progress information for a pipeline stage.
 */
export interface StageProgress {
  name: string;
  status: StageStatus;
  current: number;
  total: number;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Result of validating a generated JSON document.
 */
export interface ValidationResult {
  /** Whether the document is valid */
  valid: boolean;
  /** List of validation errors */
  errors: string[];
  /** List of validation warnings */
  warnings: string[];
}
