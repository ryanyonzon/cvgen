/**
 * Pipeline orchestration for the AI generation pipeline.
 *
 * Orchestrates the full pipeline from profile loading through
 * keyword extraction, ranking, AI generation, validation, and rendering.
 *
 * Pipeline stages:
 *   1. Profile loading & validation
 *   2. Job description parsing
 *   3. Keyword extraction (AI)
 *   4. Experience ranking (deterministic)
 *   5. Skill ranking (deterministic)
 *   6. Project ranking (deterministic)
 *   7. Education ranking (deterministic)
 *   8. Resume planning (AI)
 *   9. Resume generation (AI)
 *   10. ATS analysis (AI)
 *   11. Cover letter generation (AI)
 *   12. Validation (deterministic)
 */

import type {
  PipelineOptions,
  PipelineResult,
  PipelineExplanations,
  GenerationMetadata,
  ResumePlan,
} from "./types.js";
import type { ParsedJob } from "../parser/types.js";
import {
  extractKeywords,
  generateResumePlan,
  generateResume,
  generateCoverLetter,
  generateATSReport,
} from "./stages.js";
import { RankingEngine } from "../ranking/index.js";

// ---------------------------------------------------------------------------
// Pipeline Orchestrator
// ---------------------------------------------------------------------------

/**
 * Run the complete generation pipeline.
 *
 * @param options - Pipeline configuration and inputs
 * @returns Complete pipeline result with generated documents
 */
export async function runPipeline(
  options: PipelineOptions,
): Promise<PipelineResult> {
  const { profile, job, config, env, provider, logger, dryRun, explain } =
    options;

  const startTime = Date.now();
  const totalSteps = dryRun ? 5 : 9;
  let currentStep = 0;

  // -----------------------------------------------------------------------
  // Step 1: Load profile (already loaded by caller)
  // -----------------------------------------------------------------------
  currentStep++;
  logger.step(currentStep, totalSteps, "Profile loaded");

  // -----------------------------------------------------------------------
  // Step 2: Parse job description (already parsed by caller)
  // -----------------------------------------------------------------------
  currentStep++;
  logger.step(currentStep, totalSteps, "Job description parsed");

  // -----------------------------------------------------------------------
  // Step 3: Keyword Extraction (AI)
  // -----------------------------------------------------------------------
  currentStep++;
  logger.step(currentStep, totalSteps, "Extracting keywords...");

  let keywords;
  if (dryRun) {
    keywords = extractKeywordsDeterministic(job);
  } else {
    keywords = await extractKeywords(profile, job, provider, config, env);
  }

  logger.verbose(
    `Extracted ${keywords.requiredSkills.length} required, ${keywords.preferredSkills.length} preferred skills`,
  );

  // -----------------------------------------------------------------------
  // Step 4: Ranking (deterministic)
  // -----------------------------------------------------------------------
  currentStep++;
  logger.step(currentStep, totalSteps, "Ranking profile items...");

  const rankingEngine = new RankingEngine();
  const ranking = rankingEngine.rankAll(profile, job, keywords);

  logger.verbose(
    `Ranked ${ranking.experience.length} experiences, ${ranking.projects.length} projects, ` +
      `${ranking.education.length} education entries`,
  );

  if (dryRun) {
    const metadata: GenerationMetadata = {
      timestamp: new Date().toISOString(),
      provider: env.provider,
      model: env.model,
      promptVersion: config.promptVersion,
      template: config.defaultTemplate,
      duration: Date.now() - startTime,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCost: 0,
    };

    const plan: ResumePlan = {
      summaryFocus: "Dry run - no AI generation performed",
      selectedExperience: ranking.experience.slice(0, 3).map((e) => e.item.id),
      selectedProjects: ranking.projects.slice(0, 2).map((p) => p.item.id),
      selectedSkills: ranking.skills.primary.slice(0, 10),
      selectedEducation: ["0"],
      selectedCertifications: [],
    };

    if (explain) {
      logger.info("\n[Explain Mode]");
      logger.info("Keywords:");
      logger.info(`  Required: ${keywords.requiredSkills.join(", ")}`);
      logger.info(`  Preferred: ${keywords.preferredSkills.join(", ")}`);
      logger.info("\nTop Experience:");
      for (const exp of ranking.experience.slice(0, 3)) {
        logger.info(
          `  ${exp.item.role} at ${exp.item.company} - Score: ${exp.score}`,
        );
        for (const reason of exp.reasons) {
          logger.info(`    → ${reason}`);
        }
      }
      logger.info("\nSkills:");
      logger.info(`  Primary: ${ranking.skills.primary.join(", ")}`);
      logger.info(`  Omitted: ${ranking.skills.omitted.join(", ")}`);
    }

    return {
      resume: {
        schemaVersion: 1,
        summary: "",
        experience: [],
        education: [],
        projects: [],
        skills: ranking.skills,
        certifications: [],
      },
      coverLetter: {
        greeting: "",
        introduction: "",
        body: [],
        closing: "",
        signature: "",
      },
      atsReport: {
        overallScore: 0,
        keywordCoverage: 0,
        matchedKeywords: [],
        missingKeywords: [],
        recommendations: [],
        strengths: [],
        weaknesses: [],
      },
      keywords,
      ranking,
      plan,
      metadata,
      explanations: explain ? buildExplanations(ranking) : undefined,
    };
  }

  // Provider is required for non-dry-run execution
  if (!provider) {
    throw new Error("AI provider is required when dryRun is false");
  }

  // -----------------------------------------------------------------------
  // Step 5: Resume Planning (AI)
  // -----------------------------------------------------------------------
  currentStep++;
  logger.step(currentStep, totalSteps, "Planning resume...");

  const plan = await generateResumePlan(
    profile,
    job,
    keywords,
    ranking,
    provider,
    config,
    env,
  );

  logger.verbose(
    `Plan: ${plan.selectedExperience.length} experiences, ${plan.selectedProjects.length} projects`,
  );

  // -----------------------------------------------------------------------
  // Step 6: Resume Generation (AI)
  // -----------------------------------------------------------------------
  currentStep++;
  logger.step(currentStep, totalSteps, "Generating resume...");

  const resume = await generateResume(
    profile,
    job,
    keywords,
    ranking,
    plan,
    provider,
    config,
    env,
  );

  logger.verbose(
    `Generated resume: ${resume.experience.length} experiences, ` +
      `${resume.skills.primary.length} primary skills`,
  );

  // -----------------------------------------------------------------------
  // Step 7: ATS Analysis (AI)
  // -----------------------------------------------------------------------
  currentStep++;
  logger.step(currentStep, totalSteps, "Running ATS analysis...");

  const atsReport = await generateATSReport(
    resume,
    job,
    keywords,
    provider,
    config,
    env,
  );

  logger.verbose(
    `ATS score: ${atsReport.overallScore}, ${atsReport.matchedKeywords.length} keywords matched`,
  );

  // -----------------------------------------------------------------------
  // Step 8: Cover Letter Generation (AI)
  // -----------------------------------------------------------------------
  currentStep++;
  logger.step(currentStep, totalSteps, "Generating cover letter...");

  const coverLetter = await generateCoverLetter(
    profile,
    job,
    resume,
    keywords,
    provider,
    config,
    env,
    options.coverNote,
  );

  logger.verbose("Cover letter generated");

  // -----------------------------------------------------------------------
  // Step 9: Finalize
  // -----------------------------------------------------------------------
  currentStep++;
  logger.step(currentStep, totalSteps, "Finalizing...");

  const duration = Date.now() - startTime;

  const metadata: GenerationMetadata = {
    timestamp: new Date().toISOString(),
    provider: env.provider,
    model: env.model,
    promptVersion: config.promptVersion,
    template: config.defaultTemplate,
    duration,
    inputTokens: 0, // Will be populated from provider response if available
    outputTokens: 0,
    estimatedCost: undefined,
  };

  return {
    resume,
    coverLetter,
    atsReport,
    keywords,
    ranking,
    plan,
    metadata,
    explanations: explain ? buildExplanations(ranking) : undefined,
  };
}

