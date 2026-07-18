/**
 * Cost estimation for AI provider usage.
 *
 * Provides per-model pricing data and estimation utilities.
 * Prices are in USD per 1M tokens.
 */

/**
 * Pricing entry for a model or model pattern.
 */
interface PricingEntry {
  /** Model ID pattern to match (e.g., "openai/gpt-4o*") */
  pattern: string;
  /** Price per 1M input tokens in USD */
  inputPrice: number;
  /** Price per 1M output tokens in USD */
  outputPrice: number;
  /** Optional note about the pricing source */
  note?: string;
}

/**
 * Known pricing data for common models.
 *
 * Sources:
 * - OpenRouter: https://openrouter.ai/models (retrieved 2026-07-09)
 * - OpenAI: https://openai.com/api/pricing/
 * - Anthropic: https://www.anthropic.com/pricing
 *
 * Prices are approximate and may change over time.
 */
const PRICING_TABLE: PricingEntry[] = [
  // OpenAI models (via OpenRouter)
  { pattern: "openai/gpt-5*", inputPrice: 10.0, outputPrice: 40.0 },
  { pattern: "openai/gpt-4o*", inputPrice: 2.5, outputPrice: 10.0 },
  { pattern: "openai/gpt-4o-mini*", inputPrice: 0.15, outputPrice: 0.6 },
  { pattern: "openai/gpt-4-turbo*", inputPrice: 10.0, outputPrice: 30.0 },
  { pattern: "openai/gpt-4*", inputPrice: 30.0, outputPrice: 60.0 },
  { pattern: "openai/gpt-3.5-turbo*", inputPrice: 0.5, outputPrice: 1.5 },
  { pattern: "openai/o1*", inputPrice: 15.0, outputPrice: 60.0 },
  { pattern: "openai/o3*", inputPrice: 10.0, outputPrice: 40.0 },

  // Anthropic models
  {
    pattern: "anthropic/claude-3.5-sonnet*",
    inputPrice: 3.0,
    outputPrice: 15.0,
  },
  { pattern: "anthropic/claude-3-opus*", inputPrice: 15.0, outputPrice: 75.0 },
  { pattern: "anthropic/claude-3-haiku*", inputPrice: 0.25, outputPrice: 1.25 },
  { pattern: "anthropic/claude-4*", inputPrice: 15.0, outputPrice: 75.0 },

  // Google models
  { pattern: "google/gemini-2.0-flash*", inputPrice: 0.1, outputPrice: 0.4 },
  { pattern: "google/gemini-2.0-pro*", inputPrice: 2.0, outputPrice: 8.0 },
  { pattern: "google/gemini-1.5-pro*", inputPrice: 1.25, outputPrice: 5.0 },

  // Meta / Llama models
  { pattern: "meta-llama/llama-3*", inputPrice: 0.25, outputPrice: 1.0 },
  { pattern: "meta-llama/llama-4*", inputPrice: 0.5, outputPrice: 2.0 },

  // Mistral models
  { pattern: "mistralai/mistral-large*", inputPrice: 2.0, outputPrice: 6.0 },
  { pattern: "mistralai/mistral-small*", inputPrice: 0.5, outputPrice: 1.5 },

  // Deepseek models
  { pattern: "deepseek/deepseek-chat*", inputPrice: 0.5, outputPrice: 2.0 },
  { pattern: "deepseek/deepseek-r1*", inputPrice: 1.0, outputPrice: 4.0 },

  // Qwen models
  { pattern: "qwen/qwen-3*", inputPrice: 0.5, outputPrice: 2.0 },
  { pattern: "qwen/qwen-2.5*", inputPrice: 0.3, outputPrice: 1.2 },

  // Cohere models
  { pattern: "cohere/command-r*", inputPrice: 0.5, outputPrice: 1.5 },

  // Local / free models (Ollama, LM Studio, etc.)
  { pattern: "ollama/*", inputPrice: 0, outputPrice: 0 },
  { pattern: "lm-studio/*", inputPrice: 0, outputPrice: 0 },
  { pattern: "local/*", inputPrice: 0, outputPrice: 0 },
];

/**
 * Find the best matching pricing entry for a model ID.
 */
function findPricing(modelId: string): PricingEntry | undefined {
  // Try exact match first, then prefix match
  for (const entry of PRICING_TABLE) {
    const pattern = entry.pattern;
    if (pattern.endsWith("*")) {
      const prefix = pattern.slice(0, -1);
      if (modelId.startsWith(prefix)) {
        return entry;
      }
    } else if (modelId === pattern) {
      return entry;
    }
  }
  return undefined;
}

/**
 * Estimate the cost of a generation request.
 *
 * @param modelId - The model identifier (e.g., "openai/gpt-4o")
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @returns Estimated cost in USD, or undefined if pricing is unknown
 */
export function estimateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
): number | undefined {
  const pricing = findPricing(modelId);

  if (!pricing) {
    return undefined;
  }

  const inputCost = (inputTokens / 1_000_000) * pricing.inputPrice;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPrice;

  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
}

/**
 * Format a cost value as a human-readable USD string.
 *
 * @param cost - Cost in USD
 * @returns Formatted string (e.g., "$0.02", "$0.0008", "N/A")
 */
export function formatCost(cost: number | undefined): string {
  if (cost === undefined) {
    return "N/A";
  }

  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  }

  if (cost < 1) {
    return `$${cost.toFixed(2)}`;
  }

  return `$${cost.toFixed(2)}`;
}

/**
 * Get pricing information for a specific model.
 */
export function getModelPricing(modelId: string): {
  inputPrice: number | undefined;
  outputPrice: number | undefined;
} {
  const pricing = findPricing(modelId);

  if (!pricing) {
    return { inputPrice: undefined, outputPrice: undefined };
  }

  return {
    inputPrice: pricing.inputPrice,
    outputPrice: pricing.outputPrice,
  };
}

/**
 * Register custom pricing for a model.
 * Useful for users who want to override default pricing.
 *
 * @param pattern - Model ID pattern (e.g., "my-provider/my-model*")
 * @param inputPrice - Price per 1M input tokens in USD
 * @param outputPrice - Price per 1M output tokens in USD
 */
export function registerPricing(
  pattern: string,
  inputPrice: number,
  outputPrice: number,
): void {
  // Remove existing entry with same pattern if it exists
  const existingIndex = PRICING_TABLE.findIndex((e) => e.pattern === pattern);
  if (existingIndex !== -1) {
    PRICING_TABLE.splice(existingIndex, 1);
  }

  PRICING_TABLE.push({ pattern, inputPrice, outputPrice });
}

/**
 * Check if a provider uses a local/self-hosted model with no API cost.
 */
export function isLocalModel(modelId: string): boolean {
  return (
    modelId.startsWith("ollama/") ||
    modelId.startsWith("lm-studio/") ||
    modelId.startsWith("local/")
  );
}
