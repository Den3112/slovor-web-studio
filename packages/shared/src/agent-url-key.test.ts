import { describe, expect, it } from "vitest";
import { deriveAgentUrlKey, normalizeAgentUrlKey, isUuidLike } from "./agent-url-key.js";

describe("agent-url-key", () => {
  describe("isUuidLike", () => {
    it("identifies valid UUIDs", () => {
      expect(isUuidLike("123e4567-e89b-12d3-a456-426614174000")).toBe(true);
    });

    it("identifies invalid UUIDs", () => {
      expect(isUuidLike("00000000-0000-0000-0000-000000000000")).toBe(false); // not a v1-5 UUID
      expect(isUuidLike("not-a-uuid")).toBe(false);
      expect(isUuidLike("123e4567-e89b-12d3-a456-42661417400")).toBe(false); // too short
      expect(isUuidLike("")).toBe(false);
    });
  });

  describe("deriveAgentUrlKey", () => {
    it("derives a key from name", () => {
      expect(deriveAgentUrlKey("John Doe", "engineer")).toBe("john-doe");
    });

    it("uses fallback if name is invalid", () => {
      expect(deriveAgentUrlKey(null, "Fallback")).toBe("fallback");
    });

    it("normalizes special characters", () => {
      expect(deriveAgentUrlKey("John & Doe!")).toBe("john-doe");
    });

    it("handles empty values gracefully", () => {
      expect(deriveAgentUrlKey("", "")).toBe("agent");
    });
  });

  describe("normalizeAgentUrlKey", () => {
    it("leaves UUIDs alone", () => {
      const uuid = "123e4567-e89b-12d3-a456-426614174000";
      expect(normalizeAgentUrlKey(uuid)).toBe(uuid);
    });

    it("sluggifies non-UUID keys", () => {
      expect(normalizeAgentUrlKey("John Doe")).toBe("john-doe");
    });
  });
});
