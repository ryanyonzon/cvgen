/**
 * OpenRouter AI provider adapter.
 *
 * Implements the AIProvider interface for OpenRouter.
 * Handles authentication, model discovery, streaming, retries,
 * and usage reporting.
 *
 * @see https://openrouter.ai/docs
 */

import {
  type AIProvider,
  type GenerateRequest,
  type GenerateResponse,
  type Model,
  type ProviderCapabilities,
  type Usage,
} from "./types.js";
import { estimateCost } from "./cost.js";
import { ProviderError } from "../errors/index.js";

/**
 * OpenRouter API endpoint for chat completions.
 *
 * Note: The base URL already includes the /v1 prefix
 * (e.g., https://openrouter.ai/api/v1), so the endpoint
 * path does not include /v1.
 */
const CHAT_ENDPOINT = "/chat/completions";

/**
 * OpenRouter API endpoint for listing models.
 *
 * Note: The base URL already includes the /v1 prefix
 * (e.g., https://openrouter.ai/api/v1), so the endpoint
 * path does not include /v1.
 */
const MODELS_ENDPOINT = "/models";

/**
 * Default retry configuration.
 */
const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10_000,
};

/**
 * HTTP headers sent with every OpenRouter request.
 */
/**
 * Configuration for the OpenRouter provider.
 */
export interface OpenRouterConfig {
  /** API key for authentication */
  apiKey: string;
  /** Base URL for the API */
  baseUrl: string;
  /** Optional referer URL (for OpenRouter rankings) */
  referer?: string;
  /** Optional app title (for OpenRouter rankings) */
  title?: string;
}

/**
 * Raw model data from the OpenRouter models endpoint.
 */
interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  pricing?: {
    prompt: string;
    completion: string;
  };
}

/**
 * Raw chunk from a streaming response.
 */
interface StreamChunk {
  choices?: {
    delta?: {
      content?: string;
    };
    finish_reason?: string | null;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Raw response from the OpenRouter chat completions endpoint.
 */
interface ChatResponse {
  id: string;
  model: string;
  choices: {
    message: {
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Delay helper for retry backoff.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Compute exponential backoff delay with jitter.
 */
function computeBackoff(attempt: number): number {
  const delayMs = Math.min(
    RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt),
    RETRY_CONFIG.maxDelayMs,
  );
  // Add up to 25% jitter
  return Math.round(delayMs * (0.75 + Math.random() * 0.25));
}

/**
 * Determine if an HTTP status code represents a transient error.
 */
function isTransientError(status: number): boolean {
  return status === 429 || status === 500 || status === 502 || status === 503;
}

/**
 * Determine if an HTTP status code represents an auth error.
 */
function isAuthError(status: number): boolean {
  return status === 401 || status === 403;
}

/**
 * Build the authorization headers for OpenRouter requests.
 */
export function buildHeaders(config: OpenRouterConfig): Record<string, string> {
  const headers: Record<string, string> = {
    "Authorization": `Bearer ${config.apiKey}`,
    "Content-Type": "application/json",
  };

  if (config.referer) {
    headers["HTTP-Referer"] = config.referer;
  }

  if (config.title) {
    headers["X-Title"] = config.title;
  }

  return headers;
}

/**
 * Parse usage from an OpenRouter response and compute cost.
 */
function parseUsage(
  rawUsage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  },
  model: string,
): Usage {
  return {
    inputTokens: rawUsage.prompt_tokens,
    outputTokens: rawUsage.completion_tokens,
    totalTokens: rawUsage.total_tokens,
    estimatedCostUsd: estimateCost(
      model,
      rawUsage.prompt_tokens,
      rawUsage.completion_tokens,
    ),
  };
}

/**
 * OpenRouter AI provider implementation.
 */
export class OpenRouterProvider implements AIProvider {
  private readonly config: OpenRouterConfig;
  private readonly baseUrl: string;
  private capabilitiesCache: ProviderCapabilities | null = null;

  constructor(config: OpenRouterConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
  }

  /**
   * Get the provider name.
   */
  public name(): string {
    return "OpenRouter";
  }

  /**
   * Get the capabilities of the OpenRouter provider.
   *
   * OpenRouter itself supports streaming, JSON mode, and reasoning
   * depending on the underlying model. We report conservative defaults
   * and let the specific model refine them.
   */
  public async capabilities(): Promise<ProviderCapabilities> {
    if (this.capabilitiesCache) {
      return this.capabilitiesCache;
    }

    // OpenRouter generally supports these across most models
    this.capabilitiesCache = {
      streaming: true,
      jsonMode: true, // Many models on OpenRouter support JSON mode
      reasoning: false, // Depends on the model (e.g., o1, deepseek-r1)
      toolCalling: true, // Most modern models support tool calling
      vision: false, // Depends on the model
    };

    return this.capabilitiesCache;
  }

  /**
   * List available models from OpenRouter.
   */
  public async models(): Promise<Model[]> {
    const url = `${this.baseUrl}${MODELS_ENDPOINT}`;
    const headers = buildHeaders(this.config);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        await this.handleErrorResponse(response, "list models");
      }

      const body = (await response.json()) as {
        data: OpenRouterModel[];
      };

      if (!body.data || !Array.isArray(body.data)) {
        throw new ProviderError(
          "Unexpected response format from OpenRouter models endpoint",
          "openrouter",
        );
      }

      return body.data.map((m) => this.normalizeModel(m));
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }
      throw new ProviderError(
        `Failed to list models from OpenRouter: ${(error as Error).message}`,
        "openrouter",
      );
    }
  }

