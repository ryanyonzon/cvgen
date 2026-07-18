/**
 * Template renderer for cvgen.
 *
 * Consumes structured GeneratedResume + GeneratedCoverLetter + Profile data
 * and renders Markdown output using presentation-only templates.
 *
 * Template syntax (logic-light):
 *   {{variable}}              - Simple substitution
 *   {{#if variable}}...{{/if}} - Conditional block (with {{else}} support)
 *   {{#each array}}...{{/each}} - Iteration over arrays
 *   Nested path: {{contact.email}}, {{skills.primary}}
 *
 * Array interpolation joins with ", " by default.
 * Inside {{#each}}, the context variable `this` is the current item.
 */

import fs from "node:fs";
import path from "node:path";
import { getTemplatesDir } from "../config/profile.js";
import { DEFAULT_TEMPLATES } from "../config/templates.js";
import { RenderingError, IOError } from "../errors/index.js";
import type { Profile } from "../types/profile.js";
import type {
  GeneratedResume,
  GeneratedCoverLetter,
  PipelineResult,
} from "../pipeline/types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Flat data map for template substitution.
 */
type TemplateData = Record<string, unknown>;

/**
 * Output mode for generated documents.
 */
export type OutputMode = "stdout" | "directory" | "json";

/**
 * Options for writing output.
 */
export interface OutputOptions {
  /** Output mode */
  mode: OutputMode;
  /** Output directory (when mode is "directory") */
  outDir?: string;
  /** Template name to use */
  templateName?: string;
  /** Custom template content (overrides templateName) */
  templateContent?: string;
}

// ---------------------------------------------------------------------------
// Template Engine
// ---------------------------------------------------------------------------

/**
 * Simple template engine supporting:
 *   {{variable}}                  - substitution
 *   {{#if variable}}...{{/if}}    - conditional (with {{else}})
 *   {{#each array}}...{{/each}}   - iteration
 *   Nested paths: {{a.b.c}}
 *
 * This is intentionally logic-light per the SPEC.
 * No embedded scripting, no complex expressions.
 *
 * Handles arbitrarily nested {{#each}} and {{#if}} blocks using
 * depth-counting to find matching closing tags.
 */
export function renderTemplate(template: string, data: TemplateData): string {
  // Process {{#each ...}} ... {{/each}} blocks first
  template = processEachBlocks(template, data);
  // Process {{#if ...}} ... {{else}} ... {{/if}} blocks
  template = processIfBlocks(template, data);
  // Process remaining simple {{variable}} substitutions
  template = processVariables(template, data);
  return template;
}

/**
 * Resolve a dotted path against the data object.
 * E.g., "contact.email" → data["contact"].email
 */
