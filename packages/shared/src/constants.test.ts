import { describe, expect, it } from "vitest";
import * as constants from "./constants.js";

describe("shared: constants", () => {
  it("exports defined constants", () => {
    expect(constants.COMPANY_STATUSES).toBeDefined();
    expect(constants.AGENT_STATUSES).toBeDefined();
    expect(constants.AGENT_ROLES).toBeDefined();
    expect(constants.AGENT_ICON_NAMES).toBeDefined();
    expect(constants.PLUGIN_STATUSES).toBeDefined();
  });

  it("has matching role labels", () => {
    constants.AGENT_ROLES.forEach(role => {
      expect(constants.AGENT_ROLE_LABELS[role]).toBeDefined();
    });
  });
});
