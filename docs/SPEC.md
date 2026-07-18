# Specification - cvgen

**Version:** 1.0.0
**Status:** Active

---

## Project Goal

`cvgen` is a deterministic, AI-powered CLI that generates ATS-friendly tailored resumes and cover letters from structured candidate profiles and job descriptions.

Unlike simple prompt wrappers, it follows a structured generation pipeline that separates data, AI reasoning, rendering, and templates - ensuring consistent, professional, and ATS-friendly output.

---

## Problem Statement

Applying for jobs is repetitive. Applicants spend significant time rewriting resumes, reordering experience, highlighting relevant skills, and writing cover letters for each application.

Most AI tools solve this with a single prompt, which leads to:

- **Hallucinated achievements** - fabricated metrics, companies, and projects
- **Inconsistent formatting** - poor ATS parsing
- **Provider lock-in** - tied to one AI service
- **Non-reproducible outputs** - different results from the same input
- **Poor customization** - difficult to tailor prompts or templates

`cvgen` solves these through a structured, deterministic generation pipeline.

---

## Non-Goals

The following are explicitly outside scope:

- GUI or TUI (terminal UI)
- LinkedIn / GitHub profile import
- Automatic job application submission
- Browser extension
- AI interview coaching
- Portfolio generation
- Employment history extraction

---

## Target Users

**Primary:** Software engineers, developers, architects, DevOps engineers, technical leads, engineering managers.

**Secondary:** Designers, marketers, finance professionals, administrative professionals, students, career shifters.

---

## Core Features

- **Profile Management** - Structured candidate data, multiple profiles
- **Job Description Parsing** - Markdown, text, PDF, DOCX, HTML, URL, stdin
- **AI Provider Abstraction** - Provider-independent interface, OpenRouter by default
- **Keyword Extraction** - AI identifies required and preferred skills
- **Deterministic Ranking** - Experience, skills, projects, education scored by relevance
- **Resume Generation** - Tailored summary, reordered experience, optimized skills
- **Cover Letter Generation** - Personalized, role-specific cover letter
- **ATS Analysis** - Keyword matching, scoring, recommendations
- **Template System** - Presentation-only templates (ATS, Classic, Modern, Minimal)
- **Prompt System** - Versioned, overridable AI prompts
- **History & Logging** - Generation history, metadata, cost tracking
- **Explain Mode** - Shows reasoning behind AI decisions
- **Dry Run** - Preview analysis without AI costs
- **Doctor Command** - System diagnostics
- **Validate Command** - Validate configuration, profiles, prompts, templates

---

## Functional Requirements

### CLI Commands

#### `cvgen init`

Creates `~/.config/cvgen/` with default configuration, profile, prompts, and templates.

| Option    | Description                                      |
|-----------|--------------------------------------------------|
| `--force` | Overwrite existing files without prompting       |

#### `cvgen generate <job-description>`

Generates a tailored resume and cover letter from a job description.

| Option           | Description                                      |
|------------------|--------------------------------------------------|
| `--profile`      | Profile to use (default: from config)            |
| `--template`     | Template to use (default: from config)           |
| `--out`          | Output directory                                 |
| `--cover`        | Additional context for cover letter              |
| `--dry-run`      | Show analysis without AI generation              |
| `--explain`      | Show reasoning for each decision                 |
| `--stdout`       | Output to stdout (default)                       |
| `--output`       | Output type: `markdown`, `json`                  |

Supported job description sources:

| Source   | Example                                        |
|----------|------------------------------------------------|
| .md      | `cvgen generate job.md`                    |
| .txt     | `cvgen generate job.txt`                   |
| .pdf     | `cvgen generate job.pdf`                   |
| .docx    | `cvgen generate job.docx`                  |
| .html    | `cvgen generate job.html`                  |
| URL      | `cvgen generate https://example.com/job`   |
| stdin    | `cat job.md \| cvgen generate`             |

#### `cvgen profile`

| Subcommand | Description                          |
|------------|--------------------------------------|
| list       | List all available profiles          |
| show       | Show details of a profile            |
| validate   | Validate all profiles or one profile |

#### `cvgen config`

| Subcommand | Description                          |
|------------|--------------------------------------|
| show       | Display current configuration        |
| profile    | Set default profile                  |

#### `cvgen validate`

