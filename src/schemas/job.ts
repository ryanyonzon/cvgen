/**
 * Zod schemas for job description parsing validation.
 *
 * These schemas validate parsed job descriptions to ensure
 * downstream components receive well-structured data.
 */

import { z } from "zod";
import type { ParsedJob } from "../parser/types.js";

/**
 * Schema for a parsed job description.
 *
 * This is the normalized output of every job parser.
 * Downstream components (keyword extraction, ranking, generation)
 * should consume this schema exclusively.
 */
export const ParsedJobSchema = z.object({
  title: z
    .string()
    .min(1, "Job title is required")
    .max(500, "Job title must be under 500 characters"),
  company: z
    .string()
    .max(200, "Company name must be under 200 characters")
    .optional(),
  location: z
    .string()
    .max(200, "Location must be under 200 characters")
    .optional(),
  employmentType: z
    .string()
    .max(100, "Employment type must be under 100 characters")
    .optional(),
  content: z.string().min(1, "Job description content is required"),
});

/**
 * Validation result for a parsed job.
 */
export interface ParsedJobValidationResult {
  /** Whether the parsed job is valid */
  valid: boolean;
  /** List of validation errors */
  errors: { path: string; message: string }[];
  /** List of validation warnings */
  warnings: { path: string; message: string }[];
}

/**
 * Validate a parsed job description.
 */
export function validateParsedJob(data: unknown): ParsedJobValidationResult {
  const result = ParsedJobSchema.safeParse(data);

  if (result.success) {
    const warnings: { path: string; message: string }[] = [];

    if (!result.data.company) {
      warnings.push({
        path: "company",
        message: "Company name was not detected in the job description",
      });
    }

    if (!result.data.location) {
      warnings.push({
        path: "location",
        message: "Location was not detected in the job description",
      });
    }

    if (!result.data.employmentType) {
      warnings.push({
        path: "employmentType",
        message: "Employment type was not detected in the job description",
      });
    }

    if (result.data.content.length < 50) {
      warnings.push({
        path: "content",
        message:
          "Job description content is very short - may be incomplete or failed to extract properly",
      });
    }

    return { valid: true, errors: [], warnings };
  }

  const errors = result.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));

  return { valid: false, errors, warnings: [] };
}

/**
 * Type guard to check if a value is a valid ParsedJob.
 */
export function isParsedJob(data: unknown): data is ParsedJob {
  return ParsedJobSchema.safeParse(data).success;
}

/**
 * Infer the ParsedJob type from the schema.
 */
export type InferedParsedJob = z.infer<typeof ParsedJobSchema>;
