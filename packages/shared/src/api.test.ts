import { describe, expect, it } from "vitest";
import { API, API_PREFIX } from "./api.js";

describe("shared: api", () => {
  it("defines API_PREFIX", () => {
    expect(API_PREFIX).toBe("/api");
  });

  it("exports API endpoints", () => {
    expect(API.health).toBe("/api/health");
    expect(API.companies).toBe("/api/companies");
    expect(API.agents).toBe("/api/agents");
  });
});
