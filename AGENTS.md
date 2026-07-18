# AGENTS.md - AI Coding Agent Guide

## Startup Instructions

On your **first response of every new conversation**, you MUST:

1. Read and understand `docs/SPEC.md` before making any code changes.
2. Treat `docs/SPEC.md` as the single source of truth for product behavior, architecture, implementation priorities, and roadmap.
3. Review the **Development Roadmap** section in `docs/SPEC.md`.
4. If a requested feature already exists in the roadmap:
   - Implement it according to the SPEC.
   - Do not redesign the architecture unless explicitly instructed.
5. After completing any roadmap task:
   - Mark completed checklist items in `docs/SPEC.md`.
   - Update `README.md` if user-facing behavior changed.
   - Update `CHANGELOG.md`.
   - Update this file (`AGENTS.md`) if workflow, guidelines, or conventions change.
6. If implementation requires deviating from the SPEC:
   - Update `docs/SPEC.md` first.
   - Explain the reason in the commit/summary.
7. Never remove roadmap items without updating SPEC.
8. If the requested feature is **not** covered by the SPEC:
   - Ask whether the SPEC should be updated before implementation.
   - Avoid introducing architecture that conflicts with the SPEC.
9. Keep documentation synchronized with the codebase at all times.

---

## Project Overview

**cvgen** is a TypeScript CLI that generates ATS-friendly tailored Resume and Cover Letter documents from:

- Structured candidate profile(s)
- Job descriptions
- AI providers (OpenRouter initially)

The project follows a deterministic AI generation pipeline where AI is responsible only for content generation, while parsing, ranking, validation, rendering, and formatting remain deterministic.

---

## Core Principles

### Structured Data First

Never treat Markdown as the source of truth.

```
Profile
    ↓
AI
    ↓
Structured JSON
    ↓
Renderer
    ↓
Markdown
```

### Never Fabricate Information

Never invent: employers, companies, dates, job titles, projects, technologies, certifications, awards, promotions, education, or metrics.

AI may only: summarize, rewrite, reorder, tailor, omit irrelevant information.

### Separation of Concerns

Maintain strict separation between: CLI, Commands, Configuration, Providers, AI Pipeline, Ranking, ATS Analysis, Rendering, Validation, Templates, Logging.

### Provider Independence

Business logic must never depend on OpenRouter. Every provider implements the same `AIProvider` interface.

### Renderer Owns Presentation

AI generates structured content. Renderers generate presentation. AI must never generate Markdown layout directly.

---

## Coding Conventions

### TypeScript

- `"strict": true` in tsconfig
- Explicit return types on exported functions
- Async/await over raw promises
- Native ES Modules
- Small, focused modules (target < 300 lines, max 500)
- Single-responsibility functions (target < 40 lines)

### Naming

Use descriptive names:

```typescript
ProfileLoader      ✓
KeywordExtractor   ✓
ExperienceRanker   ✓
ResumeRenderer     ✓
```

Avoid generic names:

```typescript
Helper    ✗
Utils     ✗
Manager   ✗
Service   ✗
```

### Imports

- Use explicit file extensions for relative imports (`.js`)
- Group imports: external → internal
- Avoid circular dependencies

### Error Handling

Use typed errors from `src/errors/`:

```typescript
import { ConfigurationError, ValidationError, ProviderError, RenderingError, ParsingError } from "../errors/index.js";
```

### Preferences

- Interfaces over type aliases where possible
- Composition over inheritance
- Dependency injection where appropriate
- Avoid `any`, implicit `any`, mutable globals, circular dependencies, large utility classes

---

## Project Structure

```
src/
├── ai/           AI provider integrations (OpenRouter, etc.)
├── ats/          ATS analysis engine
├── commands/     CLI command handlers
├── config/       Configuration management
├── errors/       Typed error classes
├── history/      Generation history
├── logging/      Logging framework
├── parser/       Job description parsers (Markdown, PDF, DOCX, HTML, URL)
├── pipeline/     AI generation pipeline orchestration
├── ranking/      Deterministic ranking engines (experience, skills, projects, education, certifications)
├── renderer/     Template-based Markdown renderer
├── schemas/      JSON schemas (Zod)
├── templates/    Built-in templates (ATS, Classic, Modern, Minimal)
├── types/        TypeScript type definitions
├── utils/        Utility functions
├── validation/   Configuration, prompt, and template validation
└── index.ts      CLI entry point
```

