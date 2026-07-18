/**
 * Tests for job description parsers.
 *
 * Covers all supported formats: Markdown, plain text, HTML, PDF, DOCX, and URL.
 */

import { describe, it, expect } from "vitest";
import {
  parseJobDescription,
  detectSource,
  MarkdownParser,
  TextParser,
  HTMLParser,
} from "../src/parser/index.js";
import { ParsedJobSchema, validateParsedJob } from "../src/schemas/job.js";
import { ParsingError } from "../src/errors/index.js";

// ============================================================================
// Markdown Parser Tests
// ============================================================================

describe("MarkdownParser", () => {
  const parser = new MarkdownParser();

  it("should have the correct name", () => {
    expect(parser.name).toBe("markdown");
  });

  it("should support .md and .markdown extensions", () => {
    expect(parser.supportsExtension(".md")).toBe(true);
    expect(parser.supportsExtension(".markdown")).toBe(true);
    expect(parser.supportsExtension(".txt")).toBe(false);
    expect(parser.supportsExtension(".html")).toBe(false);
  });

  it("should throw on empty content", async () => {
    await expect(parser.parseContent("")).rejects.toThrow(ParsingError);
    await expect(parser.parseContent("   ")).rejects.toThrow(ParsingError);
  });

  it("should extract title from H1 heading", async () => {
    const content = [
      "# Senior Backend Engineer",
      "",
      "We are looking for a Senior Backend Engineer.",
      "",
      "## Requirements",
      "",
      "- Node.js",
      "- TypeScript",
    ].join("\n");
    const result = await parser.parseContent(content);
    expect(result.title).toBe("Senior Backend Engineer");
  });

  it("should extract company name", async () => {
    const content = [
      "# Senior Engineer",
      "",
      "Company: Acme Corp",
      "",
      "We are looking for an engineer.",
    ].join("\n");
    const result = await parser.parseContent(content);
    expect(result.company).toBe("Acme Corp");
  });

  it("should extract location", async () => {
    const content = [
      "# Senior Engineer",
      "",
      "Location: San Francisco, CA",
      "",
      "We are looking for an engineer.",
    ].join("\n");
    const result = await parser.parseContent(content);
    expect(result.location).toBe("San Francisco, CA");
  });

  it("should detect remote keyword", async () => {
    const content = "# Senior Engineer\n\nRemote position available.";
    const result = await parser.parseContent(content);
    expect(result.location).toBe("Remote");
  });

  it("should extract employment type", async () => {
    const content = [
      "# Senior Engineer",
      "",
      "Type: Full-time",
      "",
      "We are looking for an engineer.",
    ].join("\n");
    const result = await parser.parseContent(content);
    expect(result.employmentType).toBe("Full-time");
  });

  it("should handle a complete job description", async () => {
    const content = [
      "# Senior Backend Engineer",
      "",
      "**Company:** TechCorp",
      "**Location:** Remote, US",
      "**Type:** Full-time",
      "",
      "## About the Role",
      "",
      "We are looking for a Senior Backend Engineer.",
      "",
      "## Requirements",
      "",
      "- 5+ years Node.js",
      "- TypeScript",
      "- AWS",
    ].join("\n");

    const result = await parser.parseContent(content);
    expect(result.title).toBe("Senior Backend Engineer");
    expect(result.content.length).toBeGreaterThan(0);

    const validation = ParsedJobSchema.safeParse(result);
    expect(validation.success).toBe(true);
  });

  it("should strip metadata lines from content", async () => {
    const content = [
      "# Software Engineer",
      "",
      "Company: TestCo",
      "Location: New York",
      "Type: Full-time",
      "",
      "This is the actual job description content.",
      "",
      "## Requirements",
      "",
      "- Skill A",
      "- Skill B",
    ].join("\n");

    const result = await parser.parseContent(content);
    expect(result.content).not.toContain("Company: TestCo");
    expect(result.content).toContain("This is the actual job description");
    expect(result.content).toContain("Requirements");
  });
});

// ============================================================================
// Text Parser Tests
// ============================================================================

