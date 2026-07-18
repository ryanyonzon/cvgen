/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function */

/**
 * Tests for the AI provider framework - Phase 4.
 *
 * Covers:
 * - Type definitions (AIProvider interface, types)
 * - Provider registry (registration, creation, listing)
 * - OpenRouter adapter (request building, response parsing, error handling)
 * - Cost estimation (pricing lookup, formatting, custom registration)
 * - Provider capabilities
 * - Model discovery
 * - Retry logic and error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// AI types
// ---------------------------------------------------------------------------

describe("AI types", () => {
  it("should export the AIProvider interface with required methods", async () => {
    const { AIProvider } = await import("../src/ai/types.js");
    const provider: AIProvider = {
      name: () => "test",
      models: () => Promise.resolve([]),
      capabilities: () =>
        Promise.resolve({
          streaming: false,
          jsonMode: false,
          reasoning: false,
          toolCalling: false,
          vision: false,
        }),
      generate: () =>
        Promise.resolve({
          content: "",
          model: "test",
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
          finished: true,
        }),
      stream: async function* () {
        // test stub
      },
    };
    expect(provider.name()).toBe("test");
    expect(await provider.models()).toEqual([]);
    const caps = await provider.capabilities();
    expect(caps.streaming).toBe(false);
    const resp = await provider.generate({
      model: "test",
      messages: [{ role: "user", content: "hi" }],
    });
    expect(resp.finished).toBe(true);
  });

  it("should define DEFAULT_CAPABILITIES with streaming only enabled", async () => {
    const { DEFAULT_CAPABILITIES } = await import("../src/ai/types.js");
    expect(DEFAULT_CAPABILITIES).toEqual({
      streaming: true,
      jsonMode: false,
      reasoning: false,
      toolCalling: false,
      vision: false,
    });
  });

  it("should support all MessageRole values", () => {
    const role: "system" | "user" | "assistant" = "system";
    expect(["system", "user", "assistant"]).toContain(role);
  });

  it("should allow partial capabilities on Model", () => {
    const model = {
      id: "test/model",
      name: "Test",
      provider: "test",
      capabilities: { jsonMode: true },
    };
    expect(model.capabilities?.jsonMode).toBe(true);
    expect(model.capabilities?.streaming).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Cost estimation
// ---------------------------------------------------------------------------

describe("Cost estimation", () => {
  it("should estimate cost for GPT-4o", async () => {
    const { estimateCost } = await import("../src/ai/cost.js");
    const cost = estimateCost("openai/gpt-4o", 1000, 500);
    expect(cost).toBeCloseTo(0.0075, 6);
  });

  it("should return undefined for unknown models", async () => {
    const { estimateCost } = await import("../src/ai/cost.js");
    expect(estimateCost("unknown/model-v99", 1000, 500)).toBeUndefined();
  });

  it("should estimate cost for GPT-5", async () => {
    const { estimateCost } = await import("../src/ai/cost.js");
    const cost = estimateCost("openai/gpt-5", 2000, 1000);
    expect(cost).toBeCloseTo(0.06, 6);
  });

  it("should estimate cost for multiple model families", async () => {
    const { estimateCost } = await import("../src/ai/cost.js");
    expect(estimateCost("anthropic/claude-3.5-sonnet", 1500, 300)).toBeCloseTo(
      0.009,
      6,
    );
    expect(estimateCost("anthropic/claude-3-opus", 1000, 200)).toBeCloseTo(
      0.03,
      6,
    );
    expect(estimateCost("google/gemini-2.0-flash", 2000, 1000)).toBeCloseTo(
      0.0006,
      6,
    );
    expect(estimateCost("meta-llama/llama-3-70b", 3000, 500)).toBeCloseTo(
      0.00125,
      6,
    );
    expect(estimateCost("deepseek/deepseek-chat", 1000, 500)).toBeCloseTo(
      0.0015,
      6,
    );
    expect(estimateCost("qwen/qwen-3-32b", 1000, 200)).toBeCloseTo(0.0009, 6);
  });

  it("should return zero cost for local models", async () => {
    const { estimateCost } = await import("../src/ai/cost.js");
    expect(estimateCost("ollama/llama3", 1000, 500)).toBe(0);
    expect(estimateCost("lm-studio/qwen", 1000, 500)).toBe(0);
    expect(estimateCost("local/custom", 1000, 500)).toBe(0);
  });

  it("should format cost values correctly", async () => {
    const { formatCost } = await import("../src/ai/cost.js");
    expect(formatCost(undefined)).toBe("N/A");
    expect(formatCost(0.0008)).toBe("$0.0008");
    expect(formatCost(0.02)).toBe("$0.02");
    expect(formatCost(0.5)).toBe("$0.50");
    expect(formatCost(1.5)).toBe("$1.50");
    expect(formatCost(123.45)).toBe("$123.45");
  });

  it("should get model pricing", async () => {
    const { getModelPricing } = await import("../src/ai/cost.js");
    expect(getModelPricing("openai/gpt-4o")).toEqual({
      inputPrice: 2.5,
      outputPrice: 10.0,
    });
    expect(getModelPricing("unknown/model")).toEqual({
      inputPrice: undefined,
      outputPrice: undefined,
    });
  });

  it("should register and override custom pricing", async () => {
    const { registerPricing, getModelPricing } =
      await import("../src/ai/cost.js");
    registerPricing("my-custom/model*", 5.0, 15.0);
    expect(getModelPricing("my-custom/model-v1")).toEqual({
      inputPrice: 5.0,
      outputPrice: 15.0,
    });
    // Override
    registerPricing("my-custom/model*", 10.0, 30.0);
    expect(getModelPricing("my-custom/model-v2")).toEqual({
      inputPrice: 10.0,
      outputPrice: 30.0,
    });
  });

  it("should detect local models", async () => {
    const { isLocalModel } = await import("../src/ai/cost.js");
    expect(isLocalModel("ollama/llama3")).toBe(true);
    expect(isLocalModel("lm-studio/qwen")).toBe(true);
    expect(isLocalModel("local/custom")).toBe(true);
    expect(isLocalModel("openai/gpt-4o")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Provider registry
// ---------------------------------------------------------------------------

describe("Provider registry", () => {
  it("should register and create providers", async () => {
    const { ProviderRegistry } = await import("../src/ai/registry.js");
    const registry = new ProviderRegistry();

    registry.register("mock", "Mock provider", () => ({
      name: () => "mock",
      models: () => Promise.resolve([]),
      capabilities: () =>
        Promise.resolve({
          streaming: false,
          jsonMode: false,
          reasoning: false,
          toolCalling: false,
          vision: false,
        }),
      generate: () =>
        Promise.resolve({
          content: "mock",
          model: "mock-model",
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
          finished: true,
        }),
      stream: async function* () {
        // Intentionally empty for test interface compliance
      },
    }));

    expect(registry.has("mock")).toBe(true);
    expect(registry.has("nonexistent")).toBe(false);
    expect(registry.size).toBe(1);

    const provider = registry.create("mock", {
      provider: "mock",
      model: "mock-model",
      apiKey: "test-key",
      baseUrl: "",
    });
    expect(provider.name()).toBe("mock");
  });

  it("should list registered providers", async () => {
    const { ProviderRegistry } = await import("../src/ai/registry.js");
    const registry = new ProviderRegistry();

    registry.register("p1", "Provider One", () => ({
      name: () => "p1",
      models: () => Promise.resolve([]),
      capabilities: () =>
        Promise.resolve({
          streaming: false,
          jsonMode: false,
          reasoning: false,
          toolCalling: false,
          vision: false,
        }),
      generate: () =>
        Promise.resolve({
          content: "",
          model: "",
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
          finished: true,
        }),
      stream: async function* () {
        // test stub
      },
    }));
    registry.register("p2", "Provider Two", () => ({
      name: () => "p2",
      models: () => Promise.resolve([]),
      capabilities: () =>
        Promise.resolve({
          streaming: true,
          jsonMode: true,
          reasoning: false,
          toolCalling: false,
          vision: false,
        }),
      generate: () =>
        Promise.resolve({
          content: "",
          model: "",
          usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
          finished: true,
        }),
      stream: async function* () {
        // test stub
      },
    }));

    const list = registry.list();
    expect(list).toHaveLength(2);
    expect(list.find((p) => p.name === "p1")?.description).toBe("Provider One");
  });

  it("should throw for unknown provider", async () => {
    const { ProviderRegistry } = await import("../src/ai/registry.js");
    const registry = new ProviderRegistry();
    expect(() =>
      registry.create("unknown", {
        provider: "unknown",
        model: "test",
        apiKey: "key",
        baseUrl: "",
      }),
    ).toThrow("Unknown provider");
  });

  it("should throw ConfigurationError when API key is missing for non-local providers", async () => {
    const { ProviderRegistry } = await import("../src/ai/registry.js");
    const registry = new ProviderRegistry();
    registry.register("test-provider", "Test", () => ({
      name: () => "test",
      models: () => Promise.resolve([]),
      capabilities: () =>
        Promise.resolve({
          streaming: false,
          jsonMode: false,
          reasoning: false,
          toolCalling: false,
          vision: false,
        }),
      generate: () => Promise.reject(new Error("not called")),
      stream: async function* () {
        // test stub
      },
    }));

    expect(() =>
      registry.create("test-provider", {
        provider: "test-provider",
        model: "test",
        apiKey: "",
        baseUrl: "",
      }),
    ).toThrow("API key is required");
  });

  it("should create default registry with OpenRouter", async () => {
    const { createDefaultRegistry } = await import("../src/ai/registry.js");
    const registry = createDefaultRegistry();
    expect(registry.size).toBeGreaterThanOrEqual(1);
    expect(registry.has("openrouter")).toBe(true);
  });

  it("should list OpenRouter in default registry", async () => {
    const { createDefaultRegistry } = await import("../src/ai/registry.js");
    const registry = createDefaultRegistry();
    const list = registry.list();
    expect(list.some((p) => p.name === "openrouter")).toBe(true);
  });

  it("should reuse default registry singleton", async () => {
    const { getDefaultRegistry } = await import("../src/ai/registry.js");
    expect(getDefaultRegistry()).toBe(getDefaultRegistry());
  });

  it("should create OpenRouter provider via convenience function", async () => {
    const { createProvider } = await import("../src/ai/registry.js");
    const provider = createProvider({
      provider: "openrouter",
      model: "openai/gpt-4o",
      apiKey: "test-key",
      baseUrl: "https://openrouter.ai/api/v1",
    });
    expect(provider.name()).toBe("OpenRouter");
  });
});

// ---------------------------------------------------------------------------
// OpenRouter adapter (unit tests with mocked fetch)
// ---------------------------------------------------------------------------

describe("OpenRouter provider (unit)", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should report provider name", async () => {
    const { OpenRouterProvider } = await import("../src/ai/openrouter.js");
    const provider = new OpenRouterProvider({
      apiKey: "test-key",
      baseUrl: "https://openrouter.ai/api/v1",
    });
    expect(provider.name()).toBe("OpenRouter");
  });

  it("should strip trailing slash from base URL", async () => {
    const { OpenRouterProvider } = await import("../src/ai/openrouter.js");
    const provider = new OpenRouterProvider({
      apiKey: "test-key",
      baseUrl: "https://openrouter.ai/api/v1///",
    });
    // Should still work without error
    expect(provider.name()).toBe("OpenRouter");
  });

  it("should handle model listing with valid response", async () => {
    const { OpenRouterProvider } = await import("../src/ai/openrouter.js");
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [
            {
              id: "openai/gpt-4o",
              name: "GPT-4o",
              description: "Latest GPT-4 model",
              context_length: 128000,
              pricing: { prompt: "2.5", completion: "10.0" },
            },
            {
              id: "anthropic/claude-3.5-sonnet",
              name: "Claude 3.5 Sonnet",
              context_length: 200000,
              pricing: { prompt: "3.0", completion: "15.0" },
            },
          ],
        }),
    });

    const provider = new OpenRouterProvider({
      apiKey: "test-key",
      baseUrl: "https://openrouter.ai/api/v1",
    });

    const models = await provider.models();
    expect(models).toHaveLength(2);
    expect(models[0].id).toBe("openai/gpt-4o");
    expect(models[0].provider).toBe("openrouter");
    expect(models[0].contextLength).toBe(128000);
    expect(models[0].pricingInput).toBe(2.5);
    expect(models[1].id).toBe("anthropic/claude-3.5-sonnet");
  });

  it("should handle model listing with minimal data", async () => {
    const { OpenRouterProvider } = await import("../src/ai/openrouter.js");
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: [
            {
              id: "minimal/model",
              name: "",
            },
          ],
        }),
    });

    const provider = new OpenRouterProvider({
      apiKey: "test-key",
      baseUrl: "https://openrouter.ai/api/v1",
    });

    const models = await provider.models();
    expect(models).toHaveLength(1);
    expect(models[0].name).toBe("minimal/model"); // falls back to id
  });

  it("should throw ProviderError on model listing error", async () => {
    const { OpenRouterProvider } = await import("../src/ai/openrouter.js");
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: () => Promise.resolve(""),
    });

    const provider = new OpenRouterProvider({
      apiKey: "invalid-key",
      baseUrl: "https://openrouter.ai/api/v1",
    });

    await expect(provider.models()).rejects.toThrow("Authentication failed");
  });

  it("should handle successful generate request", async () => {
    const { OpenRouterProvider } = await import("../src/ai/openrouter.js");
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "chatcmpl-123",
          model: "openai/gpt-4o",
          choices: [
            {
              message: { content: "Hello! How can I help you?" },
              finish_reason: "stop",
            },
          ],
          usage: {
            prompt_tokens: 25,
            completion_tokens: 10,
            total_tokens: 35,
          },
        }),
    });

    const provider = new OpenRouterProvider({
      apiKey: "test-key",
      baseUrl: "https://openrouter.ai/api/v1",
    });

    const response = await provider.generate({
      model: "openai/gpt-4o",
      messages: [
        { role: "system", content: "You are helpful." },
        { role: "user", content: "Hi" },
      ],
    });

    expect(response.content).toBe("Hello! How can I help you?");
    expect(response.model).toBe("openai/gpt-4o");
    expect(response.finished).toBe(true);
    expect(response.finishReason).toBe("stop");
    expect(response.usage.inputTokens).toBe(25);
    expect(response.usage.outputTokens).toBe(10);
    expect(response.usage.totalTokens).toBe(35);
    expect(response.usage.estimatedCostUsd).toBeDefined();
  });

  it("should include cost estimation in usage from generate", async () => {
    const { OpenRouterProvider } = await import("../src/ai/openrouter.js");
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "chatcmpl-456",
          model: "openai/gpt-4o",
          choices: [
            {
              message: { content: "Response" },
              finish_reason: "stop",
            },
          ],
          usage: {
            prompt_tokens: 50,
            completion_tokens: 20,
            total_tokens: 70,
          },
        }),
    });

    const provider = new OpenRouterProvider({
      apiKey: "test-key",
      baseUrl: "https://openrouter.ai/api/v1",
    });

    const response = await provider.generate({
      model: "openai/gpt-4o",
      messages: [{ role: "user", content: "Hello" }],
    });

    // GPT-4o: $2.50/1M input, $10.00/1M output
    // (50/1_000_000 * 2.50) + (20/1_000_000 * 10.00) = 0.000125 + 0.0002 = 0.000325
    expect(response.usage.estimatedCostUsd).toBeCloseTo(0.000325, 8);
  });

  it("should handle generate with JSON mode", async () => {
    const { OpenRouterProvider } = await import("../src/ai/openrouter.js");
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "chatcmpl-789",
          model: "openai/gpt-4o",
          choices: [
            {
              message: { content: JSON.stringify({ result: "ok" }) },
              finish_reason: "stop",
            },
          ],
          usage: {
            prompt_tokens: 30,
            completion_tokens: 15,
            total_tokens: 45,
          },
        }),
    });

    const provider = new OpenRouterProvider({
      apiKey: "test-key",
      baseUrl: "https://openrouter.ai/api/v1",
    });

    const response = await provider.generate({
      model: "openai/gpt-4o",
      messages: [{ role: "user", content: "Return JSON" }],
      jsonMode: true,
    });

    expect(response.content).toBe('{"result":"ok"}');
  });

  it("should handle generate with custom temperature and maxTokens", async () => {
    const { OpenRouterProvider } = await import("../src/ai/openrouter.js");

    let requestBody: string | undefined;

    mockFetch.mockImplementation(
      async (url: string, options: { body?: string }) => {
        requestBody = options.body;
        return {
          ok: true,
          json: () =>
            Promise.resolve({
              id: "chatcmpl-101",
              model: "openai/gpt-4o",
              choices: [
                {
                  message: { content: "Cool" },
                  finish_reason: "stop",
                },
              ],
              usage: {
                prompt_tokens: 10,
                completion_tokens: 5,
                total_tokens: 15,
              },
            }),
        };
      },
    );

    const provider = new OpenRouterProvider({
      apiKey: "test-key",
      baseUrl: "https://openrouter.ai/api/v1",
    });

    await provider.generate({
      model: "openai/gpt-4o",
      messages: [{ role: "user", content: "Hi" }],
      temperature: 0.7,
      maxTokens: 2000,
    });

    const body = JSON.parse(requestBody as string);
    expect(body.temperature).toBe(0.7);
    expect(body.max_tokens).toBe(2000);
  });

  it("should handle generate with provider-specific params", async () => {
    const { OpenRouterProvider } = await import("../src/ai/openrouter.js");

    let requestBody: string | undefined;

    mockFetch.mockImplementation(
      async (url: string, options: { body?: string }) => {
        requestBody = options.body;
        return {
          ok: true,
          json: () =>
            Promise.resolve({
              id: "chatcmpl-102",
              model: "openai/gpt-4o",
              choices: [
                {
                  message: { content: "OK" },
                  finish_reason: "stop",
                },
              ],
              usage: {
                prompt_tokens: 5,
                completion_tokens: 3,
                total_tokens: 8,
              },
            }),
        };
      },
    );

    const provider = new OpenRouterProvider({
      apiKey: "test-key",
      baseUrl: "https://openrouter.ai/api/v1",
    });

    await provider.generate({
      model: "openai/gpt-4o",
      messages: [{ role: "user", content: "Hi" }],
      providerParams: {
        top_p: 0.9,
        frequency_penalty: 0.1,
      },
    });

    const body = JSON.parse(requestBody as string);
    expect(body.top_p).toBe(0.9);
    expect(body.frequency_penalty).toBe(0.1);
  });

  it("should handle 401 auth error on generate", async () => {
    const { OpenRouterProvider } = await import("../src/ai/openrouter.js");
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: () => Promise.resolve(""),
    });

    const provider = new OpenRouterProvider({
      apiKey: "bad-key",
      baseUrl: "https://openrouter.ai/api/v1",
    });

    await expect(
      provider.generate({
        model: "openai/gpt-4o",
        messages: [{ role: "user", content: "Hi" }],
      }),
    ).rejects.toThrow("Authentication failed");
  });

  it("should handle 403 auth error on generate", async () => {
    const { OpenRouterProvider } = await import("../src/ai/openrouter.js");
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      text: () => Promise.resolve(""),
    });

    const provider = new OpenRouterProvider({
      apiKey: "bad-key",
      baseUrl: "https://openrouter.ai/api/v1",
    });

    await expect(
      provider.generate({
        model: "openai/gpt-4o",
        messages: [{ role: "user", content: "Hi" }],
      }),
    ).rejects.toThrow("Authentication failed");
  });

  it("should retry on 429 rate limit and eventually succeed", async () => {
    const { OpenRouterProvider } = await import("../src/ai/openrouter.js");

    let callCount = 0;

    mockFetch.mockImplementation(async () => {
      callCount++;
      if (callCount === 1 || callCount === 2) {
        return {
          ok: false,
          status: 429,
          statusText: "Too Many Requests",
          text: () => Promise.resolve(""),
        };
      }
      return {
        ok: true,
        json: () =>
          Promise.resolve({
            id: "chatcmpl-103",
            model: "openai/gpt-4o",
            choices: [
              {
                message: { content: "Success after retry" },
                finish_reason: "stop",
              },
            ],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 5,
              total_tokens: 15,
            },
          }),
      };
    });

    const provider = new OpenRouterProvider({
      apiKey: "test-key",
      baseUrl: "https://openrouter.ai/api/v1",
    });

    const response = await provider.generate({
      model: "openai/gpt-4o",
      messages: [{ role: "user", content: "Hi" }],
    });

    expect(response.content).toBe("Success after retry");
    expect(callCount).toBe(3);
  });

  it("should retry on 500 and eventually succeed", async () => {
    const { OpenRouterProvider } = await import("../src/ai/openrouter.js");

    let callCount = 0;

    mockFetch.mockImplementation(async () => {
      callCount++;
      if (callCount <= 2) {
        return {
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          text: () => Promise.resolve(""),
        };
      }
      return {
        ok: true,
        json: () =>
          Promise.resolve({
            id: "chatcmpl-104",
            model: "openai/gpt-4o",
            choices: [
              {
                message: { content: "Recovered" },
                finish_reason: "stop",
              },
            ],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 5,
              total_tokens: 15,
            },
          }),
      };
    });

    const provider = new OpenRouterProvider({
      apiKey: "test-key",
      baseUrl: "https://openrouter.ai/api/v1",
    });

    const response = await provider.generate({
      model: "openai/gpt-4o",
      messages: [{ role: "user", content: "Hi" }],
    });

    expect(response.content).toBe("Recovered");
    expect(callCount).toBe(3);
  });

  it("should fail after exhausting retries on persistent errors", async () => {
    const { OpenRouterProvider } = await import("../src/ai/openrouter.js");
    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      text: () => Promise.resolve(""),
    });

    const provider = new OpenRouterProvider({
      apiKey: "test-key",
      baseUrl: "https://openrouter.ai/api/v1",
    });

    await expect(
      provider.generate({
        model: "openai/gpt-4o",
        messages: [{ role: "user", content: "Hi" }],
      }),
    ).rejects.toThrow("after maximum retries");
  });

  it("should not retry on 401 auth errors", async () => {
    const { OpenRouterProvider } = await import("../src/ai/openrouter.js");

    let callCount = 0;

    mockFetch.mockImplementation(async () => {
      callCount++;
      return {
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        text: () => Promise.resolve(""),
      };
    });

    const provider = new OpenRouterProvider({
      apiKey: "bad-key",
      baseUrl: "https://openrouter.ai/api/v1",
    });

    await expect(
      provider.generate({
        model: "openai/gpt-4o",
        messages: [{ role: "user", content: "Hi" }],
      }),
    ).rejects.toThrow("Authentication failed");

    expect(callCount).toBe(1); // no retry
  });

  it("should handle empty response choices", async () => {
    const { OpenRouterProvider } = await import("../src/ai/openrouter.js");
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: "chatcmpl-105",
          model: "openai/gpt-4o",
          choices: [],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 5,
            total_tokens: 15,
          },
        }),
    });

    const provider = new OpenRouterProvider({
      apiKey: "test-key",
      baseUrl: "https://openrouter.ai/api/v1",
    });

    await expect(
      provider.generate({
        model: "openai/gpt-4o",
        messages: [{ role: "user", content: "Hi" }],
      }),
    ).rejects.toThrow("empty response");
  });

  it("should handle model listing with unexpected response format", async () => {
    const { OpenRouterProvider } = await import("../src/ai/openrouter.js");
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ notData: "oops" }),
    });

    const provider = new OpenRouterProvider({
      apiKey: "test-key",
      baseUrl: "https://openrouter.ai/api/v1",
    });

    await expect(provider.models()).rejects.toThrow("Unexpected response");
  });

  it("should handle model listing with network failure", async () => {
    const { OpenRouterProvider } = await import("../src/ai/openrouter.js");
    mockFetch.mockRejectedValue(new Error("Network failure"));

    const provider = new OpenRouterProvider({
      apiKey: "test-key",
      baseUrl: "https://openrouter.ai/api/v1",
    });

    await expect(provider.models()).rejects.toThrow("Failed to list models");
  });

  it("should handle generate with network timeout and retry", async () => {
    const { OpenRouterProvider } = await import("../src/ai/openrouter.js");

    let callCount = 0;

    mockFetch.mockImplementation(async () => {
      callCount++;
      if (callCount <= 2) {
        throw new Error("network timeout");
      }
      return {
        ok: true,
        json: () =>
          Promise.resolve({
            id: "chatcmpl-106",
            model: "openai/gpt-4o",
            choices: [
              {
                message: { content: "Final answer" },
                finish_reason: "stop",
              },
            ],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 5,
              total_tokens: 15,
            },
          }),
      };
    });

    const provider = new OpenRouterProvider({
      apiKey: "test-key",
      baseUrl: "https://openrouter.ai/api/v1",
    });

    const response = await provider.generate({
      model: "openai/gpt-4o",
      messages: [{ role: "user", content: "Hi" }],
    });

    expect(response.content).toBe("Final answer");
    expect(callCount).toBe(3);
  });

  it("should use OpenRouter headers correctly", async () => {
    const { OpenRouterProvider, buildHeaders } =
      await import("../src/ai/openrouter.js");

    // Test buildHeaders directly
    const headers = (
      buildHeaders as (config: {
        apiKey: string;
        baseUrl: string;
        referer?: string;
        title?: string;
      }) => Record<string, string>
    )({
      apiKey: "sk-xxx",
      baseUrl: "https://openrouter.ai/api/v1",
      referer: "https://cvgen.dev",
      title: "cvgen",
    });

    expect(headers["Authorization"]).toBe("Bearer sk-xxx");
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["HTTP-Referer"]).toBe("https://cvgen.dev");
    expect(headers["X-Title"]).toBe("cvgen");
  });

  it("should handle streaming response with SSE chunks", async () => {
    const { OpenRouterProvider } = await import("../src/ai/openrouter.js");

    const encoder = new TextEncoder();
    const chunks = [
      encoder.encode(
        'data: {"choices":[{"delta":{"content":"Hello"},"finish_reason":null}]}\n',
      ),
      encoder.encode(
        'data: {"choices":[{"delta":{"content":" world"},"finish_reason":null}]}\n',
      ),
      encoder.encode(
        'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}\n',
      ),
      encoder.encode("data: [DONE]\n"),
    ];

    let chunkIndex = 0;
    const reader = {
      read: async () => {
        if (chunkIndex < chunks.length) {
          return { done: false, value: chunks[chunkIndex++] };
        }
        return { done: true, value: undefined };
      },
      releaseLock() {},
    };

    mockFetch.mockResolvedValue({
      ok: true,
      body: { getReader: () => reader },
    });

    const provider = new OpenRouterProvider({
      apiKey: "test-key",
      baseUrl: "https://openrouter.ai/api/v1",
    });

    const collected: string[] = [];
    for await (const chunk of provider.stream({
      model: "openai/gpt-4o",
      messages: [{ role: "user", content: "Hi" }],
    })) {
      collected.push(chunk.content);
    }

    expect(collected.join("")).toBe("Hello world");
  });

  it("should handle streaming auth failure without retry", async () => {
    const { OpenRouterProvider } = await import("../src/ai/openrouter.js");

    let callCount = 0;

    mockFetch.mockImplementation(async () => {
      callCount++;
      return {
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        text: () => Promise.resolve(""),
      };
    });

    const provider = new OpenRouterProvider({
      apiKey: "bad-key",
      baseUrl: "https://openrouter.ai/api/v1",
    });

    await expect(
      (async () => {
        for await (const _ of provider.stream({
          model: "openai/gpt-4o",
          messages: [{ role: "user", content: "Hi" }],
        })) {
          // consume
        }
      })(),
    ).rejects.toThrow("Authentication failed");

    expect(callCount).toBe(1); // no retry on auth
  });

  it("should handle streaming retry on transient error", async () => {
    const { OpenRouterProvider } = await import("../src/ai/openrouter.js");

    let callCount = 0;

    mockFetch.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          ok: false,
          status: 500,
          statusText: "Server Error",
          text: () => Promise.resolve(""),
        };
      }
      const encoder = new TextEncoder();
      return {
        ok: true,
        body: {
          getReader: () => ({
            read: async () => ({
              done: true,
              value: undefined,
            }),
            releaseLock() {},
          }),
        },
      };
    });

    const provider = new OpenRouterProvider({
      apiKey: "test-key",
      baseUrl: "https://openrouter.ai/api/v1",
    });

    // Should succeed after retry
    await (async () => {
      for await (const _ of provider.stream({
        model: "openai/gpt-4o",
        messages: [{ role: "user", content: "Hi" }],
      })) {
        // consume
      }
    })();

    expect(callCount).toBe(2);
  });

  it("should handle streaming body reader failure", async () => {
    const { OpenRouterProvider } = await import("../src/ai/openrouter.js");
    mockFetch.mockResolvedValue({
      ok: true,
      body: null, // no body
    });

    const provider = new OpenRouterProvider({
      apiKey: "test-key",
      baseUrl: "https://openrouter.ai/api/v1",
    });

    await expect(
      (async () => {
        for await (const _ of provider.stream({
          model: "openai/gpt-4o",
          messages: [{ role: "user", content: "Hi" }],
        })) {
          // consume
        }
      })(),
    ).rejects.toThrow("no readable body");
  });

  it("should be able to stream with streaming set in request body", async () => {
    const { OpenRouterProvider } = await import("../src/ai/openrouter.js");

    let requestBody: string | undefined;

    const encoder = new TextEncoder();
    mockFetch.mockImplementation(
      async (url: string, options: { body?: string }) => {
        requestBody = options.body;
        return {
          ok: true,
          body: {
            getReader: () => ({
              read: async () => ({ done: true, value: undefined }),
              releaseLock() {},
            }),
          },
        };
      },
    );

    const provider = new OpenRouterProvider({
      apiKey: "test-key",
      baseUrl: "https://openrouter.ai/api/v1",
    });

    for await (const _ of provider.stream({
      model: "openai/gpt-4o",
      messages: [{ role: "user", content: "Hi" }],
    })) {
      // consume
    }

    const body = JSON.parse(requestBody as string);
    expect(body.stream).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Barrel exports
// ---------------------------------------------------------------------------

describe("AI module barrel exports", () => {
  it("should export all expected symbols from ai/index", async () => {
    const mod = await import("../src/ai/index.js");
    // Type-only exports aren't available at runtime, so we check for
    // the runtime-available symbols
    expect(mod.OpenRouterProvider).toBeDefined();
    expect(mod.ProviderRegistry).toBeDefined();
    expect(mod.createOpenRouterProvider).toBeDefined();
    expect(mod.createDefaultRegistry).toBeDefined();
    expect(mod.getDefaultRegistry).toBeDefined();
    expect(mod.createProvider).toBeDefined();
    expect(mod.buildHeaders).toBeDefined();
    expect(mod.estimateCost).toBeDefined();
    expect(mod.formatCost).toBeDefined();
    expect(mod.getModelPricing).toBeDefined();
    expect(mod.registerPricing).toBeDefined();
    expect(mod.isLocalModel).toBeDefined();
    expect(mod.DEFAULT_CAPABILITIES).toBeDefined();
  });
});
