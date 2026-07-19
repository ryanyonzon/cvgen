# cvgen

**AI-powered CLI for generating professional, ATS-friendly resumes and cover letters.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/cvgen)](https://www.npmjs.com/package/cvgen)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org)

---

## Overview

`cvgen` is a deterministic, AI-powered CLI that generates tailored resumes (CVs) and cover letters from structured candidate profiles and job descriptions.

Unlike simple prompt wrappers, `cvgen` follows a structured generation pipeline that separates data, AI reasoning, rendering, and templates - ensuring consistent, professional, and ATS-friendly output.

### Key Features

- **Structured Pipeline** - Deterministic stages: parse, rank, generate, render
- **ATS-Friendly** - Keyword matching, scoring, and optimization
- **Provider Independent** - OpenRouter by default, extensible to any AI provider
- **Never Fabricates** - AI summarizes, rewrites, and tailors - never invents
- **Customizable** - Editable prompts, templates, and profiles
- **Scriptable** - Unix-friendly CLI, pipes, and stdout support
- **Multiple Profiles** - Support for different career targets
- **History** - Track generation history with metadata
- **Explain Mode** - Understand why each decision was made
- **Dry Run** - Preview analysis without spending AI tokens

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Commands](#commands)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [Output](#output)
- [Templates](#templates)
- [Providers](#providers)
- [Prompts](#prompts)
- [History](#history)
- [Examples](#examples)
- [Development](#development)
- [FAQ](#faq)
- [License](#license)

---

## Installation

### Prerequisites

- **Node.js** >= 20.0.0
- **npm** >= 10.0.0

### Install Globally

```bash
npm install -g @ryanyonzon/cvgen
```

### Use Directly with npx

```bash
npx cvgen [command] [options]
```

### From Source

```bash
git clone https://github.com/ryanyonzon/cvgen.git
cd cvgen
npm install
npm run build
npm link
```

---

## Quick Start

### 1. Initialize Configuration

```bash
cvgen init
```

This creates the configuration directory at `~/.config/cvgen/` with:

- `config.json` - Application configuration
- `.env` - Provider credentials (set your API key)
- `profiles/default.json` - Your candidate profile
- `prompts/v1/` - Default AI prompts
- `templates/` - Built-in resume templates

### 2. Set Up Your Profile

Edit your profile at `~/.config/cvgen/profiles/default.json`:

```json
{
  "name": "Jane Doe",
  "headline": "Senior Software Engineer",
  "summary": "Experienced software engineer with 10+ years building scalable web applications, REST APIs, and cloud-native systems. Passionate about distributed systems, developer experience, and mentoring engineers.",
  "contact": {
    "email": "jane@example.com",
    "phone": "+1-555-0123",
    "city": "San Francisco",
    "state": "CA",
    "country": "US",
    "website": "https://janedoe.dev"
  },
  "social": {
    "linkedin": "https://linkedin.com/in/janedoe",
    "github": "https://github.com/janedoe",
    "stackoverflow": "https://stackoverflow.com/users/12345/janedoe",
    "portfolio": "https://janedoe.dev"
  },
  "skills": ["JavaScript", "TypeScript", "React", "Node.js", "Python", "Go", "PostgreSQL", "MongoDB", "Redis", "Docker", "Kubernetes", "AWS", "Terraform", "GraphQL", "REST APIs"],
  "experience": [
    {
      "id": "exp-1",
      "company": "Tech Corp",
      "role": "Senior Software Engineer",
      "location": "San Francisco, CA",
      "startDate": "2020-01",
      "endDate": null,
      "current": true,
      "summary": "Lead backend and infrastructure team for the platform engineering group.",
      "achievements": [
        "Designed and built a scalable microservices architecture serving 1M+ daily active users",
        "Led migration from a monolithic Rails application to distributed Go and Node.js services",
        "Reduced average API latency by 40% through query optimization and caching strategies",
        "Established CI/CD pipelines using GitHub Actions and ArgoCD, reducing deployment time from 2 hours to 15 minutes",
        "Mentored 5 junior engineers through structured code reviews and weekly pair programming sessions"
      ],
      "skills": ["System Design", "Team Leadership", "Code Review", "Mentoring"],
      "technologies": ["TypeScript", "Go", "Node.js", "Docker", "Kubernetes", "AWS", "Terraform", "PostgreSQL", "Redis", "GraphQL"],
      "projects": ["platform-migration", "api-gateway"]
    },
    {
      "id": "exp-2",
      "company": "StartupXYZ",
      "role": "Full Stack Developer",
      "location": "Remote",
      "startDate": "2017-03",
      "endDate": "2019-12",
      "current": false,
      "summary": "Early engineer building the company's core SaaS product from the ground up.",
      "achievements": [
        "Built the initial MVP and customer-facing dashboard using React and Node.js, acquiring first 500 paying customers",
        "Implemented real-time data processing pipeline handling 10M+ events per day using Kafka and Redis",
        "Designed and documented RESTful APIs consumed by 50+ third-party integrations",
        "Reduced infrastructure costs by 35% through right-sizing EC2 instances and implementing auto-scaling policies"
      ],
      "skills": ["Full Stack Development", "Product Engineering", "API Design"],
      "technologies": ["JavaScript", "React", "Node.js", "Python", "AWS", "Kafka", "Redis", "MongoDB"],
      "projects": ["saas-dashboard", "event-pipeline"]
    }
  ],
  "education": [
    {
      "school": "University of California, Berkeley",
      "degree": "Bachelor of Science",
      "field": "Computer Science",
      "startDate": "2012-08",
      "endDate": "2016-05",
      "achievements": [
        "Dean's List - Spring 2015, Fall 2015",
        "Teaching Assistant for Data Structures and Algorithms (2015–2016)"
      ],
      "skills": ["Data Structures", "Algorithms", "Operating Systems", "Networking", "Linear Algebra"]
    }
  ],
  "projects": [
    {
      "id": "platform-migration",
      "name": "Platform Migration",
      "description": "Architected and executed migration from a monolithic Rails application to a distributed microservices platform serving 1M+ users across 3 continents.",
      "url": "https://techcorp.com/engineering/platform-migration",
      "repository": "https://github.com/techcorp/platform-migration",
      "technologies": ["Go", "TypeScript", "gRPC", "Docker", "Kubernetes", "AWS ECS", "Terraform"],
      "skills": ["System Architecture", "Distributed Systems", "Migration Strategy"],
      "achievements": [
        "Achieved 99.99% uptime during the 6-month phased migration",
        "Reduced deployment frequency from bi-weekly to 50+ deploys per day"
      ]
    },
    {
      "id": "api-gateway",
      "name": "API Gateway",
      "description": "Designed and implemented a GraphQL federation gateway unifying 8 backend services into a single developer-friendly API endpoint.",
      "repository": "https://github.com/techcorp/api-gateway",
      "technologies": ["TypeScript", "GraphQL", "Apollo Federation", "Redis", "Node.js"],
      "skills": ["API Design", "GraphQL", "Performance Optimization"],
      "achievements": [
        "Reduced frontend team's API integration time by 60% through schema stitching and caching",
        "Gateway handles 500K+ requests per minute with p99 latency under 50ms"
      ]
    },
    {
      "id": "saas-dashboard",
      "name": "SaaS Analytics Dashboard",
      "description": "Customer-facing analytics dashboard for StartupXYZ's core SaaS product, featuring real-time metrics, customizable reports, and role-based access control.",
      "technologies": ["React", "Redux", "D3.js", "Node.js", "MongoDB", "WebSockets"],
      "skills": ["UI Development", "Data Visualization", "Real-time Systems"],
      "achievements": [
        "Drove customer engagement up 45% quarter-over-quarter after launch"
      ]
    }
  ],
  "certifications": [
    {
      "name": "AWS Solutions Architect – Associate",
      "issuer": "Amazon Web Services",
      "issueDate": "2021-06",
      "expiryDate": "2024-06",
      "credentialId": "AWS-ASA-123456",
      "url": "https://aws.amazon.com/certification/",
      "skills": ["AWS", "Cloud Architecture", "Infrastructure Design"]
    },
    {
      "name": "Kubernetes Administrator (CKA)",
      "issuer": "CNCF",
      "issueDate": "2022-03",
      "credentialId": "LF-9xyz7abc",
      "url": "https://cncf.io/certification/cka/",
      "skills": ["Kubernetes", "Container Orchestration", "Cluster Management"]
    }
  ],
  "languages": ["English (Native)", "Spanish (Professional Working)", "Mandarin (Conversational)"]
}
```

> **Tip:** The profile is the single source of truth. AI may summarize, rewrite, reorder, or omit content - but it will never fabricate employers, dates, projects, metrics, or technologies.

### 3. Set Your API Key

Edit `~/.config/cvgen/.env`:

```dotenv
provider=openrouter
model=openai/gpt-4o
api_key=sk-or-v1-your-api-key-here
base_url=https://openrouter.ai/api/v1
```

### 4. Generate a Resume

```bash
# Get a job description
curl -L https://example.com/job-posting.md > job.md

# Generate a tailored resume and cover letter
cvgen generate job.md

# Output to a directory
cvgen generate job.md --out ./generated

# Preview without AI generation
cvgen generate job.md --dry-run

# Understand AI decisions
cvgen generate job.md --explain

# Pipe to clipboard
cvgen generate job.md | pbcopy
```

---

## Commands

### `cvgen init`

Initializes the configuration directory at `~/.config/cvgen/` with default configuration, profile, prompts, and templates.

```bash
cvgen init                   # Create configuration (fails if exists)
cvgen init --force           # Overwrite existing configuration
```

### `cvgen generate <job-description>`

Generates a tailored resume and cover letter from a job description.

**Sources:**

| Source | Example |
|--------|---------|
| Local Markdown file | `cvgen generate job.md` |
| Local text file | `cvgen generate job.txt` |
| PDF file | `cvgen generate job.pdf` |
| DOCX file | `cvgen generate job.docx` |
| HTML file | `cvgen generate job.html` |
| URL | `cvgen generate https://example.com/jobs/123` |
| Standard input | `cat job.md \| cvgen generate` |

**Options:**

| Option | Description |
|--------|-------------|
| `--profile <name>` | Profile to use (default: from config) |
| `--template <name>` | Template to use (default: from config) |
| `--out <dir>` | Output directory |
| `--cover <text>` | Additional context for cover letter generation |
| `--dry-run` | Show analysis without AI generation |
| `--explain` | Show reasoning for each decision |
| `--stdout` | Output to stdout (default) |
| `--output <type>` | Output type: `markdown`, `json` |

**Examples:**

```bash
# Basic generation to stdout
cvgen generate job.md

# Use a specific profile and template
cvgen generate job.md --profile backend --template modern

# Output to directory with all files
cvgen generate job.md --out ./my-application

# Preview analysis without AI
cvgen generate job.md --dry-run

# See reasoning behind AI decisions
cvgen generate job.md --explain

# Provide extra context for the cover letter
cvgen generate job.md --cover "While I haven't worked with Firebase professionally, I have experience learning and adopting new technologies quickly, and I'm confident I can become productive with it in a short time."

# Get raw JSON output for automation
cvgen generate job.md --output json

# Read from URL
cvgen generate https://company.com/careers/backend-engineer
```

### `cvgen profile`

Manages candidate profiles.

```bash
cvgen profile list                   # List all profiles
cvgen profile show --name backend    # Show profile details
cvgen profile validate               # Validate all profiles
cvgen profile validate --name backend  # Validate specific profile
```

### `cvgen config`

Manages application configuration.

```bash
cvgen config show                    # Display current configuration
cvgen config profile --name backend  # Set default profile
```

### `cvgen validate`

Validates various components of the setup without AI generation.

```bash
cvgen validate                       # Validate all profiles (default)
cvgen validate profile --name backend  # Validate specific profile
cvgen validate config                # Validate configuration files
cvgen validate prompts               # Validate prompt files
cvgen validate templates             # Validate template files
cvgen validate job job.md            # Parse and analyze a job description
cvgen validate job job.md --ats      # Include ATS keyword analysis
```

### `cvgen doctor`

Runs comprehensive system diagnostics to identify configuration issues.

```bash
cvgen doctor            # Run basic diagnostics
cvgen doctor --verbose  # Show detailed diagnostics
```

The diagnostics check:

- ✔ Configuration directory and files
- ✔ Environment file and API key
- ✔ Provider and model configuration
- ✔ Profile availability and validity
- ✔ Prompt files and structure
- ✔ Template files and structure
- ✔ Internet connectivity (for remote providers)
- ✔ Provider API connectivity
- ✔ Model availability

### `cvgen providers`

Lists available AI providers.

```bash
cvgen providers
```

### `cvgen models`

Lists available models for the configured provider.

```bash
cvgen models                    # Models for current provider
cvgen models --provider openai  # Models for specific provider
```

### `cvgen help`

Displays help information.

```bash
cvgen help
cvgen --help
cvgen -h
```

### Global Options

These options work with any command:

| Option | Description |
|--------|-------------|
| `--verbose` | Enable verbose logging |
| `--debug` | Enable debug logging (includes prompts, raw responses) |
| `--no-color` | Disable colored output |
| `--version` | Display version information |

---

## Configuration

Configuration is stored at `~/.config/cvgen/`.

```
~/.config/cvgen/
├── .env              # Provider credentials (API keys, provider, model)
├── config.json       # Application settings
├── profiles/         # Candidate profiles
│   └── default.json
├── prompts/          # AI prompt overrides
│   └── v1/           # Versioned prompt directories
├── templates/        # Document templates
├── logs/             # Generation logs (if enabled)
└── history/          # Generation history (if enabled)
```

### Environment (`.env`)

```dotenv
# Provider credentials
provider=openrouter
model=openai/gpt-4o
api_key=sk-or-v1-your-api-key-here
base_url=https://openrouter.ai/api/v1
```

| Variable | Description | Required |
|----------|-------------|----------|
| `provider` | AI provider name | Yes |
| `model` | Model identifier | Yes |
| `api_key` | API key for the provider | For remote providers |
| `base_url` | Base URL for the provider API | Yes |

### Configuration (`config.json`)

```json
{
  "defaultProfile": "default",
  "defaultTemplate": "ats",
  "defaultOutput": "stdout",
  "temperature": 0.2,
  "maxTokens": 8000,
  "history": true,
  "logging": true,
  "promptVersion": "v1"
}
```

| Field | Default | Description |
|-------|---------|-------------|
| `defaultProfile` | `"default"` | Default profile name |
| `defaultTemplate` | `"ats"` | Default template name |
| `defaultOutput` | `"stdout"` | Default output destination |
| `temperature` | `0.2` | AI generation temperature (0.0–2.0) |
| `maxTokens` | `8000` | Maximum tokens for AI generation |
| `history` | `true` | Enable generation history |
| `logging` | `true` | Enable file logging |
| `promptVersion` | `"v1"` | Prompt version to use |

---

## Architecture

```
Profile + Job Description
         │
         ▼
    Job Parser            │  Supports: .md, .txt, .pdf, .docx, .html, URL, stdin
         │
         ▼
 Keyword Extraction      │  AI-powered extraction of required/preferred skills
         │
         ▼
  Ranking Engine         │  Deterministic: experience, skills, projects, education
         │
         ▼
 Resume Planning         │  AI selects which items to include
         │
         ▼
 Resume Generation       │  AI generates structured JSON content
         │
         ▼
 ATS Analysis            │  Keyword matching, scoring, recommendations
         │
         ▼
 Cover Letter            │  AI generates tailored cover letter
         │
         ▼
  Validation             │  Schema validation of generated content
         │
         ▼
   Renderer              │  Template-based Markdown rendering
         │
         ▼
 Markdown / stdout       │  Output to stdout, directory, or JSON
```

### Pipeline Stages

| Stage | Description | Method |
|-------|-------------|--------|
| Profile Loading | Load and validate the selected profile | Deterministic |
| Job Parsing | Normalize job description into common schema | Deterministic |
| Keyword Extraction | Identify required/preferred skills, responsibilities | AI |
| Experience Ranking | Score work experience by relevance | Deterministic |
| Skill Ranking | Group skills by relevance (primary, secondary, supporting) | Deterministic |
| Project Ranking | Score projects by relevance | Deterministic |
| Education Ranking | Score education by relevance | Deterministic |
| Resume Planning | Plan which items to include in the resume | AI |
| Resume Generation | Generate structured resume content | AI |
| ATS Analysis | Compute keyword match score and recommendations | AI |
| Cover Letter | Generate tailored cover letter | AI |
| Validation | Validate generated JSON against schema | Deterministic |
| Rendering | Render JSON to Markdown using templates | Deterministic |

### Design Principles

- **Structured Data First** - AI generates JSON, never Markdown
- **Separation of Concerns** - Each stage has a single responsibility
- **Provider Independence** - All providers implement the same interface
- **Deterministic Where Possible** - Ranking, validation, and rendering are deterministic
- **Never Fabricates** - AI may only summarize, rewrite, reorder, or omit

---

## Output

### Stdout Mode (Default)

```bash
cvgen generate job.md
```

Outputs the combined resume and cover letter as Markdown to stdout.

### Directory Mode

```bash
cvgen generate job.md --out ./my-application
```

Produces:

```
my-application/
├── resume.md              # Resume only
├── cover-letter.md        # Cover letter only
├── combined.md            # Combined document
├── generation.json        # Raw generated resume JSON
└── ats-report.md          # ATS analysis report
```

### JSON Mode

```bash
cvgen generate job.md --output json
```

Outputs the complete pipeline result as JSON:

```json
{
  "resume": { ... },
  "coverLetter": { ... },
  "atsReport": { ... },
  "metadata": { ... }
}
```

---

## Templates

Templates are presentation-only Markdown files with placeholder variables.

### Template Syntax

| Syntax | Description |
|--------|-------------|
| `{{variable}}` | Simple variable substitution |
| `{{#if variable}}...{{/if}}` | Conditional block |
| `{{#each array}}...{{/each}}` | Array iteration |
| `{{contact.email}}` | Nested path access |

### Built-in Templates

| Template | Description |
|----------|-------------|
| `ats` | ATS-optimized, clean, machine-readable |
| `classic` | Traditional resume format with clear sections |
| `modern` | Contemporary layout with focus on skills |
| `minimal` | Ultra-clean, focused on readability |

### Custom Templates

Create custom templates at `~/.config/cvgen/templates/`:

```bash
# Create a custom template
nano ~/.config/cvgen/templates/my-company.md

# Use it
cvgen generate job.md --template my-company
```

See [Template Documentation](docs/templates.md) for full details.

---

## Providers

### Supported Providers

| Provider | Status | Type |
|----------|--------|------|
| OpenRouter | Available | Remote |
| OpenAI | - | Remote |
| Anthropic | - | Remote |
| Google Gemini | - | Remote |
| Ollama | - | Local |
| LM Studio | - | Local |

### Provider Configuration

```dotenv
# OpenRouter
provider=openrouter
model=openai/gpt-4o
api_key=sk-or-v1-your-api-key-here
base_url=https://openrouter.ai/api/v1
```

### Cost Estimation

`cvgen` includes a built-in pricing table for 20+ model families. Cost estimates are displayed in verbose mode and recorded in generation metadata.

See [Provider Documentation](docs/providers.md) for full details.

---

## Prompts

Prompts are external, versioned files that control AI behavior.

### Prompt Structure

```
prompts/v1/
├── system.md              # Universal AI behavior rules
├── resume.md              # Resume generation instructions
├── cover-letter.md        # Cover letter generation instructions
├── keyword-extraction.md  # Keyword extraction instructions
└── ats.md                 # ATS analysis instructions
```

### Custom Prompts

Override built-in prompts by placing files in `~/.config/cvgen/prompts/v1/`:

```bash
# Override the resume prompt
nano ~/.config/cvgen/prompts/v1/resume.md
```

### Prompt Versioning

```json
{
  "promptVersion": "v1"
}
```

Prompt versions are immutable. Bug fixes create new versions (e.g., `v1.1`) instead of modifying existing ones.

See [Prompt Documentation](docs/prompts.md) for full details.

---

## History

When history is enabled (`"history": true` in config.json), each generation run is saved to `~/.config/cvgen/history/`.

```
~/.config/cvgen/history/
├── 2026-07-09-143022/
│   ├── resume.md
│   ├── cover-letter.md
│   ├── combined.md
│   ├── generation.json
│   ├── metadata.json
│   └── ats-report.md
└── 2026-07-10-091500/
    └── ...
```

---

## Examples

### Basic Usage

```bash
# Initialize
cvgen init

# Generate from a local file
cvgen generate job.md

# Generate from a URL
cvgen generate https://company.com/careers/backend-engineer

# Generate from stdin
curl -L https://company.com/careers/backend-engineer | cvgen generate
```

### Profile Management

```bash
# Create multiple profiles
cp ~/.config/cvgen/profiles/default.json ~/.config/cvgen/profiles/backend.json
cp ~/.config/cvgen/profiles/default.json ~/.config/cvgen/profiles/manager.json

# Use different profiles for different roles
cvgen generate backend-job.md --profile backend
cvgen generate manager-job.md --profile manager
```

### Output Control

```bash
# Save to a directory
cvgen generate job.md --out ./my-application

# Get JSON for automation
cvgen generate job.md --output json > pipeline-result.json

# Pipe to clipboard
cvgen generate job.md | pbcopy

# Pipe to a file
cvgen generate job.md > application.md
```

### Analysis & Debugging

```bash
# Preview without AI costs
cvgen generate job.md --dry-run

# Understand AI reasoning
cvgen generate job.md --explain

# Validate your setup
cvgen doctor

# Validate a specific component
cvgen validate config
cvgen validate prompts
cvgen validate templates

# Analyze a job description
cvgen validate job job.md --ats
```

### Advanced Configuration

```bash
# Set a different default profile
cvgen config profile --name backend

# Use a specific template
cvgen generate job.md --template modern

# Override temperature for more creative output
# Edit config.json: "temperature": 0.7
```

---

## Roadmap

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | **Project Foundation** - TypeScript ESM project, strict config, CLI entry point, typed errors, structured logging, core types & defaults | Complete |
| 2 | **Profile Management** - Profile schema, multi-profile support, load/save/list/validate, default profile generation | Complete |
| 3 | **Job Description Parsing** - 6 parsers (Markdown, Text, HTML, PDF, DOCX, URL), auto-source detection, stdin support | Complete |
| 4 | **AI Provider Framework** - AIProvider interface, ProviderRegistry, OpenRouter adapter, cost estimation, model discovery | Complete |
| 5 | **AI Generation Pipeline** - Keyword extraction, experience/skill/project/education ranking, resume planning, JSON generation | Complete |
| 6 | **Resume & Cover Letter Generation** - AI-driven content generation, explain mode, dry-run mode | Complete |
| 7 | **ATS Analysis** - Keyword matching, missing keywords detection, ATS scoring, recommendations | Complete |
| 8 | **Rendering Engine** - Markdown renderer, template engine, built-in templates, output directory, JSON output | Complete |
| 9 | **Diagnostics & Validation** - Doctor command, validate command, history support, metadata generation | Complete |
| 10 | **Documentation & Release** - README, installation guide, usage guide, template/provider/prompt docs, changelog, npm publishing | Complete |

---

## Development

### Setup

```bash
git clone https://github.com/ryanyonzon/cvgen.git
cd cvgen
npm install
npm run build
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Build the TypeScript project |
| `npm run dev` | Watch mode for development |
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage |
| `npm run lint` | Lint code |
| `npm run format` | Format code with Prettier |
| `npm run typecheck` | Type check without emitting files |

### Project Structure

```
src/
├── ai/          # AI provider integrations (OpenRouter, etc.)
├── ats/         # ATS analysis engine
├── commands/    # CLI command handlers
├── config/      # Configuration management
├── errors/      # Typed error classes
├── history/     # Generation history
├── logging/     # Logging framework
├── parser/      # Job description parsers (Markdown, PDF, DOCX, etc.)
├── pipeline/    # AI generation pipeline orchestration
├── ranking/     # Deterministic ranking engines
├── renderer/    # Template-based Markdown renderer
├── schemas/     # JSON schemas (Zod)
├── templates/   # Built-in templates (ATS, Classic, Modern, Minimal)
├── types/       # TypeScript type definitions
├── utils/       # Utility functions
├── validation/  # Configuration, prompt, and template validation
└── index.ts     # CLI entry point
```

### Coding Standards

- **Strict TypeScript** (`"strict": true`)
- Explicit return types on exported functions
- Async/await preferred over raw promises
- Native ES Modules
- Small, focused modules (under 300 lines)
- Single responsibility functions (under 40 lines)

See [CONTRIBUTING.md](./CONTRIBUTING.md) for full contribution guidelines.
See [docs/SPEC.md](./docs/SPEC.md) for the full technical specification.

---

## FAQ

### Does cvgen fabricate information?

No. The AI is explicitly instructed to never invent employers, projects, metrics, or technologies. It may only summarize, rewrite, reorder, or omit.

### Is my data sent to third parties?

Your profile data is sent to the configured AI provider (e.g., OpenRouter) for generation. Nothing is sent elsewhere. Use local providers (Ollama, LM Studio) for offline/private generation.

### What formats are supported for job descriptions?

Markdown (`.md`), plain text (`.txt`), PDF (`.pdf`), DOCX (`.docx`), HTML (`.html`), URLs, and standard input.

### Can I use a local AI model?

Local providers like Ollama and LM Studio are planned for future releases. Currently, OpenRouter is the primary provider.

### Can I customize the output format?

Yes. Templates control the Markdown layout. You can customize existing templates or create new ones at `~/.config/cvgen/templates/`.

### Can I customize the AI behavior?

Yes. Override any prompt file at `~/.config/cvgen/prompts/` to change how the AI behaves.

### How do I update my profile?

Edit `~/.config/cvgen/profiles/default.json` or create additional profiles for different career targets.

### How do I get help?

```bash
cvgen help              # CLI help
cvgen doctor            # System diagnostics
cvgen validate config   # Configuration validation
```

---

## License

MIT © Ryan Yonzon

See [LICENSE](./LICENSE) for full license text.