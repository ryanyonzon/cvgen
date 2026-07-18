/**
 * Tests for profile management.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";

vi.mock("node:fs");
vi.mock("node:os");

describe("profile management", () => {
  beforeEach(() => {
    vi.mocked(os.homedir).mockReturnValue("/home/testuser");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("listProfiles", () => {
    it("should return empty array when profiles directory does not exist", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const { listProfiles } = await import("../src/config/profile.js");
      const profiles = listProfiles();
      expect(profiles).toEqual([]);
    });

    it("should return sorted list of profile names", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        "default.json",
        "backend.json",
        "manager.json",
      ] as unknown as fs.Dirent[]);

      const { listProfiles } = await import("../src/config/profile.js");
      const profiles = listProfiles();
      expect(profiles).toEqual(["backend", "default", "manager"]);
    });

    it("should filter out non-JSON files", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        "default.json",
        "notes.txt",
        ".hidden",
      ] as unknown as fs.Dirent[]);

      const { listProfiles } = await import("../src/config/profile.js");
      const profiles = listProfiles();
      expect(profiles).toEqual(["default"]);
    });
  });

  describe("loadProfile", () => {
    it("should return null when profile does not exist", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const { loadProfile } = await import("../src/config/profile.js");
      const profile = loadProfile("nonexistent");
      expect(profile).toBeNull();
    });

    it("should load and return a valid profile", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          name: "John Doe",
          contact: { email: "john@example.com" },
          skills: ["TypeScript"],
        }),
      );

      const { loadProfile } = await import("../src/config/profile.js");
      const profile = loadProfile("default");
      expect(profile).not.toBeNull();
      if (profile) {
        expect(profile.name).toBe("John Doe");
        expect(profile.contact.email).toBe("john@example.com");
      }
    });

    it("should throw on invalid JSON", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue("not json");

      const { loadProfile } = await import("../src/config/profile.js");
      expect(() => loadProfile("default")).toThrow();
    });

    it("should throw on invalid profile schema", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          name: "",
          contact: { email: "invalid" },
        }),
      );

      const { loadProfile } = await import("../src/config/profile.js");
      expect(() => loadProfile("default")).toThrow();
    });
  });

  describe("saveProfile", () => {
    it("should save a valid profile", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
      vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);

      const { saveProfile } = await import("../src/config/profile.js");
      saveProfile("test", {
        name: "Test User",
        contact: { email: "test@example.com" },
      });

      expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    });

    it("should throw on invalid profile", async () => {
      const { saveProfile } = await import("../src/config/profile.js");
      expect(() =>
        saveProfile("test", {
          name: "",
          contact: { email: "invalid" },
        }),
      ).toThrow();
    });
  });

  describe("deleteProfile", () => {
    it("should return true when profile is deleted", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.unlinkSync).mockImplementation(() => undefined);

      const { deleteProfile } = await import("../src/config/profile.js");
      const result = deleteProfile("test");
      expect(result).toBe(true);
    });

    it("should return false when profile does not exist", async () => {
      vi.mocked(fs.existsSync)
        .mockReturnValueOnce(false) // First call in deleteProfile
        .mockReturnValue(false);

      const { deleteProfile } = await import("../src/config/profile.js");
      const result = deleteProfile("nonexistent");
      expect(result).toBe(false);
    });
  });

  describe("profileExists", () => {
    it("should return true when profile exists", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const { profileExists } = await import("../src/config/profile.js");
      expect(profileExists("default")).toBe(true);
    });

    it("should return false when profile does not exist", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const { profileExists } = await import("../src/config/profile.js");
      expect(profileExists("nonexistent")).toBe(false);
    });
  });

  describe("generateDefaults", () => {
    it("should create all default files when force is true", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
      vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);

      const { generateDefaults } = await import("../src/config/profile.js");
      generateDefaults(true);

      // Should write: 1 default profile + 5 prompts + 4 templates = 10 files
      expect(fs.writeFileSync).toHaveBeenCalledTimes(10);
    });

    it("should not overwrite existing files when force is false", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
      vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);

      const { generateDefaults } = await import("../src/config/profile.js");
      generateDefaults(false);

      // Should not write anything since all files exist
      expect(fs.writeFileSync).toHaveBeenCalledTimes(0);
    });
  });

  describe("validateAllProfiles", () => {
    it("should return empty map when no profiles exist", async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const { validateAllProfiles } = await import("../src/config/profile.js");
      const results = validateAllProfiles();
      expect(results.size).toBe(0);
    });
  });
});