| Target     | Description                                  |
|------------|----------------------------------------------|
| profile    | Validate a profile                           |
| config     | Validate configuration files                 |
| prompts    | Validate prompt files                        |
| templates  | Validate template files                      |
| job        | Parse and analyze a job description (+ `--ats`) |

#### `cvgen doctor`

Runs comprehensive system diagnostics. Checks: configuration directory, API key, provider, profile, prompts, templates, internet connectivity, provider API, model availability.

#### `cvgen providers`

Lists installed AI providers.

#### `cvgen models`

Lists available models for the configured (or specified) provider.

#### `cvgen help` / `--help`

Displays command documentation.

### Global Options

| Option        | Description                                   |
|---------------|-----------------------------------------------|
| `--verbose`   | Enable verbose logging                        |
| `--debug`     | Enable debug logging (prompts, raw responses) |
| `--no-color`  | Disable colored output                        |
| `--version`   | Display version information                   |

### AI Generation Pipeline

```
Profile Loading          → Deterministic
Job Parsing              → Deterministic (normalize to common schema)
Keyword Extraction       → AI
Experience Ranking       → Deterministic
Skill Ranking            → Deterministic
Project Ranking          → Deterministic
Education Ranking        → Deterministic
Resume Planning          → AI
Resume Generation        → AI (structured JSON only)
ATS Analysis             → AI
Cover Letter Generation  → AI
Validation               → Deterministic
Rendering                → Deterministic (template-based)
```

No pipeline stage should be bypassed. Each stage has a clearly defined input, output, and error contract.

### Data Models

**Profile** - Single source of truth. Never modified by AI.

```typescript
interface Profile {
  name: string;
  headline?: string;
  summary?: string;
  contact: { email: string; phone?: string; website?: string; city?: string; state?: string; country?: string };
  social?: { github?: string; linkedin?: string; gitlab?: string; x?: string; stackoverflow?: string; portfolio?: string; website?: string };
  skills: string[];  // one skill per entry, normalized
  experience: Experience[];
  education: Education[];
  projects: Project[];
  certifications: Certification[];
  languages?: string[];
}
```

**Experience** - Contains achievements, technologies, and skills (not large paragraphs).

```typescript
interface Experience {
  id: string;
  company: string;
  role: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  summary?: string;
  achievements: string[];
  skills: string[];
  technologies: string[];
  projects: string[];
}
```

**ParsedJob** - Normalized job description.

```typescript
interface ParsedJob {
  title: string;
  company?: string;
  location?: string;
  employmentType?: string;
  content: string;
}
```

**GeneratedResume** - Canonical AI output (versioned).

```typescript
interface GeneratedResume {
  schemaVersion: number;
  summary: string;
  experience: GeneratedExperience[];
  education: GeneratedEducation[];
  projects: GeneratedProject[];
  skills: GeneratedSkillGroup[];
  certifications: GeneratedCertification[];
}
```

**CoverLetter** - Structured sections (not raw Markdown).

```typescript
interface CoverLetter {
  greeting: string;
  introduction: string;
  body: string[];
  closing: string;
  signature: string;
}
```

**ATSReport** - Analysis results.

```typescript
interface ATSReport {
  overallScore: number;
  keywordCoverage: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  recommendations: string[];
  strengths: string[];
  weaknesses: string[];
}
```

**GenerationMetadata** - Run metadata (stored separately from resume).

```typescript
interface GenerationMetadata {
  timestamp: string;
  provider: string;
  model: string;
  promptVersion: string;
  template: string;
  duration: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
}
```

### AI Generation Rules

**AI may:**
- Summarize, rewrite, reorder, tailor, omit irrelevant content, improve readability, expand where appropriate

**AI must never:**
- Fabricate employers, companies, dates, job titles, projects, technologies, certifications, awards, promotions, education, metrics, or responsibilities

**Summary rules:**
- Match the target role
- Remain truthful
- Emphasize relevant experience
- Include ATS keywords naturally
- Avoid generic phrases ("Highly motivated", "Results-driven") unless supported by context

**Bullet point rules:**
- Never fabricate metrics. Only use metrics explicitly stated in the profile.

**Cover letter rules:**
- Must include: greeting, introduction, relevant experience, alignment with company, closing
- Must avoid: generic wording, unnecessary flattery, repeating resume bullets verbatim, unsupported claims

---

## Non-Functional Requirements

### Provider Independence

