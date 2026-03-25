import { describe, it, expect } from "vitest";
import * as schema from "./schema/index.js";
import { getTableConfig } from "drizzle-orm/pg-core";

describe("db: schema verification", () => {
  it("should have all expected tables exported", () => {
    expect(schema.companies).toBeDefined();
    expect(schema.agents).toBeDefined();
    expect(schema.projects).toBeDefined();
    expect(schema.goals).toBeDefined();
    expect(schema.issues).toBeDefined();
    expect(schema.heartbeatRuns).toBeDefined();
    expect(schema.costEvents).toBeDefined();
    expect(schema.approvals).toBeDefined();
    expect(schema.activityLog).toBeDefined();
  });

  it("should have valid table configurations", () => {
    expect(getTableConfig(schema.companies).name).toBe("companies");
    expect(getTableConfig(schema.agents).name).toBe("agents");
  });
});
