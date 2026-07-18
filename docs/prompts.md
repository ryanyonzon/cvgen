# Prompt Documentation

Prompts are external, versioned files that control AI behavior. They are assembled into requests in a predictable order and support user overrides for customization.

---

## Table of Contents

- [Prompt Architecture](#prompt-architecture)
- [Built-in Prompts](#built-in-prompts)
- [Prompt Variables](#prompt-variables)
- [Prompt Versioning](#prompt-versioning)
- [Custom Prompts](#custom-prompts)
- [Prompt Assembly](#prompt-assembly)
- [Prompt Validation](#prompt-validation)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Prompt Architecture

```
prompts/v1/
├── system.md              # Universal AI behavior rules
├── resume.md              # Resume generation instructions
├── cover-letter.md        # Cover letter generation instructions
├── keyword-extraction.md  # Keyword extraction instructions
└── ats.md                 # ATS analysis instructions
```

### Design Principles

1. **Single Responsibility** - Each prompt file has one purpose
2. **Immutable Versions** - Prompt versions are never modified after release
3. **User Overridable** - Users can replace any prompt file
4. **Deterministic Assembly** - Prompts are assembled in a fixed order
5. **JSON First** - Prompts request structured JSON output whenever possible

### Prompt Roles

| Prompt File | Purpose | Used In |
|-------------|---------|---------|
| `system.md` | Universal AI behavior rules | All generation stages |
| `resume.md` | Resume content generation | Resume generation |
| `cover-letter.md` | Cover letter generation | Cover letter generation |
| `keyword-extraction.md` | Keyword extraction from job description | Keyword extraction |
| `ats.md` | ATS analysis and scoring | ATS analysis |

---

## Built-in Prompts

### System Prompt (`system.md`)

Defines universal AI behavior rules.

**Responsibilities:**
- Factual accuracy rules
- JSON output instructions
- Writing style guidelines
- Hallucination prevention rules
- Resume content rules

**Key rules:**
- Never fabricate employers, job titles, dates, projects, technologies, certifications, awards, metrics, or responsibilities
- Only summarize, rewrite, reorder, omit, or tailor
- Use active voice and strong action verbs
- Be concise and specific
- Avoid clichés ("highly motivated", "results-driven", "team player")
- Always respond with valid JSON

### Resume Prompt (`resume.md`)

Instructs the AI on how to generate the resume.

**Responsibilities:**
- Professional summary tailored to the role
- Work experience selection and rewriting
- Skill grouping (primary, secondary, supporting)
- Education selection
- Project selection
- Certification inclusion

**Output schema:**
```json
{
  "summary": "string",
  "experience": [{ "company": "string", "role": "string", ... }],
  "skills": { "primary": [], "secondary": [], "supporting": [] },
  "education": [{ "school": "string", "degree": "string", ... }],
  "projects": [{ "name": "string", "description": "string", ... }],
  "certifications": [{ "name": "string", "issuer": "string" }]
}
```

### Cover Letter Prompt (`cover-letter.md`)

Instructs the AI on how to write the cover letter.

**Responsibilities:**
- Professional greeting
- Introduction stating the position and interest
- Body paragraphs highlighting relevant experience
- Closing expressing enthusiasm
- Professional signature

**Rules:**
- Reference specific technologies, projects, or experiences
- Align with the company and role
- Never fabricate experience or qualifications
- Keep under 400 words
- Avoid generic phrases like "I am writing to express my interest"

**Output schema:**
```json
{
  "greeting": "string",
  "introduction": "string",
  "body": ["string"],
  "closing": "string",
  "signature": "string"
}
```

### Keyword Extraction Prompt (`keyword-extraction.md`)

Instructs the AI on how to extract hiring signals from the job description.

**Categories:**
- `requiredSkills` - Technologies, tools, and frameworks explicitly required
- `preferredSkills` - Technologies and skills listed as preferred or nice-to-have
- `softSkills` - Interpersonal and professional qualities
- `responsibilities` - Key duties and expectations
- `experience` - Years of experience, seniority level, domain expertise
- `education` - Required or preferred educational background

**Output schema:**
```json
{
  "requiredSkills": ["string"],
  "preferredSkills": ["string"],
  "softSkills": ["string"],
  "responsibilities": ["string"],
  "experience": ["string"],
  "education": ["string"]
}
```

### ATS Prompt (`ats.md`)

Instructs the AI on how to analyze ATS compatibility.

**Analysis criteria:**
- Keyword coverage percentage
- Matched keywords
- Missing keywords
- Strengths
- Weaknesses
- Recommendations

**Output schema:**
```json
{
  "overallScore": 0,
  "keywordCoverage": 0,
  "matchedKeywords": ["string"],
  "missingKeywords": ["string"],
  "recommendations": ["string"],
  "strengths": ["string"],
  "weaknesses": ["string"]
}
```

---

## Prompt Variables

Prompts support placeholder interpolation using `{{variable}}` syntax.

### Available Variables

| Variable | Description | Available In |
|----------|-------------|--------------|
| `{{profile}}` | Full candidate profile JSON | All prompts |
| `{{job}}` | Full job description content | All prompts |
| `{{resumePlan}}` | Resume plan with selected items | Resume, Cover Letter |
| `{{schema}}` | Expected JSON output schema | Resume, Cover Letter, ATS |
| `{{keywords}}` | Extracted keywords | Resume, ATS |
| `{{resume}}` | Generated resume JSON | Cover Letter, ATS |
| `{{ranking}}` | Ranking results | Resume |

### Example

```markdown
# Resume Generation Prompt

## Candidate Profile

{{profile}}

## Job Description

{{job}}

## Resume Plan

{{resumePlan}}

## Expected Output Schema

{{schema}}
```

---

## Prompt Versioning

### Version Structure

```
prompts/
├── v1/
│   ├── system.md
│   ├── resume.md
│   ├── cover-letter.md
│   ├── keyword-extraction.md
│   └── ats.md
├── v1.1/
│   └── ...
└── v2/
    └── ...
```

### Configuration

```json
{
  "promptVersion": "v1"
}
```

### Versioning Rules

1. **Immutable** - Once released, prompt versions are never modified
2. **Bug fixes** - Create a new version (e.g., `v1.1`) instead of modifying `v1`
3. **Backward compatibility** - New versions should maintain the same schema
4. **Metadata** - Prompt version is recorded in generation metadata for reproducibility

### Why Versioned Prompts?

- **Reproducibility** - Same prompt version + same profile + same job = same output
- **Experimentation** - Compare results across prompt versions
- **Safety** - Users can stick with a known working version
- **Migration** - Gradual adoption of new prompt versions

---

## Custom Prompts

### Override Built-in Prompts

To override a built-in prompt, create a file with the same name in the corresponding version directory under `~/.config/cvgen/prompts/`:

```bash
# Create custom prompts directory
mkdir -p ~/.config/cvgen/prompts/v1

# Override the resume prompt
nano ~/.config/cvgen/prompts/v1/resume.md

# Override the system prompt
nano ~/.config/cvgen/prompts/v1/system.md
```

### Search Order

1. `~/.config/cvgen/prompts/<version>/<name>.md` (user override)
2. Built-in prompt (ships with cvgen)

### Example Custom Resume Prompt

```markdown
Generate a tailored resume in JSON format.

## Instructions

1. Write a summary that emphasizes my leadership experience.
2. Select experiences that demonstrate team management.
3. Highlight projects where I led technical decisions.
4. Group skills with leadership and management first.

## Output Schema

{
  "summary": "string",
  "experience": [
    {
      "company": "string",
      "role": "string",
      "achievements": ["string"]
    }
  ],
  "skills": {
    "primary": ["string"],
    "secondary": ["string"],
    "supporting": ["string"]
  }
}
```

### Custom Prompt Validation

```bash
# Validate all prompts
cvgen validate prompts

# Check for issues
cvgen doctor
```

---

## Prompt Assembly

Prompts are assembled in a fixed order for every generation request:

```text
1. System Prompt
   └── Universal behavior rules

2. Task Prompt
   └── Stage-specific instructions (resume, cover letter, etc.)

3. Profile JSON
   └── Full candidate profile data

4. Context Data
   └── Resume plan, keywords, ranking (stage-dependent)

5. Job Description
   └── Full job description content

6. Expected Output Schema
   └── JSON schema for the expected response
```

### Assembly Order Rationale

The consistent order ensures:

- **Predictability** - Same input order produces same output
- **Provider independence** - Works the same way across all providers
- **Testability** - Easy to unit test with mock data
- **Debuggability** - Clear structure for debugging

### Example Assembled Context (Resume Generation)

```
You are a professional resume writer...

[System Prompt]
────────────────────────────────────
Generate a tailored resume in JSON format.

[Task Prompt]
────────────────────────────────────
Candidate Profile:
{
  "name": "Jane Doe",
  "headline": "Senior Software Engineer",
  "experience": [...],
  "skills": [...]
}

[Profile JSON]
────────────────────────────────────
Resume Plan:
{
  "summaryFocus": "Full-stack development leadership",
  "selectedExperience": ["exp-1", "exp-3"],
  "selectedSkills": ["React", "Node.js", "TypeScript"]
}

[Context Data]
────────────────────────────────────
Job Description:
Senior Software Engineer at Tech Corp...
We are looking for...

[Job Description]
────────────────────────────────────
Expected Output Schema:
{
  "summary": "string",
  "experience": [...],
  "skills": {...}
}

[Schema]
```

---

## Prompt Validation

### Command

```bash
# Validate all prompts for the current version
cvgen validate prompts

# Validate with detailed output
cvgen doctor --verbose
```

### What Gets Checked

| Check | Description |
|-------|-------------|
| File existence | Required prompt files exist |
| File readability | Prompt files are readable |
| Non-empty content | Prompt files are not empty |
| Template syntax | `{{variable}}` references are valid |

### Validation Output

```
✔ Prompt version: v1
✔ system.md - found
✔ resume.md - found
✔ cover-letter.md - found
✔ keyword-extraction.md - found
✔ ats.md - found
```

---

## Best Practices

### Writing Effective Prompts

1. **Be specific** - Clearly define what the AI should do
2. **Provide examples** - Show expected output format
3. **Set constraints** - Limit length, style, and content
4. **Use consistent terminology** - Match terms used in the profile and job description
5. **Avoid ambiguity** - Clear instructions produce consistent results

### Prompt Organization

1. **One file per purpose** - Don't combine resume and cover letter instructions
2. **Use version control** - Track prompt changes in git
3. **Document changes** - Note what changed and why
4. **Test after changes** - Run `cvgen validate prompts` after editing

### Common Pitfalls

| Pitfall | Solution |
|---------|----------|
| Vague instructions | Be specific about what to include and exclude |
| Missing schema | Always include the expected JSON output schema |
| Conflicting rules | Ensure rules are consistent across prompts |
| Too many constraints | Focus on the most important rules |
| Outdated schema | Update schema when changing output format |

---

## Troubleshooting

### Prompt Not Found

```bash
# Error: "Prompt file not found"
# Solution: Run cvgen init to regenerate default prompts
cvgen init --force
```

### Prompt Validation Fails

```bash
# Error: "Prompt file is empty"
# Solution: Ensure the prompt file has content
```

### AI Output Doesn't Match Schema

```bash
# Check the prompt version and schema
# Solution: Ensure the prompt schema matches the expected output
cvgen validate prompts
```

### Custom Prompt Not Working

```bash
# Check file location
ls ~/.config/cvgen/prompts/v1/resume.md

# Validate
cvgen validate prompts
```

### Reproducibility Issues

```bash
# Check prompt version in metadata
cat ~/.config/cvgen/history/*/metadata.json | grep promptVersion

# Ensure same version is used
cvgen config show | grep prompt
```