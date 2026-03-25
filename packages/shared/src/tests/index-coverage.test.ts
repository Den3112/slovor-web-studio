import { describe, expect, it } from "vitest";
import * as shared from "../index.js";

describe("shared: index re-exports", () => {
  it("exports constants", () => {
    expect(shared.COMPANY_STATUSES).toBeDefined();
    expect(shared.AGENT_STATUSES).toBeDefined();
    expect(shared.PLUGIN_API_VERSION).toBe(1);
  });

  it("exports validators", () => {
    expect(shared.createCompanySchema).toBeDefined();
    expect(shared.createAgentSchema).toBeDefined();
    expect(shared.createProjectSchema).toBeDefined();
  });

  it("exports utils", () => {
    expect(shared.API_PREFIX).toBe("/api");
    expect(shared.normalizeAgentUrlKey).toBeDefined();
    expect(shared.buildProjectMentionHref).toBeDefined();
  });

  it("exports config schemas", () => {
    expect(shared.paperclipConfigSchema).toBeDefined();
    expect(shared.llmConfigSchema).toBeDefined();
  });
});