/**
 * Build explanation data for explain mode.
 */
function buildExplanations(
  ranking: import("../ranking/types.js").RankingResult,
): PipelineExplanations {
  return {
    experience: ranking.experience.map((e) => ({
      id: e.item.id,
      score: e.score,
      reasons: e.reasons,
    })),
    skills: [
      ...ranking.skills.primary.map((s) => ({
        name: s,
        score: 90,
        reasons: ["Primary skill - highly relevant to target role"],
      })),
      ...ranking.skills.secondary.map((s) => ({
        name: s,
        score: 60,
        reasons: ["Secondary skill - moderately relevant"],
      })),
      ...ranking.skills.supporting.map((s) => ({
        name: s,
        score: 30,
        reasons: ["Supporting skill - some relevance"],
      })),
    ],
    summary: {
      focus: "Tailored to match target role requirements",
      reason: "Based on keyword extraction and experience ranking",
    },
  };
}

/**
 * Deterministic keyword extraction (for dry-run mode).
 */
export function extractKeywordsDeterministic(
  job: ParsedJob,
): import("../ranking/types.js").ExtractedKeywords {
  const content = job.content.toLowerCase();

  // Common tech keywords
  const techKeywords = [
    "javascript",
    "typescript",
    "python",
    "java",
    "go",
    "rust",
    "c++",
    "react",
    "vue",
    "angular",
    "node",
    "express",
    "next",
    "nuxt",
    "laravel",
    "php",
    "ruby",
    "rails",
    "django",
    "flask",
    "docker",
    "kubernetes",
    "aws",
    "gcp",
    "azure",
    "terraform",
    "postgresql",
    "mysql",
    "mongodb",
    "redis",
    "elasticsearch",
    "graphql",
    "rest",
    "api",
    "microservices",
    "serverless",
    "git",
    "ci/cd",
    "jenkins",
    "github actions",
  ];

  const requiredSkills: string[] = [];
  const preferredSkills: string[] = [];

  for (const tech of techKeywords) {
    if (content.includes(tech)) {
      // Check context: "preferred" or "nice to have" sections
      const index = content.indexOf(tech);
      const contextStart = Math.max(0, index - 100);
      const context = content.substring(contextStart, index + tech.length + 50);

      if (
        context.includes("preferred") ||
        context.includes("nice to have") ||
        context.includes("bonus") ||
        context.includes("plus")
      ) {
        preferredSkills.push(tech);
      } else {
        requiredSkills.push(tech);
      }
    }
  }

  return {
    requiredSkills,
    preferredSkills,
    softSkills: [],
    responsibilities: [],
    experience: [],
    education: [],
  };
}
