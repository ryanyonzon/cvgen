import type {
  GeneratedResume,
  GeneratedCoverLetter,
  ValidationResult,
} from "./types.js";

/**
 * Validate a generated resume document.
 */
export function validateGeneratedResume(data: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data || typeof data !== "object") {
    return {
      valid: false,
      errors: ["Generated resume is not a valid object"],
      warnings: [],
    };
  }

  const resume = data as Record<string, unknown>;

  if (typeof resume.schemaVersion !== "number") {
    errors.push("Missing or invalid schemaVersion (must be a number)");
  }

  if (!resume.summary || typeof resume.summary !== "string") {
    errors.push("Missing or invalid summary (must be a non-empty string)");
  } else if ((resume.summary as string).trim().length === 0) {
    errors.push("Summary is empty");
  }

  if (!Array.isArray(resume.experience)) {
    errors.push("Missing or invalid experience (must be an array)");
  } else {
    for (let i = 0; i < resume.experience.length; i++) {
      const exp = resume.experience[i] as Record<string, unknown>;
      const prefix = `experience[${i}]`;
      if (!exp.company || typeof exp.company !== "string") {
        errors.push(`${prefix}: missing or invalid company`);
      }
      if (!exp.role || typeof exp.role !== "string") {
        errors.push(`${prefix}: missing or invalid role`);
      }
      if (!exp.startDate || typeof exp.startDate !== "string") {
        errors.push(`${prefix}: missing or invalid startDate`);
      }
      if (!Array.isArray(exp.achievements)) {
        errors.push(`${prefix}: missing or invalid achievements`);
      } else if (exp.achievements.length === 0) {
        errors.push(`${prefix}: achievements array is empty`);
      }
    }
  }

  if (!Array.isArray(resume.education)) {
    errors.push("Missing or invalid education (must be an array)");
  } else {
    for (let i = 0; i < resume.education.length; i++) {
      const edu = resume.education[i] as Record<string, unknown>;
      const prefix = `education[${i}]`;
      if (!edu.school || typeof edu.school !== "string") {
        errors.push(`${prefix}: missing or invalid school`);
      }
      if (!edu.degree || typeof edu.degree !== "string") {
        errors.push(`${prefix}: missing or invalid degree`);
      }
    }
  }

  if (!Array.isArray(resume.projects)) {
    errors.push("Missing or invalid projects (must be an array)");
  } else {
    for (let i = 0; i < resume.projects.length; i++) {
      const proj = resume.projects[i] as Record<string, unknown>;
      const prefix = `projects[${i}]`;
      if (!proj.name || typeof proj.name !== "string") {
        errors.push(`${prefix}: missing or invalid name`);
      }
      if (!proj.description || typeof proj.description !== "string") {
        errors.push(`${prefix}: missing or invalid description`);
      }
    }
  }

  if (!resume.skills || typeof resume.skills !== "object") {
    errors.push("Missing or invalid skills (must be an object)");
  } else {
    const skills = resume.skills as Record<string, unknown>;
    if (!Array.isArray(skills.primary)) {
      errors.push("skills.primary must be an array");
    }
    if (!Array.isArray(skills.secondary)) {
      errors.push("skills.secondary must be an array");
    }
    if (!Array.isArray(skills.supporting)) {
      errors.push("skills.supporting must be an array");
    }
  }

  if (!Array.isArray(resume.certifications)) {
    errors.push("Missing or invalid certifications (must be an array)");
  }

  if (Array.isArray(resume.experience) && resume.experience.length === 0) {
    warnings.push("No experience entries in generated resume");
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate a generated cover letter.
 */
export function validateCoverLetter(data: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data || typeof data !== "object") {
    return {
      valid: false,
      errors: ["Generated cover letter is not a valid object"],
      warnings: [],
    };
  }

  const letter = data as Record<string, unknown>;

  if (!letter.greeting || typeof letter.greeting !== "string") {
    errors.push("Missing or invalid greeting");
  }
  if (!letter.introduction || typeof letter.introduction !== "string") {
    errors.push("Missing or invalid introduction");
  }
  if (!Array.isArray(letter.body)) {
    errors.push("Missing or invalid body (must be an array)");
  } else if (letter.body.length === 0) {
    errors.push("Body is empty");
  }
  if (!letter.closing || typeof letter.closing !== "string") {
    errors.push("Missing or invalid closing");
  }
  if (!letter.signature || typeof letter.signature !== "string") {
    errors.push("Missing or invalid signature");
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Parse a Markdown-formatted AI response into a GeneratedResume.
 */
export function parseMarkdownResume(markdown: string): GeneratedResume | null {
  try {
    // Try JSON code block
    const jsonMatch = markdown.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1].trim());
        const validation = validateGeneratedResume(parsed);
        if (validation.valid) return parsed as GeneratedResume;
      } catch {
        /* ignore */
      }
    }

    // Try entire response as JSON
    try {
      const trimmed = markdown.trim();
      if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        const parsed = JSON.parse(trimmed);
        const validation = validateGeneratedResume(parsed);
        if (validation.valid) return parsed as GeneratedResume;
      }
    } catch {
      /* ignore */
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Parse a Markdown-formatted AI response into a GeneratedCoverLetter.
 */
export function parseMarkdownCoverLetter(
  markdown: string,
): GeneratedCoverLetter | null {
  try {
    const jsonMatch = markdown.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1].trim());
        const validation = validateCoverLetter(parsed);
        if (validation.valid) return parsed as GeneratedCoverLetter;
      } catch {
        /* ignore */
      }
    }

    try {
      const trimmed = markdown.trim();
      if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        const parsed = JSON.parse(trimmed);
        const validation = validateCoverLetter(parsed);
        if (validation.valid) return parsed as GeneratedCoverLetter;
      }
    } catch {
      /* ignore */
    }

    return null;
  } catch {
    return null;
  }
}
