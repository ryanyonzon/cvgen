/**
 * Built-in default prompts for cvgen.
 *
 * These prompts are used as fallbacks when no user-defined prompt
 * files exist in ~/.config/cvgen/prompts/<version>/.
 *
 * Prompt versions are immutable once released.
 */

/**
 * Default candidate profile used when initializing a new profile.
 */
export const DEFAULT_PROFILE = {
  name: "",
  headline: "",
  summary: "",
  contact: {
    email: "",
    phone: "",
    city: "",
    state: "",
    country: "",
  },
  social: {
    github: "",
    linkedin: "",
    website: "",
  },
  skills: [],
  experience: [],
  education: [],
  projects: [],
  certifications: [],
  languages: [],
};

/**
 * Built-in default prompts keyed by filename.
 *
 * Each prompt file has a specific purpose in the pipeline:
 *   - system.md             - Global system instructions for all AI calls
 *   - keyword-extraction.md - Extract structured hiring signals
 *   - resume.md             - Generate a tailored resume in JSON
 *   - cover-letter.md       - Generate a tailored cover letter in JSON
 *   - ats.md                - Analyze resume against job description
 */
export const DEFAULT_PROMPTS: Record<string, string> = {
  "system.md": `You are a professional resume writer and career coach. You help candidates tailor their resumes and cover letters for specific job applications.

## Core Rules
- NEVER fabricate employers, job titles, dates, projects, technologies, certifications, metrics, or responsibilities
- You may ONLY summarize, rewrite, reorder, tailor, or omit information that is explicitly provided
- Never add skills, experience, or achievements that are not present in the candidate's profile
- Use active voice and strong action verbs
- Be concise and specific
- Keep bullet points to 1-2 lines each
- Return ONLY valid JSON matching the requested schema

## Output Format
Always respond with strictly valid JSON. No markdown wrapping, no explanations outside the JSON structure.`,

  "keyword-extraction.md": `Extract key hiring signals from the job description below.

## Categories
1. **requiredSkills** - Technologies, tools, frameworks, and languages explicitly required (e.g., "TypeScript", "React", "AWS")
2. **preferredSkills** - Technologies and skills listed as preferred, nice-to-have, or a plus
3. **softSkills** - Interpersonal qualities mentioned (e.g., "leadership", "communication", "teamwork")
4. **responsibilities** - Key duties and expectations for the role
5. **experience** - Years of experience, seniority level, and domain expertise mentioned
6. **education** - Required or preferred educational background

## Output Schema
Return a JSON object with this exact structure:
{
  "requiredSkills": ["string"],
  "preferredSkills": ["string"],
  "softSkills": ["string"],
  "responsibilities": ["string"],
  "experience": ["string"],
  "education": ["string"]
}`,

  "resume.md": `Generate a tailored resume in JSON format based on the candidate profile and target role.

## Instructions
1. Write a professional summary (2-3 sentences) tailored to the target role
2. Select and reorder the most relevant work experiences for the target role
3. Rewrite achievement bullets to highlight relevant skills and technologies
4. Group and prioritize skills: Primary (core for the role), Secondary (supporting), Supporting (additional)
5. Include only the most relevant education entries
6. Include relevant projects with highlights

## Constraints
- NEVER fabricate metrics, companies, roles, dates, or technologies
- Use only achievements explicitly stated in the candidate's profile
- You may omit irrelevant experience but never add fabricated details
- Bullet points must be factual and verifiable from the profile data

## Output Schema
Return a JSON object with this exact structure:
{
  "schemaVersion": 1,
  "summary": "string",
  "experience": [
    {
      "company": "string",
      "role": "string",
      "location": "string|null",
      "startDate": "string",
      "endDate": "string|null",
      "current": true,
      "summary": "string|null",
      "achievements": ["string"]
    }
  ],
  "education": [
    {
      "school": "string",
      "degree": "string",
      "field": "string|null",
      "startDate": "string|null",
      "endDate": "string|null"
    }
  ],
  "projects": [
    {
      "name": "string",
      "description": "string",
      "technologies": ["string"],
      "highlights": ["string"]
    }
  ],
  "skills": {
    "primary": ["string"],
    "secondary": ["string"],
    "supporting": ["string"]
  },
  "certifications": [
    {
      "name": "string",
      "issuer": "string"
    }
  ]
}`,

  "cover-letter.md": `Write a professional cover letter tailored to the target role and company.

## Instructions
1. Greeting - Address the hiring manager or company
2. Introduction - State the position you're applying for and briefly why you're interested
3. Body (2-3 paragraphs) - Highlight relevant experience, skills, and achievements that align with the role
4. Closing - Express enthusiasm and request an interview
5. Signature - Professional sign-off with candidate name

## Guidelines
- Reference specific technologies and experiences from the candidate's background
- Align with the company and role described
- Never fabricate experience or qualifications
- Keep the tone professional and natural
- Avoid generic phrases like "I'm writing to apply for..."
- Keep the letter under 400 words

## Output Schema
Return a JSON object with this exact structure:
{
  "greeting": "string",
  "introduction": "string",
  "body": ["string", "string"],
  "closing": "string",
  "signature": "string"
}`,

  "ats.md": `Analyze the generated resume against the job description for ATS compatibility.

## Analysis Criteria
1. **Keyword Coverage** - What percentage of required/preferred skills are present in the resume?
2. **Matched Keywords** - Which keywords from the job description appear in the resume content?
3. **Missing Keywords** - Which required keywords are absent from the resume?
4. **Strengths** - What does the resume do well for this role?
5. **Weaknesses** - What areas need improvement for better ATS matching?
6. **Recommendations** - Specific, actionable suggestions to improve the resume

## Output Schema
Return a JSON object with this exact structure:
{
  "overallScore": 100,
  "keywordCoverage": 85,
  "matchedKeywords": ["string"],
  "missingKeywords": ["string"],
  "recommendations": ["string"],
  "strengths": ["string"],
  "weaknesses": ["string"]
}`,
};
