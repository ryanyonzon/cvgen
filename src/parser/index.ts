/**
 * Parser module for cvgen.
 *
 * Parses job descriptions from various input formats into a common
 * normalized structure (ParsedJob).
 *
 * Supported formats:
 *   - Markdown (.md)
 *   - Plain text (.txt)
 *   - HTML (.html, .htm)
 *   - PDF (.pdf)
 *   - DOCX (.docx)
 *   - URLs (fetched and parsed based on content type)
 *
 * Usage:
 *   const result = await parseJobDescription("path/to/job.md");
 *   const result = await parseJobDescription("https://example.com/job");
 *   const result = await parseJobDescription(rawText);
 */

import fs from "node:fs";
import type { ParserResult, JobParser, SourceInfo } from "./types.js";
import { MarkdownParser } from "./markdown.js";
import { TextParser } from "./text.js";
import { HTMLParser } from "./html.js";
import { PDFParser } from "./pdf.js";
import { DocxParser } from "./docx.js";
import { URLParser } from "./url.js";
import { ParsingError } from "../errors/index.js";

/**
 * File extension to parser type mapping.
 */
const extensionParsers: Record<string, string> = {
  ".md": "markdown",
  ".markdown": "markdown",
  ".txt": "text",
  ".html": "html",
  ".htm": "html",
  ".pdf": "pdf",
  ".docx": "docx",
};

/**
 * Detect source type and determine the appropriate parser.
 */
export function detectSource(source: string): SourceInfo {
  // Check if it's stdin marker
  if (source === "-" || source === "/dev/stdin") {
    return { type: "stdin", parserType: "text", source };
  }

  // Check if it's a URL
  try {
    const url = new URL(source);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return { type: "url", parserType: "url", source };
    }
  } catch {
    // Not a URL, continue
  }

  // Check if it's a file path
  const lower = source.toLowerCase();
  for (const [ext, parserType] of Object.entries(extensionParsers)) {
    if (lower.endsWith(ext)) {
      return { type: "file", parserType, source };
    }
  }

  // Check if source is an existing file with unknown extension
  try {
    if (fs.existsSync(source) && fs.statSync(source).isFile()) {
      return { type: "file", parserType: "text", source };
    }
  } catch {
    // Not a file
  }

  // Treat as raw content - detect content type heuristically
  const parserType = detectContentType(source);
  return { type: "raw", parserType, source };
}

/**
 * Detect content type from raw text content heuristics.
 */
function detectContentType(content: string): string {
  const trimmed = content.trim();

  // Check if it looks like HTML
  if (/^<!DOCTYPE html/i.test(trimmed) || /^<html/i.test(trimmed)) {
    return "html";
  }

  // Check if it looks like Markdown (has markdown headers or formatting)
  if (/^#\s/.test(trimmed) || /^##\s/.test(trimmed)) {
    return "markdown";
  }

  // Default to text
  return "text";
}

/**
 * List of supported file extensions.
 */
export function supportedExtensions(): string[] {
  return Object.keys(extensionParsers);
}

/**
 * Read content from a file path.
 */
export function readFileContent(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch (error) {
    throw new ParsingError(
      `Failed to read file "${filePath}": ${(error as Error).message}`,
    );
  }
}

/**
 * Read content from stdin.
 */
export async function readStdin(): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];

    if (process.stdin.isTTY) {
      // No piped input
      resolve("");
      return;
    }

    process.stdin.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    process.stdin.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf-8"));
    });

    process.stdin.on("error", (error) => {
      reject(new ParsingError(`Failed to read stdin: ${error.message}`));
    });

    // Timeout for reading stdin
    setTimeout(() => {
      if (chunks.length === 0) {
        resolve("");
      }
    }, 1000);
  });
}

/**
 * Parse a job description from a file path, URL, or raw content string.
 *
 * Auto-detects the format based on:
 *   - File extension (.md, .txt, .html, .htm, .pdf, .docx)
 *   - URL protocol (http://, https://)
 *   - Content heuristics for raw strings
 *
 * @param source - File path, URL, stdin marker ("-"), or raw text content
 * @returns ParserResult with either parsed data or error
 */
export async function parseJobDescription(
  source: string,
): Promise<ParserResult> {
  try {
    const sourceInfo = detectSource(source);

    if (sourceInfo.type === "stdin") {
      const content = await readStdin();
      if (!content || content.trim().length === 0) {
        return {
          success: false,
          error: "No input received from stdin",
        };
      }
      const parserType = detectContentType(content);
      const parser = createParser(parserType);
      if (!parser) {
        return {
          success: false,
          error: `Unable to determine parser for stdin content`,
        };
      }
      const data = await parser.parseContent(content);
      return { success: true, data };
    }

    if (sourceInfo.type === "url") {
      const parser = createParser("url");
      if (!parser) {
        return { success: false, error: "URL parser not available" };
      }
      const data = await parser.parseContent(source);
      return { success: true, data };
    }

    if (sourceInfo.type === "file") {
      const parserType = sourceInfo.parserType;
      const parser = createParser(parserType);
      if (!parser) {
        return {
          success: false,
          error: `No parser available for "${source}"`,
        };
      }

      // For binary formats (PDF, DOCX), pass file path via options
      if (parserType === "pdf" || parserType === "docx") {
        const data = await parser.parseContent("", {
          filePath: sourceInfo.source,
        });
        return { success: true, data };
      }

      // For text-based formats, read the file
      const content = readFileContent(sourceInfo.source);
      const data = await parser.parseContent(content, {
        filePath: sourceInfo.source,
      });
      return { success: true, data };
    }

    // Raw content - parse directly
    const parserType = sourceInfo.parserType;
    const parser = createParser(parserType);
    if (!parser) {
      return {
        success: false,
        error: `Unable to determine parser for the provided content`,
      };
    }

    const data = await parser.parseContent(source);
    return { success: true, data };
  } catch (error) {
    if (error instanceof ParsingError) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error: `Failed to parse job description: ${(error as Error).message}`,
    };
  }
}

/**
 * Create a parser instance by type name.
 */
function createParser(type: string): JobParser | null {
  switch (type) {
    case "markdown":
      return new MarkdownParser();
    case "text":
      return new TextParser();
    case "html":
      return new HTMLParser();
    case "pdf":
      return new PDFParser();
    case "docx":
      return new DocxParser();
    case "url":
      return new URLParser();
    default:
      return null;
  }
}

// Re-export types and parser classes
export type {
  ParsedJob,
  ParserResult,
  JobParser,
  SourceInfo,
} from "./types.js";
export { MarkdownParser } from "./markdown.js";
export { TextParser } from "./text.js";
export { HTMLParser } from "./html.js";
export { PDFParser } from "./pdf.js";
export { DocxParser } from "./docx.js";
export { URLParser } from "./url.js";
