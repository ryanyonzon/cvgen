/**
 * Markdown job description parser.
 *
 * Parses Markdown content and attempts to extract structured metadata
 * (title, company, location, employment type) from the content.
 * Headers and common job posting patterns are used to infer metadata.
 */

import type { ParsedJob, JobParser, ParserOptions } from "./types.js";
import { ParsingError } from "../errors/index.js";

/**
 * Markdown parser for job descriptions.
 */
export class MarkdownParser implements JobParser {
  public readonly name = "markdown";
  public readonly supportedExtensions = [".md", ".markdown"];

  public supportsExtension(ext: string): boolean {
    return [".md", ".markdown"].includes(ext.toLowerCase());
  }

  /**
   * Parse a Markdown job description string.
   */
  public async parseContent(
    content: string,
    _options?: ParserOptions,
  ): Promise<ParsedJob> {
    if (!content || content.trim().length === 0) {
      throw new ParsingError("Empty Markdown content");
    }

    const title = this.extractTitle(content);
    const company = this.extractCompany(content);
    const location = this.extractLocation(content);
    const employmentType = this.extractEmploymentType(content);
    const body = this.extractBody(content);

    return {
      title,
      company,
      location,
      employmentType,
      content: body,
    };
  }

  /**
   * Extract job title from Markdown content.
   *
   * Strategy (in priority order):
   *   1. First H1 heading
   *   2. First H2 heading containing job keywords
   *   3. First line of content
   */
  private extractTitle(content: string): string {
    // Look for H1: # Title
    const h1Match = content.match(/^#\s+(.+)$/m);
    if (h1Match) {
      return h1Match[1].trim();
    }

    // Look for H2 with job-related keywords
    const jobKeywords =
      /\b(Engineer|Developer|Architect|Manager|Lead|Director|Designer|Analyst|Admin|Specialist|Consultant|Coordinator|Associate)\b/i;
    const h2Matches = content.matchAll(/^##\s+(.+)$/gm);
    for (const match of h2Matches) {
      if (jobKeywords.test(match[1])) {
        return match[1].trim();
      }
    }

    // Fall back to first non-empty line
    const lines = content
      .split("\n")
      .map((l) => l.replace(/^#+\s*/, "").trim())
      .filter((l) => l.length > 0);
    if (lines.length > 0) {
      return lines[0];
    }

    return "Unknown Position";
  }

  /**
   * Extract company name from Markdown content.
   */
  private extractCompany(content: string): string | undefined {
    const companyPatterns = [
      /(?:^|\n)(?:Company|Organization|Employer)\s*:?\s*(.+)$/im,
      /(?:^|\n)#{1,3}\s*(.+?)\s*(?:Engineering|Development|Team|Position|Job|Opening|Role)\b/i,
    ];

    for (const pattern of companyPatterns) {
      const match = content.match(pattern);
      if (match) {
        const name = match[1].trim();
        if (
          name.length > 2 &&
          !/^(Job|Position|Role|Description|Overview)$/i.test(name)
        ) {
          return name;
        }
      }
    }

    return undefined;
  }

  /**
   * Extract job location from Markdown content.
   */
  private extractLocation(content: string): string | undefined {
    // Check for labeled location fields first
    const labeledPatterns = [
      /(?:^|\n)(?:Location|Loc|Office|Address)\s*:?\s*(.+)$/im,
    ];

    for (const pattern of labeledPatterns) {
      const match = content.match(pattern);
      if (match) {
        const loc = match[1]?.trim() || match[0].trim();
        if (loc.length > 0) return loc;
      }
    }

    // Check for bare work-model keywords (not prefixed by label)
    const barePattern = /(?:^|\n)(Remote|On-site|Onsite|Hybrid)\b/im;
    const bareMatch = content.match(barePattern);
    if (bareMatch) {
      return bareMatch[1];
    }

    // Fallback: match bare keyword anywhere in content
    const remoteMatch = content.match(/\b(Remote|Hybrid|On-site|Onsite)\b/i);
    if (remoteMatch) return remoteMatch[1];

    return undefined;
  }

  /**
   * Extract employment type from Markdown content.
   */
  private extractEmploymentType(content: string): string | undefined {
    const typePatterns = [
      /(?:^|\n)(?:Type|Employment|Employment Type|Job Type|Work Type)\s*:?\s*(.+)$/im,
      /\b(Full-time|Part-time|Contract|Freelance|Temporary|Internship)\b/i,
    ];

    for (const pattern of typePatterns) {
      const match = content.match(pattern);
      if (match) return match[1]?.trim() || match[0].trim();
    }

    return undefined;
  }

  /**
   * Extract the main body content, stripping metadata lines.
   */
  private extractBody(content: string): string {
    const metadataPattern =
      /^(?:Title|Company|Location|Type|Employment|Job Type|Work Type|Salary|Posted|Apply|Job ID|Requisition)\s*:.*$/im;

    const lines = content.split("\n");
    const bodyLines = lines.filter(
      (line) => !metadataPattern.test(line.trim()),
    );

    return bodyLines.join("\n").trim();
  }
}
