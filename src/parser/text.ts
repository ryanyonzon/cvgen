/**
 * Plain text job description parser.
 *
 * Parses raw text content and attempts to extract structured metadata.
 * Uses heuristics to identify title, company, location, and employment type
 * from unformatted text.
 */

import type { ParsedJob, JobParser, ParserOptions } from "./types.js";
import { ParsingError } from "../errors/index.js";

/**
 * Text parser for job descriptions.
 */
export class TextParser implements JobParser {
  public readonly name = "text";
  public readonly supportedExtensions = [".txt"];

  public supportsExtension(ext: string): boolean {
    return ext.toLowerCase() === ".txt";
  }

  /**
   * Parse plain text job description.
   */
  public async parseContent(
    content: string,
    _options?: ParserOptions,
  ): Promise<ParsedJob> {
    if (!content || content.trim().length === 0) {
      throw new ParsingError("Empty text content");
    }

    const title = this.extractTitle(content);
    const company = this.extractCompany(content);
    const location = this.extractLocation(content);
    const employmentType = this.extractEmploymentType(content);
    const body = content.trim();

    return {
      title,
      company,
      location,
      employmentType,
      content: body,
    };
  }

  /**
   * Extract job title from plain text.
   *
   * Strategy:
   *   1. First line if it looks like a job title (contains job keywords)
   *   2. Line with "Title:" or "Position:" prefix
   *   3. First non-empty line
   */
  private extractTitle(content: string): string {
    const lines = content
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return "Unknown Position";

    // Look for "Title:" or "Position:" prefixed lines
    const labeledMatch = content.match(
      /(?:^|\n)(?:Title|Position|Role|Job Title)\s*:?\s*(.+)$/im,
    );
    if (labeledMatch) {
      const label = labeledMatch[1].trim();
      if (label.length > 0) return label;
    }

    // Check first line for job keywords
    const jobKeywords =
      /\b(Engineer|Developer|Architect|Manager|Lead|Director|Designer|Analyst|Admin|Specialist|Consultant|Coordinator|Associate|Intern)\b/i;
    if (jobKeywords.test(lines[0])) {
      return lines[0];
    }

    // Fall back to first line
    return lines[0];
  }

  /**
   * Extract company name from plain text.
   */
  private extractCompany(content: string): string | undefined {
    const patterns = [
      /(?:^|\n)(?:Company|Organization|Employer|At)\s*:?\s*(.+)$/im,
      /(?:^|\n)About\s+(.+?)(?:\n|$)/i,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        const name = match[1].trim();
        if (name.length > 2) return name;
      }
    }

    return undefined;
  }

  /**
   * Extract job location from plain text.
   */
  private extractLocation(content: string): string | undefined {
    const patterns = [
      /(?:^|\n)(?:Location|Loc|Office|Address)\s*:?\s*(.+)$/im,
      /\b(Remote|Hybrid|On-site|Onsite)\b/i,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        const loc = match[1]?.trim() || match[0].trim();
        if (loc.length > 0) return loc;
      }
    }

    return undefined;
  }

  /**
   * Extract employment type from plain text.
   */
  private extractEmploymentType(content: string): string | undefined {
    const match = content.match(
      /\b(Full-time|Part-time|Contract|Freelance|Temporary|Internship)\b/i,
    );
    return match ? match[1] : undefined;
  }
}
