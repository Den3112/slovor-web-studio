import { describe, expect, it } from "vitest";
import { normalizeProjectUrlKey, deriveProjectUrlKey } from "./project-url-key.js";

describe("project-url-key", () => {
  describe("normalizeProjectUrlKey", () => {
    it("returns null for non-string values", () => {
      expect(normalizeProjectUrlKey(null)).toBe(null);
      expect(normalizeProjectUrlKey(undefined)).toBe(null);
      expect(normalizeProjectUrlKey(123 as any)).toBe(null);
    });

    it("normalizes a string", () => {
      expect(normalizeProjectUrlKey(" My Project ")).toEqual("my-project");
      expect(normalizeProjectUrlKey("!!!Project!!!")).toEqual("project");
      expect(normalizeProjectUrlKey("Project 123")).toEqual("project-123");
    });

    it("returns null for empty strings after normalization", () => {
      expect(normalizeProjectUrlKey("   ")).toBe(null);
      expect(normalizeProjectUrlKey("!!!")).toBe(null);
    });
  });

  describe("deriveProjectUrlKey", () => {
    it("derives from name", () => {
      expect(deriveProjectUrlKey("New Project")).toBe("new-project");
    });

    it("uses fallback if name is invalid", () => {
      expect(deriveProjectUrlKey(null, "Fallback")).toBe("fallback");
    });

    it("uses default 'project' if both are invalid", () => {
      expect(deriveProjectUrlKey(null, null)).toBe("project");
    });
  });
});
