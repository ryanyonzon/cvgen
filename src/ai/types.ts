/**
 * Core type definitions for the AI provider framework.
 *
 * Every AI provider in cvgen implements the AIProvider interface.
 * No business logic should depend on a provider-specific SDK.
 */

/**
 * Capabilities that a provider may support.
 */
export interface ProviderCapabilities {
  /** Whether the provider supports streaming responses */
  streaming: boolean;
  /** Whether the provider supports structured JSON output mode */
  jsonMode: boolean;
  /** Whether the provider supports reasoning/thinking tokens */
  reasoning: boolean;
  /** Whether the provider supports tool/function calling */
  toolCalling: boolean;
  /** Whether the provider supports vision/image inputs */
  vision: boolean;
}

/**
 * Default capabilities for providers that don't advertise them.
 * Only streaming is assumed; everything else is opted in.
 */
export const DEFAULT_CAPABILITIES: ProviderCapabilities = {
  streaming: true,
  jsonMode: false,
  reasoning: false,
  toolCalling: false,
  vision: false,
};

/**
 * A model available from an AI provider.
 */
export interface Model {
  /** Model identifier (e.g., "openai/gpt-4o") */
  id: string;
  /** Human-readable name (e.g., "GPT-4o") */
  name: string;
  /** Provider that hosts this model */
  provider: string;
  /** Optional description */
  description?: string;
  /** Context window size in tokens */
  contextLength?: number;
  /** Maximum output tokens */
  maxOutput?: number;
  /** Pricing per 1M input tokens (USD) */
  pricingInput?: number;
  /** Pricing per 1M output tokens (USD) */
  pricingOutput?: number;
  /** Capabilities supported by this model */
  capabilities?: Partial<ProviderCapabilities>;
}

/**
 * Message role in a chat conversation.
 */
export type MessageRole = "system" | "user" | "assistant";

/**
 * A single message in a chat conversation.
 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
}

/**
 * Request to generate a response from an AI provider.
 */
export interface GenerateRequest {
  /** The model to use for generation */
  model: string;
  /** Messages comprising the conversation/context */
  messages: ChatMessage[];
  /** Temperature for generation (0.0 – 2.0) */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Whether to use JSON mode (if supported) */
  jsonMode?: boolean;
  /** Provider-specific parameters (passthrough) */
  providerParams?: Record<string, unknown>;
}

/**
 * Usage statistics for a generation request.
 */
export interface Usage {
  /** Number of input/prompt tokens consumed */
  inputTokens: number;
  /** Number of output/completion tokens generated */
  outputTokens: number;
  /** Total tokens consumed */
  totalTokens: number;
  /** Estimated cost of the request in USD (optional) */
  estimatedCostUsd?: number;
}

/**
 * Response from a generation request.
 */
export interface GenerateResponse {
  /** The generated text content */
  content: string;
  /** The model that generated the response */
  model: string;
  /** Usage statistics */
  usage: Usage;
  /** Whether the response was finished (not truncated) */
  finished: boolean;
  /** Optional finish reason (e.g., "stop", "length") */
  finishReason?: string;
}

/**
 * Standard AI provider interface.
 *
 * Every provider must implement this interface.
 * Provider-specific SDKs must never leak into business logic.
 */
export interface AIProvider {
  /** Human-readable provider name (e.g., "OpenRouter", "OpenAI") */
  name(): string;

  /** List available models from this provider */
  models(): Promise<Model[]>;

  /** Get the capabilities of this provider */
  capabilities(): Promise<ProviderCapabilities>;

  /**
   * Generate a response from the provider.
   *
   * @param request - The generation request
   * @returns The generated response with usage statistics
   */
  generate(request: GenerateRequest): Promise<GenerateResponse>;

  /**
   * Stream a response from the provider.
   *
   * @param request - The generation request
   * @returns An async generator yielding response chunks
   */
  stream(request: GenerateRequest): AsyncGenerator<GenerateResponse>;
}
