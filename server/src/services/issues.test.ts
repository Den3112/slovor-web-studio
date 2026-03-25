import { describe, it, expect, vi, beforeEach } from "vitest";
import { issueService, deriveIssueUserContext } from "./issues.js";

// Mock dependencies
vi.mock("./instance-settings.js", () => ({
  instanceSettingsService: vi.fn(() => ({
    getExperimental: vi.fn().mockResolvedValue({ enableIsolatedWorkspaces: true })
  }))
}));

vi.mock("./goals.js", () => ({
  getDefaultCompanyGoal: vi.fn().mockResolvedValue({ id: "goal-1" })
}));

describe("issueService", () => {
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
      groupBy: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      onConflictDoUpdate: vi.fn().mockReturnThis(),
      transaction: vi.fn().mockImplementation((cb: any) => cb(dbMock)),
      then: vi.fn().mockImplementation((cb: any) => Promise.resolve([]).then(cb)),
    };
  });

  describe("deriveIssueUserContext", () => {
    it("identifies unread issues correctly", () => {
      const now = new Date();
      const past = new Date(now.getTime() - 10000);
      const future = new Date(now.getTime() + 10000);

      const issue = { createdByUserId: "user-1", assigneeUserId: null, createdAt: past, updatedAt: past };
      const stats = { 
        myLastCommentAt: past, 
        myLastReadAt: past, 
        lastExternalCommentAt: future 
      };

      const context = deriveIssueUserContext(issue, "user-1", stats);
      expect(context.isUnreadForMe).toBe(true);
    });
  });

  describe("list", () => {
    it("lists issues for a company", async () => {
      const issueRow = { id: "iss-1", companyId: "comp-1", title: "Test Issue" };
      dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([issueRow]).then(cb)); // for issues
      dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([]).then(cb)); // for labels
      dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([]).then(cb)); // for active runs

      const svc = issueService(dbMock);
      const result = await svc.list("comp-1");

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("iss-1");
    });
  });

  describe("create", () => {
    it("creates an issue with identifier and status side effects", async () => {
      // Mocks for create process
      dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([{ issueCounter: 5, issuePrefix: "PAP" }]).then(cb)); // for company counter
      const newIssue = { id: "new-iss", companyId: "comp-1", status: "todo", identifier: "PAP-6" };
      dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([newIssue]).then(cb)); // for insert returning
      dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([]).then(cb)); // for sync labels Select
      dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([]).then(cb)); // for withLabels Select

      const svc = issueService(dbMock);
      const result = await svc.create("comp-1", { title: "New Issue", status: "todo" });

      expect(result.identifier).toBe("PAP-6");
      expect(dbMock.insert).toHaveBeenCalled();
    });
  });

  describe("getById", () => {
    it("returns enriched issue", async () => {
      const issueRow = { id: "iss-1", title: "Enriched" };
      dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([issueRow]).then(cb));
      dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([]).then(cb)); // labels

      const svc = issueService(dbMock);
      const result = await svc.getById("iss-1");
      expect(result?.title).toBe("Enriched");
    });
  });
});