All AI providers implement the same interface. Business logic must never depend on a specific provider SDK.

```typescript
interface AIProvider {
  name(): string;
  models(): Promise<Model[]>;
  capabilities(): Promise<ProviderCapabilities>;
  generate(request: GenerateRequest): Promise<GenerateResponse>;
  stream(request: GenerateRequest): AsyncGenerator<GenerateResponse>;
}
```

The pipeline automatically adjusts behavior based on provider capabilities (falls back to Markdown parsing if JSON mode is unsupported).

### Determinism

The pipeline should produce identical outputs when profile, prompts, model, temperature, and job description remain unchanged. Ranking, validation, and rendering are deterministic.

### Structured Data First

AI generates structured JSON only. Rendering is handled by templates. AI never generates Markdown directly.

### User-Facing Promises

- **ATS-friendly** - Output optimized for automated parsing
- **Never fabricates** - AI may only summarize, rewrite, reorder, or omit
- **Provider independent** - Easy to add OpenAI, Anthropic, Ollama, etc.
- **Customizable** - Prompts, templates, and profiles are user-editable
- **Scriptable** - Unix-friendly CLI with pipes and stdout support

### Security

- Never hardcode secrets or commit API keys
- Never transmit profile data except to the configured AI provider
- Mask API keys in all output and logs
- Never log personal data by default (only in `--debug` mode)
- Support local providers (Ollama, LM Studio) for offline/private generation
- Sanitize URLs before fetching
- Validate all external input

### Performance

- Startup under 500ms (excluding AI calls)
- Efficient parsing of large job descriptions
- Avoid unnecessary AI requests
- Cache reusable computations where appropriate

### Testing

- Unit tests for business logic (parsers, rankers, renderers, validators)
- Integration tests for pipeline flows (mock provider responses)
- Fixture tests with stable input files
- Provider compatibility tests for each adapter
- Prompt regression tests for each prompt version

### Compatibility

- Existing profiles must work across minor releases
- Prompt versions are immutable once released
- Template placeholders should only be added, never renamed without deprecation
- JSON schema changes require explicit version increments and migration support
- Breaking changes are only permitted in major releases

---

## Configuration

### Directory Structure

```
~/.config/cvgen/
├── .env                    # Provider credentials
├── config.json             # Application settings
├── profiles/               # Candidate profiles
│   ├── default.json
│   ├── backend.json
│   └── manager.json
├── prompts/                # AI prompt overrides
│   └── v1/
│       ├── system.md
│       ├── resume.md
│       ├── cover-letter.md
│       ├── keyword-extraction.md
│       └── ats.md
├── templates/              # Document templates
│   ├── ats.md
│   ├── classic.md
│   ├── modern.md
│   └── minimal.md
├── logs/                   # Generation logs (if enabled)
└── history/                # Generation history (if enabled)
```

### Environment (`.env`)

```dotenv
provider=openrouter
model=openai/gpt-4o
api_key=sk-or-v1-your-api-key-here
base_url=https://openrouter.ai/api/v1
```

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

### Prompt Versioning

Prompt versions are immutable once released. Bug fixes create new versions (e.g., `v1.1`) instead of modifying existing ones.

```
prompts/
├── v1/
├── v1.1/       ← Bug fixes (immutable snapshots)
└── v2/
```

Search order for prompts: user override (`~/.config/cvgen/prompts/`) → built-in.

### Supported Providers

| Provider    | Status    | Type   |
|-------------|-----------|--------|
| OpenRouter  | Available | Remote |
| OpenAI      | Planned   | Remote |
| Anthropic   | Planned   | Remote |
| Google      | Planned   | Remote |
| Ollama      | Planned   | Local  |
| LM Studio   | Planned   | Local  |

### Template Engine

Templates support:
- `{{variable}}` - Simple substitution
- `{{#if variable}}...{{/if}}` - Conditional rendering
- `{{#each array}}...{{/each}}` - Array iteration
- `{{contact.email}}` - Nested path access

No embedded scripting in MVP. Templates are presentation-only.

---

## Output Format

### Stdout (Default)

Combined resume and cover letter as Markdown to stdout.

### Directory Mode (`--out <dir>`)

```
output/
├── resume.md
├── cover-letter.md
├── combined.md
├── generation.json
└── ats-report.md
```

### JSON Mode (`--output json`)

