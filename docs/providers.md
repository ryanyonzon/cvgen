# Provider Documentation

`cvgen` uses a provider abstraction layer that allows you to use different AI providers without changing application logic. Every provider implements the same `AIProvider` interface.

---

## Table of Contents

- [Provider Architecture](#provider-architecture)
- [OpenRouter (Default)](#openrouter-default)
- [Provider Configuration](#provider-configuration)
- [Provider Capabilities](#provider-capabilities)
- [Cost Estimation](#cost-estimation)
- [Model Discovery](#model-discovery)
- [Provider Commands](#provider-commands)
- [Future Providers](#future-providers)
- [Local Models](#local-models)
- [Troubleshooting](#troubleshooting)

---

## Provider Architecture

```
┌─────────────────────────────────────────────┐
│            Business Logic                   │
│  (Pipeline, Ranking, Rendering, etc.)       │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│         AIProvider Interface                │
│  generate()  stream()  models()  caps()     │
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
   OpenRouter    OpenAI    Anthropic
   Adapter      Adapter    Adapter   ...
```

### AIProvider Interface

```typescript
interface AIProvider {
  name(): string;
  models(): Promise<Model[]>;
  capabilities(): Promise<ProviderCapabilities>;
  generate(request: GenerateRequest): Promise<GenerateResponse>;
  stream(request: GenerateRequest): AsyncGenerator<GenerateResponse>;
}
```

### Provider Capabilities

Each provider advertises its capabilities:

```typescript
interface ProviderCapabilities {
  streaming: boolean;   // Supports streaming responses
  jsonMode: boolean;    // Supports structured JSON output
  reasoning: boolean;   // Supports reasoning/thinking tokens
  toolCalling: boolean; // Supports tool/function calling
  vision: boolean;      // Supports vision/image inputs
}
```

The pipeline automatically adjusts based on supported capabilities:

- If `jsonMode` is available, the AI returns structured JSON directly
- If `jsonMode` is unavailable, the pipeline falls back to Markdown parsing
- If `streaming` is available, progress is shown in real-time

---

## OpenRouter (Default)

[OpenRouter](https://openrouter.ai/) is the default provider. It provides access to 200+ models from various providers through a single API.

### Setup

1. **Create an account** at [openrouter.ai](https://openrouter.ai/)
2. **Generate an API key** from the [keys page](https://openrouter.ai/keys)
3. **Configure** `~/.config/cvgen/.env`:

```dotenv
provider=openrouter
model=openai/gpt-4o
api_key=sk-or-v1-your-api-key-here
base_url=https://openrouter.ai/api/v1
```

### Recommended Models

| Model | Description | Cost (per 1M tokens) |
|-------|-------------|---------------------|
| `openai/gpt-4o` | Best balance of quality and speed | $2.50 / $10.00 |
| `openai/gpt-4o-mini` | Fast and affordable | $0.15 / $0.60 |
| `openai/gpt-4-turbo` | Strong reasoning capabilities | $10.00 / $30.00 |
| `anthropic/claude-3.5-sonnet` | Excellent for detailed analysis | $3.00 / $15.00 |
| `meta-llama/llama-3.1-70b` | Open-source alternative | $0.25 / $1.00 |
| `mistralai/mistral-large` | Strong European model | $2.00 / $6.00 |
| `deepseek/deepseek-chat` | Affordable high-quality option | $0.50 / $2.00 |

### Features

- JSON mode - Structured output without parsing
- Streaming - Real-time response generation
- Model listing - Discover available models dynamically
- Usage tracking - Token counts and cost estimation
- Retry logic - Automatic retry on transient failures (3 attempts, exponential backoff)

---

## Provider Configuration

### Environment Variables (`.env`)

```dotenv
# Provider selection
provider=openrouter

# Model selection
model=openai/gpt-4o

# API authentication
api_key=sk-or-v1-your-api-key-here

# API base URL
base_url=https://openrouter.ai/api/v1
```

| Variable | Required | Description |
|----------|----------|-------------|
| `provider` | Yes | Provider name (e.g., `openrouter`, `openai`) |
| `model` | Yes | Model identifier (e.g., `openai/gpt-4o`) |
| `api_key` | For remote providers | API key for authentication |
| `base_url` | Yes | API base URL |

### Multiple Providers

Future versions will support multiple providers simultaneously. For now, set the provider in `.env` and use it across all commands.

### Provider-Specific Parameters

Provider-specific parameters can be passed through `providerParams` in the generation request. These are passed through without modification.

---

## Provider Capabilities

### OpenRouter

| Capability | Supported |
|------------|-----------|
| Streaming | [x] |
| JSON Mode | [x] |
| Reasoning | [x] |
| Tool Calling | [x] |
| Vision | [x] |

### Capability Detection

The pipeline automatically detects provider capabilities:

```typescript
const capabilities = await provider.capabilities();

if (capabilities.jsonMode) {
  // Request structured JSON output
} else {
  // Fall back to Markdown parsing
}

if (capabilities.streaming) {
  // Use streaming for long operations
}
```

---

## Cost Estimation

`cvgen` includes a built-in pricing table for 20+ model families from the following providers:

- OpenAI (GPT-4o, GPT-4, GPT-3.5, o1, o3)
- Anthropic (Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku, Claude 4)
- Google (Gemini 2.0 Flash, Gemini 2.0 Pro, Gemini 1.5 Pro)
- Meta (Llama 3, Llama 4)
- Mistral (Mistral Large, Mistral Small)
- DeepSeek (DeepSeek Chat, DeepSeek R1)
- Qwen (Qwen 3, Qwen 2.5)
- Cohere (Command R)

### Cost Display

Cost estimates are shown in:

- **Verbose mode** (`--verbose`)
- **Generation metadata** (saved in history)
- **Doctor command** (`cvgen doctor --verbose`)

### Custom Pricing

You can register custom pricing for models not in the built-in table:

```typescript
import { registerPricing } from "./ai/cost.js";

registerPricing("my-provider/my-model*", 1.0, 4.0);
```

### Local Models

Models from local providers (Ollama, LM Studio) have zero cost by default:

```text
ollama/*      → $0.00 / $0.00
lm-studio/*   → $0.00 / $0.00
local/*       → $0.00 / $0.00
```

---

## Model Discovery

List available models for your configured provider:

```bash
# List models for the current provider
cvgen models

# List models for a specific provider
cvgen models --provider openrouter
```

Example output:

```
Found 47 model(s) from openrouter:

  • openai/gpt-4o | 128K context
  • openai/gpt-4o-mini | 128K context
  • anthropic/claude-3.5-sonnet | 200K context
  • meta-llama/llama-3.1-70b | 128K context
  ...
```

---

## Provider Commands

### List Available Providers

```bash
cvgen providers
```

Example output:

```
Available Providers:
  ✔ OpenRouter (default)
```

### List Models

```bash
# Models for current provider
cvgen models

# Models for specific provider
cvgen models --provider openrouter
```

### Check Provider Health

```bash
cvgen doctor --verbose
```

The doctor command checks:

- Provider and model configuration
- API key presence
- Internet connectivity (for remote providers)
- Provider API connectivity
- Model availability

---

## Future Providers

The following providers are planned for future releases:

| Provider | Type | Status |
|----------|------|--------|
| OpenAI | Remote | Planned |
| Anthropic | Remote | Planned |
| Google Gemini | Remote | Planned |
| Ollama | Local | Planned |
| LM Studio | Local | Planned |
| Azure OpenAI | Remote | Planned |
| OpenAI-compatible | Remote | Planned |

### Provider Specification

To add a new provider, implement the `AIProvider` interface:

```typescript
import type { AIProvider, Model, ProviderCapabilities, GenerateRequest, GenerateResponse } from "../ai/types.js";

export class MyCustomProvider implements AIProvider {
  name(): string {
    return "my-provider";
  }

  async models(): Promise<Model[]> {
    // Fetch models from the provider API
  }

  async capabilities(): Promise<ProviderCapabilities> {
    return {
      streaming: true,
      jsonMode: true,
      reasoning: false,
      toolCalling: false,
      vision: false,
    };
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    // Make API call and return response
  }

  async *stream(request: GenerateRequest): AsyncGenerator<GenerateResponse> {
    // Stream response chunks
  }
}
```

Then register it:

```typescript
import { getDefaultRegistry } from "../ai/index.js";

const registry = getDefaultRegistry();
registry.register("my-provider", () => new MyCustomProvider());
```

---

## Local Models

Local models run on your machine, keeping all data private.

### Supported Local Providers (Planned)

| Provider | Description |
|----------|-------------|
| **Ollama** | Run models locally with Ollama |
| **LM Studio** | Discover, download, and run local models |

### Configuration (Future)

```dotenv
# Ollama
provider=ollama
model=ollama/qwen3:32b
base_url=http://localhost:11434

# LM Studio
provider=lm-studio
model=lm-studio/qwen3-32b
base_url=http://localhost:1234/v1
```

### Benefits of Local Models

- **Privacy** - All data stays on your machine
- **No API costs** - Free to use after initial setup
- **Offline** - Works without internet
- **Customizable** - Fine-tune models for specific domains

---

## Troubleshooting

### API Key Issues

```bash
# Check if API key is configured
cvgen doctor

# Error: "API key is not configured"
# Solution: Add api_key to ~/.config/cvgen/.env
```

### Provider Not Available

```bash
# Check available providers
cvgen providers

# Error: "Provider not found"
# Solution: Ensure provider name is correct in .env
```

### Model Not Available

```bash
# List available models
cvgen models

# Error: "Model not found in provider's model list"
# Solution: Choose a model from the list or update the model name
```

### Network Issues

```bash
# Test connectivity
cvgen doctor --verbose

# Error: "Failed to resolve host"
# Solution: Check internet connection and DNS settings
```

### Rate Limiting

The provider adapter includes automatic retry logic for transient failures:

- **429 Rate Limit** - Retries with exponential backoff
- **500 Server Error** - Retries up to 3 times
- **Network Timeout** - Retries with exponential backoff

Authentication failures (401) are not retried.