  /**
   * Generate a response (non-streaming).
   */
  public async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const url = `${this.baseUrl}${CHAT_ENDPOINT}`;
    const headers = buildHeaders(this.config);

    const body = this.buildRequestBody(request);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < RETRY_CONFIG.maxAttempts; attempt++) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(60_000),
        });

        if (!response.ok) {
          if (isAuthError(response.status)) {
            throw new ProviderError(
              `Authentication failed (${response.status}): ${response.statusText}. Check your API key in ~/.config/cvgen/.env.`,
              "openrouter",
            );
          }

          if (
            isTransientError(response.status) &&
            attempt < RETRY_CONFIG.maxAttempts - 1
          ) {
            lastError = new ProviderError(
              `OpenRouter returned ${response.status} (attempt ${attempt + 1}/${RETRY_CONFIG.maxAttempts})`,
              "openrouter",
            );
            const backoff = computeBackoff(attempt);
            await delay(backoff);
            continue;
          }

          const errorBody = await response.text().catch(() => "");
          throw new ProviderError(
            `OpenRouter request failed (${response.status}): ${response.statusText}. ${errorBody}`,
            "openrouter",
          );
        }

        const bodyJson = (await response.json()) as ChatResponse;

        if (!bodyJson.choices || bodyJson.choices.length === 0) {
          throw new ProviderError(
            "OpenRouter returned an empty response",
            "openrouter",
          );
        }

        const content = bodyJson.choices[0].message.content;
        const usage = parseUsage(bodyJson.usage, request.model);

        return {
          content,
          model: bodyJson.model,
          usage,
          finished: bodyJson.choices[0].finish_reason !== "length",
          finishReason: bodyJson.choices[0].finish_reason,
        };
      } catch (error) {
        if (error instanceof ProviderError) {
          // Don't retry auth errors - check the message since exitCode is the class-level code
          if (
            error.message.includes("Authentication failed") ||
            error.message.includes("authentication")
          ) {
            throw error;
          }
          lastError = error;
        } else {
          lastError = error as Error;
        }

        // Retry on network/timeout errors
        if (attempt < RETRY_CONFIG.maxAttempts - 1) {
          const backoff = computeBackoff(attempt);
          await delay(backoff);
        }
      }
    }

    throw new ProviderError(
      `OpenRouter request failed after maximum retries: ${(lastError as Error)?.message || "Unknown error"}`,
      "openrouter",
    );
  }

  /**
   * Stream a response from the provider.
   */
  public async *stream(
    request: GenerateRequest,
  ): AsyncGenerator<GenerateResponse> {
    const url = `${this.baseUrl}${CHAT_ENDPOINT}`;
    const headers = buildHeaders(this.config);

    const body = this.buildRequestBody(request, true);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < RETRY_CONFIG.maxAttempts; attempt++) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(120_000),
        });

        if (!response.ok) {
          if (isAuthError(response.status)) {
            throw new ProviderError(
              `Authentication failed (${response.status}): ${response.statusText}. Check your API key in ~/.config/cvgen/.env.`,
              "openrouter",
            );
          }

          if (
            isTransientError(response.status) &&
            attempt < RETRY_CONFIG.maxAttempts - 1
          ) {
            lastError = new ProviderError(
              `OpenRouter returned ${response.status} during streaming (attempt ${attempt + 1}/${RETRY_CONFIG.maxAttempts})`,
              "openrouter",
            );
            const backoff = computeBackoff(attempt);
            await delay(backoff);
            continue;
          }

          const errorBody = await response.text().catch(() => "");
          throw new ProviderError(
            `OpenRouter streaming request failed (${response.status}): ${response.statusText}. ${errorBody}`,
            "openrouter",
          );
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new ProviderError(
            "OpenRouter streaming response has no readable body",
            "openrouter",
          );
        }

        const decoder = new TextDecoder();
        let buffer = "";
        const finalModel = request.model;

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data: ")) continue;

              const data = trimmed.slice(6).trim();

              // OpenRouter sends "data: [DONE]" when streaming is complete
              if (data === "[DONE]") continue;

              try {
                const chunk = JSON.parse(data) as StreamChunk;

                if (chunk.choices && chunk.choices.length > 0) {
                  const delta = chunk.choices[0].delta?.content ?? "";
                  const finishReason = chunk.choices[0].finish_reason ?? null;

                  yield {
                    content: delta,
                    model: finalModel,
                    usage: {
                      inputTokens: 0,
                      outputTokens: 0,
                      totalTokens: 0,
                    },
                    finished: finishReason !== null,
                    finishReason: finishReason ?? undefined,
                  };
                }
              } catch {
                // Skip malformed JSON chunks
              }
            }
          }
        } finally {
          reader.releaseLock();
        }

        // If we got here, streaming completed successfully
        return;
      } catch (error) {
        if (error instanceof ProviderError) {
          if (
            error.message.includes("Authentication failed") ||
            error.message.includes("authentication")
          ) {
            throw error;
          }
          lastError = error;
        } else {
          lastError = error as Error;
        }

        if (attempt < RETRY_CONFIG.maxAttempts - 1) {
          const backoff = computeBackoff(attempt);
          await delay(backoff);
        }
      }
    }

    throw new ProviderError(
      `OpenRouter streaming failed after maximum retries: ${(lastError as Error)?.message || "Unknown error"}`,
      "openrouter",
    );
  }

  /**
   * Build the request body for the OpenRouter chat completions endpoint.
   */
  private buildRequestBody(
    request: GenerateRequest,
    stream = false,
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: request.model,
      messages: request.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      stream,
    };

    if (request.temperature !== undefined) {
      body.temperature = request.temperature;
    }

    if (request.maxTokens !== undefined) {
      body.max_tokens = request.maxTokens;
    }

    if (request.jsonMode) {
      body.response_format = { type: "json_object" };
    }

    // Merge provider-specific parameters
    if (request.providerParams) {
      for (const [key, value] of Object.entries(request.providerParams)) {
        body[key] = value;
      }
    }

    return body;
  }

  /**
   * Normalize an OpenRouter model into the standard Model interface.
   */
  private normalizeModel(raw: OpenRouterModel): Model {
    const pricingInput = raw.pricing?.prompt
      ? parseFloat(raw.pricing.prompt)
      : undefined;
    const pricingOutput = raw.pricing?.completion
      ? parseFloat(raw.pricing.completion)
      : undefined;

    return {
      id: raw.id,
      name: raw.name || raw.id,
      provider: "openrouter",
      description: raw.description,
      contextLength: raw.context_length,
      pricingInput: pricingInput,
      pricingOutput: pricingOutput,
    };
  }

  /**
   * Handle a non-OK HTTP response from OpenRouter.
   */
  private async handleErrorResponse(
    response: Response,
    operation: string,
  ): Promise<never> {
    const status = response.status;
    const body = await response.text().catch(() => "");

    if (isAuthError(status)) {
      throw new ProviderError(
        `Authentication failed (${status}) while trying to ${operation}: ${response.statusText}. Check your API key.`,
        "openrouter",
      );
    }

    if (status === 429) {
      throw new ProviderError(
        `Rate limited (429) while trying to ${operation}. Please wait and try again.`,
        "openrouter",
      );
    }

    throw new ProviderError(
      `OpenRouter request failed (${status}) while trying to ${operation}: ${response.statusText}. ${body}`,
      "openrouter",
    );
  }
}

/**
 * Factory function to create an OpenRouter provider.
 */
export function createOpenRouterProvider(config: OpenRouterConfig): AIProvider {
  return new OpenRouterProvider(config);
}
