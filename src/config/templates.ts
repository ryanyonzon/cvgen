/**
 * Built-in default templates for cvgen.
 *
 * Templates are presentation-only. They use the template engine syntax:
 *   {{variable}}              - Simple substitution
 *   {{#if variable}}...{{/if}} - Conditional rendering (with {{else}})
 *   {{#each array}}...{{/each}} - Array iteration
 *   {{contact.email}}         - Nested path access
 *
 * Available template variables:
 *   name, headline, summary
 *   contact.email, contact.phone, contact.website, contact.city, contact.state, contact.country
 *   social.github, social.linkedin, social.website
 *   experience (array: company, role, location, startDate, endDate, current, summary, achievements)
 *   skills.primary, skills.secondary, skills.supporting
 *   education (array: school, degree, field, startDate, endDate)
 *   projects (array: name, description, technologies, highlights)
 *   certifications (array: name, issuer)
 */

/**
 * Built-in templates keyed by filename (e.g., "ats.md", "classic.md").
 */
export const DEFAULT_TEMPLATES: Record<string, string> = {
  "ats.md": `# {{name}}
{{#if headline}}*{{headline}}*{{/if}}

{{#if contact.email}}**Email:** {{contact.email}}{{/if}}{{#if contact.phone}} | **Phone:** {{contact.phone}}{{/if}}
{{#if contact.city}}{{contact.city}}{{#if contact.state}}, {{contact.state}}{{/if}}{{/if}}{{#if contact.country}}, {{contact.country}}{{/if}}

{{#if social.linkedin}}[LinkedIn]({{social.linkedin}}){{/if}}{{#if social.github}} | [GitHub]({{social.github}}){{/if}}{{#if social.website}} | [Website]({{social.website}}){{/if}}

---

## Professional Summary

{{summary}}

---

## Experience

{{#each experience}}
### {{role}} at {{company}}
{{location}} | {{startDate}} – {{#if current}}Present{{else}}{{endDate}}{{/if}}

{{#if summary}}{{summary}}{{/if}}

{{#each achievements}}
- {{this}}
{{/each}}

{{/each}}

---

## Skills

{{#if skills.primary}}**Primary:** {{skills.primary}}{{/if}}
{{#if skills.secondary}}**Secondary:** {{skills.secondary}}{{/if}}
{{#if skills.supporting}}**Supporting:** {{skills.supporting}}{{/if}}

---

## Education

{{#each education}}
### {{degree}}{{#if field}} in {{field}}{{/if}}
{{school}} | {{startDate}} – {{endDate}}
{{/each}}

---

## Projects

{{#each projects}}
### {{name}}
{{description}}

{{#if technologies}}**Technologies:** {{technologies}}{{/if}}

{{#each highlights}}
- {{this}}
{{/each}}

{{/each}}

---

## Certifications

{{#each certifications}}
- **{{name}}** – {{issuer}}
{{/each}}
`,

  "classic.md": `# {{name}}
{{#if headline}}*{{headline}}*{{/if}}

{{#if contact.email}}{{contact.email}}{{/if}}{{#if contact.phone}} | {{contact.phone}}{{/if}}
{{#if contact.city}}{{contact.city}}{{#if contact.state}}, {{contact.state}}{{/if}}{{/if}}

{{#if social.linkedin}}[LinkedIn]({{social.linkedin}}){{/if}}{{#if social.github}} | [GitHub]({{social.github}}){{/if}}

---

## Summary

{{summary}}

---

## Professional Experience

{{#each experience}}
### {{role}}
**{{company}}** — {{location}} | {{startDate}} – {{#if current}}Present{{else}}{{endDate}}{{/if}}

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
**Core:** {{skills.primary}}
{{/if}}
{{#if skills.secondary}}
**Proficient:** {{skills.secondary}}
{{/if}}
{{#if skills.supporting}}
**Familiar:** {{skills.supporting}}
{{/if}}

---

## Education

{{#each education}}
**{{degree}}{{#if field}} in {{field}}{{/if}}**
{{school}} — {{startDate}} – {{endDate}}
{{/each}}

---

## Projects

{{#each projects}}
### {{name}}
{{description}}

{{#if technologies}}*{{technologies}}*{{/if}}

{{#each highlights}}
- {{this}}
{{/each}}

{{/each}}

---

## Certifications

{{#each certifications}}
- {{name}} — {{issuer}}
{{/each}}
`,

  "modern.md": `# {{name}}
{{#if headline}}### {{headline}}{{/if}}

<div class="contact">
{{#if contact.email}}✉ {{contact.email}}{{/if}}
{{#if contact.phone}} | ☎ {{contact.phone}}{{/if}}
{{#if contact.city}} | 📍 {{contact.city}}{{#if contact.state}}, {{contact.state}}{{/if}}{{/if}}
</div>

<div class="social">
{{#if social.linkedin}}🔗 [LinkedIn]({{social.linkedin}}){{/if}}
{{#if social.github}}🔗 [GitHub]({{social.github}}){{/if}}
{{#if social.website}}🔗 [Website]({{social.website}}){{/if}}
</div>

---

## Professional Summary

{{summary}}

---

## Experience

{{#each experience}}
### {{role}}
#### {{company}} — {{location}}
##### {{startDate}} – {{#if current}}Present{{else}}{{endDate}}{{/if}}

{{#if summary}}
{{summary}}
{{/if}}

{{#each achievements}}
- {{this}}
{{/each}}

{{/each}}

---

## Skills

<div class="skills">
{{#if skills.primary}}<span class="skill-tag">{{skills.primary}}</span>{{/if}}
{{#if skills.secondary}}<span class="skill-tag">{{skills.secondary}}</span>{{/if}}
{{#if skills.supporting}}<span class="skill-tag">{{skills.supporting}}</span>{{/if}}
</div>

---

## Education

{{#each education}}
### {{degree}}{{#if field}} in {{field}}{{/if}}
#### {{school}}
{{startDate}} – {{endDate}}
{{/each}}

---

## Projects

{{#each projects}}
### {{name}}

{{description}}

{{#if technologies}}**Built with:** {{technologies}}{{/if}}

{{#each highlights}}
- {{this}}
{{/each}}

{{/each}}

---

## Certifications

{{#each certifications}}
- **{{name}}** — *{{issuer}}*
{{/each}}
`,

  "minimal.md": `# {{name}}
{{#if headline}}### {{headline}}{{/if}}

{{#if contact.email}}{{contact.email}}{{/if}}
{{#if contact.phone}} | {{contact.phone}}{{/if}}
{{#if social.linkedin}} | [LinkedIn]({{social.linkedin}}){{/if}}
{{#if social.github}} | [GitHub]({{social.github}}){{/if}}

---

**{{summary}}**

---

{{#each experience}}
**{{role}}** — {{company}}{{#if location}}, {{location}}{{/if}}
*{{startDate}} – {{#if current}}Present{{else}}{{endDate}}{{/if}}*

{{#each achievements}}
- {{this}}
{{/each}}

{{/each}}

---

**Skills:** {{skills.primary}}{{#if skills.secondary}}; {{skills.secondary}}{{/if}}

---

{{#each education}}
**{{degree}}**{{#if field}} in {{field}}{{/if}}, {{school}}
{{/each}}

---

{{#each certifications}}
- {{name}}, {{issuer}}
{{/each}}
`,
};