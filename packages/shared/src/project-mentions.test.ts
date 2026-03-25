import { describe, expect, it } from "vitest";
import {
  buildAgentMentionHref,
  buildProjectMentionHref,
  extractAgentMentionIds,
  extractProjectMentionIds,
  parseAgentMentionHref,
  parseProjectMentionHref,
} from "./project-mentions.js";

describe("project-mentions", () => {
  it("round-trips project mentions with color metadata", () => {
    expect(parseProjectMentionHref("project://p123?c=abc")).toEqual({ projectId: "p123", color: "#aabbcc" });
    expect(parseProjectMentionHref("project://p123?color=%23123")).toEqual({ projectId: "p123", color: "#112233" });
    expect(parseProjectMentionHref("project://p123?color=invalid")).toEqual({ projectId: "p123", color: null });
    expect(parseProjectMentionHref("project://?c=invalid")).toBeNull();
    const href = buildProjectMentionHref("p1", "#336699");
    expect(href).toBe("project://p1?c=336699");
    expect(parseProjectMentionHref(href)).toEqual({ projectId: "p1", color: "#336699" });
    expect(buildProjectMentionHref("p2", null)).toBe("project://p2");
    expect(extractProjectMentionIds(`[@p1](${href}) and something else`)).toEqual(["p1"]);
    expect(extractProjectMentionIds("[foo](project://bar) [baz](project://qux)")).toEqual(["bar", "qux"]);
  });

  it("handles malformed URLs in parse functions", () => {
      // Test the catch block for new URL()
      // In Node/V8, new URL("project://invalid space") might throw or be weird
      expect(parseProjectMentionHref("project://invalid space")).toBeNull();
      expect(parseAgentMentionHref("agent://invalid space")).toBeNull();
  });

  it("round-trips agent mentions with icon metadata", () => {
    const href = buildAgentMentionHref("agent-123", "code");
    expect(parseAgentMentionHref(href)).toEqual({
      agentId: "agent-123",
      icon: "code",
    });
    expect(extractAgentMentionIds(`[@CodexCoder](${href})`)).toEqual(["agent-123"]);
  });

  it("handles invalid agent mentions", () => {
    expect(parseAgentMentionHref("notanagent://foo")).toBeNull();
    expect(parseAgentMentionHref("agent://")).toBeNull();
    expect(buildAgentMentionHref("a1", "invalid!")).toBe("agent://a1");
  });

  it("handles empty markdown extraction", () => {
    expect(extractProjectMentionIds("")).toEqual([]);
    expect(extractAgentMentionIds("")).toEqual([]);
    expect(extractProjectMentionIds("just text")).toEqual([]);
  });
});
