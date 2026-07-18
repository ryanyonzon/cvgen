/**
 * HTML job description parser with readability extraction.
 *
 * Parses HTML content, strips tags, and attempts to extract
 * structured metadata from common job board HTML patterns.
 * Also implements a simple readability algorithm to extract
 * the main content from article/job posting pages.
 */

import { parse as parseHTML } from "node-html-parser";
import type { ParsedJob, JobParser, ParserOptions } from "./types.js";
import { ParsingError } from "../errors/index.js";

/**
 * HTML parser for job descriptions.
 */
export class HTMLParser implements JobParser {
  public readonly name = "html";
  public readonly supportedExtensions = [".html", ".htm"];

  public supportsExtension(ext: string): boolean {
    return [".html", ".htm"].includes(ext.toLowerCase());
  }

  /**
   * Parse HTML job description.
   */
  public async parseContent(
    content: string,
    _options?: ParserOptions,
  ): Promise<ParsedJob> {
    if (!content || content.trim().length === 0) {
      throw new ParsingError("Empty HTML content");
    }

    const root = parseHTML(content);

    // Extract main readable content
    const readableContent = this.extractReadableContent(root);

    const title = this.extractTitle(root, readableContent);
    const company = this.extractCompany(root, readableContent);
    const location = this.extractLocation(readableContent);
    const employmentType = this.extractEmploymentType(readableContent);

    return {
      title,
      company,
      location,
      employmentType,
      content: readableContent,
    };
  }

  /**
   * Extract the main readable content from HTML.
   *
   * Uses a simple readability algorithm:
   *   1. Look for <article>, <main>, or role="main" elements
   *   2. Look for common class/id names (job-description, posting, etc.)
   *   3. Look for the largest text block
   *   4. Fall back to extracting all text
   */
  private extractReadableContent(root: ReturnType<typeof parseHTML>): string {
    // Priority 1: Look for semantic HTML5 elements
    const semanticSelectors = [
      "article",
      "main",
      '[role="main"]',
      '[role="article"]',
    ];

    for (const selector of semanticSelectors) {
      const element = root.querySelector(selector);
      if (element) {
        const text = this.getElementText(element);
        if (text.length > 50) return text;
      }
    }

    // Priority 2: Look for common job description containers
    const containerSelectors = [
      '[class*="job-description"]',
      '[class*="posting"]',
      '[class*="description"]',
      '[class*="content"]',
      '[class*="body"]',
      '[id*="job-description"]',
      '[id*="posting"]',
      '[id*="description"]',
      '[class*="jd"]',
      '[class*="job"]',
    ];

    for (const selector of containerSelectors) {
      const elements = root.querySelectorAll(selector);
      for (const element of elements) {
        const text = this.getElementText(element);
        if (text.length > 50) return text;
      }
    }

    // Priority 3: Find the element with the most text content
    const allElements = root.querySelectorAll("div, section, td");
    let bestText = "";
    let bestLength = 0;

    for (const element of allElements) {
      // Skip navigation, header, footer, sidebar elements
      const classAttr = element.getAttribute("class") || "";
      const idAttr = element.getAttribute("id") || "";
      const skipPatterns =
        /nav|header|footer|sidebar|menu|dropdown|modal|popup|banner|ad-/i;

      if (skipPatterns.test(classAttr) || skipPatterns.test(idAttr)) {
        continue;
      }

      const text = this.getElementText(element);
      if (text.length > bestLength && text.length > 200) {
        bestText = text;
        bestLength = text.length;
      }
    }

    if (bestText) return bestText;

    // Priority 4: Fall back to body text
    const body = root.querySelector("body");
    if (body) {
      const text = this.getElementText(body);
      if (text.length > 0) return text;
    }

    // Priority 5: Extract all text from the document
    return root.textContent?.trim() || "";
  }

  /**
   * Get clean text content from an HTML element.
   */
  private getElementText(element: ReturnType<typeof parseHTML>): string {
    if (!element) return "";

    // Get text content and clean it up
    let text = element.textContent || "";

    // Normalize whitespace
    text = text
      .replace(/[\t\r]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]+/g, " ")
      .trim();

    return text;
  }

  /**
   * Extract job title from HTML.
   */
  private extractTitle(
    root: ReturnType<typeof parseHTML>,
    readableContent: string,
  ): string {
    // Check og:title meta tag (more reliable for job postings)
    const ogTitle = root.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      const ogContent = ogTitle.getAttribute("content");
      if (ogContent && ogContent.length > 0) return ogContent.trim();
    }

    // Check <title> tag (fallback)
    const titleTag = root.querySelector("title");
    if (titleTag) {
      const titleText = titleTag.textContent?.trim() || "";
      if (titleText.length > 0) return titleText;
    }

    // Look for H1 with job keywords
    const h1Elements = root.querySelectorAll("h1");
    const jobKeywords =
      /\b(Engineer|Developer|Architect|Manager|Lead|Director|Designer|Analyst|Admin|Specialist|Consultant|Coordinator|Associate)\b/i;

    for (const h1 of h1Elements) {
      const text = h1.textContent?.trim() || "";
      if (jobKeywords.test(text) && text.length > 0) return text;
    }

    // Look for H2 with job keywords
    const h2Elements = root.querySelectorAll("h2");
    for (const h2 of h2Elements) {
      const text = h2.textContent?.trim() || "";
      if (jobKeywords.test(text) && text.length > 0) return text;
    }

    // Fall back to first line of readable content
    const firstLine = readableContent
      .split("\n")
      .find((l) => l.trim().length > 0);
    if (firstLine && jobKeywords.test(firstLine)) return firstLine.trim();

    return "Unknown Position";
  }

  /**
   * Extract company name from HTML.
   */
  private extractCompany(
    root: ReturnType<typeof parseHTML>,
    _readableContent: string,
  ): string | undefined {
    // Check structured data (JSON-LD)
    const scripts = root.querySelectorAll('script[type="application/ld+json"]');
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent || "{}");
        const companyName =
          data?.hiringOrganization?.name ||
          data?.hiringOrganization?.legalName ||
          data?.publisher?.name;
        if (companyName) return companyName;
      } catch {
        // Invalid JSON-LD, skip
      }
    }

    // Check og:site_name
    const ogSite = root.querySelector('meta[property="og:site_name"]');
    if (ogSite) {
      const content = ogSite.getAttribute("content");
      if (content) return content.trim();
    }

    // Look for common company name patterns
    const companyPatterns = [
      /(?:^|\n)(?:Company|At)\s*:?\s*(.+)$/im,
      /\b(?:About|Join)\s+(.+?)(?:\n|$)/i,
    ];

    const text = root.textContent || "";
    for (const pattern of companyPatterns) {
      const match = text.match(pattern);
      if (match) {
        const name = match[1].trim();
        if (name.length > 2 && name.length < 100) return name;
      }
    }

    return undefined;
  }

  /**
   * Extract location from HTML.
   */
  private extractLocation(text: string): string | undefined {
    const patterns = [
      /(?:^|\n)(?:Location|Loc|Office|Address)\s*:?\s*(.+)$/im,
      /\b(Remote|Hybrid|On-site|Onsite)\b/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const loc = match[1]?.trim() || match[0].trim();
        if (loc.length > 0) return loc;
      }
    }

    return undefined;
  }

  /**
   * Extract employment type from HTML.
   */
  private extractEmploymentType(text: string): string | undefined {
    const match = text.match(
      /\b(Full-time|Part-time|Contract|Freelance|Temporary|Internship)\b/i,
    );
    return match ? match[1] : undefined;
  }
}
