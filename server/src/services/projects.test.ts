import { describe, it, expect, vi, beforeEach } from "vitest";
import { projectService } from "./projects.js";

// Mock workspace-runtime
vi.mock("./workspace-runtime.js", () => ({
  listWorkspaceRuntimeServicesForProjectWorkspaces: vi.fn().mockResolvedValue(new Map())
}));

describe("projectService", () => {
  let dbMock: any;

  beforeEach(() => {
    dbMock = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      returning: vi.fn().mockReturnThis(),
      transaction: vi.fn().mockImplementation((cb: any) => cb(dbMock)),
      then: vi.fn().mockImplementation((cb: any) => Promise.resolve([]).then(cb)),
    };
  });

  it("lists projects for a company", async () => {
    const projectRow = { id: "proj-1", companyId: "comp-1", name: "Test Project" };
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([projectRow]).then(cb)); // for projects
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([]).then(cb)); // for goals
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([]).then(cb)); // for workspaces

    const svc = projectService(dbMock);
    const result = await svc.list("comp-1");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("proj-1");
  });

  it("gets project by id", async () => {
    const projectRow = { id: "proj-1", companyId: "comp-1", name: "Test Project" };
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([projectRow]).then(cb)); // for project
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([]).then(cb)); // for goals
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([]).then(cb)); // for workspaces

    const svc = projectService(dbMock);
    const result = await svc.getById("proj-1");

    expect(result?.id).toBe("proj-1");
  });

  it("creates project with auto-color and unique name", async () => {
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([]).then(cb)); // for color check
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([]).then(cb)); // for unique name check
    const newProject = { id: "new-proj", companyId: "comp-1", name: "New Project", color: "blue" };
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([newProject]).then(cb)); // for insert returning
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([]).then(cb)); // for goals attach
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([]).then(cb)); // for workspaces attach

    const svc = projectService(dbMock);
    const result = await svc.create("comp-1", { name: "New Project" });

    expect(result.id).toBe("new-proj");
    expect(dbMock.insert).toHaveBeenCalled();
  });

  it("resolves project by reference (ID)", async () => {
    const projectRow = { id: "550e8400-e29b-41d4-a716-446655440000", companyId: "comp-1", name: "UUID Project" };
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve([projectRow]).then(cb));

    const svc = projectService(dbMock);
    const result = await svc.resolveByReference("comp-1", "550e8400-e29b-41d4-a716-446655440000");

    expect(result.project?.id).toBe(projectRow.id);
  });

  it("resolves project by reference (Name/Key)", async () => {
    const projectRows = [{ id: "proj-1", companyId: "comp-1", name: "My Project" }];
    dbMock.then.mockImplementationOnce((cb: any) => Promise.resolve(projectRows).then(cb));

    const svc = projectService(dbMock);
    const result = await svc.resolveByReference("comp-1", "my-project");

    expect(result.project?.id).toBe("proj-1");
  });
});
