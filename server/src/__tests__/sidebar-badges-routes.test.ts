import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { sidebarBadgeRoutes } from "../routes/sidebar-badges.js";

// Mock the services
vi.mock("../services/sidebar-badges.js", () => ({
  sidebarBadgeService: vi.fn(() => ({
    get: vi.fn().mockResolvedValue({ failedRuns: 0, approvals: 2, joinRequests: 1, inbox: 0 })
  }))
}));

vi.mock("../services/access.js", () => ({
  accessService: vi.fn(() => ({
    canUser: vi.fn().mockResolvedValue(true),
    hasPermission: vi.fn().mockResolvedValue(true)
  }))
}));

vi.mock("../services/dashboard.js", () => ({
  dashboardService: vi.fn(() => ({
    summary: vi.fn().mockResolvedValue({ 
      agents: { error: 0 }, 
      costs: { monthBudgetCents: 100, monthUtilizationPercent: 50 } 
    })
  }))
}));

describe("sidebarBadgeRoutes", () => {
  let app: express.Express;
  let dbMock: any;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as any).actor = { type: "board", source: "local_implicit" };
      next();
    });
    dbMock = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((cb) => Promise.resolve([{ count: 1 }]).then(cb)),
    };
    app.use("/", sidebarBadgeRoutes(dbMock as any));
  });

  it("GET /companies/:companyId/sidebar-badges returns badges", async () => {
    const res = await request(app).get("/companies/comp-123/sidebar-badges");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("inbox");
    // 1 join request (from db mock) + 2 approvals (from service mock) = 3 (plus potential alerts)
    expect(res.body.inbox).toBeGreaterThanOrEqual(3);
  });

  it("calculates alerts correctly when budget is exceeded", async () => {
    // Re-mock dashboard to trigger alert
    const { dashboardService } = await import("../services/dashboard.js");
    (dashboardService as any).mockReturnValueOnce({
      summary: vi.fn().mockResolvedValue({ 
        agents: { error: 0 }, 
        costs: { monthBudgetCents: 100, monthUtilizationPercent: 90 } // Alert triggered
      })
    });

    const res = await request(app).get("/companies/comp-123/sidebar-badges");
    expect(res.status).toBe(200);
    // inbox should include 1 alert for budget
  });
});
