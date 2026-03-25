import { describe, it, expect, vi, beforeEach } from "vitest";
import { budgetService } from "./budgets.js";
import { 
  agents, 
  budgetIncidents, 
  budgetPolicies, 
  companies, 
  costEvents, 
  projects,
  approvals 
} from "@paperclipai/db";

vi.mock("./activity-log.js", () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

describe("server: budgetService Coverage Final", () => {
  let mockDb: any;
  let service: ReturnType<typeof budgetService>;
  let mockHooks: any;

  const getBaseData = (t: any) => {
      if (t === companies) return [{ id: "c1", name: "Comp", status: "active", companyId: "c1" }];
      if (t === agents) return [{ id: "a1", companyId: "c1", name: "Agent", status: "active" }];
      if (t === projects) return [{ id: "p1", companyId: "c1", name: "Proj", status: "active", pausedAt: null }];
      if (t === budgetPolicies) return [{ id: "p1", companyId: "c1", scopeType: "company", scopeId: "c1", amount: 1000, isActive: true, metric: "billed_cents", windowKind: "lifetime", hardStopEnabled: true, warnPercent: 50, notifyEnabled: true }];
      if (t === costEvents) return [{ total: 0 }];
      if (t === approvals) return [{ id: "app1", status: "pending" }];
      if (t === budgetIncidents) return []; // Default to empty to allow creation tests
      return [];
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn((t) => { mockDb._lastTable = t; return mockDb; }),
      where: vi.fn(() => mockDb),
      and: vi.fn().mockReturnThis(),
      symbols: { and: Symbol("and"), eq: Symbol("eq") },
      eq: vi.fn().mockReturnThis(),
      insert: vi.fn((t) => { mockDb._lastTable = t; return mockDb; }),
      values: vi.fn().mockReturnThis(),
      update: vi.fn((t) => { mockDb._lastTable = t; return mockDb; }),
      set: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      desc: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      transaction: vi.fn(async (cb: any) => await cb(mockDb)),
      then: vi.fn((cb: any) => {
          const d = getBaseData(mockDb._lastTable);
          return Promise.resolve(cb ? cb(d) : d);
      }),
      _lastTable: null
    };
    mockHooks = { cancelWorkForScope: vi.fn().mockResolvedValue(undefined) };
    service = budgetService(mockDb, mockHooks);
  });

  it("upsertPolicy lifecycle", async () => {
      // triggers hard stop because observed is 1100
      mockDb.then = vi.fn().mockImplementation((cb: any) => {
          if (mockDb._lastTable === costEvents) return Promise.resolve(cb([{ total: 1100 }]));
          return Promise.resolve(cb(getBaseData(mockDb._lastTable)));
      });
      const res = await service.upsertPolicy("c1", { scopeType: "company", scopeId: "c1", amount: 1000 }, "u1");
      expect(res.status).toBe("hard_stop");
      expect(mockHooks.cancelWorkForScope).toHaveBeenCalled();
  });

  it("getInvocationBlock project block", async () => {
      let pc = 0;
      mockDb.then = vi.fn().mockImplementation((cb: any) => {
          const t = mockDb._lastTable;
          if (t === budgetPolicies) {
              pc++;
              if (pc === 3) return Promise.resolve(cb([{ id: "pp", scopeType: "project", scopeId: "p1", amount: 100, hardStopEnabled: true, isActive: true, metric: "billed_cents" }]));
              return Promise.resolve(cb([]));
          }
          if (t === costEvents) return Promise.resolve(cb([{ total: 150 }]));
          if (t === projects) return Promise.resolve(cb([{ id: "p1", companyId: "c1", name: "P1", status: "active" }]));
          return Promise.resolve(cb(getBaseData(t)));
      });
      const res1 = await service.getInvocationBlock("c1", "a1", { projectId: "p1" });
      expect(res1?.scopeType).toBe("project");
  });

  it("resolveIncident full lifecycle", async () => {
      mockDb.then = vi.fn().mockImplementation((cb: any) => {
          const t = mockDb._lastTable;
          if (t === budgetIncidents) return Promise.resolve(cb([{ id: "i1", companyId: "c1", policyId: "p1", approvalId: "app1", scopeType: "company", scopeId: "c1", status: "open" }]));
          if (t === approvals) return Promise.resolve(cb([{ id: "app1", status: "approved" }]));
          return Promise.resolve(cb(getBaseData(t)));
      });
      const resD = await service.resolveIncident("c1", "i1", { action: "keep_paused" }, "u1");
      expect(resD.status).toBe("dismissed");

      const resR = await service.resolveIncident("c1", "i1", { action: "raise_budget_and_resume", amount: 2000 }, "u1");
      expect(resR.status).toBe("resolved");
  });

  it("evaluateCostEvent soft", async () => {
      mockDb.then = vi.fn().mockImplementation((cb: any) => {
          if (mockDb._lastTable === costEvents) return Promise.resolve(cb([{ total: 600 }]));
          if (mockDb._lastTable === budgetIncidents) return Promise.resolve(cb([])); // ensure no existing
          return Promise.resolve(cb(getBaseData(mockDb._lastTable)));
      });
      await service.evaluateCostEvent({ companyId: "c1", costCents: 100 } as any);
      expect(mockDb.insert).toHaveBeenCalledWith(budgetIncidents);
  });
});
