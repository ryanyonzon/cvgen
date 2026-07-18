/**
 * URL job description parser.
 *
 * Fetches job descriptions from URLs, detects the content type
 * from response headers, and routes to the appropriate sub-parser
 * for structured metadata extraction.
 */

import type { ParsedJob, JobParser, ParserOptions } from "./types.js";
import { MarkdownParser } from "./markdown.js";
import { TextParser } from "./text.js";
import { HTMLParser } from "./html.js";
import { ParsingError } from "../errors/index.js";

/**
 * Result of fetching a URL.
 */
interface FetchResult {
  content: string;
  contentType: string;
  finalUrl: string;
}

/**
 * URL parser for job descriptions.
 *
 * This is a meta-parser that fetches content from URLs and routes
 * to the appropriate format-specific parser based on content type.
 */
export class URLParser implements JobParser {
  public readonly name = "url";
  public readonly supportedExtensions: string[] = [];

  private readonly markdownParser = new MarkdownParser();
  private readonly textParser = new TextParser();
  private readonly htmlParser = new HTMLParser();

  public supportsExtension(_ext: string): boolean {
    return false; // URL is not detected by extension
  }

  /**
   * Parse a job description from a URL.
   *
   * @param source - The URL to fetch
   * @param _options - Not used
   */
  public async parseContent(
    source: string,
    _options?: ParserOptions,
  ): Promise<ParsedJob> {
    // Validate URL
    let url: URL;
    try {
      url = new URL(source);
    } catch {
      throw new ParsingError(`Invalid URL: "${source}"`);
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new ParsingError(
        `Unsupported URL protocol: "${url.protocol}". Only HTTP and HTTPS are supported.`,
      );
    }

    // Fetch the URL
    const { content, contentType } = await this.fetchUrl(source);

    // Route to the appropriate parser based on content type
    const parser = this.selectParser(contentType, source);

    return parser.parseContent(content, { url: source });
  }

  /**
   * Fetch content from a URL.
   */
  private async fetchUrl(url: string): Promise<FetchResult> {
    let response: Response;

    try {
      response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; cvgen/0.1.0; +https://github.com/ryanyonzon/cvgen)",
          "Accept":
            "text/html,application/xhtml+xml,text/plain,text/markdown,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document;q=0.9,*/*;q=0.8",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(30_000), // 30-second timeout
      });
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new ParsingError(
          `Request to "${url}" timed out after 30 seconds`,
        );
      }
      throw new ParsingError(
        `Failed to fetch URL "${url}": ${(error as Error).message}`,
      );
    }

    if (!response.ok) {
      throw new ParsingError(
        `Failed to fetch "${url}": HTTP ${response.status} ${response.statusText}`,
      );
    }

    const contentType = response.headers.get("content-type") || "text/plain";
    const finalUrl = response.url;

    // Read the response body as text
    let content: string;
    try {
      content = await response.text();
    } catch (error) {
      throw new ParsingError(
        `Failed to read response body from "${url}": ${(error as Error).message}`,
      );
    }

    if (!content || content.trim().length === 0) {
      throw new ParsingError(`Empty response from "${url}"`);
    }

    return { content, contentType, finalUrl };
  }

  /**
   * Select the appropriate parser based on content type and URL.
   */
  private selectParser(contentType: string, url: string): JobParser {
    const type = contentType.toLowerCase();
    const urlLower = url.toLowerCase();

    // Check content type first
    if (type.includes("text/html")) {
      return this.htmlParser;
    }

    if (type.includes("text/markdown") || type.includes("text/x-markdown")) {
      return this.markdownParser;
    }

    if (type.includes("text/plain")) {
      return this.textParser;
    }

    // Fall back to URL extension
    if (urlLower.endsWith(".md") || urlLower.endsWith(".markdown")) {
      return this.markdownParser;
    }

    if (urlLower.endsWith(".html") || urlLower.endsWith(".htm")) {
      return this.htmlParser;
    }

    if (urlLower.endsWith(".txt")) {
      return this.textParser;
    }

    // Default to HTML parser for web pages
    if (type.includes("text/")) {
      return this.htmlParser;
    }

    // Final fallback
    return this.htmlParser;
  }
}
