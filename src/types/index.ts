/**
 * Core type definitions for cvgen.
 */

/**
 * Logging level for the application.
 */
export type LogLevel = "normal" | "verbose" | "debug";

/**
 * Application configuration schema.
 */
export interface cvgenConfig {
  /** Default profile name */
  defaultProfile: string;
  /** Default template name */
  defaultTemplate: string;
  /** Default output destination */
  defaultOutput: "stdout" | "directory" | "json";
  /** AI generation temperature */
  temperature: number;
  /** Maximum tokens for AI generation */
  maxTokens: number;
  /** Whether to record generation history */
  history: boolean;
  /** Whether to enable logging */
  logging: boolean;
  /** Prompt version identifier */
  promptVersion: string;
}

/**
 * Environment configuration (sensitive values).
 */
export interface EnvironmentConfig {
  /** AI provider name */
  provider: string;
  /** Model identifier */
  model: string;
  /** API key for the provider */
  apiKey: string;
  /** Base URL for the provider API */
  baseUrl: string;
}

/**
 * Default configuration values.
 */
export const DEFAULT_CONFIG: cvgenConfig = {
  defaultProfile: "default",
  defaultTemplate: "ats",
  defaultOutput: "stdout",
  temperature: 0.2,
  maxTokens: 8000,
  history: true,
  logging: true,
  promptVersion: "v1",
};

/**
 * Default environment values.
 */
export const DEFAULT_ENVIRONMENT: EnvironmentConfig = {
  provider: "openrouter",
  model: "openai/gpt-4o",
  apiKey: "",
  baseUrl: "https://openrouter.ai/api/v1",
};