Complete pipeline result as JSON: resume, cover letter, ATS report, metadata.

### History (when enabled)

```
~/.config/cvgen/history/
├── 2026-07-09-143022/
│   ├── resume.md
│   ├── cover-letter.md
│   ├── combined.md
│   ├── generation.json
│   ├── metadata.json
│   └── ats-report.md
└── ...
```

---

## Error Handling

### Typed Errors

| Error Class         | Description                      |
|---------------------|----------------------------------|
| `ConfigurationError` | Missing/invalid configuration    |
| `ValidationError`    | Schema or input validation       |
| `ProviderError`      | AI provider failures             |
| `RenderingError`     | Template/render failures         |
| `ParsingError`       | Input parsing failures           |
| `IOError`            | File system or network I/O       |

### Error Categories

- **User Errors** - Configuration, missing files, invalid input
- **Provider Errors** - Authentication, rate limits, API failures
- **System Errors** - I/O, parser failures, renderer failures
- **Internal Errors** - Unexpected exceptions

All errors exit with meaningful exit codes for automation and CI pipelines.

### Guidance for Common Errors

| Error                      | Suggested Resolution                                  |
|----------------------------|-------------------------------------------------------|
| Missing API key            | Run `cvgen init` or update `.env`                 |
| Invalid profile            | Show validation errors with field names               |
| Unsupported file type      | List supported input formats                          |
| Provider unavailable       | Check network connectivity or provider status         |
| Template missing           | Fall back to default template, display warning        |
| AI returned invalid JSON   | Retry once with stricter JSON mode, then report error |

### Retry Strategy

- Retry only transient failures (network timeout, HTTP 429, HTTP 500, malformed JSON)
- Exponential backoff, maximum 3 attempts
- Do not retry authentication failures
- If JSON generation repeatedly fails, fall back to Markdown → parser → structured JSON

---

## Technical Constraints

- **Language:** TypeScript (strict mode, `"strict": true`)
- **Runtime:** Node.js >= 20.0.0
- **Module System:** Native ES Modules
- **Testing:** Vitest
- **Linting:** ESLint
- **Formatting:** Prettier
- **Schema Validation:** Zod
- **Default AI temperature:** 0.2
- **No circular dependencies**
- **Small modules** - target under 300 lines per file, functions under 40 lines
- **Composition over inheritance** for pipeline components

### Project Structure

```
src/
├── ai/           AI provider integrations
├── ats/          ATS analysis engine
├── commands/     CLI command handlers
├── config/       Configuration management
├── errors/       Typed error classes
├── history/      Generation history
├── logging/      Logging framework
├── parser/       Job description parsers
├── pipeline/     AI generation pipeline orchestration
├── ranking/      Deterministic ranking engines
├── renderer/     Template-based Markdown renderer
├── schemas/      JSON schemas (Zod)
├── templates/    Built-in templates
├── types/        TypeScript type definitions
├── utils/        Utility functions
├── validation/   Configuration, prompt, and template validation
└── index.ts      CLI entry point
```

---

## Development Roadmap

### Phase 1 - Project Foundation

Goal: Establish project structure and core CLI framework.

- [x] Initialize TypeScript project with strict mode
- [x] Configure ESLint and Prettier
- [x] Configure Vitest
- [x] Configure GitHub Actions CI/CD
- [x] Configure npm publishing workflow
- [x] Create directory structure
- [x] Implement command dispatcher
- [x] Implement configuration loader
- [x] Implement logging framework
- [x] Implement typed error framework
- [x] Write CONTRIBUTING.md, AGENTS.md, README.md

### Phase 2 - Profile Management

Goal: Configuration and profile handling.

- [x] Implement `cvgen init` with `--force`
- [x] Generate .env, config.json, default profile, prompts, templates
- [x] Validate profile schema
- [x] Support multiple profiles
- [x] Implement profile selection (`--profile`)
- [x] Implement configuration migration

### Phase 3 - Job Description Parsing

Goal: Normalize all supported job description formats.

- [x] Markdown, plain text, HTML, PDF, DOCX parsers
- [x] URL downloader with HTML readability extraction
- [x] Common ParsedJob schema
- [x] Auto-source detection (extension, URL, stdin)
- [x] Unit tests for all parsers

### Phase 4 - AI Provider Framework

Goal: Provider abstraction layer.