describe("TextParser", () => {
  const parser = new TextParser();

  it("should have the correct name", () => {
    expect(parser.name).toBe("text");
  });

  it("should support .txt extension", () => {
    expect(parser.supportsExtension(".txt")).toBe(true);
    expect(parser.supportsExtension(".md")).toBe(false);
  });

  it("should throw on empty content", async () => {
    await expect(parser.parseContent("")).rejects.toThrow(ParsingError);
  });

  it("should extract title from first line with job keywords", async () => {
    const content = [
      "Senior Backend Engineer",
      "We are looking for a Senior Backend Engineer.",
      "",
      "Requirements:",
      "- 5+ years experience",
    ].join("\n");
    const result = await parser.parseContent(content);
    expect(result.title).toBe("Senior Backend Engineer");
  });

  it("should extract title from labeled field", async () => {
    const content =
      "Title: DevOps Engineer\n\nWe are looking for a DevOps Engineer.";
    const result = await parser.parseContent(content);
    expect(result.title).toBe("DevOps Engineer");
  });

  it("should extract company and location", async () => {
    const content = [
      "Senior Engineer",
      "Company: Acme Corp",
      "Location: New York, NY",
      "We are hiring a senior engineer.",
    ].join("\n");
    const result = await parser.parseContent(content);
    expect(result.company).toBe("Acme Corp");
    expect(result.location).toBe("New York, NY");
  });

  it("should extract employment type", async () => {
    const content = "Senior Engineer\n\nThis is a Full-time contract position.";
    const result = await parser.parseContent(content);
    expect(result.employmentType).toBe("Full-time");
  });

  it("should return full content as body", async () => {
    const content = [
      "Senior Engineer",
      "",
      "Job Description:",
      "We are looking for an experienced engineer.",
      "Requirements include TypeScript and React.",
    ].join("\n");
    const result = await parser.parseContent(content);
    expect(result.content).toBe(content.trim());
  });
});

// ============================================================================
// HTML Parser Tests
// ============================================================================

describe("HTMLParser", () => {
  const parser = new HTMLParser();

  it("should have the correct name", () => {
    expect(parser.name).toBe("html");
  });

  it("should support .html and .htm extensions", () => {
    expect(parser.supportsExtension(".html")).toBe(true);
    expect(parser.supportsExtension(".htm")).toBe(true);
    expect(parser.supportsExtension(".txt")).toBe(false);
  });

  it("should throw on empty content", async () => {
    await expect(parser.parseContent("")).rejects.toThrow(ParsingError);
  });

  it("should extract title from <title> tag", async () => {
    const html = [
      "<!DOCTYPE html>",
      "<html><head><title>Backend Engineer - Acme Corp</title></head>",
      "<body><h1>Backend Engineer</h1><p>Job description here.</p></body>",
      "</html>",
    ].join("\n");
    const result = await parser.parseContent(html);
    expect(result.title).toBe("Backend Engineer - Acme Corp");
  });

  it("should extract title from og:title meta tag", async () => {
    const html = [
      "<!DOCTYPE html>",
      '<html><head><meta property="og:title" content="Senior DevOps Engineer">',
      "<title>Page Title</title></head><body>",
      "<h1>Senior DevOps Engineer</h1><p>Job description here.</p>",
      "</body></html>",
    ].join("\n");
    const result = await parser.parseContent(html);
    expect(result.title).toBe("Senior DevOps Engineer");
  });

  it("should extract JSON-LD company name", async () => {
    const html = [
      "<!DOCTYPE html>",
      "<html><head>",
      '<script type="application/ld+json">',
      '{ "@context": "https://schema.org",',
      '  "@type": "JobPosting",',
      '  "title": "Backend Engineer",',
      '  "hiringOrganization": {',
      '    "@type": "Organization",',
      '    "name": "TechCorp"',
      "  }",
      "}",
      "</script>",
      "</head><body><h1>Backend Engineer</h1><p>Job description.</p></body></html>",
    ].join("\n");
    const result = await parser.parseContent(html);
    expect(result.company).toBe("TechCorp");
  });

  it("should extract readable content from <article> element", async () => {
    const html = [
      "<!DOCTYPE html><html><body>",
      "<nav>Navigation links here</nav>",
      "<article>",
      "<h1>Senior Frontend Developer</h1>",
      "<p>Job posting for Senior Frontend Developer with React and TypeScript.</p>",
      "<h2>Requirements</h2>",
      "<ul><li>5+ years experience</li><li>React</li></ul>",
      "</article>",
      "<footer>Footer content</footer>",
      "</body></html>",
    ].join("\n");
    const result = await parser.parseContent(html);
    expect(result.title).toBe("Senior Frontend Developer");
    expect(result.content).toContain("React");
    expect(result.content).toContain("TypeScript");
    expect(result.content).not.toContain("Navigation links");
    expect(result.content).not.toContain("Footer content");
  });

  it("should extract content from job-description class", async () => {
    const html = [
      "<!DOCTYPE html><html><body>",
      '<div class="header">Site Header</div>',
      '<div class="job-description">',
      "<h1>Backend Engineer</h1>",
      "<p>We need a Backend Engineer with Node.js.</p>",
      "<ul><li>Build APIs</li><li>Write tests</li></ul>",
      "</div>",
      '<div class="sidebar">Related jobs</div>',
      "</body></html>",
    ].join("\n");
    const result = await parser.parseContent(html);
    expect(result.title).toBe("Backend Engineer");
    expect(result.content).toContain("Build APIs");
    expect(result.content).not.toContain("Site Header");
    expect(result.content).not.toContain("Related jobs");
  });
});

// ============================================================================
// Source Detection Tests
// ============================================================================

