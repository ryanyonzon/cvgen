/**
 * Configuration management for cvgen.
 *
 * Handles loading, saving, and validating configuration files
 * in the ~/.config/cvgen/ directory.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { ConfigurationError } from "../errors/index.js";
import type { cvgenConfig, EnvironmentConfig } from "../types/index.js";
import { DEFAULT_CONFIG, DEFAULT_ENVIRONMENT } from "../types/index.js";

// ---------------------------------------------------------------------------
// Configuration Directory
// ---------------------------------------------------------------------------

/**
 * Get the cvgen configuration directory path.
 * Defaults to ~/.config/cvgen/.
 */
export function getConfigDir(): string {
  return path.join(os.homedir(), ".config", "cvgen");
}

/**
 * Get the path to the config.json file.
 */
export function getConfigPath(): string {
  return path.join(getConfigDir(), "config.json");
}

/**
 * Get the path to the .env file.
 */
export function getEnvPath(): string {
  return path.join(getConfigDir(), ".env");
}

/**
 * Ensure the configuration directory structure exists.
 */
export function ensureConfigDir(): void {
  const dir = getConfigDir();
  const subdirs = ["profiles", "prompts", "templates", "logs", "history"];

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  for (const subdir of subdirs) {
    const subdirPath = path.join(dir, subdir);
    if (!fs.existsSync(subdirPath)) {
      fs.mkdirSync(subdirPath, { recursive: true });
    }
  }

  // Create v1 prompts directory
  const promptsV1 = path.join(dir, "prompts", "v1");
  if (!fs.existsSync(promptsV1)) {
    fs.mkdirSync(promptsV1, { recursive: true });
  }
}

// ---------------------------------------------------------------------------
// Configuration Check
// ---------------------------------------------------------------------------

/**
 * Result of checking configuration directory structure.
 */
export interface ConfigurationCheck {
  configDir: boolean;
  configFile: boolean;
  envFile: boolean;
  profiles: boolean;
  prompts: boolean;
  templates: boolean;
}

/**
 * Check the configuration directory structure.
 */
export function checkConfiguration(): ConfigurationCheck {
  const dir = getConfigDir();

  return {
    configDir: fs.existsSync(dir),
    configFile: fs.existsSync(getConfigPath()),
    envFile: fs.existsSync(getEnvPath()),
    profiles: fs.existsSync(path.join(dir, "profiles")),
    prompts: fs.existsSync(path.join(dir, "prompts")),
    templates: fs.existsSync(path.join(dir, "templates")),
  };
}

// ---------------------------------------------------------------------------
// Config Load / Save
// ---------------------------------------------------------------------------

/**
 * Load application configuration from config.json.
 *
 * Falls back to DEFAULT_CONFIG if the file doesn't exist.
 */
export function loadConfig(): cvgenConfig {
  const configPath = getConfigPath();

  if (!fs.existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<cvgenConfig>;

    return {
      defaultProfile: parsed.defaultProfile ?? DEFAULT_CONFIG.defaultProfile,
      defaultTemplate: parsed.defaultTemplate ?? DEFAULT_CONFIG.defaultTemplate,
      defaultOutput: parsed.defaultOutput ?? DEFAULT_CONFIG.defaultOutput,
      temperature: parsed.temperature ?? DEFAULT_CONFIG.temperature,
      maxTokens: parsed.maxTokens ?? DEFAULT_CONFIG.maxTokens,
      history: parsed.history ?? DEFAULT_CONFIG.history,
      logging: parsed.logging ?? DEFAULT_CONFIG.logging,
      promptVersion: parsed.promptVersion ?? DEFAULT_CONFIG.promptVersion,
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Save application configuration to config.json.
 */
export function saveConfig(config: cvgenConfig): void {
  ensureConfigDir();
  const configPath = getConfigPath();
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
}

// ---------------------------------------------------------------------------
// Environment Load / Save
// ---------------------------------------------------------------------------

/**
 * Load environment configuration from .env file.
 *
 * Falls back to DEFAULT_ENVIRONMENT if the file doesn't exist.
 * The .env file follows the standard KEY=VALUE format.
 */
export function loadEnvironment(): EnvironmentConfig {
  const envPath = getEnvPath();

  if (!fs.existsSync(envPath)) {
    return { ...DEFAULT_ENVIRONMENT };
  }

  try {
    const raw = fs.readFileSync(envPath, "utf-8");
    const env: Record<string, string> = {};

    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const eqIndex = trimmed.indexOf("=");
      if (eqIndex > 0) {
        const key = trimmed.substring(0, eqIndex).trim();
        const value = trimmed.substring(eqIndex + 1).trim();
        if (key && value) {
          env[key] = value;
        }
      }
    }

    return {
      provider: env.provider ?? DEFAULT_ENVIRONMENT.provider,
      model: env.model ?? DEFAULT_ENVIRONMENT.model,
      apiKey: env.api_key ?? env.apiKey ?? DEFAULT_ENVIRONMENT.apiKey,
      baseUrl: env.base_url ?? env.baseUrl ?? DEFAULT_ENVIRONMENT.baseUrl,
    };
  } catch {
    return { ...DEFAULT_ENVIRONMENT };
  }
}

/**
 * Save environment configuration to .env file.
 */
export function saveEnvironment(env: EnvironmentConfig): void {
  ensureConfigDir();
  const envPath = getEnvPath();

  const lines = [
    `# cvgen environment configuration`,
    `# Generated by cvgen init`,
    ``,
    `provider=${env.provider}`,
    `model=${env.model}`,
    `api_key=${env.apiKey}`,
    `base_url=${env.baseUrl}`,
    ``,
  ];

  fs.writeFileSync(envPath, lines.join("\n"), "utf-8");
}

// ---------------------------------------------------------------------------
// API Key Validation
// ---------------------------------------------------------------------------

/**
 * Validate that the API key is configured for remote providers.
 *
 * @throws ConfigurationError if the provider is remote and no API key is set
 */
export { getProfilePath } from "./profile.js";

export function validateApiKey(env: EnvironmentConfig): void {
  const remoteProviders = ["openrouter", "openai", "anthropic", "google"];
  const isRemote = remoteProviders.includes(env.provider.toLowerCase());

  if (isRemote && (!env.apiKey || env.apiKey.trim() === "")) {
    throw new ConfigurationError(
      `No API key configured for "${env.provider}". ` +
        `Set api_key in ~/.config/cvgen/.env or use a local provider.`,
    );
  }
}
