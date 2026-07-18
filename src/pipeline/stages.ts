/**
 * AI-powered pipeline stages for the generation pipeline.
 */

import type { AIProvider } from "../ai/types.js";
import type { Profile } from "../types/profile.js";
import type { ParsedJob } from "../parser/types.js";
import type { cvgenConfig, EnvironmentConfig } from "../types/index.js";
import type { ExtractedKeywords, RankingResult } from "../ranking/types.js";
import type {
  GeneratedResume,
  GeneratedCoverLetter,
  ATSReport,
  ResumePlan,
} from "./types.js";
import {
  validateGeneratedResume,
  validateCoverLetter,
  parseMarkdownResume,
  parseMarkdownCoverLetter,
} from "./validator.js";
import fs from "node:fs";
import path from "node:path";
import { getPromptsDir } from "../config/profile.js";
import { DEFAULT_PROMPTS } from "../config/defaults.js";
import { ValidationError } from "../errors/index.js";
import { analyzeATS } from "../ats/index.js";

// ---------------------------------------------------------------------------
// Prompt Loader
// ---------------------------------------------------------------------------

/**
 * Load a prompt by name from the prompts directory, with fallback to built-in defaults.
 *
 * Search order:
 *   1. ~/.config/cvgen/prompts/<promptVersion>/<name> (user override)
 *   2. Built-in default from DEFAULT_PROMPTS
 *
 * Returns null if neither source has the prompt.
 */
function loadPromptContent(name: string, promptVersion: string): string | null {
  // Try user prompt file first
  try {
    const promptsDir = getPromptsDir(promptVersion);
    const promptPath = path.join(promptsDir, name);

    if (fs.existsSync(promptPath)) {
      return fs.readFileSync(promptPath, "utf-8");
    }
  } catch {
    // Fall through to default
  }

  // Fall back to built-in default
  return DEFAULT_PROMPTS[name] ?? null;
}

/**
 * Build a system prompt for a pipeline stage, loading from external prompt
 * files with fallback to inline default.
 */
function buildSystemPrompt(
  promptName: string,
  promptVersion: string,
  fallback: string,
): string {
  return loadPromptContent(promptName, promptVersion) ?? fallback;
}

/**
 * Build a stage-specific prompt, loading from external prompt files
 * with fallback to inline default. Appends JSON-only output instruction.
 */
function buildStagePrompt(
  promptName: string,
  promptVersion: string,
  fallback: string,
): string {
  const loaded = loadPromptContent(promptName, promptVersion);
  const base = loaded ?? fallback;
  return `${base}\n\nReturn ONLY valid JSON matching the requested schema.`;
}

// ---------------------------------------------------------------------------
// Keyword Extraction
// ---------------------------------------------------------------------------

export async function extractKeywords(
  _profile: Profile,
  job: ParsedJob,
  provider: AIProvider,
  config: cvgenConfig,
  env: EnvironmentConfig,
): Promise<ExtractedKeywords> {
  const systemPrompt = buildSystemPrompt(
    "system.md",
    config.promptVersion,
    `You are a keyword extraction specialist. Extract structured hiring signals from job descriptions.

Rules:
- Extract verbatim terms when possible
- Normalize variations (e.g., "JS" to "JavaScript")
- Remove duplicates within each category
- Return ONLY valid JSON matching the requested schema`,
  );

  const stagePrompt = buildStagePrompt(
    "keyword-extraction.md",
    config.promptVersion,
    `Extract key hiring signals from job descriptions.

## Categories

1. **requiredSkills** - Technologies, tools, and frameworks explicitly required
2. **preferredSkills** - Technologies and skills listed as preferred or nice-to-have
3. **softSkills** - Interpersonal and professional qualities mentioned
4. **responsibilities** - Key duties and expectations for the role
5. **experience** - Years of experience, seniority level, and domain expertise mentioned
6. **education** - Required or preferred educational background`,
  );

  const userPrompt = `${stagePrompt}

## Job Title
${job.title}
${
  job.company
    ? `## Company
${job.company}`
    : ""
}
${
  job.location
    ? `## Location
${job.location}`
    : ""
}

## Job Description
${job.content}

Return a JSON object with this exact structure:
{
  "requiredSkills": ["string"],
  "preferredSkills": ["string"],
  "softSkills": ["string"],
  "responsibilities": ["string"],
  "experience": ["string"],
  "education": ["string"]
}`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    { role: "user" as const, content: userPrompt },
  ];

  const caps = await provider.capabilities();
  const useJsonMode = caps.jsonMode;

  const response = await provider.generate({
    model: env.model,
    messages,
    temperature: Math.min(config.temperature, 0.3),
    maxTokens: 2000,
    jsonMode: useJsonMode,
  });

  let parsed: ExtractedKeywords | null = null;

  if (useJsonMode) {
    try {
      parsed = JSON.parse(response.content) as ExtractedKeywords;
    } catch {
      // fall through
    }
  }

  if (!parsed) {
    parsed = parseKeywordFallback(response.content);
  }

  if (!parsed) {
    throw new ValidationError(
      "Failed to parse keyword extraction response from AI provider",
      "keywords",
    );
  }

  return parsed;
}

