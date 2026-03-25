import { describe, it, expect, vi, beforeEach } from "vitest";
import { budgetService } from "./budgets.js";
import { 
  agents, 
  budgetIncidents, 
  budgetPolicies, 
  companies, 
  costEvents, 
  instanceSettings,
  activityLog,
  projects,
  approvals,
  authUsers
} from "@paperclipai/db";

describe("server: budgetService FULL test suite", () => {
  let mockDb: any;
  let service: any;
  let mockHooks: any;

  beforeEach(() => {
    mockHooks = { cancelWorkForScope: vi.fn().mockResolvedValue(undefined) };
    const chain: any = {
        select: vi.fn(() => { chain._isInsert = chain._isUpdate = false; return chain; }),
        from: vi.fn((t) => { chain._lastTable = t; return chain; }),
        where: vi.fn(() => chain),
        insert: vi.fn((t) => { chain._lastTable = t; chain._isInsert = true; return chain; }),
        update: vi.fn((t) => { chain._lastTable = t; chain._isUpdate = true; return chain; }),
        delete: vi.fn((t) => { chain._lastTable = t; return chain; }),
        values: vi.fn(() => chain),
        set: vi.fn(() => chain),
        onConflictDoUpdate: vi.fn(() => chain),
        returning: vi.fn(() => chain),
        execute: vi.fn().mockResolvedValue(undefined),
        orderBy: vi.fn(() => chain),
        desc: vi.fn(() => chain),
        leftJoin: vi.fn(() => chain),
        innerJoin: vi.fn(() => chain),
        groupBy: vi.fn(() => chain),
        then: vi.fn((cb: any) => {
            if (!cb) return Promise.resolve([]);
            let data: any[] = [];
            const t = chain._lastTable;
            
            if (chain._isInsert || chain._isUpdate) {
                if (t === budgetPolicies) data = [{ id: "p1", companyId: "c1", amount: 500 }];
                if (t === budgetIncidents) data = [{ id: "i1", companyId: "c1" }];
                if (t === approvals) data = [{ id: "app1" }];
                if (t === activityLog) data = [{ id: "log1" }];
            } else {
                if (t === agents) data = [{ id: "a1", companyId: "c1", name: "Agent1", status: "active" }];
                if (t === companies) data = [{ id: "c1", companyId: "c1", name: "Comp1", status: "active" }];
                if (t === projects) data = [{ id: "pr1", companyId: "c1", name: "Proj1" }];
                if (t === budgetPolicies) data = [{ id: "p1", companyId: "c1", scopeType: "company", scopeId: "c1", amount: 100, warnPercent: 80, metric: "billed_cents", windowKind: "calendar_month_utc", isActive: true, hardStopEnabled: true, notifyEnabled: true }];
                if (t === budgetIncidents) data = []; // default empty for select
                if (t === instanceSettings) data = [{ general: { budgetPolicies: { enabled: true } } }];
                if (t === authUsers) data = [{ id: "u1", name: "User1", email: "u@e.com" }];
                if (t === costEvents) data = [{ total: 50 }];
            }
            
            const res = cb(data);
            chain._isInsert = chain._isUpdate = false;
            return Promise.resolve(res);
        }),
        transaction: vi.fn(async (cb: any) => await cb(chain)),
    };
    mockDb = chain;
    service = budgetService(mockDb, mockHooks);
  });

  it("evaluateCostEvent hard stop", async () => {
      mockDb.then.mockImplementationOnce((cb: any) => Promise.resolve(cb([{ 
          id: "p1", companyId: "c1", scopeType: "agent", scopeId: "a1", 
          amount: 100, warnPercent: 80, metric: "billed_cents", windowKind: "calendar_month_utc", isActive: true, hardStopEnabled: true 
      }]))); 
      mockDb.then.mockImplementationOnce((cb: any) => Promise.resolve(cb([{ total: 110 }]))); 
      
      await service.evaluateCostEvent({ id: "e1", companyId: "c1", agentId: "a1", costCents: 10 } as any);
      expect(mockDb.insert).toHaveBeenCalledWith(budgetIncidents);
      expect(mockHooks.cancelWorkForScope).toHaveBeenCalled();
  });

  it("resolveIncident: approve agent budget", async () => {
      mockDb.then.mockImplementationOnce((cb: any) => Promise.resolve(cb([{ id: "i1", companyId: "c1", policyId: "p1", scopeType: "agent", scopeId: "a1", status: "open" }])));
      mockDb.then.mockImplementationOnce((cb: any) => Promise.resolve(cb([{ id: "p1", companyId: "c1", scopeType: "agent", scopeId: "a1", amount: 100, metric: "billed_cents", windowKind: "calendar_month_utc" }])));
      mockDb.then.mockImplementationOnce((cb: any) => Promise.resolve(cb([{ total: 150 }]))); 
      
      const res = await service.resolveIncident("c1", "i1", { action: "raise_budget_and_resume", amount: 200 }, "u1");
      expect(res.status).toBe("resolved");
      expect(mockDb.update).toHaveBeenCalledWith(agents);
  });

  it("resolveIncident: dismiss path", async () => {
      mockDb.then.mockImplementationOnce((cb: any) => Promise.resolve(cb([{ id: "i1", companyId: "c1", policyId: "p1", scopeType: "company", scopeId: "c1", status: "open" }])));
      
      const res = await service.resolveIncident("c1", "i1", { action: "dismiss" }, "u1");
      expect(res.status).toBe("dismissed");
      expect(mockDb.update).toHaveBeenCalledWith(budgetIncidents);
  });

  it("upsertPolicy and overview", async () => {
      await service.upsertPolicy("c1", { scopeType: "company", scopeId: "c1", amount: 500 }, "u1");
      mockDb.then.mockImplementation((cb: any) => {
          const t = mockDb._lastTable;
          if (t === budgetIncidents) return Promise.resolve(cb([{ id: "i1", companyId: "c1", scopeType: "company", scopeId: "c1", status: "open" }]));
          if (t === companies) return Promise.resolve(cb([{ id: "c1", name: "Comp1" }]));
          return Promise.resolve(cb([]));
      });
      const ov = await service.overview("c1");
      expect(ov.activeIncidents.length).toBeGreaterThan(0);
  });
});
