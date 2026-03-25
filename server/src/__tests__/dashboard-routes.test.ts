import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { dashboardRoutes } from "../routes/dashboard.js";

// Mock the dashboard service
vi.mock("../services/dashboard.js", () => ({
  dashboardService: vi.fn(() => ({
    summary: vi.fn().mockResolvedValue({ totalAgents: 5, totalProjects: 10 })
  }))
}));

describe("dashboardRoutes", () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    // Middleware to set req.actor for tests
    app.use((req, _res, next) => {
      (req as any).actor = { type: "board", source: "local_implicit" };
      next();
    });
    app.use("/", dashboardRoutes({} as any));
  });

  it("GET /companies/:companyId/dashboard returns summary", async () => {
    const res = await request(app).get("/companies/comp-123/dashboard");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ totalAgents: 5, totalProjects: 10 });
  });

  it("throws forbidden if agent tries to access another company", async () => {
    const restrictedApp = express();
    restrictedApp.use((req, _res, next) => {
      (req as any).actor = { type: "agent", companyId: "comp-456" };
      next();
    });
    // Error handler to catch and return status
    restrictedApp.use("/", dashboardRoutes({} as any));
    restrictedApp.use((err: any, _req: any, res: any, _next: any) => {
      res.status(err.status || 500).json({ error: err.message });
    });

    const res = await request(restrictedApp).get("/companies/comp-123/dashboard");
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Agent key cannot access another company");
  });
});
