/**
 * Configuration validation for cvgen.
 *
 * Validates the application configuration file (config.json) and
 * environment configuration (.env) for correctness.
 */

import fs from "node:fs";
import { getConfigPath, getEnvPath } from "../config/index.js";
import type { cvgenConfig } from "../types/index.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Result of a validation check.
 */
export interface ValidationCheck {
  /** Human-readable label for the check */
  label: string;
  /** Whether the check passed */
  ok: boolean;
  /** Optional error message when the check fails */
  message?: string;
  /** Optional hint for resolving the issue */
  hint?: string;
}

/**
 * Configuration validation result.
 */
export interface ConfigValidationResult {
  /** All checks performed */
  checks: ValidationCheck[];
  /** Whether all checks passed */
  valid: boolean;
  /** Summary message */
  summary: string;
}

// ---------------------------------------------------------------------------
// Validation Functions
// ---------------------------------------------------------------------------

/**
 * Validate the config.json file exists and is valid JSON.
 */
export function validateConfigFile(): ValidationCheck {
  const configPath = getConfigPath();

  if (!fs.existsSync(configPath)) {
    return {
      label: "Config file exists",
      ok: false,
      message: "config.json not found",
      hint: "Run `cvgen init` to generate the configuration file.",
    };
  }

  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<cvgenConfig>;

    // Check for required fields
    const requiredFields: (keyof cvgenConfig)[] = [
      "defaultProfile",
      "defaultTemplate",
      "defaultOutput",
      "temperature",
      "maxTokens",
      "history",
      "logging",
      "promptVersion",
    ];

    const missingFields = requiredFields.filter(
      (field) => parsed[field] === undefined,
    );

    if (missingFields.length > 0) {
      return {
        label: "Config file structure",
        ok: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
        hint: "Run `cvgen init --force` to regenerate the configuration.",
      };
    }

    // Validate value types
    const temperature = parsed.temperature;
    if (typeof temperature !== "number" || temperature < 0 || temperature > 2) {
      return {
        label: "Config temperature value",
        ok: false,
        message: "temperature must be a number between 0 and 2",
        hint: "Set temperature to a value between 0 and 2 (recommended: 0.2).",
      };
    }

    const maxTokens = parsed.maxTokens;
    if (typeof maxTokens !== "number" || maxTokens < 1) {
      return {
        label: "Config maxTokens value",
        ok: false,
        message: "maxTokens must be a positive number",
        hint: "Set maxTokens to a value between 1 and 128000 (recommended: 8000).",
      };
    }

    const defaultOutput = parsed.defaultOutput;
    if (!["stdout", "directory", "json"].includes(defaultOutput ?? "")) {
      return {
        label: "Config defaultOutput value",
        ok: false,
        message: `Invalid defaultOutput: "${defaultOutput}"`,
        hint: "Valid values: stdout, directory, json.",
      };
    }

    return {
      label: "Config file is valid",
      ok: true,
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {
        label: "Config file is valid JSON",
        ok: false,
        message: `Invalid JSON: ${error.message}`,
        hint: "Check the file at ~/.config/cvgen/config.json for syntax errors.",
      };
    }
    return {
      label: "Config file readable",
      ok: false,
      message: (error as Error).message,
      hint: "Check file permissions.",
    };
  }
}

/**
 * Validate the .env file exists and has required values.
 */
export function validateEnvFile(): ValidationCheck {
  const envPath = getEnvPath();

  if (!fs.existsSync(envPath)) {
    return {
      label: "Environment file (.env) exists",
      ok: false,
      message: ".env file not found",
      hint: "Run `cvgen init` to generate the .env file.",
    };
  }

  try {
    const raw = fs.readFileSync(envPath, "utf-8");
    const lines = raw.split("\n").filter((l) => l.trim() && !l.startsWith("#"));

    // Parse key=value pairs
    const env: Record<string, string> = {};
    for (const line of lines) {
      const eqIndex = line.indexOf("=");
      if (eqIndex > 0) {
        const key = line.substring(0, eqIndex).trim();
        const value = line.substring(eqIndex + 1).trim();
        if (key && value) {
          env[key] = value;
        }
      }
    }

    if (!env.provider) {
      return {
        label: "Provider configured in .env",
        ok: false,
        message: "provider is not set in .env",
        hint: "Add `provider=openrouter` to ~/.config/cvgen/.env.",
      };
    }

    if (!env.model) {
      return {
        label: "Model configured in .env",
        ok: false,
        message: "model is not set in .env",
        hint: "Add `model=openai/gpt-4o` to ~/.config/cvgen/.env.",
      };
    }

    // API key is only required for remote providers
    if (
      !env.api_key &&
      env.provider !== "ollama" &&
      env.provider !== "lmstudio"
    ) {
      return {
        label: "API key configured in .env",
        ok: false,
        message: "api_key is not set in .env",
        hint: "Add your API key to ~/.config/cvgen/.env.",
      };
    }

    return {
      label: "Environment file is valid",
      ok: true,
    };
  } catch (error) {
    return {
      label: "Environment file readable",
      ok: false,
      message: (error as Error).message,
      hint: "Check file permissions for ~/.config/cvgen/.env.",
    };
  }
}

/**
 * Validate the config.json values against defaults.
 */
export function validateConfigValues(): ValidationCheck {
  const configPath = getConfigPath();

  if (!fs.existsSync(configPath)) {
    return {
      label: "Configuration values",
      ok: false,
      message: "config.json not found, cannot validate values",
      hint: "Run `cvgen init` first.",
    };
  }

  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<cvgenConfig>;

    const warnings: string[] = [];

    if (parsed.temperature !== undefined && parsed.temperature > 0.5) {
      warnings.push(
        `temperature is ${parsed.temperature} (recommended: 0.2 for deterministic output)`,
      );
    }

    if (parsed.maxTokens !== undefined && parsed.maxTokens < 2000) {
      warnings.push(
        `maxTokens is ${parsed.maxTokens} (low values may truncate generated content)`,
      );
    }

    if (warnings.length > 0) {
      return {
        label: "Configuration values are optimal",
        ok: false,
        message: warnings.join("; "),
        hint: "Review recommended values in the documentation.",
      };
    }

    return {
      label: "Configuration values are optimal",
      ok: true,
    };
  } catch {
    return {
      label: "Configuration values",
      ok: false,
      message: "Failed to read config.json",
      hint: "Check the file format.",
    };
  }
}

/**
 * Validate all configuration aspects.
 */
export function validateConfiguration(): ConfigValidationResult {
  const checks: ValidationCheck[] = [
    validateConfigFile(),
    validateEnvFile(),
    validateConfigValues(),
  ];

  const valid = checks.every((c) => c.ok);
  const failedCount = checks.filter((c) => !c.ok).length;

  return {
    checks,
    valid,
    summary: valid
      ? "All configuration checks passed."
      : `${failedCount} configuration check(s) failed.`,
  };
}

/**
 * Validate that a provider has an API key (if required).
 */
export function validateProviderApiKey(
  provider: string,
  apiKey: string,
): ValidationCheck {
  const remoteProviders = ["openrouter", "openai", "anthropic", "google"];
  const isRemote = remoteProviders.includes(provider.toLowerCase());

  if (isRemote && (!apiKey || apiKey.trim() === "")) {
    return {
      label: `API key for ${provider}`,
      ok: false,
      message: `No API key configured for ${provider}`,
      hint: `Set api_key in ~/.config/cvgen/.env or use a local provider like ollama.`,
    };
  }

  return {
    label: `API key for ${provider}`,
    ok: true,
  };
}
