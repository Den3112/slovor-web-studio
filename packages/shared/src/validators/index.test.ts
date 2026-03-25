import { describe, expect, it } from "vitest";
import { 
  createCompanySchema, 
  createAgentSchema, 
  createProjectSchema,
  createIssueSchema 
} from "./index.js";

describe("validators", () => {
  describe("createCompanySchema", () => {
    it("validates a valid company", () => {
      const valid = { name: "Test Company" };
      expect(createCompanySchema.parse(valid)).toEqual({
        ...valid,
        budgetMonthlyCents: 0
      });
    });

    it("rejects missing name", () => {
      expect(() => createCompanySchema.parse({})).toThrow();
    });

    it("rejects empty name", () => {
      expect(() => createCompanySchema.parse({ name: "" })).toThrow();
    });
  });

  describe("createAgentSchema", () => {
    it("validates a valid agent", () => {
      const valid = { 
        name: "Test Agent", 
        role: "engineer", 
        adapterType: "codex_local" 
      };
      const result = createAgentSchema.parse(valid);
      expect(result.name).toBe("Test Agent");
      expect(result.role).toBe("engineer");
    });

    it("rejects invalid role", () => {
      expect(() => createAgentSchema.parse({ 
        name: "Test Agent", 
        role: "invalid", 
        adapterType: "codex_local" 
      })).toThrow();
    });
  });

  describe("createProjectSchema", () => {
    it("validates a valid project", () => {
      const valid = { name: "Test Project" };
      expect(createProjectSchema.parse(valid)).toEqual({
        ...valid,
        status: "backlog"
      });
    });
  });

  describe("createIssueSchema", () => {
    it("validates a valid issue", () => {
      const valid = { 
        title: "Test Issue", 
        priority: "medium" 
      };
      const result = createIssueSchema.parse(valid);
      expect(result.title).toBe("Test Issue");
      expect(result.priority).toBe("medium");
    });
  });
});
