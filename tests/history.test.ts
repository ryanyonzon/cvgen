/**
 * Tests for the history module.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";

// Mock fs
vi.mock("node:fs");
vi.mock("node:os");

describe("History Module", () => {
  beforeEach(() => {
    vi.mocked(os.homedir).mockReturnValue("/home/testuser");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should generate a run ID", async () => {
    const { generateRunId } = await import("../src/history/index.js");
    const runId = generateRunId();

    // Format: YYYY-MM-DD-HHMMSS (all digits)
    expect(runId).toMatch(/^\d{4}-\d{2}-\d{2}-\d{6}$/);
  });

  it("should list empty history", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const { listHistory } = await import("../src/history/index.js");
    const entries = listHistory();

    expect(entries).toEqual([]);
  });

  it("should return 0 history size when empty", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const { getHistorySize } = await import("../src/history/index.js");
    const size = getHistorySize();

    expect(size).toBe(0);
  });

  it("should list history entries", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue([
      { name: "2026-07-10-120000", isDirectory: () => true },
      { name: "2026-07-09-100000", isDirectory: () => true },
    ] as unknown as fs.Dirent[]);

    // Mock metadata.json reads for each entry
    vi.mocked(fs.readFileSync)
      .mockReturnValueOnce(
        JSON.stringify({
          runId: "2026-07-10-120000",
          timestamp: "2026-07-10T12:00:00.000Z",
          provider: "openrouter",
          model: "openai/gpt-4o",
          promptVersion: "v1",
          template: "ats",
          duration: 5000,
          inputTokens: 1000,
          outputTokens: 500,
          estimatedCost: 0.02,
          atsScore: 85,
          jobTitle: "Senior Engineer",
          company: "Acme Corp",
          profileName: "default",
        }),
      )
      .mockReturnValueOnce(
        JSON.stringify({
          runId: "2026-07-09-100000",
          timestamp: "2026-07-09T10:00:00.000Z",
          provider: "openrouter",
          model: "openai/gpt-4o",
          promptVersion: "v1",
          template: "ats",
          duration: 3000,
          inputTokens: 800,
          outputTokens: 400,
          estimatedCost: 0.015,
          atsScore: 90,
          jobTitle: "Backend Developer",
          company: undefined,
          profileName: "backend",
        }),
      );

    const { listHistory } = await import("../src/history/index.js");
    const entries = listHistory();

    expect(entries.length).toBe(2);
    // Newest first
    expect(entries[0].runId).toBe("2026-07-10-120000");
    expect(entries[0].metadata?.atsScore).toBe(85);
  });

  it("should handle history directory read errors", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockImplementation(() => {
      throw new Error("Permission denied");
    });

    const { listHistory } = await import("../src/history/index.js");
    const entries = listHistory();

    expect(entries).toEqual([]);
  });

  it("should load history metadata", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        runId: "2026-07-10-120000",
        timestamp: "2026-07-10T12:00:00.000Z",
        provider: "openrouter",
        model: "openai/gpt-4o",
        promptVersion: "v1",
        template: "ats",
        duration: 5000,
        inputTokens: 1000,
        outputTokens: 500,
        estimatedCost: 0.02,
        atsScore: 85,
        jobTitle: "Senior Engineer",
        company: "Acme Corp",
        profileName: "default",
      }),
    );

    const { loadHistoryMetadata } = await import("../src/history/index.js");
    const metadata = loadHistoryMetadata("2026-07-10-120000");

    expect(metadata).not.toBeNull();
    expect(metadata?.provider).toBe("openrouter");
    expect(metadata?.atsScore).toBe(85);
  });

  it("should return null for missing metadata", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const { loadHistoryMetadata } = await import("../src/history/index.js");
    const metadata = loadHistoryMetadata("nonexistent");

    expect(metadata).toBeNull();
  });

  it("should load history file", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue("# Resume\n\nContent");

    const { loadHistoryFile } = await import("../src/history/index.js");
    const content = loadHistoryFile("run-1", "resume.md");

    expect(content).toBe("# Resume\n\nContent");
  });

  it("should return null for missing history file", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const { loadHistoryFile } = await import("../src/history/index.js");
    const content = loadHistoryFile("run-1", "nonexistent.md");

    expect(content).toBeNull();
  });

  it("should delete history entry", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.rmSync).mockImplementation(() => undefined);

    const { deleteHistory } = await import("../src/history/index.js");
    const result = deleteHistory("2026-07-10-120000");

    expect(result).toBe(true);
  });

  it("should return false when deleting nonexistent history", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const { deleteHistory } = await import("../src/history/index.js");
    const result = deleteHistory("nonexistent");

    expect(result).toBe(false);
  });
});
