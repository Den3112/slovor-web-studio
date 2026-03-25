import { describe, it, expect, vi, beforeEach } from "vitest";
import { dashboardService } from "./dashboard.js";

// Mock budgetService
vi.mock("./budgets.js", () => ({
  budgetService: vi.fn(() => ({
    overview: vi.fn().mockResolvedValue({
      activeIncidents: [],
      pendingApprovalCount: 0,
      pausedAgentCount: 0,
      pausedProjectCount: 0
    })
  }))
}));

describe("dashboardService", () => {
  let dbMock: any;

  beforeEach(() => {
    dbMock = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      groupBy: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((cb: any) => {
        // Default mock implementation returns empty or minimal valid data
        return Promise.resolve([]).then(cb);
      }),
    };
  });

  it("throws notFound if company does not exist", async () => {
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([]).then(cb));
    const svc = dashboardService(dbMock);
    await expect(svc.summary("none")).rejects.toThrow("Company not found");
  });

  it("calculates summary correctly", async () => {
    // 1st call: company
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([{ id: "comp-1", budgetMonthlyCents: 1000 }]).then(cb));
    // 2nd call: agentCounts
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([{ status: "running", count: 2 }, { status: "idle", count: 1 }]).then(cb));
    // 3rd call: taskCounts
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([{ status: "in_progress", count: 3 }]).then(cb));
    // 4th call: pendingApprovals
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([{ count: 5 }]).then(cb));
    // 5th call: monthSpend
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([{ monthSpend: 500 }]).then(cb));

    const svc = dashboardService(dbMock);
    const summary = await svc.summary("comp-1");

    expect(summary.companyId).toBe("comp-1");
    expect(summary.agents.running).toBe(2);
    expect(summary.agents.active).toBe(1); // idle counts as active
    expect(summary.tasks.inProgress).toBe(3);
    expect(summary.costs.monthSpendCents).toBe(500);
    expect(summary.costs.monthUtilizationPercent).toBe(50);
    expect(summary.pendingApprovals).toBe(5);
  });
});
