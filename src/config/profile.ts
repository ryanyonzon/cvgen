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
import { DEFAULT_PROFILE } from "./defaults.js";
import { DEFAULT_PROMPTS } from "./defaults.js";
import { DEFAULT_TEMPLATES } from "./templates.js";

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
 * Get the full path to a profile file.
 *
 * @param name - Profile name (without .json extension)
 */
export function getProfilePath(name: string): string {
  return path.join(getProfilesDir(), `${name}.json`);
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
  const profilePath = getProfilePath(name);

  if (!fs.existsSync(profilePath)) {
    return null;
  }

  const raw = fs.readFileSync(profilePath, "utf-8");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Profile "${name}" contains invalid JSON`);
  }

  const validation = validateProfile(parsed);
  if (!validation.valid) {
    const msgs = validation.errors.map((e) => `${e.path}: ${e.message}`).join("; ");
    throw new Error(`Profile "${name}" is invalid: ${msgs}`);
  }

  return parsed as Profile;
}

/**
 * Save a profile to disk.
 *
 * @param name - Profile name (without .json extension)
 * @param profile - The profile data to save
 */
export function saveProfile(name: string, profile: Profile): void {
  const validation = validateProfile(profile);
  if (!validation.valid) {
    const msgs = validation.errors.map((e) => `${e.path}: ${e.message}`).join("; ");
    throw new Error(`Invalid profile: ${msgs}`);
  }

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
export function validateAllProfiles(): Map<
  string,
  SingleProfileValidationResult
> {
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
 * Generate and save all default configuration files.
 *
 * @param force - If true, overwrite existing files; if false, skip existing
 */
export function generateDefaults(force: boolean): void {
  const configDir = getConfigDir();

  // Ensure directories exist
  const dirs = [
    configDir,
    path.join(configDir, "profiles"),
    path.join(configDir, "prompts"),
    path.join(configDir, "prompts", "v1"),
    path.join(configDir, "templates"),
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // Write default profile
  const profilePath = path.join(configDir, "profiles", "default.json");
  if (force || !fs.existsSync(profilePath)) {
    fs.writeFileSync(profilePath, JSON.stringify(DEFAULT_PROFILE, null, 2), "utf-8");
  }

  // Write prompt files
  const promptsDir = path.join(configDir, "prompts", "v1");
  for (const [filename, content] of Object.entries(DEFAULT_PROMPTS)) {
    const filePath = path.join(promptsDir, filename);
    if (force || !fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, content, "utf-8");
    }
  }

  // Write template files
  const templatesDir = path.join(configDir, "templates");
  for (const [filename, content] of Object.entries(DEFAULT_TEMPLATES)) {
    const filePath = path.join(templatesDir, filename);
    if (force || !fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, content, "utf-8");
    }
  }
}

/**
 * Validate a single profile by nesDir = path.join(configDir, \"templates\");\n  for (const [filename, content] of Object.entries(DEFAULT_TEMPLATES)) {\n    const filePath = path.join(templatesDir, filename);\n    if (force || !fs.existsSync(filePath)) {\n      fs.writeFileSync(filePath, content, \"utf-8\");\n    }\n  }\n}\n\n/**\n * Validate a single profile by name.", {"oldText": "export function profileExists(name: string): boolean {\n  return path.join(getProfilesDir(), `${name}.json`);\n}", "newText": "export function profileExists(name: string): boolean {\n  return fs.existsSync(getProfilePath(name));\n}"}]
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
