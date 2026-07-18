/**
 * Zod schemas for candidate profile validation.
 *
 * These schemas define the canonical shape of profile data and provide
 * runtime validation for loaded profiles.
 */

import { z } from "zod";
import type { Profile } from "../types/profile.js";

/**
 * Contact schema.
 */
const ContactSchema = z.object({
  email: z
    .string()
    .email("Contact email must be a valid email address")
    .describe("Primary email address"),
  phone: z.string().optional().describe("Phone number"),
  website: z.string().url("Website must be a valid URL").optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
});

/**
 * Social links schema.
 */
const SocialSchema = z.object({
  github: z.string().url("GitHub URL must be a valid URL").optional(),
  linkedin: z.string().url("LinkedIn URL must be a valid URL").optional(),
  gitlab: z.string().url("GitLab URL must be a valid URL").optional(),
  x: z.string().url("X/Twitter URL must be a valid URL").optional(),
  stackoverflow: z
    .string()
    .url("Stack Overflow URL must be a valid URL")
    .optional(),
  portfolio: z.string().url("Portfolio URL must be a valid URL").optional(),
  website: z.string().url("Website URL must be a valid URL").optional(),
});

/**
 * Experience schema.
 */
const ExperienceSchema = z.object({
  id: z.string().min(1, "Experience ID is required"),
  company: z.string().min(1, "Company name is required"),
  role: z.string().min(1, "Job role is required"),
  location: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  current: z.boolean(),
  summary: z.string().optional(),
  achievements: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  technologies: z.array(z.string()).default([]),
  projects: z.array(z.string()).default([]),
});

/**
 * Project schema.
 */
const ProjectSchema = z.object({
  id: z.string().min(1, "Project ID is required"),
  name: z.string().min(1, "Project name is required"),
  description: z.string().min(1, "Project description is required"),
  url: z.string().url("Project URL must be a valid URL").optional(),
  repository: z.string().url("Repository URL must be a valid URL").optional(),
  technologies: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  achievements: z.array(z.string()).default([]),
});

/**
 * Education schema.
 */
const EducationSchema = z.object({
  school: z.string().min(1, "School name is required"),
  degree: z.string().min(1, "Degree is required"),
  field: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  achievements: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
});

/**
 * Certification schema.
 */
const CertificationSchema = z.object({
  name: z.string().min(1, "Certification name is required"),
  issuer: z.string().min(1, "Issuer is required"),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  credentialId: z.string().optional(),
  url: z.string().url("Credential URL must be a valid URL").optional(),
  skills: z.array(z.string()).default([]),
});

/**
 * Complete profile schema.
 *
 * This is the single source of truth for profile validation.
 */
export const ProfileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  headline: z.string().optional(),
  summary: z.string().optional(),
  contact: ContactSchema,
  social: SocialSchema.optional(),
  skills: z.array(z.string()).optional(),
  experience: z.array(ExperienceSchema).optional(),
  education: z.array(EducationSchema).optional(),
  projects: z.array(ProjectSchema).optional(),
  certifications: z.array(CertificationSchema).optional(),
  languages: z.array(z.string()).optional(),
});

/**
 * Profile validation result.
 */
export interface ProfileValidationResult {
  /** Whether the profile is valid */
  valid: boolean;
  /** List of validation errors */
  errors: ProfileValidationIssue[];
  /** List of validation warnings */
  warnings: ProfileValidationWarning[];
}

/**
 * A single validation issue.
 */
export interface ProfileValidationIssue {
  /** Path to the field with the issue (e.g., "contact.email") */
  path: string;
  /** Description of the issue */
  message: string;
}

/**
 * A validation warning (non-blocking).
 */
export interface ProfileValidationWarning {
  path: string;
  message: string;
}

/**
 * Validate a profile object against the profile schema.
 *
 * Returns detailed validation results including errors and warnings.
 * Warnings include things like missing optional fields that are recommended,
 * while errors indicate invalid data that prevents profile use.
 */
export function validateProfile(data: unknown): ProfileValidationResult {
  const result = ProfileSchema.safeParse(data);

  if (result.success) {
    // Check for warnings on the parsed data
    const warnings: ProfileValidationWarning[] = [];

    if (!result.data.headline) {
      warnings.push({
        path: "headline",
        message: "Headline is empty - consider adding a professional headline",
      });
    }

    if (!result.data.summary) {
      warnings.push({
        path: "summary",
        message: "Summary is empty - consider adding a professional summary",
      });
    }

    if (!result.data.skills || result.data.skills.length === 0) {
      warnings.push({
        path: "skills",
        message: "No skills defined",
      });
    }

    if (!result.data.experience || result.data.experience.length === 0) {
      warnings.push({
        path: "experience",
        message: "No work experience defined",
      });
    }

    if (!result.data.education || result.data.education.length === 0) {
      warnings.push({
        path: "education",
        message: "No education entries defined",
      });
    }

    return { valid: true, errors: [], warnings };
  }

  const errors: ProfileValidationIssue[] = result.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));

  return { valid: false, errors, warnings: [] };
}

/**
 * Type guard to check if a value is a valid Profile.
 */
export function isProfile(data: unknown): data is Profile {
  return ProfileSchema.safeParse(data).success;
}

/**
 * Infer the Profile type from the schema.
 */
export type InferedProfile = z.infer<typeof ProfileSchema>;
