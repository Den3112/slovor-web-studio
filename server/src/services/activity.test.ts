import { describe, it, expect, vi, beforeEach } from "vitest";
import { activityService } from "./activity.js";

describe("activityService", () => {
  let dbMock: any;

  beforeEach(() => {
    dbMock = {
      select: vi.fn().mockReturnThis(),
      selectDistinctOn: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((cb: any) => Promise.resolve([]).then(cb)),
    };
  });

  it("lists activity with filters", async () => {
    const activityRow = { id: "act-1", companyId: "comp-1" };
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([{ activityLog: activityRow }]).then(cb));

    const svc = activityService(dbMock);
    const result = await svc.list({ companyId: "comp-1", agentId: "agent-1" });

    expect(result).toEqual([activityRow]);
    expect(dbMock.where).toHaveBeenCalled();
  });

  it("gets activity for issue", async () => {
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([{ id: "act-iss" }]).then(cb));
    const svc = activityService(dbMock);
    const result = await svc.forIssue("iss-1");
    expect(result).toEqual([{ id: "act-iss" }]);
  });

  it("creates activity", async () => {
    const newActivity = { id: "new", companyId: "comp-1", action: "test" };
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([newActivity]).then(cb));

    const svc = activityService(dbMock);
    const result = await svc.create(newActivity as any);

    expect(result).toEqual(newActivity);
    expect(dbMock.insert).toHaveBeenCalled();
  });

  it("gets issues for run", async () => {
    // 1st call: get run
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([{ companyId: "comp-1", contextSnapshot: { issueId: "iss-ctx" } }]).then(cb));
    // 2nd call: fromActivity
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([{ issueId: "iss-act" }]).then(cb));
    // 3rd call: fromContext
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([{ issueId: "iss-ctx" }]).then(cb));

    const svc = activityService(dbMock);
    const result = await svc.issuesForRun("run-1");

    expect(result).toHaveLength(2);
    expect(result[0].issueId).toBe("iss-ctx");
    expect(result[1].issueId).toBe("iss-act");
  });
});
