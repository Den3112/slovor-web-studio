import { describe, it, expect, vi, beforeEach } from "vitest";
import { costService } from "./costs.js";
import { 
  agents, 
  companies, 
  costEvents, 
  projects,
  activityLog,
  issues
} from "@paperclipai/db";

vi.mock("./budgets.js", () => ({
  budgetService: vi.fn(() => ({
    evaluateCostEvent: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe("server: costService Full Coverage", () => {
  let mockDb: any;
  let service: ReturnType<typeof costService>;

  const getBaseData = (t: any) => {
    if (t === companies) return [{ id: "c1", name: "Comp", budgetMonthlyCents: 10000, spentMonthlyCents: 0 }];
    if (t === agents) return [{ id: "a1", companyId: "c1", name: "Agent", spentMonthlyCents: 0 }];
    if (t === costEvents) return [{ id: "e1", companyId: "c1", costCents: 100, agentId: "a1", total: 0 }];
    return [];
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn((t) => { mockDb._lastTable = t; return mockDb; }),
      where: vi.fn(() => mockDb),
      and: vi.fn().mockReturnThis(),
      insert: vi.fn((t) => { mockDb._lastTable = t; mockDb._op = "insert"; return mockDb; }),
      values: vi.fn().mockReturnThis(),
      update: vi.fn((t) => { mockDb._lastTable = t; mockDb._op = "update"; return mockDb; }),
      set: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      desc: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      selectDistinctOn: vi.fn().mockReturnThis(),
      as: vi.fn((name) => ({ name })),
      then: vi.fn((cb: any) => {
        const d = getBaseData(mockDb._lastTable);
        return Promise.resolve(cb ? cb(d) : d);
      }),
      _lastTable: null,
      _op: "select"
    };
    service = costService(mockDb);
  });

  it("createEvent: coverage for all branches", async () => {
    // 1. Success
    const res = await service.createEvent("c1", { agentId: "a1", costCents: 100 } as any);
    expect(res.id).toBe("e1");

    // 2. Not found
    mockDb.then = vi.fn().mockImplementation((cb) => Promise.resolve(cb([])));
    await expect(service.createEvent("c1", { agentId: "a2" } as any)).rejects.toThrow("Agent not found");

    // 3. Wrong company
    mockDb.then = vi.fn().mockImplementation((cb) => Promise.resolve(cb([{ id: "a1", companyId: "other" }])));
    await expect(service.createEvent("c1", { agentId: "a1" } as any)).rejects.toThrow("Agent does not belong to company");
  });

  it("summary and utilization", async () => {
      mockDb.then = vi.fn().mockImplementation((cb) => {
          const t = mockDb._lastTable;
          if (t === costEvents) return Promise.resolve(cb([{ total: 5000 }]));
          if (t === companies) return Promise.resolve(cb([{ id: "c1", budgetMonthlyCents: 10000 }]));
          return Promise.resolve(cb([]));
      });
      const res = await service.summary("c1", { from: new Date(), to: new Date() });
      expect(res.spendCents).toBe(5000);
      expect(res.utilizationPercent).toBe(50);
  });

  it("summary: zero budget case", async () => {
      mockDb.then = vi.fn().mockImplementation((cb) => {
          if (mockDb._lastTable === costEvents) return Promise.resolve(cb([{ total: 5000 }]));
          if (mockDb._lastTable === companies) return Promise.resolve(cb([{ id: "c1", budgetMonthlyCents: 0 }]));
          return Promise.resolve(cb([]));
      });
      const res = await service.summary("c1");
      expect(res.utilizationPercent).toBe(0);
  });

  it("summary: company not found", async () => {
      mockDb.then = vi.fn().mockImplementation((cb) => Promise.resolve(cb([])));
      await expect(service.summary("c2")).rejects.toThrow("Company not found");
  });

  it("complex aggregations: coverage", async () => {
      await service.byAgent("c1", { from: new Date(), to: new Date() });
      await service.byProvider("c1", { from: new Date(), to: new Date() });
      await service.byBiller("c1", { from: new Date(), to: new Date() });
      await service.windowSpend("c1");
      await service.byAgentModel("c1", { from: new Date(), to: new Date() });
      expect(mockDb.groupBy).toHaveBeenCalled();
  });

  it("byProject: complex join coverage", async () => {
      await service.byProject("c1", { from: new Date(), to: new Date() });
      expect(mockDb.selectDistinctOn).toHaveBeenCalled();
      expect(mockDb.innerJoin).toHaveBeenCalled();
  });
});
