/**
 * Template validation for cvgen.
 *
 * Validates that template files exist, have valid syntax,
 * and contain the expected placeholders for proper rendering.
 */

import fs from "node:fs";
import path from "node:path";
import { getTemplatesDir } from "../config/profile.js";
import { DEFAULT_TEMPLATES } from "../config/templates.js";
import { renderTemplate } from "../renderer/index.js";
import type { ValidationCheck } from "./config.js";

// ---------------------------------------------------------------------------
// Required Template Placeholders
// ---------------------------------------------------------------------------

/**
 * Placeholders that every template should support for proper rendering.
 */
const REQUIRED_PLACEHOLDERS = [
  "{{summary}}",
  "{{#each experience}}",
  "{{#each education}}",
];

/**
 * Optional but recommended placeholders and patterns.
 */
const RECOMMENDED_PLACEHOLDERS = [
  "{{name}}",
  "{{contact.email}}",
  "{{#if skills.primary}}",
  "{{#each projects}}",
  "{{#each certifications}}",
];

// ---------------------------------------------------------------------------
// Validation Functions
// ---------------------------------------------------------------------------

/**
 * Load template content, checking user override then built-in.
 */
function loadTemplateContent(templateName: string): string | null {
  const templatesDir = getTemplatesDir();
  const userPath = path.join(templatesDir, `${templateName}.md`);

  if (fs.existsSync(userPath)) {
    try {
      return fs.readFileSync(userPath, "utf-8");
    } catch {
      return null;
    }
  }

  return DEFAULT_TEMPLATES[`${templateName}.md`] ?? null;
}

/**
 * Validate that a specific template file exists.
 */
export function validateTemplateExists(templateName: string): ValidationCheck {
  const label = `Template: ${templateName}.md`;

  const content = loadTemplateContent(templateName);

  if (!content) {
    return {
      label,
      ok: false,
      message: `Template "${templateName}.md" not found`,
      hint: `Run \`cvgen init\` to create default templates, or add "${templateName}.md" to ~/.config/cvgen/templates/.`,
    };
  }

  return {
    label,
    ok: true,
  };
}

/**
 * Validate template syntax - checks for unmatched block tags.
 */
export function validateTemplateSyntax(templateName: string): ValidationCheck {
  const label = `Template syntax: ${templateName}.md`;

  const content = loadTemplateContent(templateName);

  if (!content) {
    return {
      label,
      ok: false,
      message: `Cannot check syntax: template "${templateName}" not found`,
      hint: "Ensure the template file exists.",
    };
  }

  // Check for unmatched {{#each}} / {{/each}} blocks
  const openEach = (content.match(/\{\{#each\s+[\w.]+\}\}/g) ?? []).length;
  const closeEach = (content.match(/\{\{\/each\}\}/g) ?? []).length;

  if (openEach !== closeEach) {
    return {
      label,
      ok: false,
      message: `Unmatched {{#each}} blocks: ${openEach} open, ${closeEach} closed`,
      hint: "Ensure every {{#each ...}} has a matching {{/each}}.",
    };
  }

  // Check for unmatched {{#if}} / {{/if}} blocks
  const openIf = (content.match(/\{\{#if\s+[\w.]+\}\}/g) ?? []).length;
  const closeIf = (content.match(/\{\{\/if\}\}/g) ?? []).length;

  if (openIf !== closeIf) {
    return {
      label,
      ok: false,
      message: `Unmatched {{#if}} blocks: ${openIf} open, ${closeIf} closed`,
      hint: "Ensure every {{#if ...}} has a matching {{/if}}.",
    };
  }

  // Check for empty template
  if (content.trim().length === 0) {
    return {
      label,
      ok: false,
      message: "Template is empty",
      hint: "Add content and placeholders to the template file.",
    };
  }

  return {
    label,
    ok: true,
  };
}

/**
 * Validate that a template has required placeholders.
 */
export function validateTemplatePlaceholders(
  templateName: string,
): ValidationCheck {
  const label = `Template placeholders: ${templateName}.md`;

  const content = loadTemplateContent(templateName);

  if (!content) {
    return {
      label,
      ok: false,
      message: `Cannot check placeholders: template "${templateName}" not found`,
      hint: "Ensure the template file exists.",
    };
  }

  const missingRequired = REQUIRED_PLACEHOLDERS.filter(
    (ph) => !content.includes(ph),
  );

  const missingRecommended = RECOMMENDED_PLACEHOLDERS.filter(
    (ph) => !content.includes(ph),
  );

  if (missingRequired.length > 0) {
    return {
      label,
      ok: false,
      message: `Missing required placeholders: ${missingRequired.join(", ")}`,
      hint: "Add these placeholders to the template for proper data injection.",
    };
  }

  if (missingRecommended.length > 0) {
    return {
      label,
      ok: true,
      message: `Missing recommended placeholders: ${missingRecommended.join(", ")}`,
      hint:
        "Consider adding these for richer output: " +
        missingRecommended.join(", "),
    };
  }

  return {
    label,
    ok: true,
  };
}

/**
 * Validate that a template renders without errors.
 */
export function validateTemplateRenders(templateName: string): ValidationCheck {
  const label = `Template renders: ${templateName}.md`;

  const content = loadTemplateContent(templateName);

  if (!content) {
    return {
      label,
      ok: false,
      message: `Cannot render: template "${templateName}" not found`,
      hint: "Ensure the template file exists.",
    };
  }

  try {
    // Render with empty data to check for errors
    const result = renderTemplate(content, {});
    // Simply checking that it doesn't throw
    if (typeof result !== "string") {
      return {
        label,
        ok: false,
        message: "Template rendering did not produce a string",
        hint: "Check the template content for issues.",
      };
    }

    return {
      label,
      ok: true,
    };
  } catch (error) {
    return {
      label,
      ok: false,
      message: `Template rendering failed: ${(error as Error).message}`,
      hint: "Check for syntax errors in the template.",
    };
  }
}

/**
 * Validate all aspects of a single template.
 */
export function validateTemplate(templateName: string): ValidationCheck[] {
  return [
    validateTemplateExists(templateName),
    validateTemplateSyntax(templateName),
    validateTemplatePlaceholders(templateName),
    validateTemplateRenders(templateName),
  ];
}

/**
 * Get the list of available template names (user + built-in).
 */
export function listTemplates(): string[] {
  const templatesDir = getTemplatesDir();
  const names = new Set<string>();

  // Add built-in templates
  for (const key of Object.keys(DEFAULT_TEMPLATES)) {
    names.add(key.replace(/\.md$/, ""));
  }

  // Add user templates
  if (fs.existsSync(templatesDir)) {
    try {
      const files = fs.readdirSync(templatesDir);
      for (const file of files) {
        if (file.endsWith(".md")) {
          names.add(file.replace(/\.md$/, ""));
        }
      }
    } catch {
      // Ignore directory read errors
    }
  }

  return Array.from(names).sort();
}

/**
 * Validate all available templates.
 */
export function validateAllTemplates(): ValidationCheck[] {
  const templateNames = listTemplates();
  const checks: ValidationCheck[] = [];

  for (const name of templateNames) {
    checks.push(...validateTemplate(name));
  }

  return checks;
}
