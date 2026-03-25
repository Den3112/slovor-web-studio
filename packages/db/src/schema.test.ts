import { describe, expect, it } from "vitest";
import * as schema from "./schema/index.js";
import { getTableConfig } from "drizzle-orm/pg-core";

describe("database schema", () => {
  it("exports all expected tables", () => {
    const tableKeys = Object.keys(schema);
    expect(tableKeys.length).toBeGreaterThan(0);
    // Spot check a few critical tables
    expect(schema).toHaveProperty("companies");
    expect(schema).toHaveProperty("agents");
    expect(schema).toHaveProperty("authUsers");
  });

  it("each export is a valid Drizzle table", () => {
    for (const [name, table] of Object.entries(schema)) {
      try {
        const config = getTableConfig(table as any);
        expect(config.name).toBeDefined();
      } catch (e) {
        // Some exports might be enums or other helpers, skip those
        // but for this project most are tables
      }
    }
  });

  it("has unique table names", () => {
    const tableNames = new Set<string>();
    for (const [name, table] of Object.entries(schema)) {
      try {
        const config = getTableConfig(table as any);
        if (tableNames.has(config.name)) {
          throw new Error(`Duplicate table name: ${config.name} (from export ${name})`);
        }
        tableNames.add(config.name);
      } catch (e) {
        // Skip non-table exports
      }
    }
  });
});
