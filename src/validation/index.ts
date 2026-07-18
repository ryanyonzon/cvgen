/**
 * Validation module for cvgen.
 *
 * Provides validation for configuration, prompts, templates, profiles,
 * and job descriptions. Used by the `validate` and `doctor` commands.
 *
 * @module validation
 */

export {
  validateConfiguration,
  validateConfigFile,
  validateEnvFile,
  validateConfigValues,
  validateProviderApiKey,
} from "./config.js";

export type { ValidationCheck, ConfigValidationResult } from "./config.js";

export {
  validateAllPrompts,
  validatePrompt,
  validatePromptStructure,
} from "./prompts.js";

export {
  validateTemplate,
  validateTemplateExists,
  validateTemplateSyntax,
  validateTemplatePlaceholders,
  validateTemplateRenders,
  validateAllTemplates,
  listTemplates,
} from "./templates.js";
