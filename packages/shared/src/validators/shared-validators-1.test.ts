import { describe, expect, it } from "vitest";
import { 
  createCompanySchema, 
  updateCompanySchema, 
  updateCompanyBrandingSchema,
  instanceGeneralSettingsSchema,
  patchInstanceGeneralSettingsSchema,
  instanceExperimentalSettingsSchema,
  patchInstanceExperimentalSettingsSchema,
  upsertBudgetPolicySchema,
  resolveBudgetIncidentSchema
} from "./index.js";

describe("validators: company", () => {
  describe("createCompanySchema", () => {
    it("validates a valid company", () => {
      const valid = { name: "Test Company", description: "Desc", budgetMonthlyCents: 1000 };
      expect(createCompanySchema.parse(valid)).toEqual(valid);
    });

    it("uses default budget", () => {
      expect(createCompanySchema.parse({ name: "Test" }).budgetMonthlyCents).toBe(0);
    });

    it("rejects invalid budget", () => {
      expect(() => createCompanySchema.parse({ name: "Test", budgetMonthlyCents: -1 })).toThrow();
    });
  });

  describe("updateCompanySchema", () => {
    it("validates valid partial update", () => {
      const valid = { status: "active", brandColor: "#ffffff" };
      expect(updateCompanySchema.parse(valid)).toMatchObject(valid);
    });

    it("rejects invalid brand color", () => {
      expect(() => updateCompanySchema.parse({ brandColor: "invalid" })).toThrow();
    });
  });

  describe("updateCompanyBrandingSchema", () => {
    it("validates valid branding", () => {
      expect(updateCompanyBrandingSchema.parse({ name: "New Name" })).toEqual({ name: "New Name" });
    });

    it("rejects empty update", () => {
      expect(() => updateCompanyBrandingSchema.parse({})).toThrow("At least one branding field must be provided");
    });
    
    it("rejects unknown fields via strict", () => {
      expect(() => updateCompanyBrandingSchema.parse({ name: "Name", extra: 1 })).toThrow();
    });
  });
});

describe("validators: instance", () => {
  describe("instanceGeneralSettingsSchema", () => {
    it("validates valid settings", () => {
      const valid = { 
        censorUsernameInLogs: true
      };
      expect(instanceGeneralSettingsSchema.parse(valid)).toEqual(valid);
    });
  });

  describe("patchInstanceGeneralSettingsSchema", () => {
    it("validates partial patch", () => {
      expect(patchInstanceGeneralSettingsSchema.parse({ censorUsernameInLogs: false })).toEqual({ censorUsernameInLogs: false });
    });
  });

  describe("instanceExperimentalSettingsSchema", () => {
    it("validates valid settings", () => {
      const valid = { 
        enableIsolatedWorkspaces: true,
        autoRestartDevServerWhenIdle: true
      };
      expect(instanceExperimentalSettingsSchema.parse(valid)).toEqual(valid);
    });
  });
});

describe("validators: budget", () => {
  describe("upsertBudgetPolicySchema", () => {
    it("validates valid policy", () => {
      const valid = { 
        scopeType: "company",
        scopeId: "00000000-0000-0000-0000-000000000000",
        amount: 5000
      };
      expect(upsertBudgetPolicySchema.parse(valid)).toMatchObject(valid);
    });
  });

  describe("resolveBudgetIncidentSchema", () => {
    it("validates valid resolution", () => {
      const valid = { action: "keep_paused" };
      expect(resolveBudgetIncidentSchema.parse(valid)).toEqual(valid);
    });

    it("requires amount when raising budget", () => {
      expect(() => resolveBudgetIncidentSchema.parse({ action: "raise_budget_and_resume" })).toThrow("amount is required when raising a budget");
    });

    it("accepts amount when raising budget", () => {
      const valid = { action: "raise_budget_and_resume", amount: 1000 };
      expect(resolveBudgetIncidentSchema.parse(valid)).toEqual(valid);
    });
  });
});
