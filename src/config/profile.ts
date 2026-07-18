/**
 * Profile management for cvgen.
 *
 * Handles loading, listing, and validating candidate profiles
 * stored in ~/.config/cvgen/profiles/.
 */

import fs from "node:fs";
import path from "node:path";
import { getConfigDir } from "./index.js";
import type { Profile } from "../types/profile.js";
import { validateProfile } from "../schemas/profile.js";

// ---------------------------------------------------------------------------
// Directory Helpers
// ---------------------------------------------------------------------------

/**
 * Get the profiles directory path.
 */
export function getProfilesDir(): string {
  return path.join(getConfigDir(), "profiles");
}

/**
 * Get the prompts directory path for a specific version.
 */
export function getPromptsDir(version: string): string {
  return path.join(getConfigDir(), "prompts", version);
}

/**
 * Get the templates directory path.
 */
export function getTemplatesDir(): string {
  return path.join(getConfigDir(), "templates");
}

// ---------------------------------------------------------------------------
// Profile CRUD
// ---------------------------------------------------------------------------

/**
 * List all available profile names (without .json extension).
 */
export function listProfiles(): string[] {
  const profilesDir = getProfilesDir();

  if (!fs.existsSync(profilesDir)) {
    return [];
  }

  try {
    const files = fs.readdirSync(profilesDir);
    return files
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""))
      .sort();
  } catch {
    return [];
  }
}

/**
 * Load a profile by name.
 *
 * @param name - Profile name (without .json extension)
 * @returns The parsed Profile, or null if not found or invalid
 */
export function loadProfile(name: string): Profile | null {
  const profilesDir = getProfilesDir();
  const profilePath = path.join(profilesDir, `${name}.json`);

  if (!fs.existsSync(profilePath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(profilePath, "utf-8");
    const data = JSON.parse(raw) as Profile;

    // Apply defaults for optional fields
    return {
      ...data,
      skills: data.skills ?? [],
      experience: data.experience ?? [],
      education: data.education ?? [],
      projects: data.projects ?? [],
      certifications: data.certifications ?? [],
    };
  } catch {
    return null;
  }
}

/**
 * Save a profile to disk.
 *
 * @param name - Profile name (without .json extension)
 * @param profile - The profile data to save
 */
export function saveProfile(name: string, profile: Profile): void {
  const profilesDir = getProfilesDir();

  if (!fs.existsSync(profilesDir)) {
    fs.mkdirSync(profilesDir, { recursive: true });
  }

  const profilePath = path.join(profilesDir, `${name}.json`);
  fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2), "utf-8");
}

/**
 * Check if a profile exists.
 *
 * @param name - Profile name (without .json extension)
 */
export function profileExists(name: string): boolean {
  const profilePath = path.join(getProfilesDir(), `${name}.json`);
  return fs.existsSync(profilePath);
}

/**
 * Delete a profile from disk.
 *
 * @param name - Profile name (without .json extension)
 * @returns true if the profile was deleted, false if it didn't exist
 */
export function deleteProfile(name: string): boolean {
  const profilePath = path.join(getProfilesDir(), `${name}.json`);

  if (!fs.existsSync(profilePath)) {
    return false;
  }

  try {
    fs.unlinkSync(profilePath);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Profile Validation
// ---------------------------------------------------------------------------

/**
 * Validation result for a single profile.
 */
export interface SingleProfileValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate all profiles in the profiles directory.
 *
 * @returns Map of profile name to validation result
 */
export function validateAllProfiles(): Map<string, SingleProfileValidationResult> {
  const names = listProfiles();
  const results = new Map<string, SingleProfileValidationResult>();

  for (const name of names) {
    const profile = loadProfile(name);

    if (!profile) {
      results.set(name, {
        valid: false,
        errors: ["Failed to load profile file"],
        warnings: [],
      });
      continue;
    }

    const validation = validateProfile(profile);

    results.set(name, {
      valid: validation.valid,
      errors: validation.errors.map((e) => `${e.path}: ${e.message}`),
      warnings: validation.warnings.map((w) => `${w.path}: ${w.message}`),
    });
  }

  return results;
}

/**
 * Validate a single profile by name.
 *
 * @returns Validation result, or null if the profile doesn't exist
 */
export function validateProfileByName(
  name: string,
): SingleProfileValidationResult | null {
  const profile = loadProfile(name);

  if (!profile) {
    return null;
  }

  const validation = validateProfile(profile);

  return {
    valid: validation.valid,
    errors: validation.errors.map((e) => `${e.path}: ${e.message}`),
    warnings: validation.warnings.map((w) => `${w.path}: ${w.message}`),
  };
}

/**
 * Create a default profile and save it.
 *
 * @returns The created default profile
 */
export function createDefaultProfile(): Profile {
  const profile: Profile = {
    name: "",
    headline: "",
    summary: "",
    contact: {
      email: "",
    },
    skills: [],
    experience: [],
    education: [],
    projects: [],
    certifications: [],
  };

  return profile;
}
