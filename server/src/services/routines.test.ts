import { describe, it, expect, vi, beforeEach } from "vitest";
import { routineService } from "./routines.js";

// Mock dependencies
vi.mock("./issues.js", () => ({
  issueService: vi.fn(() => ({
    getById: vi.fn().mockResolvedValue({ id: "iss-1", title: "Parent Issue" }),
    create: vi.fn().mockResolvedValue({ id: "new-iss", title: "Routine Issue" })
  }))
}));

vi.mock("./secrets.js", () => ({
  secretService: vi.fn(() => ({
    create: vi.fn().mockResolvedValue({ id: "sec-1" }),
    resolveSecretValue: vi.fn().mockResolvedValue("secret-value")
  }))
}));

vi.mock("./heartbeat.js", () => ({
  heartbeatService: vi.fn(() => ({}))
}));

vi.mock("./issue-assignment-wakeup.js", () => ({
  queueIssueAssignmentWakeup: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("./activity-log.js", () => ({
  logActivity: vi.fn().mockResolvedValue(undefined)
}));

describe("routineService", () => {
  let dbMock: any;

  beforeEach(() => {
    dbMock = {
      select: vi.fn().mockReturnThis(),
      selectDistinctOn: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      execute: vi.fn().mockReturnThis(),
      transaction: vi.fn().mockImplementation((cb: any) => cb(dbMock)),
      then: vi.fn().mockImplementation((cb: any) => Promise.resolve([]).then(cb)),
    };
  });

  it("lists routines for a company", async () => {
    const routineRow = { id: "rout-1", companyId: "comp-1", title: "Test Routine" };
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([routineRow]).then(cb)); // routines
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([]).then(cb)); // triggers
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([]).then(cb)); // latest run
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([]).then(cb)); // active issue (execution bound)
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([]).then(cb)); // active issue (legacy)

    const svc = routineService(dbMock);
    const result = await svc.list("comp-1");

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Test Routine");
  });

  it("gets routine detail", async () => {
    const routineRow = { id: "rout-1", companyId: "comp-1", title: "Test Routine", projectId: "proj-1" };
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([routineRow]).then(cb)); // getById
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([{ id: "proj-1" }]).then(cb)); // project
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([]).then(cb)); // assignee
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([]).then(cb)); // triggers
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([]).then(cb)); // recent runs

    const svc = routineService(dbMock);
    const result = await svc.getDetail("rout-1");

    expect(result?.title).toBe("Test Routine");
  });

  it("runs a routine (dispatches a run)", async () => {
    const routineRow = { id: "rout-1", companyId: "comp-1", title: "Test Routine", concurrencyPolicy: "always_enqueue" };
    const runRow = { id: "run-1", status: "received" };
    
    // transaction mocks
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([routineRow]).then(cb)); // getRoutineById
    dbMock.execute.mockResolvedValueOnce({}); // FOR UPDATE lock
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([runRow]).then(cb)); // insert routine run
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([]).then(cb)); // findLiveExecutionIssue (execution bound)
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([]).then(cb)); // findLiveExecutionIssue (legacy)
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([runRow]).then(cb)); // finalizeRun
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([]).then(cb)); // updateRoutineTouchedState (routine)

    const svc = routineService(dbMock);
    const result = await svc.runRoutine("rout-1", {
      source: "manual"
    });

    expect(result.id).toBe("run-1");
  });
});