describe("detectSource", () => {
  it("should detect URLs", () => {
    const r = detectSource("https://example.com/jobs/engineer");
    expect(r.type).toBe("url");
    expect(r.parserType).toBe("url");
  });

  it("should detect markdown files by extension", () => {
    const r = detectSource("job.md");
    expect(r.type).toBe("file");
    expect(r.parserType).toBe("markdown");
  });

  it("should detect text files by extension", () => {
    const r = detectSource("job.txt");
    expect(r.type).toBe("file");
    expect(r.parserType).toBe("text");
  });

  it("should detect HTML files by extension", () => {
    const r = detectSource("job.html");
    expect(r.type).toBe("file");
    expect(r.parserType).toBe("html");
  });

  it("should detect PDF files by extension", () => {
    const r = detectSource("job.pdf");
    expect(r.type).toBe("file");
    expect(r.parserType).toBe("pdf");
  });

  it("should detect DOCX files by extension", () => {
    const r = detectSource("job.docx");
    expect(r.type).toBe("file");
    expect(r.parserType).toBe("docx");
  });

  it("should detect stdin", () => {
    const r = detectSource("-");
    expect(r.type).toBe("stdin");
  });

  it("should detect raw HTML content", () => {
    const r = detectSource(
      "<!DOCTYPE html><html><body><p>Test</p></body></html>",
    );
    expect(r.type).toBe("raw");
    expect(r.parserType).toBe("html");
  });

  it("should detect raw Markdown content", () => {
    const r = detectSource("# Job Title\n\nDescription");
    expect(r.type).toBe("raw");
    expect(r.parserType).toBe("markdown");
  });

  it("should default to text for raw content", () => {
    const r = detectSource("Just some plain text content");
    expect(r.type).toBe("raw");
    expect(r.parserType).toBe("text");
  });
});

// ============================================================================
// Integration Tests: parseJobDescription
// ============================================================================

describe("parseJobDescription", () => {
  it("should parse raw Markdown content", async () => {
    const content = [
      "# Senior Backend Engineer",
      "",
      "We are looking for a Senior Backend Engineer.",
      "",
      "Company: Acme Corp",
      "Location: San Francisco, CA",
      "Type: Full-time",
      "",
      "## Requirements",
      "",
      "- 5+ years Node.js",
      "- TypeScript experience",
    ].join("\n");

    const result = await parseJobDescription(content);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.title).toBe("Senior Backend Engineer");
    expect(result.data!.company).toBe("Acme Corp");
    expect(result.data!.content.length).toBeGreaterThan(0);
  });

  it("should parse raw HTML content", async () => {
    const content = [
      "<!DOCTYPE html><html>",
      "<head><title>DevOps Engineer</title></head>",
      "<body><article>",
      "<h1>DevOps Engineer</h1>",
      "<p>Join our infrastructure team.</p>",
      "</article></body></html>",
    ].join("\n");

    const result = await parseJobDescription(content);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.title).toBe("DevOps Engineer");
  });

  it("should parse plain text content", async () => {
    const content = [
      "Senior Developer",
      "",
      "We are looking for a Senior Developer.",
      "",
      "Requirements:",
      "- 5+ years experience",
      "- TypeScript",
      "- React",
    ].join("\n");

    const result = await parseJobDescription(content);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!.title).toBe("Senior Developer");
  });
});

// ============================================================================
// Schema Validation Tests
// ============================================================================

describe("validateParsedJob", () => {
  it("should validate a complete parsed job", () => {
    const job = {
      title: "Senior Backend Engineer",
      company: "Acme Corp",
      location: "San Francisco, CA",
      employmentType: "Full-time",
      content: "We are looking for a Senior Backend Engineer.",
    };
    const result = validateParsedJob(job);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should reject missing title", () => {
    const job = {
      title: "",
      company: "Acme Corp",
      content: "Job description.",
    };
    const result = validateParsedJob(job);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should warn about missing optional fields", () => {
    const job = {
      title: "Senior Engineer",
      content: "We are looking for an engineer.",
    };
    const result = validateParsedJob(job);
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some((w) => w.path === "company")).toBe(true);
  });

  it("should warn about very short content", () => {
    const job = { title: "Engineer", content: "Short text." };
    const result = validateParsedJob(job);
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.path === "content")).toBe(true);
  });

  it("should accept minimal valid parsed job", () => {
    const job = {
      title: "Software Engineer",
      content: "We are looking for a skilled software engineer.",
    };
    const result = validateParsedJob(job);
    expect(result.valid).toBe(true);
  });
});

// ============================================================================
// Supported Extensions
// ============================================================================

describe("supportedExtensions", () => {
  it("should list all supported extensions", async () => {
    const { supportedExtensions } = await import("../src/parser/index.js");
    const exts = supportedExtensions();
    expect(exts).toBeDefined();
    expect(exts.length).toBeGreaterThan(0);
    expect(exts).toContain(".md");
    expect(exts).toContain(".txt");
    expect(exts).toContain(".html");
    expect(exts).toContain(".pdf");
    expect(exts).toContain(".docx");
  });
});
