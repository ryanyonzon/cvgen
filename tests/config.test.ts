import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";

// Mock fs and os before importing the config module
vi.mock("node:fs");
vi.mock("node:os");

describe("config", () => {
  beforeEach(() => {
    vi.mocked(os.homedir).mockReturnValue("/home/testuser");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getConfigDir", () => {
    it("should return the correct config directory path", async () => {
      const { getConfigDir } = await import("../src/config/index.js");
      expect(getConfigDir()).toBe("/home/testuser/.config/cvgen");
    });
  });

  describe("getProfilePath", () => {
    it("should return the correct profile path", async () => {
      const { getProfilePath } = await import("../src/config/index.js");
      expect(getProfilePath("default")).toBe(
        "/home/testuser/.config/cvgen/profiles/default.json",
      );
    });
  });

  describe("getEnvPath", () => {
    it("should return the correct env path", async () => {
      const { getEnvPath } = await import("../src/config/index.js");
      expect(getEnvPath()).toBe("/home/testuser/.config/cvgen/.env");
    });
  });

  describe("getConfigPath", () => {
    it("should return the correct config path", async () => {
      const { getConfigPath } = await import("../src/config/index.js");
      expect(getConfigPath()).toBe("/home/testuser/.config/cvgen/config.json");
    });
  });

  describe("loadConfig", () => {
    it("should return default config when config file does not exist", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const { loadConfig } = await import("../src/config/index.js");
      const config = loadConfig();
      expect(config.defaultProfile).toBe("default");
      expect(config.temperature).toBe(0.2);
    });

    it("should merge with default config when config file exists", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ temperature: 0.5 }),
      );
      const { loadConfig } = await import("../src/config/index.js");
      const config = loadConfig();
      expect(config.temperature).toBe(0.5);
      expect(config.defaultProfile).toBe("default"); // from defaults
    });
  });

  describe("ensureConfigDir", () => {
    it("should create all required directories", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);

      const { ensureConfigDir } = await import("../src/config/index.js");
      ensureConfigDir();

      expect(fs.mkdirSync).toHaveBeenCalled();
      // ensureConfigDir creates: config dir, profiles, prompts, templates, logs, history, prompts/v1
      expect(fs.mkdirSync).toHaveBeenCalledTimes(7);
    });
  });

  describe("checkConfiguration", () => {
    it("should check for all required files and directories", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const { checkConfiguration } = await import("../src/config/index.js");
      const result = checkConfiguration();

      expect(result.configDir).toBe(true);
      expect(result.configFile).toBe(true);
      expect(result.envFile).toBe(true);
      expect(result.profiles).toBe(true);
      expect(result.prompts).toBe(true);
      expect(result.templates).toBe(true);
    });
  });
});
