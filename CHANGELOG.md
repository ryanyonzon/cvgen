# Changelog

All notable changes to `cvgen` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-07-10

### Added

#### Phase 10 - Documentation & Release

- Comprehensive README with installation guide, usage guide, examples, and FAQ
- Template documentation (`docs/templates.md`) - template syntax, variables, built-in templates, custom templates
- Provider documentation (`docs/providers.md`) - provider architecture, OpenRouter setup, cost estimation, model discovery
- Prompt documentation (`docs/prompts.md`) - prompt architecture, versioning, custom prompts, assembly order
- CHANGELOG.md with release notes for all phases

#### Phase 9 - Diagnostics & Validation

- `cvgen doctor` command - comprehensive system diagnostics
- `cvgen validate` command - validates profiles, configuration, prompts, templates, and job descriptions
- Configuration validation - checks config file, env file, and config values
- Prompt validation - checks prompt file existence, readability, and structure
- Template validation - checks template file existence, syntax, and content
- History support - saves generation runs with metadata, ATS reports, and documents
- Metadata generation - records provider, model, tokens, cost, duration, and prompt version
- Logging improvements - file logging, step progress, verbose and debug levels

#### Phase 8 - Rendering Engine

- Markdown renderer with template engine (`{{variable}}`, `{{#if}}`, `{{#each}}`)
- Built-in templates: ATS, Classic, Modern, Minimal
- User template support - custom templates in `~/.config/cvgen/templates/`
- Output directory support - `--out` flag creates resume.md, cover-letter.md, combined.md, generation.json, ats-report.md
- Stdout rendering - default output mode
- JSON output mode - `--output json` returns raw pipeline result
- Template search order - user override → built-in → fallback to ATS

#### Phase 7 - ATS Analysis

- Deterministic ATS analyzer with keyword matching
- Levenshtein distance-based fuzzy matching
- Match score computation (0-100)
- Keyword coverage percentage
- Resume quality assessment (summary, achievements, skills, education)
- Keyword categorization (matched, weak, missing)
- Strengths, weaknesses, and recommendations generation
- Configurable match threshold and scoring weights
- ATS report output in Markdown format

#### Phase 6 - Resume & Cover Letter Generation

- AI-powered resume generation with structured JSON output
- AI-powered cover letter generation with structured sections
- Professional summary tailored to the target role
- Achievement bullet rewriting for impact
- ATS keyword insertion
- Resume validator - checks schema compliance
- Cover letter validator - checks schema compliance
- Explain mode (`--explain`) - shows reasoning for AI decisions
- Dry-run mode (`--dry-run`) - preview analysis without AI costs

#### Phase 5 - AI Generation Pipeline

- Pipeline orchestration with 12 stages
- AI-powered keyword extraction from job descriptions
- Deterministic experience ranking with relevance scores
- Deterministic skill ranking (primary, secondary, supporting, omitted)
- Deterministic project ranking
- Deterministic education ranking
- Resume planning stage - AI selects items before generation
- Structured JSON generation with schema validation
- Markdown fallback for providers without JSON mode
- Token usage tracking and cost estimation

#### Phase 4 - AI Provider Framework

- `AIProvider` interface - common contract for all providers
- `ProviderRegistry` with factory pattern
- OpenRouter adapter - generate, stream, retry, model listing
- Capability detection - streaming, JSON mode, reasoning, tool calling, vision
- Model discovery - `cvgen models` command
- Streaming support - real-time response generation
- Retry logic - 3 attempts with exponential backoff
- Token usage reporting
- Cost estimation - pricing table for 20+ model families
- Provider commands - `cvgen providers` and `cvgen models`

#### Phase 3 - Job Description Parsing

- Markdown parser
- Plain text parser
- HTML parser
- PDF parser (via pdf-parse)
- DOCX parser (via mammoth)
- URL downloader with readability extraction
- Auto-source detection (file extension, URL pattern, stdin)
- Common `ParsedJob` schema with validation
- Metadata extraction (title, company, location, employment type)

#### Phase 2 - Profile Management

- `cvgen init` command - initializes configuration directory
- Profile schema with Zod validation
- Multi-profile support - `profiles/` directory
- Profile load, save, list, and delete operations
- Profile validation with warnings
- `cvgen profile list` - list all profiles
- `cvgen profile show` - show profile details
- `cvgen profile validate` - validate all profiles
- Default profile generation with prompts and templates
- Configuration migration support

#### Phase 1 - Project Foundation

- TypeScript ESM project with strict mode
- ESLint and Prettier configuration
- Vitest test framework
- GitHub Actions CI/CD
- Semantic release configuration
- Command dispatcher architecture
- Configuration loader (config.json, .env)
- Logging framework (normal, verbose, debug)
- Typed error classes (ConfigurationError, ValidationError, ProviderError, RenderingError, ParsingError, IOError)
- Core type definitions
- Default configuration values
- CONTRIBUTING.md
- AGENTS.md
- README.md (initial)

---

## [0.1.0] - 2026-07-09

### Added

- Initial project scaffold
- TypeScript configuration with strict mode
- ESLint and Prettier setup
- Vitest test framework
- Basic CLI entry point
- Command dispatcher with help
- Configuration loader
- Logging framework
- Typed error classes
- Core type definitions
- Default configuration values
- CONTRIBUTING.md
- AGENTS.md
- Initial README.md