- [x] Define AIProvider interface
- [x] Implement OpenRouter adapter
- [x] Capability detection (streaming, JSON mode, reasoning, tool calling, vision)
- [x] Model discovery (`cvgen models`)
- [x] Streaming support
- [x] Retry logic (3 attempts, exponential backoff)
- [x] Token usage reporting and cost estimation
- [x] Provider tests

### Phase 5 - AI Generation Pipeline

Goal: Deterministic generation workflow.

- [x] Keyword extraction (required/preferred skills, soft skills, responsibilities)
- [x] Experience ranking (relevance scores)
- [x] Skill ranking (primary, secondary, supporting groups)
- [x] Project ranking
- [x] Education ranking
- [x] Resume planning (AI selects items before generation)
- [x] Structured JSON generation
- [x] JSON validation
- [x] Markdown fallback for providers without JSON mode
- [x] Pipeline orchestration (12 stages)

### Phase 6 - Resume & Cover Letter Generation

Goal: Produce professional application documents.

- [x] Resume generation prompt
- [x] Cover letter generation prompt
- [x] Summary generation (tailored to target role)
- [x] Bullet rewriting for impact
- [x] ATS keyword insertion
- [x] Resume validator (schema compliance)
- [x] Cover letter validator (schema compliance)
- [x] Explain mode (`--explain`)
- [x] Dry-run mode (`--dry-run`)

### Phase 7 - ATS Analysis

Goal: Evaluate candidate fit.

- [x] Keyword extraction engine
- [x] Match score computation (0–100)
- [x] Keyword coverage percentage
- [x] Missing keyword detection
- [x] Resume quality assessment
- [x] Recommendations generation
- [x] ATS report generation

### Phase 8 - Rendering Engine

Goal: Convert structured JSON into presentation formats.

- [x] Markdown renderer
- [x] Template engine (`{{variable}}`, `{{#if}}`, `{{#each}}`)
- [x] Built-in templates (ATS, Classic, Modern, Minimal)
- [x] User template support
- [x] Output directory support (`--out`)
- [x] Stdout rendering
- [x] JSON output mode (`--output json`)

### Phase 9 - Diagnostics & Validation

Goal: Improve reliability and troubleshooting.

- [x] `doctor` command
- [x] `validate` command (profile, config, prompts, templates, job)
- [x] Configuration validation
- [x] Prompt validation
- [x] Template validation
- [x] Logging improvements (normal, verbose, debug)
- [x] History support
- [x] Metadata generation

### Phase 10 - Documentation & Release

Goal: Prepare for public release.

- [x] Complete README
- [x] Installation guide
- [x] Usage guide
- [x] Template documentation
- [x] Provider documentation
- [x] Prompt documentation
- [x] API reference
- [x] Changelog
- [x] Release notes
- [ ] Publish to npm

---

## Future Improvements

### AI Providers

- [ ] OpenAI provider adapter
- [ ] Anthropic provider adapter
- [ ] Google Gemini provider adapter
- [ ] Ollama provider adapter
- [ ] LM Studio provider adapter
- [ ] Azure OpenAI provider adapter
- [ ] Generic OpenAI-compatible endpoints

### Output Formats

- [ ] HTML renderer
- [ ] PDF renderer
- [ ] DOCX renderer
- [ ] LaTeX renderer
- [ ] JSON Resume format
- [ ] Europass CV format

### Interactive Experience

- [ ] Interactive `init` wizard
- [ ] Interactive generation wizard
- [ ] Terminal UI (TUI)
- [ ] Desktop GUI
- [ ] Web UI

### Integrations

- [ ] LinkedIn profile import
- [ ] GitHub profile import
- [ ] Personal website import
- [ ] Workday integration
- [ ] Greenhouse integration
- [ ] Lever integration
- [ ] Ashby integration

### Plugins

- [ ] Plugin SDK
- [ ] Community plugin registry
- [ ] Custom renderers
- [ ] Custom parsers
- [ ] Custom AI providers

### Intelligence

- [ ] AI-assisted profile improvement
- [ ] Resume gap analysis
- [ ] Interview question generation
- [ ] Job fit comparison across multiple postings
- [ ] Career progression recommendations
- [ ] Skill gap analysis with learning suggestions
- [ ] Multi-language resume and cover letter generation
- [ ] Country-specific formatting and localization
- [ ] Recruiter feedback simulation