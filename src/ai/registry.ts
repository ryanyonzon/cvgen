/**
 * Provider registry for cvgen.
 *
 * Manages the lifecycle and discovery of AI providers.
 * Providers are registered by name and can be looked up
 * dynamically based on configuration.
 */

import type { AIProvider } from "./types.js";
import { OpenRouterProvider } from "./openrouter.js";
import { ProviderError, ConfigurationError } from "../errors/index.js";
import type { EnvironmentConfig } from "../types/index.js";

/**
 * Factory function for creating provider instances.
 */
type ProviderFactory = (env: EnvironmentConfig) => AIProvider;

/**
 * Provider registration entry.
 */
interface ProviderEntry {
  name: string;
  description: string;
  factory: ProviderFactory;
}

/**
 * Provider registry.
 *
 * Holds all available provider factories and can create
 * provider instances on demand.
 */
export class ProviderRegistry {
  private readonly providers = new Map<string, ProviderEntry>();

  /**
   * Register a provider factory.
   *
   * @param name - Provider name (e.g., "openrouter")
   * @param description - Human-readable description
   * @param factory - Factory function to create a provider instance
   */
  public register(
    name: string,
    description: string,
    factory: ProviderFactory,
  ): void {
    this.providers.set(name, { name, description, factory });
  }

  /**
   * Create a provider instance from the registry.
   *
   * @param name - Provider name to create
   * @param env - Environment configuration
   * @returns An AIProvider instance
   * @throws ProviderError if the provider is not found
   * @throws ConfigurationError if the API key is missing
   */
  public create(name: string, env: EnvironmentConfig): AIProvider {
    const entry = this.providers.get(name);

    if (!entry) {
      throw new ProviderError(
        `Unknown provider "${name}". Available providers: ${this.list()
          .map((p) => p.name)
          .join(", ")}`,
      );
    }

    if (
      !env.apiKey &&
      name !== "ollama" &&
      name !== "lm-studio" &&
      name !== "local"
    ) {
      throw new ConfigurationError(
        `API key is required for provider "${name}". Set api_key in ~/.config/cvgen/.env or use a local provider.`,
      );
    }

    return entry.factory(env);
  }

  /**
   * List all registered providers.
   */
  public list(): { name: string; description: string }[] {
    return Array.from(this.providers.values()).map((entry) => ({
      name: entry.name,
      description: entry.description,
    }));
  }

  /**
   * Check if a provider is registered.
   */
  public has(name: string): boolean {
    return this.providers.has(name);
  }

  /**
   * Get the number of registered providers.
   */
  public get size(): number {
    return this.providers.size;
  }
}

/**
 * Create the default provider registry with all built-in providers.
 */
export function createDefaultRegistry(): ProviderRegistry {
  const registry = new ProviderRegistry();

  // Register OpenRouter
  registry.register(
    "openrouter",
    "OpenRouter - Unified API for multiple AI models",
    (env: EnvironmentConfig) => {
      return new OpenRouterProvider({
        apiKey: env.apiKey,
        baseUrl: env.baseUrl,
      });
    },
  );

  // Future providers will be registered here as they are implemented:
  // registry.register("openai", "OpenAI - GPT-4, GPT-3.5, and more", ...)
  // registry.register("anthropic", "Anthropic - Claude models", ...)
  // registry.register("ollama", "Ollama - Local AI models", ...)
  // registry.register("google", "Google - Gemini models", ...)
  // registry.register("lm-studio", "LM Studio - Local model hosting", ...)
  // registry.register("azure", "Azure OpenAI - Enterprise OpenAI", ...)

  return registry;
}

/**
 * Singleton provider registry instance.
 *
 * Used throughout the application as the single source of truth
 * for available providers.
 */
let defaultRegistry: ProviderRegistry | null = null;

/**
 * Get the default provider registry, creating it if needed.
 */
export function getDefaultRegistry(): ProviderRegistry {
  if (!defaultRegistry) {
    defaultRegistry = createDefaultRegistry();
  }
  return defaultRegistry;
}

/**
 * Create a provider from environment configuration.
 *
 * Convenience function that uses the default registry.
 *
 * @param env - Environment configuration
 * @returns An AIProvider instance
 */
export function createProvider(env: EnvironmentConfig): AIProvider {
  return getDefaultRegistry().create(env.provider || "openrouter", env);
}
