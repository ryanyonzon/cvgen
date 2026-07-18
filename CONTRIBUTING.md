# Contributing to cvgen

Thank you for considering contributing to `cvgen`! This document outlines the development workflow, coding standards, and pull request process.

## Development Setup

### Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0

### Setup

```bash
# Clone the repository
git clone https://github.com/ryanyonzon/cvgen.git
cd cvgen

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

### Development Commands

```bash
# Build the project
npm run build

# Watch mode for development
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Fix lint issues
npm run lint:fix

# Check formatting
npm run format:check

# Format code
npm run format

# Type check (without emitting files)
npm run typecheck
```

## Project Structure

```
src/
├── ai/          # AI provider integrations
├── ats/         # ATS analysis engine
├── commands/    # CLI command handlers
├── config/      # Configuration management
├── errors/      # Typed error classes
├── logging/     # Logging framework
├── parser/      # Job description parsers
├── prompts/     # AI prompt templates
├── ranking/     # Ranking engines
├── renderer/    # Output renderers
├── schemas/     # JSON schemas
├── templates/   # Document templates
├── types/       # TypeScript type definitions
├── utils/       # Utility functions
├── validation/  # Validation logic
└── index.ts     # CLI entry point
```

## Coding Standards

### TypeScript

- **Strict mode** is enabled (`"strict": true`)
- Use explicit return types on exported functions
- Prefer `async/await` over raw promises
- Use native ES Modules (`import`/`export`)
- Keep modules small and focused (under 300 lines)
- Functions should have a single responsibility (under 40 lines)

### Naming

Use descriptive names:

```typescript
// Good
ProfileLoader
KeywordExtractor
ExperienceRanker
ResumeRenderer

// Bad
Helper
Utils
Manager
Service
```

### Imports

- Use explicit file extensions for relative imports (`.js`)
- Group imports: external → internal
- Avoid circular dependencies

### Error Handling

Use typed errors from `src/errors/`:

```typescript
import { ConfigurationError, ValidationError, ProviderError } from "../errors/index.js";

throw new ConfigurationError("Missing API key");
```

### Testing

Every feature must include tests:

- **Unit tests** for business logic
- **Integration tests** for pipeline flows
- **Fixture tests** for deterministic behavior

## Pull Request Process

1. Read `docs/SPEC.md` and understand the roadmap.
2. Identify the corresponding roadmap phase and task.
3. Implement the feature according to the SPEC.
4. Add or update automated tests.
5. Run the formatter: `npm run format`
6. Run the linter: `npm run lint`
7. Run all tests: `npm test`
8. Update documentation as needed.
9. Update `docs/SPEC.md`, `README.md`, `CHANGELOG.md`, and `AGENTS.md` if the implementation changes architecture, behavior, or roadmap.
10. Submit the pull request.

### PR Checklist

- [ ] `docs/SPEC.md` reviewed
- [ ] Roadmap checklist updated in `docs/SPEC.md`
- [ ] Tests added or updated
- [ ] Formatter passes
- [ ] Linter passes
- [ ] CI passes
- [ ] Documentation updated (README, CHANGELOG, AGENTS, CLI help)
- [ ] No duplicated logic
- [ ] Modular architecture preserved
- [ ] No fabricated AI data
- [ ] Public APIs documented

## Documentation Synchronization

`docs/SPEC.md` is the single source of truth.

Whenever a change affects architecture, roadmap, features, CLI commands, configuration, providers, prompts, templates, rendering, schemas, or testing strategy, the corresponding documentation must be updated as part of the same change. This includes:

- `docs/SPEC.md` - Specification and roadmap
- `README.md` - User-facing documentation
- `CHANGELOG.md` - Release notes
- `AGENTS.md` - Ai coding agent workflow

## Definition of Done

A task is complete only when:

- Feature implemented
- Tests added
- Lint passes
- Formatter passes
- Documentation updated
- `docs/SPEC.md` reflects implementation (if necessary)
- `AGENTS.md` reflects current workflow (if necessary)
- `CHANGELOG.md` updated
- Roadmap checklist items checked in `docs/SPEC.md`
- CI passes
- Acceptance criteria satisfied

## Code of Conduct

Please be respectful and constructive in all interactions. This project aims to be welcoming to contributors of all backgrounds and experience levels.

## Questions?

Open an issue or discussion on GitHub if you have questions or need guidance.