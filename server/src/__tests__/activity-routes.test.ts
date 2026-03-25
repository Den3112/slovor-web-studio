import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorHandler } from "../middleware/index.js";
import { activityRoutes } from "../routes/activity.js";

const mockActivityService = vi.hoisted(() => ({
  list: vi.fn(),
  forIssue: vi.fn(),
  runsForIssue: vi.fn(),
  issuesForRun: vi.fn(),
  create: vi.fn(),
}));

const mockIssueService = vi.hoisted(() => ({
  getById: vi.fn(),
  getByIdentifier: vi.fn(),
}));

vi.mock("../services/activity.js", () => ({
  activityService: () => mockActivityService,
}));

vi.mock("../services/index.js", () => ({
  issueService: () => mockIssueService,
}));

function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).actor = {
      type: "board",
      userId: "user-1",
      companyIds: ["company-1"],
      source: "session",
      isInstanceAdmin: false,
    };
    next();
  });
  app.use("/api", activityRoutes({} as any));
  app.use(errorHandler);
  return app;
}

describe("activity routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves issue identifiers before loading runs", async () => {
    mockIssueService.getByIdentifier.mockResolvedValue({
      id: "issue-uuid-1",
      companyId: "company-1",
    });
    mockActivityService.runsForIssue.mockResolvedValue([
      {
        runId: "run-1",
      },
    ]);

    const res = await request(createApp()).get("/api/issues/PAP-475/runs");

    expect(res.status).toBe(200);
    expect(mockIssueService.getByIdentifier).toHaveBeenCalledWith("PAP-475");
    expect(mockIssueService.getById).not.toHaveBeenCalled();
    expect(mockActivityService.runsForIssue).toHaveBeenCalledWith("company-1", "issue-uuid-1");
    expect(res.body).toEqual([{ runId: "run-1" }]);
  });

  it("lists activity for a company", async () => {
    mockActivityService.list.mockResolvedValue([{ id: "act-1" }]);
    const res = await request(createApp()).get("/api/companies/company-1/activity");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: "act-1" }]);
    expect(mockActivityService.list).toHaveBeenCalledWith(expect.objectContaining({ companyId: "company-1" }));
  });

  it("creates activity", async () => {
    mockActivityService.create.mockResolvedValue({ id: "act-new" });
    const res = await request(createApp())
      .post("/api/companies/company-1/activity")
      .send({
        actorId: "user-1",
        action: "test",
        entityType: "issue",
        entityId: "iss-1"
      });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: "act-new" });
  });

  it("returns issue activity", async () => {
    mockIssueService.getByIdentifier.mockResolvedValue({ id: "iss-1", companyId: "company-1" });
    mockActivityService.forIssue.mockResolvedValue([{ id: "act-iss" }]);
    const res = await request(createApp()).get("/api/issues/ISS-1/activity");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: "act-iss" }]);
  });

  it("returns issues for heartbeat run", async () => {
    mockActivityService.issuesForRun.mockResolvedValue([{ id: "iss-1" }]);
    const res = await request(createApp()).get("/api/heartbeat-runs/run-1/issues");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: "iss-1" }]);
  });
});