---

## AI Pipeline (Do Not Bypass Stages)

```
Profile → Job Parser → Keyword Extraction → Experience Ranking → Skill Ranking →
Project Ranking → Education Ranking → Resume Planning → Resume JSON →
ATS Analysis → Cover Letter → Validation → Renderer
```

---

## Provider Interface

```typescript
interface AIProvider {
  name(): string;
  models(): Promise<Model[]>;
  capabilities(): Promise<ProviderCapabilities>;
  generate(request: GenerateRequest): Promise<GenerateResponse>;
  stream(request: GenerateRequest): AsyncGenerator<GenerateResponse>;
}
```

Provider-specific SDKs must never leak into business logic.

---

## Documentation Conventions

Whenever implementation changes, update as needed:

- `docs/SPEC.md` - If architecture, roadmap, behavior, feature set, configuration, schemas, prompts, templates, or public APIs change
- `README.md` - If user-facing behavior changes
- `CHANGELOG.md` - Always log user-facing changes
- `AGENTS.md` - If workflow, guidelines, or conventions change
- CLI help - If commands or options change
- Examples - If usage patterns change

Documentation updates are **part of the implementation**, not a follow-up task.

---

## Testing Expectations

Every feature must include automated tests:

| Type                  | Description                                      |
|-----------------------|--------------------------------------------------|
| Unit Tests            | Business logic: parsers, rankers, renderers, validators, config. No AI required. |
| Integration Tests     | Pipeline flow, retries, rendering, output. Mock provider responses. |
| Fixture Tests         | Stable input files for deterministic behavior verification. |
| Prompt Regression     | Each prompt version verified against known job descriptions. |
| Provider Compatibility| Each provider adapter passes a common test suite (auth, generate, stream, JSON mode). |

No feature is complete without tests.

---

## Pull Request Expectations

Before submitting, ensure:

- [ ] `docs/SPEC.md` reviewed for affected areas
- [ ] Roadmap checklist items updated in `docs/SPEC.md`
- [ ] Tests added or updated
- [ ] Formatter passes: `npm run format`
- [ ] Linter passes: `npm run lint`
- [ ] All tests pass: `npm test`
- [ ] Documentation updated (`README.md`, `CHANGELOG.md`, `AGENTS.md`, CLI help, examples)
- [ ] No duplicated logic
- [ ] Modular architecture preserved
- [ ] No fabricated AI data
- [ ] Public APIs documented (if applicable)

---

## Definition of Done

A task is complete only when:

- [ ] Feature implemented
- [ ] Tests added and passing
- [ ] Lint and formatter pass
- [ ] Documentation updated
- [ ] `docs/SPEC.md` reflects implementation
- [ ] `CHANGELOG.md` updated
- [ ] `AGENTS.md` reflects current workflow (if changed)
- [ ] Roadmap checklist items checked in `docs/SPEC.md`
- [ ] CI passes
- [ ] Acceptance criteria satisfied

---

## Development Philosophy

Prioritize:

1. Correctness
2. Determinism
3. Maintainability
4. Testability
5. Extensibility
6. Simplicity
7. Performance

Over:
- Clever code
- Premature optimization
- Provider-specific implementations

---

## Performance Goals

- Fast startup (< 500ms excluding AI calls)
- Minimal dependencies
- Efficient parsing
- Minimal memory usage
- Avoid unnecessary AI requests
- Cache reusable computations when appropriate

---

## Security Rules

- Never hardcode secrets or commit API keys
- Never trust remote content
- Never execute arbitrary template code
- Always sanitize URLs
- Always validate external input
- Always mask sensitive information in logs

---

## Backward Compatibility

Avoid breaking:
- Profile schema
- Configuration
- Prompt versions
- Templates
- JSON schemas

If breaking changes are necessary:
- Document them
- Increment schema version
- Provide migration utilities
- Update `docs/SPEC.md`
