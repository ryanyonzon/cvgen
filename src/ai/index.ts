/**
 * AI module barrel export.
 *
 * Re-exports all AI provider framework types and functions.
 */

export {
  type AIProvider,
  type ProviderCapabilities,
  type Model,
  type ChatMessage,
  type GenerateRequest,
  type GenerateResponse,
  type Usage,
  type MessageRole,
  DEFAULT_CAPABILITIES,
} from "./types.js";

export {
  OpenRouterProvider,
  createOpenRouterProvider,
  buildHeaders,
  type OpenRouterConfig,
} from "./openrouter.js";

export {
  ProviderRegistry,
  createDefaultRegistry,
  getDefaultRegistry,
  createProvider,
} from "./registry.js";

export {
  estimateCost,
  formatCost,
  getModelPricing,
  registerPricing,
  isLocalModel,
} from "./cost.js";
