/**
 * History module for cvgen.
 *
 * Records generation history to ~/.config/cvgen/history/.
 * Each generation run creates a timestamped directory containing
 * the generated documents, metadata, and ATS report.
 */

import fs from "node:fs";
import path from "node:path";
import { getConfigDir } from "../config/index.js";
import type { PipelineResult, ATSReport } from "../pipeline/types.js";
import { IOError } from "../errors/index.js";

// ---------------------------------------------------------------------------
// History Directory
// ---------------------------------------------------------------------------

/**
 * Get the history directory path.
 */
export function getHistoryDir(): string {
  return path.join(getConfigDir(), "history");
}

/**
 * Ensure the history directory exists.
 */
export function ensureHistoryDir(): void {
  const dir = getHistoryDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Get a timestamp-based directory name for a generation run.
 * Format: YYYY-MM-DD-HHMMSS
 */
export function generateRunId(): string {
  const now = new Date();
  const pad = (n: number, d = 2): string => String(n).padStart(d, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

/**
 * Get the path for a specific run's directory.
 */
export function getRunDir(runId: string): string {
  return path.join(getHistoryDir(), runId);
}

// ---------------------------------------------------------------------------
// History Entry Types
// ---------------------------------------------------------------------------

/**
 * Metadata stored alongside each history entry.
 */
export interface HistoryMetadata {
  runId: string;
  timestamp: string;
  provider: string;
  model: string;
  promptVersion: string;
  template: string;
  duration: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number | undefined;
  atsScore: number;
  jobTitle: string;
  company: string | undefined;
  profileName: string;
}

// ---------------------------------------------------------------------------
// Save History
// ---------------------------------------------------------------------------

/**
 * Save a generation run to history.
 *
 * Creates a timestamped directory with:
 *   - resume.md            - Generated resume in Markdown
 *   - cover-letter.md      - Generated cover letter in Markdown
 *   - combined.md          - Combined document
 *   - generation.json      - Raw generated resume JSON
 *   - metadata.json        - Generation metadata
 *   - ats-report.md        - ATS analysis report
 *
 * @param result - The pipeline result to save
 * @param profileName - The profile name used
 * @param resumeMarkdown - The rendered resume Markdown
 * @param coverLetterMarkdown - The rendered cover letter Markdown (optional)
 * @param combinedMarkdown - The combined rendered Markdown
 * @returns The run ID for the saved history entry
 */
export async function saveHistory(
  result: PipelineResult,
  profileName: string,
  resumeMarkdown: string,
  coverLetterMarkdown: string | null,
  combinedMarkdown: string,
): Promise<string> {
  const runId = generateRunId();
  const runDir = getRunDir(runId);

  try {
    ensureHistoryDir();
    fs.mkdirSync(runDir, { recursive: true });

    // Build history metadata
    const historyMeta: HistoryMetadata = {
      runId,
      timestamp: result.metadata.timestamp,
      provider: result.metadata.provider,
      model: result.metadata.model,
      promptVersion: result.metadata.promptVersion,
      template: result.metadata.template,
      duration: result.metadata.duration,
      inputTokens: result.metadata.inputTokens,
      outputTokens: result.metadata.outputTokens,
      estimatedCost: result.metadata.estimatedCost,
      atsScore: result.atsReport.overallScore,
      jobTitle: "", // We don't have this directly in PipelineResult
      company: undefined,
      profileName,
    };

    // Write files
    const files: Record<string, string> = {
      "resume.md": resumeMarkdown,
      "combined.md": combinedMarkdown,
      "generation.json": JSON.stringify(result.resume, null, 2),
      "metadata.json": JSON.stringify(historyMeta, null, 2),
      "ats-report.md": formatATSReportForHistory(result.atsReport),
    };

    if (coverLetterMarkdown) {
      files["cover-letter.md"] = coverLetterMarkdown;
    }

    for (const [filename, content] of Object.entries(files)) {
      const filePath = path.join(runDir, filename);
      fs.writeFileSync(filePath, content, "utf-8");
    }

    return runId;
  } catch (error) {
    throw new IOError(`Failed to save history: ${(error as Error).message}`);
  }
}

// ---------------------------------------------------------------------------
// List History
// ---------------------------------------------------------------------------

/**
 * List all history entries, sorted by date (newest first).
 *
 * @returns Array of history run IDs with metadata
 */
export function listHistory(): {
  runId: string;
  metadata: HistoryMetadata | null;
}[] {
  const historyDir = getHistoryDir();

  if (!fs.existsSync(historyDir)) {
    return [];
  }

  try {
    const entries = fs.readdirSync(historyDir, { withFileTypes: true });
    const dirs = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
      .reverse(); // Newest first

    return dirs.map((runId) => ({
      runId,
      metadata: loadHistoryMetadata(runId),
    }));
  } catch {
    return [];
  }
}

/**
 * Load metadata for a specific history entry.
 */
export function loadHistoryMetadata(runId: string): HistoryMetadata | null {
  const metaPath = path.join(getRunDir(runId), "metadata.json");

  if (!fs.existsSync(metaPath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(metaPath, "utf-8");
    return JSON.parse(raw) as HistoryMetadata;
  } catch {
    return null;
  }
}

/**
 * Load a specific file from a history entry.
 */
export function loadHistoryFile(
  runId: string,
  filename: string,
): string | null {
  const filePath = path.join(getRunDir(runId), filename);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

/**
 * Delete a history entry.
 */
export function deleteHistory(runId: string): boolean {
  const runDir = getRunDir(runId);

  if (!fs.existsSync(runDir)) {
    return false;
  }

  try {
    fs.rmSync(runDir, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get total history size (number of runs).
 */
export function getHistorySize(): number {
  return listHistory().length;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format an ATS report as Markdown for history storage.
 */
function formatATSReportForHistory(report: ATSReport): string {
  const lines: string[] = [
    "# ATS Analysis Report",
    "",
    `**Overall Score:** ${report.overallScore}/100`,
    `**Keyword Coverage:** ${report.keywordCoverage}%`,
    "",
  ];

  if (report.matchedKeywords.length > 0) {
    lines.push("## Matched Keywords", "");
    for (const kw of report.matchedKeywords) {
      lines.push(`- \u2714 ${kw}`);
    }
    lines.push("");
  }

  if (report.missingKeywords.length > 0) {
    lines.push("## Missing Keywords", "");
    for (const kw of report.missingKeywords) {
      lines.push(`- \u2718 ${kw}`);
    }
    lines.push("");
  }

  if (report.strengths.length > 0) {
    lines.push("## Strengths", "");
    for (const s of report.strengths) {
      lines.push(`- ${s}`);
    }
    lines.push("");
  }

  if (report.weaknesses.length > 0) {
    lines.push("## Weaknesses", "");
    for (const w of report.weaknesses) {
      lines.push(`- ${w}`);
    }
    lines.push("");
  }

  if (report.recommendations.length > 0) {
    lines.push("## Recommendations", "");
    for (const r of report.recommendations) {
      lines.push(`- ${r}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
