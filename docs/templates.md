# Template Documentation

Templates are presentation-only Markdown files that control how the generated resume is formatted. They consume structured JSON from the AI pipeline and render it as Markdown using simple placeholder substitution.

The renderer owns presentation. The AI never generates Markdown directly.

---

## Table of Contents

- [Template Syntax](#template-syntax)
- [Template Variables](#template-variables)
- [Conditional Blocks](#conditional-blocks)
- [Array Iteration](#array-iteration)
- [Nested Paths](#nested-paths)
- [Built-in Templates](#built-in-templates)
- [Creating Custom Templates](#creating-custom-templates)
- [Template Validation](#template-validation)
- [Examples](#examples)

---

## Template Syntax

Templates use a simple, logic-light syntax with no embedded scripting.

| Syntax | Description | Example |
|--------|-------------|---------|
| `{{variable}}` | Simple substitution | `{{name}}` |
| `{{nested.path}}` | Nested path access | `{{contact.email}}` |
| `{{#if variable}}...{{/if}}` | Conditional block | `{{#if summary}}...{{/if}}` |
| `{{#each array}}...{{/each}}` | Array iteration | `{{#each experience}}...{{/each}}` |

### Rules

- Variables are case-sensitive
- Missing variables render as empty strings (no errors)
- Arrays joined with `, ` by default
- Inside `{{#each}}` blocks, `this` refers to the current item
- Item properties are also available as direct variables inside `{{#each}}` blocks

---

## Template Variables

### Profile Variables

| Variable | Type | Description |
|----------|------|-------------|
| `{{name}}` | string | Candidate name |
| `{{headline}}` | string | Professional headline |
| `{{summary}}` | string | Generated summary |
| `{{contact.email}}` | string | Email address |
| `{{contact.phone}}` | string | Phone number |
| `{{contact.city}}` | string | City |
| `{{contact.state}}` | string | State/Province |
| `{{contact.country}}` | string | Country |
| `{{social.linkedin}}` | string | LinkedIn URL |
| `{{social.github}}` | string | GitHub URL |
| `{{social.portfolio}}` | string | Portfolio URL |

### Experience Variables

Used inside `{{#each experience}}` blocks.

| Variable | Type | Description |
|----------|------|-------------|
| `{{company}}` | string | Company name |
| `{{role}}` | string | Job title |
| `{{location}}` | string | Job location |
| `{{startDate}}` | string | Start date |
| `{{endDate}}` | string | End date (empty if current) |
| `{{current}}` | boolean | Whether currently employed here |
| `{{summary}}` | string | Role description |
| `{{achievements}}` | string[] | Achievement bullets |
| `{{technologies}}` | string | Technologies (comma-separated) |

### Skills Variables

| Variable | Type | Description |
|----------|------|-------------|
| `{{skills.primary}}` | string[] | Primary skills (comma-separated) |
| `{{skills.secondary}}` | string[] | Secondary skills (comma-separated) |
| `{{skills.supporting}}` | string[] | Supporting skills (comma-separated) |

### Education Variables

Used inside `{{#each education}}` blocks.

| Variable | Type | Description |
|----------|------|-------------|
| `{{school}}` | string | Institution name |
| `{{degree}}` | string | Degree name |
| `{{field}}` | string | Field of study |
| `{{startDate}}` | string | Start date |
| `{{endDate}}` | string | End date |

### Project Variables

Used inside `{{#each projects}}` blocks.

| Variable | Type | Description |
|----------|------|-------------|
| `{{name}}` | string | Project name |
| `{{description}}` | string | Project description |
| `{{technologies}}` | string | Technologies (comma-separated) |
| `{{url}}` | string | Project URL |

### Certification Variables

Used inside `{{#each certifications}}` blocks.

| Variable | Type | Description |
|----------|------|-------------|
| `{{name}}` | string | Certification name |
| `{{issuer}}` | string | Issuing organization |

---

## Conditional Blocks

Use `{{#if variable}}` to conditionally include content.

```markdown
{{#if contact.email}}
**Email:** {{contact.email}}
{{/if}}

{{#if contact.phone}}
**Phone:** {{contact.phone}}
{{/if}}
```

Conditional blocks are truthy when the variable:

- Exists and is not `undefined`
- Is not `null`
- Is not `false`
- Is not an empty string
- Is not an empty array

---

## Array Iteration

Use `{{#each array}}` to iterate over arrays.

```markdown
## Experience

{{#each experience}}
### {{role}} - {{company}}
{{startDate}} - {{#if current}}Present{{else}}{{endDate}}{{/if}}

{{#each achievements}}
- {{this}}
{{/each}}

{{/each}}
```

Inside `{{#each}}` blocks:

- `{{this}}` refers to the current array item
- String properties of the current item are available directly (e.g., `{{company}}`, `{{role}}`)
- Nested `{{#each}}` blocks are supported (e.g., iterating achievements within experience)

---

## Nested Paths

Access nested properties using dot notation:

```markdown
{{contact.email}}
{{social.linkedin}}
{{skills.primary}}
```

---

## Built-in Templates

`cvgen` ships with four built-in templates:

### ATS (`ats.md`)

The default template. Optimized for ATS parsing with clean, machine-readable formatting.

- Linear layout with clear section headers
- Minimal formatting to avoid ATS parsing issues
- Includes all sections: summary, experience, skills, education, projects, certifications

### Classic (`classic.md`)

Traditional resume format with clear section headers.

- Professional formatting with bold and italic text
- Traditional layout familiar to recruiters
- Includes all sections with optional certification section

### Modern (`modern.md`)

Contemporary layout with a focus on skills and achievements.

- Clean, modern typography
- Skills listed prominently
- Includes links in social profiles
- Optional project and certification sections

### Minimal (`minimal.md`)

Ultra-clean, focused on readability and brevity.

- Minimal formatting
- Concise layout
- Best for one-page resumes

---

## Creating Custom Templates

### Step 1: Create a Template File

Create a Markdown file in `~/.config/cvgen/templates/`:

```bash
nano ~/.config/cvgen/templates/my-company.md
```

### Step 2: Write Template Content

```markdown
# {{name}}

{{headline}}

{{contact.email}} | {{contact.phone}}

---

## Professional Summary

{{summary}}

---

## Experience

{{#each experience}}
### {{role}} - {{company}}
*{{startDate}} - {{#if current}}Present{{else}}{{endDate}}{{/if}}*

{{#if summary}}
{{summary}}
{{/if}}

{{#each achievements}}
- {{this}}
{{/each}}
{{/each}}

---

## Technical Skills

{{#if skills.primary}}
{{skills.primary}}
{{/if}}
```

### Step 3: Use the Template

```bash
cvgen generate job.md --template my-company
```

### Template Search Order

1. `~/.config/cvgen/templates/<name>.md` (user override)
2. Built-in template (ships with cvgen)
3. Falls back to `ats.md` template

---

## Template Validation

Validate templates using the `validate` command:

```bash
# Validate all templates
cvgen validate templates

# Check a specific template
cvgen doctor --verbose
```

The validator checks:

- File existence and readability
- Valid template syntax (matching `{{variable}}`, `{{#if}}`, `{{#each}}` blocks)
- Known variable names
- Empty or malformed template files

---

## Examples

### Full ATS Template

```markdown
# {{name}}

{{headline}}

{{#if contact.email}}{{contact.email}} | {{/if}}{{#if contact.phone}}{{contact.phone}} | {{/if}}{{#if contact.city}}{{contact.city}}, {{contact.state}}{{/if}}
{{#if social.linkedin}}LinkedIn: {{social.linkedin}}{{/if}}{{#if social.github}} | GitHub: {{social.github}}{{/if}}

---

## Summary

{{summary}}

---

## Experience

{{#each experience}}
### {{role}} - {{company}}
{{#if location}}{{location}} | {{/if}}{{startDate}} - {{#if current}}Present{{else}}{{endDate}}{{/if}}

{{#if summary}}{{summary}}

{{/if}}
{{#each achievements}}
- {{this}}
{{/each}}

{{#if technologies}}
**Technologies:** {{technologies}}
{{/if}}
{{/each}}

---

## Skills

{{#if skills.primary}}
**Primary:** {{skills.primary}}
{{/if}}
{{#if skills.secondary}}
**Secondary:** {{skills.secondary}}
{{/if}}
{{#if skills.supporting}}
**Supporting:** {{skills.supporting}}
{{/if}}

---

## Education

{{#each education}}
### {{degree}}{{#if field}} in {{field}}{{/if}} - {{school}}
{{startDate}} - {{endDate}}

{{/each}}

---

## Projects

{{#each projects}}
### {{name}}

{{description}}

{{#if technologies}}
**Technologies:** {{technologies}}
{{/if}}
{{/each}}

---

## Certifications

{{#each certifications}}
- {{name}} - {{issuer}}
{{/each}}
```

### Template with Cover Letter Section

Templates render the resume section. The cover letter is appended separately after a `---` separator.

To customize cover letter rendering, modify the renderer or use the `--output json` flag to get raw data.

---

## Best Practices

1. **Keep it simple** - ATS parsers prefer clean, linear layouts
2. **Avoid tables** - Many ATS systems cannot parse table layouts
3. **Use standard section headers** - `Summary`, `Experience`, `Skills`, `Education`
4. **Avoid images** - ATS systems cannot parse text in images
5. **Test with `cvgen validate templates`** - Always validate after editing
6. **Version your templates** - Keep backups of custom templates