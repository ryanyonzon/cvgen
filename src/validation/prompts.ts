/**
 * Prompt validation for cvgen.
 *
 * Validates that prompt files exist, have content, and contain
 * the expected sections for proper AI generation.
 */

import fs from "node:fs";
import path from "node:path";
import { getPromptsDir } from "../config/profile.js";
import { DEFAULT_PROMPTS } from "../config/defaults.js";
import type { ValidationCheck } from "./config.js";

// ---------------------------------------------------------------------------
// Required Prompt Files
// ---------------------------------------------------------------------------

/**
 * List of required prompt files.
 */
const REQUIRED_PROMPTS = [
  "system.md",
  "resume.md",
  "cover-letter.md",
  "keyword-extraction.md",
  "ats.md",
];

/**
 * Expected content markers for each prompt file.
 * These are key phrases that should appear in well-formed prompts.
 */
const PROMPT_CONTENT_MARKERS: Record<string, string[]> = {
  "system.md": [
    "NEVER fabricate",
    "You may ONLY",
    "valid JSON",
    "Output Format",
  ],
  "resume.md": [
    "summary",
    "experience",
    "skills",
    "education",
    "Output Schema",
  ],
  "cover-letter.md": [
    "greeting",
    "introduction",
    "body",
    "closing",
    "signature",
  ],
  "keyword-extraction.md": [
    "requiredSkills",
    "preferredSkills",
    "softSkills",
    "responsibilities",
  ],
  "ats.md": [
    "overallScore",
    "keywordCoverage",
    "matchedKeywords",
    "missingKeywords",
  ],
};

// ---------------------------------------------------------------------------
// Validation Functions
// ---------------------------------------------------------------------------

/**
 * Check if a prompt file exists (either user override or built-in).
 */
function promptExists(promptName: string, promptVersion: string): boolean {
  // Check user override first
  const promptsDir = getPromptsDir(promptVersion);
  const userPath = path.join(promptsDir, promptName);

  if (fs.existsSync(userPath)) {
    return true;
  }

  // Fall back to built-in
  return promptName in DEFAULT_PROMPTS;
}

/**
 * Load prompt content, checking user override then built-in.
 */
function loadPromptContent(
  promptName: string,
  promptVersion: string,
): string | null {
  const promptsDir = getPromptsDir(promptVersion);
  const userPath = path.join(promptsDir, promptName);

  if (fs.existsSync(userPath)) {
    try {
      return fs.readFileSync(userPath, "utf-8");
    } catch {
      return null;
    }
  }

  return DEFAULT_PROMPTS[promptName] ?? null;
}

/**
 * Validate that a specific prompt file exists and has valid content.
 */
export function validatePrompt(
  promptName: string,
  promptVersion: string,
): ValidationCheck {
  const label = `Prompt: ${promptName}`;

  if (!promptExists(promptName, promptVersion)) {
    return {
      label,
      ok: false,
      message: `Prompt file "${promptName}" not found for version "${promptVersion}"`,
      hint: `Run \`cvgen init\` to create default prompts, or create ${promptsDirPath(promptVersion, promptName)}.`,
    };
  }

  const content = loadPromptContent(promptName, promptVersion);

  if (!content || content.trim().length === 0) {
    return {
      label,
      ok: false,
      message: `Prompt "${promptName}" is empty`,
      hint: "Check the prompt file content and ensure it contains instructions.",
    };
  }

  // Check for expected content markers
  const markers = PROMPT_CONTENT_MARKERS[promptName];
  if (markers && markers.length > 0) {
    const missingMarkers = markers.filter(
      (marker) => !content.includes(marker),
    );

    if (missingMarkers.length > 0) {
      return {
        label,
        ok: false,
        message: `Missing expected sections: ${missingMarkers.join(", ")}`,
        hint: `Ensure the prompt contains instructions for: ${missingMarkers.join(", ")}.`,
      };
    }
  }

  return {
    label,
    ok: true,
  };
}

/**
 * Helper to build a user-friendly path hint.
 */
function promptsDirPath(promptVersion: string, filename: string): string {
  return `~/.config/cvgen/prompts/${promptVersion}/${filename}`;
}

/**
 * Validate all required prompt files for a given version.
 */
export function validateAllPrompts(promptVersion: string): ValidationCheck[] {
  return REQUIRED_PROMPTS.map((name) => validatePrompt(name, promptVersion));
}

/**
 * Validate that the prompt version directory structure is correct.
 */
export function validatePromptStructure(
  promptVersion: string,
): ValidationCheck {
  const promptsDir = getPromptsDir(promptVersion);

  if (!fs.existsSync(promptsDir)) {
    return {
      label: `Prompt version directory: ${promptVersion}`,
      ok: true, // Built-in prompts will be used as fallback
      message: `Custom prompt directory not found at ${promptsDir}`,
      hint: "Built-in prompts will be used. Create the directory to override prompts.",
    };
  }

  return {
    label: `Prompt version directory: ${promptVersion}`,
    ok: true,
  };
}