function parseKeywordFallback(content: string): ExtractedKeywords | null {
  try {
    const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim()) as ExtractedKeywords;
    }

    const trimmed = content.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      return JSON.parse(trimmed) as ExtractedKeywords;
    }

    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Resume Planning
// ---------------------------------------------------------------------------

export async function generateResumePlan(
  profile: Profile,
  job: ParsedJob,
  keywords: ExtractedKeywords,
  ranking: RankingResult,
  provider: AIProvider,
  config: cvgenConfig,
  env: EnvironmentConfig,
): Promise<ResumePlan> {
  const topExperiences = ranking.experience.slice(0, 5);
  const topProjects = ranking.projects.slice(0, 4);

  const systemPrompt = buildSystemPrompt(
    "system.md",
    config.promptVersion,
    `You are a resume strategist. Select the most relevant items for a tailored resume.

Rules:
- Select the most relevant experiences and projects based on the ranking scores
- Never select items that don't exist in the profile
- Return ONLY valid JSON`,
  );

  const experienceRows = topExperiences
    .map(
      (e) =>
        `- ${e.item.role} at ${e.item.company} (id: ${e.item.id}, score: ${e.score})`,
    )
    .join("\n");

  const projectRows = topProjects
    .map((p) => `- ${p.item.name} (id: ${p.item.id}, score: ${p.score})`)
    .join("\n");

  const educationRows = (profile.education ?? [])
    .map((e, i) => `- [${i}] ${e.degree} in ${e.field ?? "N/A"} at ${e.school}`)
    .join("\n");

  const certRows = (profile.certifications ?? [])
    .map((c) => `- ${c.name} (${c.issuer})`)
    .join("\n");

  const userPrompt = `Plan a resume.

## Job Title
${job.title}${job.company ? `\n## Company\n${job.company}` : ""}

## Required Skills
${keywords.requiredSkills.join(", ")}

## Top Ranked Experience
${experienceRows}

## Top Ranked Projects
${projectRows}

## Ranked Skills
Primary: ${ranking.skills.primary.join(", ")}
Secondary: ${ranking.skills.secondary.join(", ")}

## Education
${educationRows}

## Certifications
${certRows}

Return a JSON object with this exact structure:
{
  "summaryFocus": "string",
  "selectedExperience": ["string"],
  "selectedProjects": ["string"],
  "selectedSkills": ["string"],
  "selectedEducation": ["string"],
  "selectedCertifications": ["string"]
}`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    { role: "user" as const, content: userPrompt },
  ];

  const caps = await provider.capabilities();
  const useJsonMode = caps.jsonMode;

  const response = await provider.generate({
    model: env.model,
    messages,
    temperature: config.temperature,
    maxTokens: 3000,
    jsonMode: useJsonMode,
  });

  let parsed: ResumePlan | null = null;

  if (useJsonMode) {
    try {
      parsed = JSON.parse(response.content) as ResumePlan;
    } catch {
      /* */
    }
  }

  if (!parsed) {
    try {
      const jsonMatch = response.content.match(/```json\s*([\s\S]*?)```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1].trim()) as ResumePlan;
      } else {
        const trimmed = response.content.trim();
        if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
          parsed = JSON.parse(trimmed) as ResumePlan;
        }
      }
    } catch {
      /* */
    }
  }

  if (!parsed) {
    parsed = buildDefaultPlan(profile, ranking, keywords);
  }

  if (!parsed.summaryFocus || !Array.isArray(parsed.selectedExperience)) {
    parsed = buildDefaultPlan(profile, ranking, keywords);
  }

  return parsed;
}

function buildDefaultPlan(
  profile: Profile,
  ranking: RankingResult,
  keywords: ExtractedKeywords,
): ResumePlan {
  return {
    summaryFocus: `${profile.headline ?? "Professional"} with experience in ${keywords.requiredSkills.slice(0, 3).join(", ")}`,
    selectedExperience: ranking.experience.slice(0, 3).map((e) => e.item.id),
    selectedProjects: ranking.projects.slice(0, 2).map((p) => p.item.id),
    selectedSkills: ranking.skills.primary.slice(0, 10),
    selectedEducation: (profile.education ?? []).length > 0 ? ["0"] : [],
    selectedCertifications: (profile.certifications ?? [])
      .slice(0, 2)
      .map((c) => c.name),
  };
}

// ---------------------------------------------------------------------------
// Resume Generation
// ---------------------------------------------------------------------------

export async function generateResume(
  profile: Profile,
  job: ParsedJob,
  keywords: ExtractedKeywords,
  ranking: RankingResult,
  plan: ResumePlan,
  provider: AIProvider,
  config: cvgenConfig,
  env: EnvironmentConfig,
): Promise<GeneratedResume> {
  const selectedExperiences = ranking.experience
    .filter((e) => plan.selectedExperience.includes(e.item.id))
    .map((e) => ({
      company: e.item.company,
      role: e.item.role,
      location: e.item.location,
      startDate: e.item.startDate,
      endDate: e.item.endDate,
      current: e.item.current,
      summary: e.item.summary,
      achievements: e.item.achievements,
      skills: e.item.skills,
      technologies: e.item.technologies,
    }));

  const selectedProjects = ranking.projects
    .filter((p) => plan.selectedProjects.includes(p.item.id))
    .map((p) => ({
      name: p.item.name,
      description: p.item.description,
      technologies: p.item.technologies,
      achievements: p.item.achievements,
    }));

  const systemPrompt = buildSystemPrompt(
    "system.md",
    config.promptVersion,
    `You are a professional resume writer. Generate a tailored resume in structured JSON format.

Rules:
- NEVER fabricate employers, job titles, dates, projects, technologies, certifications, metrics, or responsibilities
- You may only summarize, rewrite, reorder, tailor, or omit information
- Use active voice and strong action verbs
- Be concise and specific
- Keep bullet points to 1-2 lines each
- Return ONLY valid JSON matching the requested schema`,
  );

  const resumePrompt = buildStagePrompt(
    "resume.md",
    config.promptVersion,
    `Generate a tailored resume in JSON format.

## Instructions

1. Write a professional summary (2-3 sentences) tailored to the target role.
2. Select and reorder the most relevant work experiences for the target role.
3. Rewrite achievement bullets to highlight relevant skills and technologies.
4. Group and prioritize skills: Primary \u2192 Secondary \u2192 Supporting.
5. Include only the most relevant education entries.
6. Include relevant projects.`,
  );

  const userPrompt = `${resumePrompt}

## Target Role
${job.title}${job.company ? ` at ${job.company}` : ""}

## Job Description
${job.content.substring(0, 3000)}

## Required Keywords
${keywords.requiredSkills.join(", ")}

## Summary Focus
${plan.summaryFocus}

## Selected Experience
${JSON.stringify(selectedExperiences, null, 2)}

## Skills to Highlight
Primary: ${plan.selectedSkills.join(", ")}
Secondary: ${ranking.skills.secondary.join(", ")}

## Education
${JSON.stringify(profile.education ?? [], null, 2)}

## Projects
${JSON.stringify(selectedProjects, null, 2)}

## Certifications
${JSON.stringify(profile.certifications ?? [], null, 2)}

Return a JSON object with this EXACT structure:
{
  "schemaVersion": 1,
  "summary": "string",
  "experience": [{ "company": "string", "role": "string", "location": "string|null", "startDate": "string", "endDate": "string|null", "current": true, "summary": "string|null", "achievements": ["string"] }],
  "skills": { "primary": ["string"], "secondary": ["string"], "supporting": ["string"] },
  "education": [{ "school": "string", "degree": "string", "field": "string|null", "startDate": "string|null", "endDate": "string|null" }],
  "projects": [{ "name": "string", "description": "string", "technologies": ["string"], "highlights": ["string"] }],
  "certifications": [{ "name": "string", "issuer": "string" }]
}`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    { role: "user" as const, content: userPrompt },
  ];

  const caps = await provider.capabilities();
  const useJsonMode = caps.jsonMode;

  const response = await provider.generate({
    model: env.model,
    messages,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
    jsonMode: useJsonMode,
  });

  let resume: GeneratedResume | null = null;

  if (useJsonMode) {
    try {
      resume = JSON.parse(response.content) as GeneratedResume;
    } catch {
      /* */
    }
  }

  if (!resume) {
    resume = parseMarkdownResume(response.content);
  }

  if (!resume) {
    throw new ValidationError(
      "Failed to parse resume generation response from AI provider",
      "resume",
    );
  }

  const validation = validateGeneratedResume(resume);
  if (!validation.valid) {
    throw new ValidationError(
      `Generated resume validation failed: ${validation.errors.join("; ")}`,
      "resume",
    );
  }

  resume.schemaVersion = resume.schemaVersion ?? 1;
  return resume;
}

// ---------------------------------------------------------------------------
// Cover Letter Generation
// ---------------------------------------------------------------------------

export async function generateCoverLetter(
  _profile: Profile,
  job: ParsedJob,
  resume: GeneratedResume,
  keywords: ExtractedKeywords,
  provider: AIProvider,
  config: cvgenConfig,
  env: EnvironmentConfig,
  coverNote?: string,
): Promise<GeneratedCoverLetter> {
  const systemPrompt = buildSystemPrompt(
    "system.md",
    config.promptVersion,
    `You are a professional cover letter writer.

Rules:
- Reference specific technologies and experiences from the candidate's background
- Align with the company and role described
- Never fabricate experience or qualifications
- Keep the tone professional and natural
- Avoid generic phrases
- Keep the letter under 400 words
- Return ONLY valid JSON`,
  );

  const coverLetterPrompt = buildStagePrompt(
    "cover-letter.md",
    config.promptVersion,
    `Write a professional cover letter tailored to the target role and company.

## Instructions

1. Greeting \u2014 Address the hiring manager or company.
2. Introduction \u2014 State the position you're applying for and briefly why you're interested.
3. Body (2-3 paragraphs) \u2014 Highlight relevant experience, skills, and achievements that align with the role.
4. Closing \u2014 Express enthusiasm and request an interview.
5. Signature \u2014 Professional sign-off.`,
  );

  const expRows = resume.experience
    .map(
      (e) =>
        `- ${e.role} at ${e.company}: ${(e.achievements ?? []).slice(0, 2).join("; ")}`,
    )
    .join("\n");

  let userPrompt = `Write a professional cover letter.

## Target Role
${job.title}${job.company ? ` at ${job.company}` : ""}
${job.location ? `\nLocation: ${job.location}` : ""}

## Candidate Summary
${resume.summary}

## Key Skills
Primary: ${resume.skills.primary.join(", ")}

## Selected Experience
${expRows}

## Job Keywords
${keywords.requiredSkills.join(", ")}

${coverLetterPrompt}`;

  if (coverNote) {
    userPrompt += `

## Additional Notes from the Applicant
${coverNote}`;
  }

  userPrompt += `

Return a JSON object with this EXACT structure:
{
  "greeting": "string",
  "introduction": "string",
  "body": ["string", "string"],
  "closing": "string",
  "signature": "string"
}`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    { role: "user" as const, content: userPrompt },
  ];

  const caps = await provider.capabilities();
  const useJsonMode = caps.jsonMode;

  const response = await provider.generate({
    model: env.model,
    messages,
    temperature: config.temperature,
    maxTokens: 2000,
    jsonMode: useJsonMode,
  });

  let letter: GeneratedCoverLetter | null = null;

  if (useJsonMode) {
    try {
      letter = JSON.parse(response.content) as GeneratedCoverLetter;
    } catch {
      /* */
    }
  }

  if (!letter) {
    letter = parseMarkdownCoverLetter(response.content);
  }

  if (!letter) {
    throw new ValidationError(
      "Failed to parse cover letter response from AI provider",
      "cover-letter",
    );
  }

  const validation = validateCoverLetter(letter);
  if (!validation.valid) {
    throw new ValidationError(
      `Cover letter validation failed: ${validation.errors.join("; ")}`,
      "cover-letter",
    );
  }

  return letter;
}

// ---------------------------------------------------------------------------
// ATS Analysis
// ---------------------------------------------------------------------------

export async function generateATSReport(
  resume: GeneratedResume,
  job: ParsedJob,
  keywords: ExtractedKeywords,
  provider: AIProvider,
  _config: cvgenConfig,
  env: EnvironmentConfig,
): Promise<ATSReport> {
  const systemPrompt = buildSystemPrompt(
    "system.md",
    _config.promptVersion,
    `You are an ATS specialist. Analyze how well a resume matches a job description.

Rules:
- Be objective and specific
- Identify exact keyword matches
- Provide actionable recommendations
- Return ONLY valid JSON`,
  );

  const atsPrompt = buildStagePrompt(
    "ats.md",
    _config.promptVersion,
    `Analyze the generated resume against the job description for ATS compatibility.

## Analysis Criteria

1. **Keyword Coverage** \u2014 What percentage of required/preferred skills are present?
2. **Matched Keywords** \u2014 Which keywords from the job description appear in the resume?
3. **Missing Keywords** \u2014 Which required keywords are absent from the resume?
4. **Strengths** \u2014 What does the resume do well for this role?
5. **Weaknesses** \u2014 What areas need improvement?
6. **Recommendations** \u2014 Specific, actionable suggestions to improve the resume.`,
  );

  const resumeText = [
    resume.summary,
    ...resume.experience.flatMap((e) => [
      e.role,
      e.company,
      ...(e.achievements ?? []),
    ]),
    ...resume.skills.primary,
    ...resume.skills.secondary,
    ...resume.skills.supporting,
    ...(resume.certifications ?? []).map((c) => c.name),
  ].join("\n");

  const userPrompt = `Analyze this resume against the job description for ATS compatibility.

## Job Title
${job.title}

## Required Keywords
${keywords.requiredSkills.join(", ")}

## Preferred Keywords
${keywords.preferredSkills.join(", ")}

## Resume Content Summary
${resumeText.substring(0, 2000)}

${atsPrompt}

Return a JSON object with this EXACT structure:
{
  "overallScore": 100,
  "keywordCoverage": 85,
  "matchedKeywords": ["string"],
  "missingKeywords": ["string"],
  "recommendations": ["string"],
  "strengths": ["string"],
  "weaknesses": ["string"]
}`;

  const messages = [
    { role: "system" as const, content: systemPrompt },
    { role: "user" as const, content: userPrompt },
  ];

  const caps = await provider.capabilities();
  const useJsonMode = caps.jsonMode;

  const response = await provider.generate({
    model: env.model,
    messages,
    temperature: 0.2,
    maxTokens: 2000,
    jsonMode: useJsonMode,
  });

  let report: ATSReport | null = null;

  if (useJsonMode) {
    try {
      report = JSON.parse(response.content) as ATSReport;
    } catch {
      /* */
    }
  }

  if (!report) {
    try {
      const jsonMatch = response.content.match(/```json\s*([\s\S]*?)```/);
      if (jsonMatch) report = JSON.parse(jsonMatch[1].trim()) as ATSReport;
      else if (response.content.trim().startsWith("{"))
        report = JSON.parse(response.content.trim()) as ATSReport;
    } catch {
      /* */
    }
  }

  if (!report) {
    // Use the deterministic ATS analyzer as fallback.
    // This provides richer analysis than the AI response:
    //   - keyword matching with weak/partial match detection
    //   - resume quality assessment
    //   - detailed recommendations
    const atsResult = analyzeATS(resume, job, keywords);

    report = {
      overallScore: atsResult.overallScore,
      keywordCoverage: atsResult.keywordCoverage,
      matchedKeywords: atsResult.matchedKeywords,
      missingKeywords: atsResult.missingKeywords,
      recommendations: atsResult.recommendations,
      strengths: atsResult.strengths,
      weaknesses: atsResult.weaknesses,
    };
  }

  return report;
}