function resolvePath(obj: TemplateData, pathStr: string): unknown {
  const parts = pathStr.trim().split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (
      current === null ||
      current === undefined ||
      typeof current !== "object"
    ) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Process {{#each array}}...{{/each}} blocks with proper nesting support.
 *
 * Uses depth-counting to find the matching {{/each}} for each {{#each}},
 * handling arbitrarily nested each blocks (e.g., achievements inside experience).
 */
function processEachBlocks(template: string, data: TemplateData): string {
  const eachOpenRegex = /\{\{#each\s+([\w.]+)\}\}/;
  let result = template;
  let match: RegExpExecArray | null;

  while ((match = eachOpenRegex.exec(result)) !== null) {
    const openTag = match[0];
    const pathStr = match[1];
    const openIndex = match.index;
    const bodyStart = openIndex + openTag.length;

    // Find matching {{/each}} by counting nesting depth
    let depth = 1;
    let pos = bodyStart;

    while (pos < result.length && depth > 0) {
      // Check for nested {{#each ...}}
      if (result.slice(pos).startsWith("{{#each ")) {
        depth++;
        pos += 1;
        continue;
      }
      // Check for {{/each}}
      if (result.slice(pos).startsWith("{{/each}}")) {
        depth--;
        if (depth > 0) {
          pos += "{{/each}}".length;
        }
        continue;
      }
      pos++;
    }

    if (depth > 0) {
      // No matching close tag found - skip to avoid infinite loop
      break;
    }

    const body = result.slice(bodyStart, pos);
    const closeEnd = pos + "{{/each}}".length;

    const arrayVal = resolvePath(data, pathStr);
    let replacement = "";

    if (Array.isArray(arrayVal) && arrayVal.length > 0) {
      replacement = arrayVal
        .map((item: unknown) => {
          // Create a context where `this` is the item
          const context: TemplateData = {
            ...data,
            this: item as Record<string, unknown>,
          };

          // Flatten item properties onto context (override existing keys)
          // This ensures item properties like `summary` override the global `summary`
          if (typeof item === "object" && item !== null) {
            for (const [key, val] of Object.entries(
              item as Record<string, unknown>,
            )) {
              context[key] = val;
            }
          }

          // Recursively process nested blocks in the body
          let processed = processEachBlocks(body, context);
          processed = processIfBlocks(processed, context);
          processed = processVariables(processed, context);
          return processed;
        })
        .join("\n");
    }

    result = result.slice(0, openIndex) + replacement + result.slice(closeEnd);
  }

  return result;
}

/**
 * Process {{#if variable}}...{{else}}...{{/if}} blocks with proper nesting support.
 *
 * Uses depth-counting to find the matching {{/if}} for each {{#if}},
 * handling nested if blocks and supporting the {{else}} branch.
 */
function processIfBlocks(template: string, data: TemplateData): string {
  const ifOpenRegex = /\{\{#if\s+([\w.]+)\}\}/;
  let result = template;
  let match: RegExpExecArray | null;

  while ((match = ifOpenRegex.exec(result)) !== null) {
    const openTag = match[0];
    const pathStr = match[1];
    const openIndex = match.index;
    const bodyStart = openIndex + openTag.length;

    // Find matching {{/if}} by counting nesting depth
    let depth = 1;
    let elseIndex = -1;
    let pos = bodyStart;

    while (pos < result.length && depth > 0) {
      // Check for nested {{#if ...}}
      if (result.slice(pos).startsWith("{{#if ")) {
        depth++;
        pos += 1;
        continue;
      }
      // Check for {{/if}}
      if (result.slice(pos).startsWith("{{/if}}")) {
        depth--;
        if (depth > 0) {
          pos += "{{/if}}".length;
        }
        continue;
      }
      // Check for {{else}} (only at depth 1)
      if (depth === 1 && result.slice(pos).startsWith("{{else}}")) {
        elseIndex = pos;
        pos += "{{else}}".length;
        continue;
      }
      pos++;
    }

    if (depth > 0) {
      // No matching close tag found - skip to avoid infinite loop
      break;
    }

    // Determine the two branches
    const closeIndex = pos;
    const closeEnd = closeIndex + "{{/if}}".length;

    let body: string;
    let elseBody: string;

    if (elseIndex >= 0) {
      body = result.slice(bodyStart, elseIndex);
      elseBody = result.slice(elseIndex + "{{else}}".length, closeIndex);
    } else {
      body = result.slice(bodyStart, closeIndex);
      elseBody = "";
    }

    const value = resolvePath(data, pathStr);
    const isTruthy =
      value !== undefined &&
      value !== null &&
      value !== false &&
      value !== "" &&
      !(Array.isArray(value) && value.length === 0);

    let rendered = "";
    if (isTruthy) {
      // Render the if-body recursively
      let processed = processEachBlocks(body, data);
      processed = processIfBlocks(processed, data);
      processed = processVariables(processed, data);
      rendered = processed;
    } else if (elseBody) {
      // Render the else-body recursively
      let processed = processEachBlocks(elseBody, data);
      processed = processIfBlocks(processed, data);
      processed = processVariables(processed, data);
      rendered = processed;
    }

    result = result.slice(0, openIndex) + rendered + result.slice(closeEnd);
  }

  return result;
}

/**
 * Process simple {{variable}} substitutions.
 */
function processVariables(template: string, data: TemplateData): string {
  const varRegex = /\{\{([\w.]+)\}\}/g;

  return template.replace(varRegex, (_match, pathStr: string) => {
    const value = resolvePath(data, pathStr);

    if (value === undefined || value === null) {
      return "";
    }

    if (Array.isArray(value)) {
      return value.join(", ");
    }

    return String(value);
  });
}

// ---------------------------------------------------------------------------
// Template Loader
// ---------------------------------------------------------------------------

/**
 * Load a template by name from the templates directory.
 *
 * Search order:
 *   1. ~/.config/cvgen/templates/<name>.md (user override)
 *   2. Built-in template (DEFAULT_TEMPLATES)
 *
 * Falls back to "ats.md" if the template is not found.
 */
export function loadTemplate(templateName: string): string {
  // Try user template first
  const templatesDir = getTemplatesDir();
  const userPath = path.join(templatesDir, `${templateName}.md`);

  if (fs.existsSync(userPath)) {
    try {
      return fs.readFileSync(userPath, "utf-8");
    } catch {
      // Fall through to default
    }
  }

  // Try built-in template
  const builtInKey = `${templateName}.md`;
  if (builtInKey in DEFAULT_TEMPLATES) {
    return DEFAULT_TEMPLATES[builtInKey];
  }

  // Fall back to ATS template
  if (templateName !== "ats") {
    return loadTemplate("ats");
  }

  throw new RenderingError(
    `Template "${templateName}" not found and no fallback available.`,
  );
}

// ---------------------------------------------------------------------------
// Document Builder
// ---------------------------------------------------------------------------

/**
 * Build the template data object from profile, generated resume, and cover letter.
 */
function buildTemplateData(
  profile: Profile,
  resume: GeneratedResume,
  coverLetter: GeneratedCoverLetter,
): TemplateData {
  // Merge profile data with generated resume data
  return {
    // From profile
    name: profile.name ?? "",
    headline: profile.headline ?? "",
    contact: profile.contact ?? {},
    social: profile.social ?? {},

    // From generated resume (overrides profile summary)
    summary: resume.summary,

    // Generated experience with technologies field for templates
    experience: resume.experience.map((exp) => ({
      ...exp,
      technologies: "",
    })),

    // Skills
    skills: resume.skills,

    // Education
    education: resume.education,

    // Projects
    projects: resume.projects.map((proj) => ({
      ...proj,
      technologies: Array.isArray(proj.technologies)
        ? proj.technologies.join(", ")
        : "",
    })),

    // Certifications
    certifications: resume.certifications,

    // Cover letter
    coverLetter: {
      greeting: coverLetter.greeting,
      introduction: coverLetter.introduction,
      body: coverLetter.body,
      closing: coverLetter.closing,
      signature: coverLetter.signature,
    },
  };
}

// ---------------------------------------------------------------------------
// Main Renderer
// ---------------------------------------------------------------------------

/**
 * Render a complete Markdown document from pipeline results.
 *
 * Output includes:
 *   1. Resume (from template + generated resume)
 *   2. Cover letter (if generated)
 *
 * @param profile - The candidate profile
 * @param resume - The generated resume
 * @param coverLetter - The generated cover letter
 * @param templateContent - Optional template content (loads default if omitted)
 * @returns Rendered Markdown string
 */
export function renderDocument(
  profile: Profile,
  resume: GeneratedResume,
  coverLetter?: GeneratedCoverLetter,
  templateContent?: string,
): string {
  const template = templateContent ?? loadTemplate("ats");
  const data = buildTemplateData(
    profile,
    resume,
    coverLetter ?? {
      greeting: "",
      introduction: "",
      body: [],
      closing: "",
      signature: "",
    },
  );

  // Render resume from template
  const resumeMarkdown = renderTemplate(template, data);

  // Append cover letter if present
  if (coverLetter && coverLetter.greeting) {
    const letterSections = [
      "",
      "---",
      "",
      "# Cover Letter",
      "",
      coverLetter.greeting,
      "",
      coverLetter.introduction,
      "",
      ...coverLetter.body.map((p) => `${p}\n`),
      coverLetter.closing,
      "",
      coverLetter.signature,
    ];

    return `${resumeMarkdown}\n${letterSections.join("\n")}`;
  }

  return resumeMarkdown;
}

/**
 * Render only the resume section.
 */
export function renderResumeOnly(
  profile: Profile,
  resume: GeneratedResume,
  templateContent?: string,
): string {
  const template = templateContent ?? loadTemplate("ats");
  const data = buildTemplateData(profile, resume, {
    greeting: "",
    introduction: "",
    body: [],
    closing: "",
    signature: "",
  });

  return renderTemplate(template, data);
}

/**
 * Render only the cover letter section.
 */
export function renderCoverLetterOnly(
  _profile: Profile,
  coverLetter: GeneratedCoverLetter,
): string {
  if (!coverLetter.greeting) {
    return "";
  }

  const parts: string[] = [
    coverLetter.greeting,
    "",
    coverLetter.introduction,
    "",
    ...coverLetter.body.map((p) => `${p}\n`),
    coverLetter.closing,
    "",
    coverLetter.signature,
  ];

  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Output Writer
// ---------------------------------------------------------------------------

/**
 * Write generated documents to the appropriate destination.
 *
 * @param result - Complete pipeline result
 * @param profile - The candidate profile
 * @param options - Output options
 * @returns Object with paths or stdout marker
 */
export async function writeOutput(
  result: PipelineResult,
  profile: Profile,
  options: OutputOptions,
): Promise<{ type: string; path?: string; content?: string }> {
  const templateContent =
    options.templateContent ?? loadTemplate(options.templateName ?? "ats");

  switch (options.mode) {
    case "stdout": {
      // Render combined document to stdout
      const combined = renderDocument(
        profile,
        result.resume,
        result.coverLetter,
        templateContent,
      );

      process.stdout.write(combined);
      process.stdout.write("\n");

      return { type: "stdout" };
    }

    case "directory": {
      const outDir = options.outDir ?? "./generated";
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
      }

      // Render each document
      const resumeMd = renderResumeOnly(
        profile,
        result.resume,
        templateContent,
      );
      const coverLetterMd = renderCoverLetterOnly(profile, result.coverLetter);
      const combinedMd = renderDocument(
        profile,
        result.resume,
        result.coverLetter,
        templateContent,
      );

      // Write files
      const files: { name: string; content: string }[] = [
        { name: "resume.md", content: resumeMd },
        { name: "combined.md", content: combinedMd },
        {
          name: "generation.json",
          content: JSON.stringify(result.resume, null, 2),
        },
        {
          name: "ats-report.md",
          content: formatATSReport(result.atsReport),
        },
      ];

      if (coverLetterMd) {
        files.push({ name: "cover-letter.md", content: coverLetterMd });
      }

      for (const file of files) {
        const filePath = path.join(outDir, file.name);
        try {
          fs.writeFileSync(filePath, file.content, "utf-8");
        } catch (error) {
          throw new IOError(
            `Failed to write output file "${file.name}": ${(error as Error).message}`,
          );
        }
      }

      return { type: "directory", path: outDir };
    }

    case "json": {
      const json = JSON.stringify(
        {
          resume: result.resume,
          coverLetter: result.coverLetter,
          atsReport: result.atsReport,
          metadata: result.metadata,
        },
        null,
        2,
      );

      process.stdout.write(json);
      process.stdout.write("\n");

      return { type: "stdout", content: json };
    }

    default:
      throw new RenderingError(`Unknown output mode: ${options.mode}`);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format an ATS report as Markdown.
 */
function formatATSReport(report: {
  overallScore: number;
  keywordCoverage: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  recommendations: string[];
  strengths: string[];
  weaknesses: string[];
}): string {
  const lines: string[] = [
    "# ATS Analysis Report",
    "",
    `**Overall Score:** ${report.overallScore}/100`,
    `**Keyword Coverage:** ${report.keywordCoverage}%`,
    "",
  ];

  if (report.matchedKeywords.length > 0) {
    lines.push("## Matched Keywords", "");
    for (const kw of report.matchedKeywords) {
      lines.push(`- ✔ ${kw}`);
    }
    lines.push("");
  }

  if (report.missingKeywords.length > 0) {
    lines.push("## Missing Keywords", "");
    for (const kw of report.missingKeywords) {
      lines.push(`- ✘ ${kw}`);
    }
    lines.push("");
  }

  if (report.strengths.length > 0) {
    lines.push("## Strengths", "");
    for (const s of report.strengths) {
      lines.push(`- ${s}`);
    }
    lines.push("");
  }

  if (report.weaknesses.length > 0) {
    lines.push("## Weaknesses", "");
    for (const w of report.weaknesses) {
      lines.push(`- ${w}`);
    }
    lines.push("");
  }

  if (report.recommendations.length > 0) {
    lines.push("## Recommendations", "");
    for (const r of report.recommendations) {
      lines.push(`- ${r}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
