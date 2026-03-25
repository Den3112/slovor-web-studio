import { describe, it, expect, vi, beforeEach } from "vitest";
import { sidebarBadgeService } from "./sidebar-badges.js";

describe("sidebarBadgeService", () => {
  let dbMock: any;

  beforeEach(() => {
    dbMock = {
      select: vi.fn().mockReturnThis(),
      selectDistinctOn: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      then: vi.fn().mockImplementation((cb: any) => Promise.resolve([]).then(cb)),
    };
  });

  it("calculates badges correctly", async () => {
    // 1st call: actionableApprovals
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([{ count: 2 }]).then(cb));
    // 2nd call: latestRunByAgent
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([
        { runStatus: "failed" }, 
        { runStatus: "success" },
        { runStatus: "timed_out" }
    ]).then(cb));

    const svc = sidebarBadgeService(dbMock);
    const badges = await svc.get("comp-1", { joinRequests: 5 });

    expect(badges.approvals).toBe(2);
    expect(badges.failedRuns).toBe(2); // failed + timed_out
    expect(badges.joinRequests).toBe(5);
    expect(badges.inbox).toBe(9); // 2 + 2 + 5
  });

  it("defaults extra fields to 0", async () => {
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([{ count: 0 }]).then(cb));
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([]).then(cb));

    const svc = sidebarBadgeService(dbMock);
    const badges = await svc.get("comp-1");

    expect(badges.joinRequests).toBe(0);
    expect(badges.inbox).toBe(0);
  });
});
